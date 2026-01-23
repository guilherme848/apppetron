import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClicksignWebhookPayload {
  event: {
    name: string;
    occurred_at: string;
  };
  document?: {
    key: string;
    status: string;
    filename: string;
    downloads?: {
      signed_file_url?: string;
    };
  };
  signer?: {
    key: string;
    email: string;
    name: string;
    documentation?: string;
    ip_address?: string;
    signed_at?: string;
    refused_at?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: ClicksignWebhookPayload = await req.json();
    console.log("Clicksign webhook received:", JSON.stringify(payload));

    const documentKey = payload.document?.key;
    if (!documentKey) {
      return new Response(
        JSON.stringify({ error: "Missing document key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find contract by external_document_id
    const { data: contract, error: findError } = await supabase
      .from("contracts_generated")
      .select("id, status")
      .eq("external_document_id", documentKey)
      .eq("external_provider", "clicksign")
      .maybeSingle();

    if (findError || !contract) {
      console.warn("Contract not found for document:", documentKey);
      return new Response(
        JSON.stringify({ error: "Contract not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine new status based on event
    let newStatus = contract.status;
    const eventName = payload.event?.name || "unknown";
    let eventDescription = "";

    switch (eventName) {
      case "sign":
        // Individual signature
        eventDescription = `Document signed by ${payload.signer?.email || "unknown"}`;
        newStatus = "signing";
        
        // Update signer record
        if (payload.signer?.key) {
          await supabase
            .from("contract_signers")
            .update({
              status: "signed",
              signed_at: payload.signer.signed_at || new Date().toISOString(),
              ip_address: payload.signer.ip_address || null,
            })
            .eq("contract_id", contract.id)
            .eq("external_signer_id", payload.signer.key);
        }
        break;

      case "close":
      case "auto_close":
        newStatus = "signed";
        eventDescription = "Document signing completed - all parties signed";
        break;

      case "refuse":
        newStatus = "refused";
        eventDescription = `Document refused by ${payload.signer?.email || "a signer"}`;
        
        if (payload.signer?.key) {
          await supabase
            .from("contract_signers")
            .update({
              status: "refused",
            })
            .eq("contract_id", contract.id)
            .eq("external_signer_id", payload.signer.key);
        }
        break;

      case "deadline":
        newStatus = "expired";
        eventDescription = "Document signature deadline reached";
        break;

      case "cancel":
        newStatus = "canceled";
        eventDescription = "Document was canceled";
        break;

      case "update":
        eventDescription = "Document was updated";
        break;

      default:
        eventDescription = `Received event: ${eventName}`;
    }

    // Update contract status
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "signed") {
      updateData.signed_at = new Date().toISOString();
    }

    await supabase
      .from("contracts_generated")
      .update(updateData)
      .eq("id", contract.id);

    // Register event
    await supabase.from("contract_events").insert({
      contract_id: contract.id,
      event_type: eventName,
      event_description: eventDescription,
      payload_original: payload,
      metadata: {
        signer_email: payload.signer?.email,
        document_status: payload.document?.status,
      },
    });

    // If document is closed/signed and has a signed PDF URL, download and store it
    if (newStatus === "signed" && payload.document?.downloads?.signed_file_url) {
      try {
        const signedPdfUrl = payload.document.downloads.signed_file_url;
        const pdfResponse = await fetch(signedPdfUrl);
        
        if (pdfResponse.ok) {
          const pdfBlob = await pdfResponse.blob();
          const pdfArrayBuffer = await pdfBlob.arrayBuffer();
          const pdfUint8Array = new Uint8Array(pdfArrayBuffer);
          
          const fileName = `signed_${contract.id}.pdf`;
          const storagePath = `contracts/${contract.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from("contracts")
            .upload(storagePath, pdfUint8Array, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (!uploadError) {
            await supabase.from("contract_files").insert({
              contract_id: contract.id,
              file_name: fileName,
              storage_path: storagePath,
              file_type: "signed_pdf",
              mime_type: "application/pdf",
              file_size: pdfBlob.size,
            });

            await supabase.from("contract_events").insert({
              contract_id: contract.id,
              event_type: "signed_pdf_stored",
              event_description: "Signed PDF downloaded and stored",
            });
          }
        }
      } catch (pdfError) {
        console.error("Failed to download signed PDF:", pdfError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, contract_id: contract.id, new_status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Clicksign webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
