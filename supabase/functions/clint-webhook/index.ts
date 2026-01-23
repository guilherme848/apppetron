import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-clint-signature",
};

interface ClintWebhookPayload {
  event_id: string;
  event_type: string;
  client_id?: string;
  client_cnpj?: string;
  client_email?: string;
  client_name?: string;
  plan_id?: string;
  plan_name?: string;
  monthly_value?: number;
  setup_fee?: number;
  discount?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  payment_method?: string;
  signer_name?: string;
  signer_email?: string;
  signer_cpf?: string;
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
    const payload: ClintWebhookPayload = await req.json();
    console.log("Clint webhook received:", JSON.stringify(payload));

    const sourceEventId = payload.event_id;
    if (!sourceEventId) {
      return new Response(
        JSON.stringify({ error: "Missing event_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check idempotency - already processed?
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

    // Also check if contract already exists with this source_event_id
    const { data: existingContract } = await supabase
      .from("contracts_generated")
      .select("id, contract_number")
      .eq("source_event_id", sourceEventId)
      .maybeSingle();

    if (existingContract) {
      console.log("Contract already exists for event:", sourceEventId);
      return new Response(
        JSON.stringify({ 
          message: "Contract already exists", 
          contract_id: existingContract.id,
          contract_number: existingContract.contract_number 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Register the webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from("clint_webhook_events")
      .insert({
        source_event_id: sourceEventId,
        event_type: payload.event_type,
        payload: payload,
        status: "received",
      })
      .select()
      .single();

    if (webhookError) {
      console.error("Failed to register webhook event:", webhookError);
      throw webhookError;
    }

    // Find the client in accounts
    let account = null;
    
    if (payload.client_cnpj) {
      const { data } = await supabase
        .from("accounts")
        .select("*, services(id, name)")
        .eq("cpf_cnpj", payload.client_cnpj)
        .maybeSingle();
      account = data;
    }
    
    if (!account && payload.client_email) {
      const { data } = await supabase
        .from("accounts")
        .select("*, services(id, name)")
        .eq("contact_email", payload.client_email)
        .maybeSingle();
      account = data;
    }

    if (!account) {
      await supabase
        .from("clint_webhook_events")
        .update({ 
          status: "failed", 
          error: "Client not found in accounts",
          processed_at: new Date().toISOString()
        })
        .eq("id", webhookEvent.id);

      return new Response(
        JSON.stringify({ error: "Client not found", event_id: webhookEvent.id }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the appropriate template
    const serviceId = account.service_id;
    let template = null;
    let templateVersion = null;

    if (serviceId) {
      // Try to find template for specific service
      const { data: serviceTemplate } = await supabase
        .from("contract_templates")
        .select("*, contract_template_versions(*)")
        .eq("service_id", serviceId)
        .eq("active", true)
        .eq("is_default_for_plan", true)
        .maybeSingle();
      
      if (serviceTemplate) {
        template = serviceTemplate;
        templateVersion = serviceTemplate.contract_template_versions?.find(
          (v: { is_active: boolean }) => v.is_active
        );
      }
    }

    // If no service-specific template, find any default active template
    if (!template) {
      const { data: defaultTemplate } = await supabase
        .from("contract_templates")
        .select("*, contract_template_versions(*)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (defaultTemplate) {
        template = defaultTemplate;
        templateVersion = defaultTemplate.contract_template_versions?.find(
          (v: { is_active: boolean }) => v.is_active
        );
      }
    }

    if (!template || !templateVersion) {
      await supabase
        .from("clint_webhook_events")
        .update({ 
          status: "failed", 
          error: "No active template found",
          processed_at: new Date().toISOString()
        })
        .eq("id", webhookEvent.id);

      return new Response(
        JSON.stringify({ error: "No active template found", event_id: webhookEvent.id }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build fields_snapshot from account and webhook payload
    const monthlyValue = payload.monthly_value ?? account.monthly_value ?? 0;
    const setupFee = payload.setup_fee ?? 0;
    const discount = payload.discount ?? 0;
    const totalFirstMonth = monthlyValue + setupFee - discount;

    const fieldsSnapshot = {
      // From account
      client_name: account.name,
      client_cnpj: account.cpf_cnpj,
      client_email: account.contact_email,
      client_phone: account.contact_phone,
      client_contact_name: account.contact_name,
      client_address: [
        account.street,
        account.street_number,
        account.address_complement,
        account.neighborhood,
        account.city,
        account.state,
        account.postal_code,
      ].filter(Boolean).join(", "),
      plan_name: account.services?.name || payload.plan_name || "",
      monthly_value: monthlyValue,
      // From webhook
      setup_fee: setupFee,
      discount: discount,
      total_first_month: totalFirstMonth,
      contract_start_date: payload.contract_start_date || new Date().toISOString().split("T")[0],
      contract_end_date: payload.contract_end_date || null,
      payment_method: payload.payment_method || account.ad_payment_method || "",
      // Signer info
      signer_name: payload.signer_name || account.contact_name || "",
      signer_email: payload.signer_email || account.contact_email || "",
      signer_cpf: payload.signer_cpf || "",
    };

    // Generate contract number
    const { data: contractNumber } = await supabase.rpc("generate_contract_number");

    // Create the contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts_generated")
      .insert({
        account_id: account.id,
        template_id: template.id,
        template_version_id: templateVersion.id,
        contract_number: contractNumber,
        fields_snapshot: fieldsSnapshot,
        mrr: monthlyValue,
        setup_fee: setupFee,
        total_first_month: totalFirstMonth,
        contract_start_date: fieldsSnapshot.contract_start_date,
        contract_end_date: fieldsSnapshot.contract_end_date,
        source: "clint",
        source_event_id: sourceEventId,
        status: "generated",
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (contractError) {
      console.error("Failed to create contract:", contractError);
      await supabase
        .from("clint_webhook_events")
        .update({ 
          status: "failed", 
          error: `Failed to create contract: ${contractError.message}`,
          processed_at: new Date().toISOString()
        })
        .eq("id", webhookEvent.id);

      throw contractError;
    }

    // Link webhook event to contract
    await supabase
      .from("clint_webhook_events")
      .update({ 
        contract_id: contract.id,
        status: "processed",
        processed_at: new Date().toISOString()
      })
      .eq("id", webhookEvent.id);

    // Register creation event
    await supabase.from("contract_events").insert({
      contract_id: contract.id,
      event_type: "created",
      event_description: "Contract created from Clint webhook",
      payload_original: payload,
    });

    // Try to send for signature if provider is configured
    const signProvider = Deno.env.get("SIGN_PROVIDER");
    
    if (signProvider && (signProvider === "autentique" || signProvider === "clicksign")) {
      try {
        const functionName = signProvider === "autentique" ? "autentique-send" : "clicksign-send";
        
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            contract_id: contract.id,
            template_html: templateVersion.content_html,
            fields: fieldsSnapshot,
            signers: [
              {
                name: fieldsSnapshot.signer_name,
                email: fieldsSnapshot.signer_email,
                cpf: fieldsSnapshot.signer_cpf,
                role: "client",
              },
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Signature request sent:", result);
        } else {
          const errorText = await response.text();
          console.warn("Failed to send for signature (will continue):", errorText);
          
          await supabase.from("contract_events").insert({
            contract_id: contract.id,
            event_type: "signature_send_failed",
            event_description: `Failed to send for signature: ${errorText}`,
          });
        }
      } catch (signError) {
        console.warn("Signature sending error (will continue):", signError);
      }
    }

    console.log("Contract created successfully:", contract.contract_number);

    return new Response(
      JSON.stringify({
        success: true,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        status: contract.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Clint webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
