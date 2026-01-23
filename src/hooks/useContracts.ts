import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contract, ContractEvent, ContractFile, ContractSigner, ContractStatus } from "@/types/contracts";
import { toast } from "sonner";

export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts_generated")
        .select(`
          *,
          accounts(id, name),
          contract_templates(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((row) => ({
        ...row,
        account: row.accounts as { id: string; name: string } | null,
        template: row.contract_templates as { id: string; name: string } | null,
        status: row.status as ContractStatus,
      })) as Contract[];
    },
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ["contracts", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts_generated")
        .select(`
          *,
          accounts(id, name),
          contract_templates(id, name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      return {
        ...data,
        account: data.accounts as { id: string; name: string } | null,
        template: data.contract_templates as { id: string; name: string } | null,
        status: data.status as ContractStatus,
      } as Contract;
    },
  });
}

export function useContractEvents(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract-events", contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_events")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContractEvent[];
    },
  });
}

export function useContractFiles(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract-files", contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_files")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContractFile[];
    },
  });
}

export function useContractSigners(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract-signers", contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_signers")
        .select("*")
        .eq("contract_id", contractId)
        .order("sign_order", { ascending: true });

      if (error) throw error;
      return data as ContractSigner[];
    },
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContractStatus }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "signed") {
        updateData.signed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("contracts_generated")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Register event
      await supabase.from("contract_events").insert({
        contract_id: id,
        event_type: "status_changed",
        event_description: `Status alterado para ${status}`,
        actor_type: "user",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-events"] });
      toast.success("Status atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Error updating contract status:", error);
      toast.error("Erro ao atualizar status do contrato");
    },
  });
}

export function useUploadSignedPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, file }: { contractId: string; file: File }) => {
      const fileName = `signed_${contractId}_${Date.now()}.pdf`;
      const storagePath = `contracts/${contractId}/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Create file record
      const { error: fileError } = await supabase.from("contract_files").insert({
        contract_id: contractId,
        file_name: fileName,
        storage_path: storagePath,
        file_type: "signed_pdf",
        mime_type: "application/pdf",
        file_size: file.size,
      });

      if (fileError) throw fileError;

      // Update contract status to signed
      const { error: updateError } = await supabase
        .from("contracts_generated")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
        })
        .eq("id", contractId);

      if (updateError) throw updateError;

      // Register event
      await supabase.from("contract_events").insert({
        contract_id: contractId,
        event_type: "signed_pdf_uploaded",
        event_description: "PDF assinado enviado manualmente",
        actor_type: "user",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-files"] });
      queryClient.invalidateQueries({ queryKey: ["contract-events"] });
      toast.success("PDF assinado enviado com sucesso");
    },
    onError: (error) => {
      console.error("Error uploading signed PDF:", error);
      toast.error("Erro ao enviar PDF assinado");
    },
  });
}
