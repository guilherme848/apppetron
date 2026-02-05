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
  weekly_workday: number;
 }
 
// Check if a date is a weekday (Monday=1 to Friday=5)
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

// Get next weekday if current date is weekend
function getNextWeekday(date: Date): Date {
  const result = new Date(date);
  while (!isWeekday(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

// Get the next occurrence of a specific weekday (1=Monday...5=Friday)
function getNextWeekdayOccurrence(startDate: Date, targetWeekday: number): Date {
  const result = new Date(startDate);
  // Convert JS day (0=Sunday) to our format (1=Monday)
  const jsTargetDay = targetWeekday === 7 ? 0 : targetWeekday; // Just in case
  
  while (true) {
    const currentDay = result.getDay();
    // Convert JS day to our format: JS 0=Sunday, 1=Monday... we want 1=Monday, 5=Friday
    const ourDay = currentDay === 0 ? 7 : currentDay;
    if (ourDay === targetWeekday && isWeekday(result)) {
      return result;
    }
    result.setDate(result.getDate() + 1);
  }
}

 // Calculate next occurrence dates based on cadence
 function calculateOccurrences(
   cadence: string,
   startDate: Date,
   endDate: Date,
   anchorRule: string | null,
   anchorDayOfWeek: number | null,
   anchorDayOfMonth: number | null,
  offsetDays: number,
  clientWeeklyWorkday?: number
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
        // Only weekdays (Monday-Friday)
        shouldAdd = isWeekday(current);
         nextIncrement = 1;
         break;
 
       case "weekly":
        // Use client's weekly_workday (1=Monday...5=Friday)
        if (clientWeeklyWorkday !== undefined && clientWeeklyWorkday >= 1 && clientWeeklyWorkday <= 5) {
          const currentDay = current.getDay();
          const ourDay = currentDay === 0 ? 7 : currentDay;
          shouldAdd = ourDay === clientWeeklyWorkday;
        } else if (anchorRule === "weekday" && anchorDayOfWeek !== null) {
          const currentDay = current.getDay();
          const ourDay = currentDay === 0 ? 7 : currentDay;
          shouldAdd = ourDay === anchorDayOfWeek;
        } else {
          // Default to Tuesday (2)
          const currentDay = current.getDay();
          shouldAdd = currentDay === 2;
         }
         nextIncrement = 1;
         break;
 
       case "biweekly":
         if (anchorRule === "biweekly_days" && anchorDayOfMonth !== null) {
           const day = current.getDate();
          shouldAdd = (day === 1 || day === 15) && isWeekday(current);
         } else {
          // Default: 1st and 15th, but only on weekdays
           const day = current.getDate();
          shouldAdd = (day === 1 || day === 15) && isWeekday(current);
         }
         nextIncrement = 1;
         break;
 
       case "monthly":
         if (anchorRule === "month_day" && anchorDayOfMonth !== null) {
          shouldAdd = current.getDate() === anchorDayOfMonth && isWeekday(current);
         } else {
          // Default to 1st, only on weekdays
          shouldAdd = current.getDate() === 1 && isWeekday(current);
         }
         nextIncrement = 1;
         break;
 
       case "quarterly":
         if (anchorRule === "quarter_day" && anchorDayOfMonth !== null) {
           const month = current.getMonth();
           const isQuarterStart = month === 0 || month === 3 || month === 6 || month === 9;
          shouldAdd = isQuarterStart && current.getDate() === anchorDayOfMonth && isWeekday(current);
         } else {
           // Default: 1st day of quarter months (Jan, Apr, Jul, Oct)
           const month = current.getMonth();
           const isQuarterStart = month === 0 || month === 3 || month === 6 || month === 9;
          shouldAdd = isQuarterStart && current.getDate() === 1 && isWeekday(current);
         }
         nextIncrement = 1;
         break;
     }
 
     if (shouldAdd && current >= startDate) {
       occurrences.push(new Date(current));
     }
 
     current.setDate(current.getDate() + nextIncrement);
   }
 
  // For biweekly/monthly/quarterly: if date falls on weekend, shift to next weekday
  if (cadence === "biweekly" || cadence === "monthly" || cadence === "quarterly") {
    // Re-process to handle weekend shifts
    const adjusted: Date[] = [];
    const current2 = new Date(startDate);
    current2.setHours(0, 0, 0, 0);
    current2.setDate(current2.getDate() + offsetDays);

    while (current2 <= endDate) {
      let targetDate: Date | null = null;

      if (cadence === "biweekly") {
        const day = current2.getDate();
        if (day === 1 || day === 15) {
          targetDate = new Date(current2);
        }
      } else if (cadence === "monthly") {
        const targetDay = anchorDayOfMonth || 1;
        if (current2.getDate() === targetDay) {
          targetDate = new Date(current2);
        }
      } else if (cadence === "quarterly") {
        const month = current2.getMonth();
        const isQuarterStart = month === 0 || month === 3 || month === 6 || month === 9;
        const targetDay = anchorDayOfMonth || 1;
        if (isQuarterStart && current2.getDate() === targetDay) {
          targetDate = new Date(current2);
        }
      }

      if (targetDate) {
        // Shift to next weekday if on weekend
        const adjustedDate = getNextWeekday(targetDate);
        if (adjustedDate >= startDate && adjustedDate <= endDate) {
          // Avoid duplicates
          const dateStr = adjustedDate.toISOString().split("T")[0];
          if (!adjusted.some(d => d.toISOString().split("T")[0] === dateStr)) {
            adjusted.push(adjustedDate);
          }
        }
      }

      current2.setDate(current2.getDate() + 1);
    }

    return adjusted;
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
 
    // 2.1 Auto-assign weekly_workday for new clients without status
    for (const client of clients || []) {
      if (!statusMap.has(client.id)) {
        console.log(`Creating traffic_client_status for client ${client.id}`);
        const { data: newStatus, error: createError } = await supabase
          .from("traffic_client_status")
          .insert({
            client_id: client.id,
            campaign_status: "active",
          })
          .select()
          .single();
        
        if (createError) {
          console.error(`Error creating status for client ${client.id}:`, createError);
        } else if (newStatus) {
          statusMap.set(client.id, newStatus as ClientStatus);
          console.log(`Assigned weekly_workday=${newStatus.weekly_workday} to client ${client.id}`);
        }
      }
    }

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
          const clientStatus = statusMap.get(client.id);
          const weeklyWorkday = clientStatus?.weekly_workday ?? 2; // Default Tuesday

         const occurrences = calculateOccurrences(
           effectiveCadence,
           today,
           endDate,
           template.anchor_rule,
           template.anchor_day_of_week,
           template.anchor_day_of_month,
            template.offset_days,
            effectiveCadence === "weekly" ? weeklyWorkday : undefined
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