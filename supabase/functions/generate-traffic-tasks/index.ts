 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface Template {
   id: string;
   service_id: string;
   name: string;
   description: string | null;
   checklist: unknown[];
   cadence: string;
   anchor_rule: string | null;
   anchor_day_of_week: number | null;
   anchor_day_of_month: number | null;
   offset_days: number;
   default_owner_role: string;
   priority: string;
 }
 
 interface Override {
   template_id: string;
   is_disabled: boolean;
   owner_override: string | null;
   cadence_override: string | null;
 }
 
 interface Client {
   id: string;
   name: string;
   service_id: string | null;
   traffic_member_id: string | null;
 }
 
 interface ClientStatus {
   client_id: string;
   campaign_status: string;
 }
 
 // Calculate next occurrence dates based on cadence
 function calculateOccurrences(
   cadence: string,
   startDate: Date,
   endDate: Date,
   anchorRule: string | null,
   anchorDayOfWeek: number | null,
   anchorDayOfMonth: number | null,
   offsetDays: number
 ): Date[] {
   const occurrences: Date[] = [];
   const current = new Date(startDate);
   current.setHours(0, 0, 0, 0);
   
   // Apply offset
   current.setDate(current.getDate() + offsetDays);
 
   while (current <= endDate) {
     let shouldAdd = false;
     let nextIncrement = 1;
 
     switch (cadence) {
       case "daily":
         shouldAdd = true;
         nextIncrement = 1;
         break;
 
       case "weekly":
         if (anchorRule === "weekday" && anchorDayOfWeek !== null) {
           shouldAdd = current.getDay() === anchorDayOfWeek;
         } else {
           // Default to Monday
           shouldAdd = current.getDay() === 1;
         }
         nextIncrement = 1;
         break;
 
       case "biweekly":
         if (anchorRule === "biweekly_days" && anchorDayOfMonth !== null) {
           const day = current.getDate();
           shouldAdd = day === 1 || day === 15;
         } else {
           // Default: 1st and 15th
           const day = current.getDate();
           shouldAdd = day === 1 || day === 15;
         }
         nextIncrement = 1;
         break;
 
       case "monthly":
         if (anchorRule === "month_day" && anchorDayOfMonth !== null) {
           shouldAdd = current.getDate() === anchorDayOfMonth;
         } else {
           // Default to 1st
           shouldAdd = current.getDate() === 1;
         }
         nextIncrement = 1;
         break;
 
       case "quarterly":
         if (anchorRule === "quarter_day" && anchorDayOfMonth !== null) {
           const month = current.getMonth();
           const isQuarterStart = month === 0 || month === 3 || month === 6 || month === 9;
           shouldAdd = isQuarterStart && current.getDate() === anchorDayOfMonth;
         } else {
           // Default: 1st day of quarter months (Jan, Apr, Jul, Oct)
           const month = current.getMonth();
           const isQuarterStart = month === 0 || month === 3 || month === 6 || month === 9;
           shouldAdd = isQuarterStart && current.getDate() === 1;
         }
         nextIncrement = 1;
         break;
     }
 
     if (shouldAdd && current >= startDate) {
       occurrences.push(new Date(current));
     }
 
     current.setDate(current.getDate() + nextIncrement);
   }
 
   return occurrences;
 }
 
 serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     const { window_days = 30, client_id = null } = await req.json().catch(() => ({}));
 
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const endDate = new Date(today);
     endDate.setDate(endDate.getDate() + window_days);
 
     console.log(`Generating tasks from ${today.toISOString()} to ${endDate.toISOString()}`);
 
     // 1. Fetch active clients with traffic service
     let clientsQuery = supabase
       .from("accounts")
       .select("id, name, service_id, traffic_member_id")
       .eq("status", "active")
       .not("service_id", "is", null);
 
     if (client_id) {
       clientsQuery = clientsQuery.eq("id", client_id);
     }
 
     const { data: clients, error: clientsError } = await clientsQuery;
     if (clientsError) throw clientsError;
 
     console.log(`Found ${clients?.length || 0} clients`);
 
     // 2. Fetch client statuses
     const { data: statuses, error: statusError } = await supabase
       .from("traffic_client_status")
       .select("*");
     if (statusError) throw statusError;
 
     const statusMap = new Map<string, ClientStatus>();
     (statuses || []).forEach((s: ClientStatus) => statusMap.set(s.client_id, s));
 
     // 3. Fetch active templates
     const { data: templates, error: templatesError } = await supabase
       .from("traffic_playbook_templates")
       .select("*")
       .eq("active", true);
     if (templatesError) throw templatesError;
 
     console.log(`Found ${templates?.length || 0} active templates`);
 
     // 4. Fetch overrides
     const { data: overrides, error: overridesError } = await supabase
       .from("traffic_playbook_overrides")
       .select("*");
     if (overridesError) throw overridesError;
 
     const overrideMap = new Map<string, Override>();
     (overrides || []).forEach((o: Override & { client_id: string }) => {
       overrideMap.set(`${o.client_id}:${o.template_id}`, o);
     });
 
     // 5. Fetch existing tasks to avoid duplicates
     const { data: existingTasks, error: existingError } = await supabase
       .from("traffic_playbook_tasks")
       .select("client_id, template_id, period_start")
       .gte("period_start", today.toISOString().split("T")[0])
       .lte("period_start", endDate.toISOString().split("T")[0]);
     if (existingError) throw existingError;
 
     const existingSet = new Set(
       (existingTasks || []).map(
         (t: { client_id: string; template_id: string; period_start: string }) =>
           `${t.client_id}:${t.template_id}:${t.period_start}`
       )
     );
 
     console.log(`Found ${existingSet.size} existing tasks in window`);
 
     // 6. Generate tasks
     const tasksToCreate: unknown[] = [];
     let skippedDueToStatus = 0;
     let skippedDueToDuplicate = 0;
 
     for (const client of clients || []) {
       const status = statusMap.get(client.id);
       const campaignStatus = status?.campaign_status || "active";
 
       // Get templates for this client's service
       const clientTemplates = (templates || []).filter(
         (t: Template) => t.service_id === client.service_id
       );
 
       for (const template of clientTemplates) {
         const overrideKey = `${client.id}:${template.id}`;
         const override = overrideMap.get(overrideKey);
 
         // Skip if disabled by override
         if (override?.is_disabled) continue;
 
         // Determine effective cadence
         const effectiveCadence = override?.cadence_override || template.cadence;
 
         // Skip daily tasks for paused/no_budget clients
         if (
           (campaignStatus === "paused" || campaignStatus === "no_budget") &&
           effectiveCadence === "daily"
         ) {
           skippedDueToStatus++;
           continue;
         }
 
         // Calculate occurrences
         const occurrences = calculateOccurrences(
           effectiveCadence,
           today,
           endDate,
           template.anchor_rule,
           template.anchor_day_of_week,
           template.anchor_day_of_month,
           template.offset_days
         );
 
         for (const occurrence of occurrences) {
           const periodStart = occurrence.toISOString().split("T")[0];
           const taskKey = `${client.id}:${template.id}:${periodStart}`;
 
           // Skip if already exists
           if (existingSet.has(taskKey)) {
             skippedDueToDuplicate++;
             continue;
           }
 
           // Determine assignee
           const assignedTo = override?.owner_override || client.traffic_member_id || null;
 
           tasksToCreate.push({
             client_id: client.id,
             template_id: template.id,
             period_start: periodStart,
             title: template.name,
             description: template.description,
             checklist: template.checklist,
             status: "todo",
             priority: template.priority,
             cadence: effectiveCadence,
             due_date: periodStart,
             assigned_to: assignedTo,
           });
 
           existingSet.add(taskKey); // Prevent duplicates within same run
         }
       }
     }
 
     console.log(`Creating ${tasksToCreate.length} new tasks`);
     console.log(`Skipped ${skippedDueToStatus} due to campaign status`);
     console.log(`Skipped ${skippedDueToDuplicate} due to duplicates`);
 
     // 7. Insert tasks in batches
     let created = 0;
     const batchSize = 100;
     for (let i = 0; i < tasksToCreate.length; i += batchSize) {
       const batch = tasksToCreate.slice(i, i + batchSize);
       const { error: insertError } = await supabase
         .from("traffic_playbook_tasks")
         .insert(batch);
       if (insertError) {
         console.error("Insert error:", insertError);
         throw insertError;
       }
       created += batch.length;
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         created,
         skipped_status: skippedDueToStatus,
         skipped_duplicate: skippedDueToDuplicate,
         window_days,
         clients_processed: clients?.length || 0,
       }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 200,
       }
     );
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