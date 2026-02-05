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
 
interface DayLoad {
  load: number;
  clients: number;
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
  load_before: Record<number, DayLoad>;
  load_after: Record<number, DayLoad>;
   skipped_reason?: string;
 }
 
 const WEEKDAY_NAMES = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
 
function calculateLoads(clientList: ClientLoad[]): Record<number, DayLoad> {
  const dayLoads: Record<number, DayLoad> = {
    1: { load: 0, clients: 0 },
    2: { load: 0, clients: 0 },
    3: { load: 0, clients: 0 },
    4: { load: 0, clients: 0 },
    5: { load: 0, clients: 0 },
  };
  
  for (const c of clientList) {
    const day = c.weekly_workday;
    if (day >= 1 && day <= 5) {
      dayLoads[day].load += c.weight;
      dayLoads[day].clients += 1;
    }
  }
  
  return dayLoads;
}

function getLoadValues(dayLoads: Record<number, DayLoad>): number[] {
  return [1, 2, 3, 4, 5].map(d => dayLoads[d]?.load ?? 0);
}

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
     
    for (const client of (clients || [])) {
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
 
      // Handle both array and object response formats
      const statusData = client.traffic_client_status;
      const status = Array.isArray(statusData) ? statusData[0] : statusData;
 
       clientLoads.push({
         client_id: client.id,
         client_name: client.name,
         weekly_workday: status?.weekly_workday ?? 2,
         weekly_workday_locked: status?.weekly_workday_locked ?? false,
         weekly_assigned_at: status?.weekly_assigned_at ?? null,
         weight,
       });
     }
 
    console.log(`Processing ${clientLoads.length} clients`);
    
    // 3. Calculate load per day
     const loadBefore = calculateLoads(clientLoads);
     console.log("Load before:", loadBefore);
 
     // 4. Check if rebalancing is needed
    const loadValues = getLoadValues(loadBefore);
    const maxLoad = Math.max(...loadValues);
    const minLoad = Math.min(...loadValues);
 
    console.log(`Load values: ${loadValues.join(', ')}, max=${maxLoad}, min=${minLoad}`);
 
    if (minLoad > 0 && ((maxLoad - minLoad) / minLoad) * 100 < threshold_percent) {
      const imbalance = ((maxLoad - minLoad) / minLoad) * 100;
      const result: RebalanceResult = {
        success: true,
        moves: [],
        load_before: loadBefore,
        load_after: loadBefore,
        skipped_reason: `Desequilíbrio ${imbalance.toFixed(1)}% está abaixo do limiar ${threshold_percent}%`,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
     }
 
     // 5. Perform rebalancing
     const moves: RebalanceResult['moves'] = [];
     const cooldownDate = new Date();
     cooldownDate.setDate(cooldownDate.getDate() - cooldown_days);
     const cooldownIso = cooldownDate.toISOString();
 
    let currentClientList = [...clientLoads];
 
     for (let moveCount = 0; moveCount < max_moves; moveCount++) {
      const dayLoads = calculateLoads(currentClientList);
      const currentLoadValues = getLoadValues(dayLoads);
       
       // Find most and least loaded days
       let mostLoadedDay = 1;
       let leastLoadedDay = 1;
      let maxL = currentLoadValues[0];
      let minL = currentLoadValues[0];
 
       for (let d = 1; d <= 5; d++) {
        const load = dayLoads[d]?.load ?? 0;
        if (load > maxL) {
          maxL = load;
           mostLoadedDay = d;
         }
        if (load < minL) {
          minL = load;
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
      const newMaxLoad = (dayLoads[mostLoadedDay]?.load ?? 0) - clientToMove.weight;
      const newMinLoad = (dayLoads[leastLoadedDay]?.load ?? 0) + clientToMove.weight;
       
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
              reason: `Auto-rebalance: ${WEEKDAY_NAMES[oldDay]} (carga=${dayLoads[oldDay]?.load ?? 0}) → ${WEEKDAY_NAMES[newDay]} (carga=${dayLoads[newDay]?.load ?? 0})`,
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