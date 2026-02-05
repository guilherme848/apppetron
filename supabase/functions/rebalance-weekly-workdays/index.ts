 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface ClientLoad {
   client_id: string;
   client_name: string;
   weekly_workday: number;
   weekly_workday_locked: boolean;
   weekly_assigned_at: string | null;
   weight: number;
 }
 
 interface RebalanceResult {
   success: boolean;
   moves: {
     client_id: string;
     client_name: string;
     old_workday: number;
     new_workday: number;
     reason: string;
   }[];
   load_before: Record<number, { load: number; clients: number }>;
   load_after: Record<number, { load: number; clients: number }>;
   skipped_reason?: string;
 }
 
 const WEEKDAY_NAMES = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     const { 
       max_moves = 5, 
       cooldown_days = 30, 
       threshold_percent = 20,
       dry_run = false 
     } = await req.json().catch(() => ({}));
 
     console.log(`Rebalancing with max_moves=${max_moves}, cooldown_days=${cooldown_days}, threshold=${threshold_percent}%, dry_run=${dry_run}`);
 
     // 1. Fetch all active clients with their weights
     const { data: clients, error: clientsError } = await supabase
       .from("accounts")
       .select(`
         id,
         name,
         service_id,
         traffic_client_status!left(
           weekly_workday,
           weekly_workday_locked,
           weekly_assigned_at
         )
       `)
       .eq("status", "active")
       .is("deleted_at", null)
       .not("service_id", "is", null);
 
     if (clientsError) throw clientsError;
 
     // 2. Calculate weight for each client
     const clientLoads: ClientLoad[] = [];
     
     for (const client of clients || []) {
       // Get weight = count of active weekly templates for this client's plan
       const { data: templates, error: templatesError } = await supabase
         .from("traffic_playbook_templates")
         .select("id")
         .eq("service_id", client.service_id)
         .eq("cadence", "weekly")
         .eq("active", true);
 
       if (templatesError) throw templatesError;
 
       // Check for overrides that disable templates
       const { data: overrides, error: overridesError } = await supabase
         .from("traffic_playbook_overrides")
         .select("template_id")
         .eq("client_id", client.id)
         .eq("is_disabled", true);
 
       if (overridesError) throw overridesError;
 
       const disabledTemplates = new Set((overrides || []).map(o => o.template_id));
       const activeTemplates = (templates || []).filter(t => !disabledTemplates.has(t.id));
       const weight = activeTemplates.length;
 
       const status = client.traffic_client_status?.[0] || client.traffic_client_status;
 
       clientLoads.push({
         client_id: client.id,
         client_name: client.name,
         weekly_workday: status?.weekly_workday ?? 2,
         weekly_workday_locked: status?.weekly_workday_locked ?? false,
         weekly_assigned_at: status?.weekly_assigned_at ?? null,
         weight,
       });
     }
 
     // 3. Calculate load per day
    const calculateLoads = (clientList: ClientLoad[]) => {
       const dayLoads: Record<number, { load: number; clients: number }> = {};
       for (let d = 1; d <= 5; d++) {
         dayLoads[d] = { load: 0, clients: 0 };
       }
      for (const c of clientList) {
         if (dayLoads[c.weekly_workday]) {
           dayLoads[c.weekly_workday].load += c.weight;
           dayLoads[c.weekly_workday].clients += 1;
         }
       }
       return dayLoads;
     };
 
     const loadBefore = calculateLoads(clientLoads);
     console.log("Load before:", loadBefore);
 
     // 4. Check if rebalancing is needed
    const loadValues = Object.values(loadBefore).map(l => l.load);
    const maxLoad = Math.max(...loadValues);
    const minLoad = Math.min(...loadValues);
 
     if (minLoad > 0) {
       const imbalance = ((maxLoad - minLoad) / minLoad) * 100;
       console.log(`Imbalance: ${imbalance.toFixed(1)}%`);
 
       if (imbalance < threshold_percent) {
         const result: RebalanceResult = {
           success: true,
           moves: [],
           load_before: loadBefore,
           load_after: loadBefore,
           skipped_reason: `Imbalance ${imbalance.toFixed(1)}% is below threshold ${threshold_percent}%`,
         };
         return new Response(JSON.stringify(result), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
     }
 
     // 5. Perform rebalancing
     const moves: RebalanceResult['moves'] = [];
     const cooldownDate = new Date();
     cooldownDate.setDate(cooldownDate.getDate() - cooldown_days);
     const cooldownIso = cooldownDate.toISOString();
 
    let currentClientList = [...clientLoads];
 
     for (let moveCount = 0; moveCount < max_moves; moveCount++) {
      const dayLoads = calculateLoads(currentClientList);
       
       // Find most and least loaded days
       let mostLoadedDay = 1;
       let leastLoadedDay = 1;
       let maxL = 0;
       let minL = Infinity;
 
       for (let d = 1; d <= 5; d++) {
         if (dayLoads[d].load > maxL) {
           maxL = dayLoads[d].load;
           mostLoadedDay = d;
         }
         if (dayLoads[d].load < minL) {
           minL = dayLoads[d].load;
           leastLoadedDay = d;
         }
       }
 
       // Check if imbalance is acceptable now
       if (minL > 0 && ((maxL - minL) / minL) * 100 < threshold_percent) {
         console.log("Balance achieved, stopping early");
         break;
       }
 
       if (mostLoadedDay === leastLoadedDay) {
         console.log("No imbalance to fix");
         break;
       }
 
       // Find eligible clients on most loaded day
      const eligibleClients = currentClientList.filter(c => 
         c.weekly_workday === mostLoadedDay &&
         !c.weekly_workday_locked &&
         (c.weekly_assigned_at === null || c.weekly_assigned_at <= cooldownIso)
       ).sort((a, b) => b.weight - a.weight); // Sort by weight desc
 
       if (eligibleClients.length === 0) {
         console.log(`No eligible clients on day ${mostLoadedDay}`);
         break;
       }
 
       // Move the highest weight client
       const clientToMove = eligibleClients[0];
       const oldDay = clientToMove.weekly_workday;
       const newDay = leastLoadedDay;
 
       // Would this move reduce imbalance?
       const newMaxLoad = dayLoads[mostLoadedDay].load - clientToMove.weight;
       const newMinLoad = dayLoads[leastLoadedDay].load + clientToMove.weight;
       
       // Only move if it improves balance
       if (newMaxLoad >= newMinLoad) {
         console.log(`Moving ${clientToMove.client_name} from ${WEEKDAY_NAMES[oldDay]} to ${WEEKDAY_NAMES[newDay]}`);
 
         if (!dry_run) {
           // Update client status
           const { error: updateError } = await supabase
             .from("traffic_client_status")
             .upsert({
               client_id: clientToMove.client_id,
               weekly_workday: newDay,
               weekly_assigned_at: new Date().toISOString(),
             }, { onConflict: "client_id" });
 
           if (updateError) throw updateError;
 
           // Log the move
           const { error: logError } = await supabase
             .from("traffic_workday_rebalance_log")
             .insert({
               client_id: clientToMove.client_id,
               old_workday: oldDay,
               new_workday: newDay,
               reason: `Auto-rebalance: moved from ${WEEKDAY_NAMES[oldDay]} (load=${dayLoads[oldDay].load}) to ${WEEKDAY_NAMES[newDay]} (load=${dayLoads[newDay].load})`,
               moved_by: "auto",
             });
 
           if (logError) console.error("Log error:", logError);
         }
 
         // Update local state
        currentClientList = currentClientList.map(c => 
           c.client_id === clientToMove.client_id 
             ? { ...c, weekly_workday: newDay, weekly_assigned_at: new Date().toISOString() }
             : c
         );
 
         moves.push({
           client_id: clientToMove.client_id,
           client_name: clientToMove.client_name,
           old_workday: oldDay,
           new_workday: newDay,
           reason: `Peso ${clientToMove.weight}: ${WEEKDAY_NAMES[oldDay]} → ${WEEKDAY_NAMES[newDay]}`,
         });
       } else {
         console.log("Move would not improve balance, stopping");
         break;
       }
     }
 
    const loadAfter = calculateLoads(currentClientList);
 
     const result: RebalanceResult = {
       success: true,
       moves,
       load_before: loadBefore,
       load_after: loadAfter,
     };
 
     return new Response(JSON.stringify(result), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
 
   } catch (error: unknown) {
     console.error("Error:", error);
     const message = error instanceof Error ? error.message : "Unknown error";
     return new Response(
       JSON.stringify({ success: false, error: message }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 500,
       }
     );
   }
 });