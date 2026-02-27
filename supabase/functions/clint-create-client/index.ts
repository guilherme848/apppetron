import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-clint-signature",
};

interface ClintClientPayload {
  event_id: string;
  event_type?: string;
  // Campos mapeados do Clint
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  deal_stage?: string;
  deal_user?: string;
  deal_status?: string;
  // Campos opcionais extras
  client_cnpj?: string;
  start_date?: string;
  website?: string;
  country?: string;
  postal_code?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  street_number?: string;
  address_complement?: string;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: ClintClientPayload = await req.json();
    console.log("Clint create-client webhook received:", JSON.stringify(payload));

    const sourceEventId = payload.event_id;
    if (!sourceEventId) {
      return new Response(
        JSON.stringify({ error: "Missing event_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.contact_name) {
      return new Response(
        JSON.stringify({ error: "Missing contact_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from("clint_webhook_events")
      .select("id, status")
      .eq("source_event_id", sourceEventId)
      .maybeSingle();

    if (existingEvent) {
      console.log("Event already processed:", sourceEventId);
      return new Response(
        JSON.stringify({ message: "Event already processed", event_id: existingEvent.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if client already exists by CNPJ or email
    let existingAccount = null;

    if (payload.client_cnpj) {
      const { data } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("cpf_cnpj", payload.client_cnpj)
        .maybeSingle();
      existingAccount = data;
    }

    if (!existingAccount && payload.contact_email) {
      const { data } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("contact_email", payload.contact_email)
        .maybeSingle();
      existingAccount = data;
    }

    // Register webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from("clint_webhook_events")
      .insert({
        source_event_id: sourceEventId,
        event_type: payload.event_type || "client_created",
        payload: payload,
        status: "received",
      })
      .select()
      .single();

    if (webhookError) {
      console.error("Failed to register webhook event:", webhookError);
      throw webhookError;
    }

    // If client already exists, skip creation
    if (existingAccount) {
      await supabase
        .from("clint_webhook_events")
        .update({
          status: "skipped",
          error: `Client already exists: ${existingAccount.name} (${existingAccount.id})`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);

      return new Response(
        JSON.stringify({
          message: "Client already exists",
          account_id: existingAccount.id,
          account_name: existingAccount.name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create account using mapped Clint fields
    const startDate = payload.start_date || new Date().toISOString().split("T")[0];

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert({
        name: payload.contact_name,
        contact_name: payload.contact_name,
        contact_email: payload.contact_email || null,
        contact_phone: payload.contact_phone || null,
        cpf_cnpj: payload.client_cnpj || null,
        start_date: startDate,
        status: "active",
        origin: "clint",
        website: payload.website || null,
        country: payload.country || null,
        postal_code: payload.postal_code || null,
        state: payload.state || null,
        city: payload.city || null,
        neighborhood: payload.neighborhood || null,
        street: payload.street || null,
        street_number: payload.street_number || null,
        address_complement: payload.address_complement || null,
      })
      .select()
      .single();

    if (accountError) {
      console.error("Failed to create account:", accountError);
      await supabase
        .from("clint_webhook_events")
        .update({
          status: "failed",
          error: `Failed to create account: ${accountError.message}`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);
      throw accountError;
    }

    // Mark event as processed
    await supabase
      .from("clint_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", webhookEvent.id);

    console.log("Client created successfully:", account.id, account.name);

    return new Response(
      JSON.stringify({
        success: true,
        account_id: account.id,
        account_name: account.name,
        start_date: startDate,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Clint create-client error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
