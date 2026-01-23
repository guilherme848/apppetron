import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignatureRequest {
  contract_id: string;
  template_html: string;
  fields: Record<string, unknown>;
  signers: Array<{
    name: string;
    email: string;
    cpf?: string;
    role: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clicksignApiKey = Deno.env.get("CLICKSIGN_API_KEY");
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || supabaseUrl;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const request: SignatureRequest = await req.json();
    console.log("Clicksign send request for contract:", request.contract_id);

    if (!clicksignApiKey) {
      console.warn("CLICKSIGN_API_KEY not configured - skipping signature send");
      
      await supabase.from("contract_events").insert({
        contract_id: request.contract_id,
        event_type: "signature_skipped",
        event_description: "Clicksign API key not configured",
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Clicksign API key not configured",
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate content from HTML template with merged fields
    let htmlContent = request.template_html;
    for (const [key, value] of Object.entries(request.fields)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      htmlContent = htmlContent.replace(placeholder, String(value ?? ""));
    }

    // Get contract details
    const { data: contract } = await supabase
      .from("contracts_generated")
      .select("contract_number, account_id, accounts(name)")
      .eq("id", request.contract_id)
      .single();

    const accountData = contract?.accounts as unknown as { name: string } | null;
    const documentName = `Contrato_${contract?.contract_number}_${(accountData?.name || "Cliente").replace(/\s+/g, "_")}`;

    // Clicksign API base URL (production vs sandbox)
    const clicksignBaseUrl = "https://app.clicksign.com/api/v1";
    // For sandbox: "https://sandbox.clicksign.com/api/v1"

    // Step 1: Create document from content
    // Note: Clicksign accepts base64 encoded content
    const contentBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

    const createDocResponse = await fetch(
      `${clicksignBaseUrl}/documents?access_token=${clicksignApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: {
            path: `/${documentName}.html`,
            content_base64: `data:text/html;base64,${contentBase64}`,
            deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            auto_close: true,
            locale: "pt-BR",
            sequence_enabled: false,
          },
        }),
      }
    );

    const docResult = await createDocResponse.json();
    console.log("Clicksign create document response:", JSON.stringify(docResult));

    if (!createDocResponse.ok || !docResult.document) {
      throw new Error(docResult.errors?.[0] || "Failed to create document in Clicksign");
    }

    const documentKey = docResult.document.key;

    // Step 2: Add signers
    const signerKeys: string[] = [];
    
    for (const signer of request.signers) {
      const createSignerResponse = await fetch(
        `${clicksignBaseUrl}/signers?access_token=${clicksignApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signer: {
              email: signer.email,
              phone_number: null,
              auths: ["email"],
              name: signer.name,
              documentation: signer.cpf || null,
              birthday: null,
              has_documentation: !!signer.cpf,
              selfie_enabled: false,
              handwritten_enabled: false,
              official_document_enabled: false,
              liveness_enabled: false,
              facial_biometrics_enabled: false,
            },
          }),
        }
      );

      const signerResult = await createSignerResponse.json();
      console.log("Clicksign create signer response:", JSON.stringify(signerResult));

      if (!createSignerResponse.ok || !signerResult.signer) {
        throw new Error(signerResult.errors?.[0] || "Failed to create signer in Clicksign");
      }

      signerKeys.push(signerResult.signer.key);

      // Save signer to database
      await supabase.from("contract_signers").insert({
        contract_id: request.contract_id,
        external_signer_id: signerResult.signer.key,
        name: signer.name,
        email: signer.email,
        cpf: signer.cpf || null,
        role: signer.role,
        status: "pending",
      });
    }

    // Step 3: Add signers to document
    for (const signerKey of signerKeys) {
      const addSignerResponse = await fetch(
        `${clicksignBaseUrl}/lists?access_token=${clicksignApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            list: {
              document_key: documentKey,
              signer_key: signerKey,
              sign_as: "sign",
              refusable: true,
              message: `Por favor, assine o contrato ${contract?.contract_number}`,
            },
          }),
        }
      );

      const addSignerResult = await addSignerResponse.json();
      console.log("Clicksign add signer to document:", JSON.stringify(addSignerResult));
    }

    // Step 4: Send notifications to signers
    for (const signerKey of signerKeys) {
      await fetch(
        `${clicksignBaseUrl}/notifications?access_token=${clicksignApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_signature_key: `${documentKey}_${signerKey}`,
            message: `Olá! Você recebeu o contrato ${contract?.contract_number} para assinatura.`,
            url: null,
          }),
        }
      );
    }

    // Update contract with external IDs
    await supabase
      .from("contracts_generated")
      .update({
        external_provider: "clicksign",
        external_document_id: documentKey,
        external_signing_url: `https://app.clicksign.com/sign/${documentKey}`,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", request.contract_id);

    // Register event
    await supabase.from("contract_events").insert({
      contract_id: request.contract_id,
      event_type: "sent",
      event_description: "Contract sent for signature via Clicksign",
      metadata: { 
        external_document_id: documentKey,
        signers_count: signerKeys.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        external_document_id: documentKey,
        signing_url: `https://app.clicksign.com/sign/${documentKey}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Clicksign send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
