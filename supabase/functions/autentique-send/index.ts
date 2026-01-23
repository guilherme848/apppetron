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
  const autentiqueApiKey = Deno.env.get("AUTENTIQUE_API_KEY");
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || supabaseUrl;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const request: SignatureRequest = await req.json();
    console.log("Autentique send request for contract:", request.contract_id);

    if (!autentiqueApiKey) {
      console.warn("AUTENTIQUE_API_KEY not configured - skipping signature send");
      
      await supabase.from("contract_events").insert({
        contract_id: request.contract_id,
        event_type: "signature_skipped",
        event_description: "Autentique API key not configured",
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Autentique API key not configured",
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate PDF from HTML template with merged fields
    let htmlContent = request.template_html;
    for (const [key, value] of Object.entries(request.fields)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      htmlContent = htmlContent.replace(placeholder, String(value ?? ""));
    }

    // For now, we'll use the HTML directly - in production you'd convert to PDF
    // using a service like Puppeteer, wkhtmltopdf, or a PDF generation API

    // Autentique GraphQL mutation to create document
    const createDocumentMutation = `
      mutation CreateDocument(
        $name: String!
        $content: Upload!
        $signers: [SignerInput!]!
      ) {
        createDocument(
          document: {
            name: $name
          }
          file: $content
          signers: $signers
        ) {
          id
          name
          signatures {
            id
            public_id
            link {
              short_link
            }
            user {
              email
              name
            }
          }
        }
      }
    `;

    // Get contract details
    const { data: contract } = await supabase
      .from("contracts_generated")
      .select("contract_number, account_id, accounts(name)")
      .eq("id", request.contract_id)
      .single();

    const accountData = contract?.accounts as unknown as { name: string } | null;
    const documentName = `Contrato ${contract?.contract_number} - ${accountData?.name || "Cliente"}`;

    // Prepare signers for Autentique
    const autentiqueSigners = request.signers.map((signer, index) => ({
      email: signer.email,
      name: signer.name,
      action: "SIGN",
      positions: [{ x: 50, y: 700 + (index * 50), z: 1 }], // Signature positions
    }));

    // Note: Autentique uses GraphQL with multipart form for file upload
    // This is a simplified implementation - production would need proper file handling
    const formData = new FormData();
    formData.append("operations", JSON.stringify({
      query: createDocumentMutation,
      variables: {
        name: documentName,
        content: null,
        signers: autentiqueSigners,
      },
    }));
    formData.append("map", JSON.stringify({ "0": ["variables.content"] }));
    
    // Create a blob from HTML content (in production, convert to PDF first)
    const htmlBlob = new Blob([htmlContent], { type: "text/html" });
    formData.append("0", htmlBlob, `${contract?.contract_number || "contract"}.html`);

    const response = await fetch("https://api.autentique.com.br/v2/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${autentiqueApiKey}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log("Autentique response:", JSON.stringify(result));

    if (result.errors) {
      throw new Error(result.errors[0]?.message || "Autentique API error");
    }

    const documentData = result.data?.createDocument;
    if (!documentData) {
      throw new Error("No document data returned from Autentique");
    }

    // Update contract with external IDs
    await supabase
      .from("contracts_generated")
      .update({
        external_provider: "autentique",
        external_document_id: documentData.id,
        external_signing_url: documentData.signatures?.[0]?.link?.short_link || null,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", request.contract_id);

    // Create signers records
    for (const sig of documentData.signatures || []) {
      await supabase.from("contract_signers").insert({
        contract_id: request.contract_id,
        external_signer_id: sig.public_id || sig.id,
        name: sig.user?.name || "",
        email: sig.user?.email || "",
        role: "client",
        status: "pending",
      });
    }

    // Register event
    await supabase.from("contract_events").insert({
      contract_id: request.contract_id,
      event_type: "sent",
      event_description: "Contract sent for signature via Autentique",
      metadata: { 
        external_document_id: documentData.id,
        signers_count: documentData.signatures?.length || 0,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        external_document_id: documentData.id,
        signing_url: documentData.signatures?.[0]?.link?.short_link,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Autentique send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
