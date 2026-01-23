import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutentiqueWebhookPayload {
  event: string;
  document?: {
    id: string;
    name: string;
    status: string;
    signed_count: number;
    total_signers: number;
    file?: {
      signed?: string;
    };
  };
  signature?: {
    id: string;
    public_id: string;
    signed_at?: string;
    rejected_at?: string;
    user?: {
      email: string;
      name: string;
    };
    ip_address?: string;
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
    const payload: AutentiqueWebhookPayload = await req.json();
    console.log("Autentique webhook received:", JSON.stringify(payload));

    const documentId = payload.document?.id;
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing document id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find contract by external_document_id
    const { data: contract, error: findError } = await supabase
      .from("contracts_generated")
      .select("id, status")
      .eq("external_document_id", documentId)
      .eq("external_provider", "autentique")
      .maybeSingle();

    if (findError || !contract) {
      console.warn("Contract not found for document:", documentId);
      return new Response(
        JSON.stringify({ error: "Contract not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine new status based on event
    let newStatus = contract.status;
    let eventType = payload.event;
    let eventDescription = "";

    switch (payload.event) {
      case "document.signed":
        // Individual signature
        eventDescription = `Document signed by ${payload.signature?.user?.email || "unknown"}`;
        
        // Update signer record
        if (payload.signature?.public_id) {
          await supabase
            .from("contract_signers")
            .update({
              status: "signed",
              signed_at: payload.signature.signed_at || new Date().toISOString(),
              ip_address: payload.signature.ip_address || null,
            })
            .eq("contract_id", contract.id)
            .eq("external_signer_id", payload.signature.public_id);
        }

        // Check if all signers have signed
        if (payload.document?.signed_count === payload.document?.total_signers) {
          newStatus = "signed";
          eventDescription = "All parties have signed the document";
        } else {
          newStatus = "signing";
        }
        break;

      case "document.finished":
        newStatus = "signed";
        eventDescription = "Document signing completed";
        break;

      case "document.rejected":
      case "signature.rejected":
        newStatus = "refused";
        eventDescription = `Document rejected by ${payload.signature?.user?.email || "a signer"}`;
        
        if (payload.signature?.public_id) {
          await supabase
            .from("contract_signers")
            .update({
              status: "refused",
            })
            .eq("contract_id", contract.id)
            .eq("external_signer_id", payload.signature.public_id);
        }
        break;

      case "document.expired":
        newStatus = "expired";
        eventDescription = "Document signature period expired";
        break;

      case "document.canceled":
        newStatus = "canceled";
        eventDescription = "Document was canceled";
        break;

      default:
        eventDescription = `Received event: ${payload.event}`;
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
      event_type: eventType,
      event_description: eventDescription,
      payload_original: payload,
      metadata: {
        signer_email: payload.signature?.user?.email,
        signed_count: payload.document?.signed_count,
        total_signers: payload.document?.total_signers,
      },
    });

    // If document is fully signed and has a signed PDF URL, download and store it
    if (newStatus === "signed" && payload.document?.file?.signed) {
      try {
        const signedPdfUrl = payload.document.file.signed;
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
    console.error("Autentique webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
