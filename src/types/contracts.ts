import { Json } from "@/integrations/supabase/types";

export interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  is_default_for_plan: boolean;
  service_id: string | null;
  created_at: string;
  updated_at: string;
  service?: { name: string } | null;
}

export interface ContractTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  content_html: string;
  is_active: boolean;
  created_at: string;
  created_by_member_id: string | null;
}

export interface ContractTemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  source_mapping: string | null;
  default_value: string | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface Contract {
  id: string;
  account_id: string;
  template_id: string | null;
  template_version_id: string | null;
  contract_number: string;
  status: ContractStatus;
  fields_snapshot: Json;
  mrr: number | null;
  setup_fee: number | null;
  total_first_month: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  source: string;
  source_event_id: string | null;
  external_provider: string | null;
  external_document_id: string | null;
  external_signing_url: string | null;
  document_hash: string | null;
  generated_at: string | null;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  account?: { id: string; name: string } | null;
  template?: { id: string; name: string } | null;
}

export type ContractStatus = 
  | "draft"
  | "generated"
  | "sent"
  | "signing"
  | "signed"
  | "refused"
  | "expired"
  | "canceled";

export const contractStatusLabels: Record<ContractStatus, string> = {
  draft: "Rascunho",
  generated: "Gerado",
  sent: "Enviado",
  signing: "Em assinatura",
  signed: "Assinado",
  refused: "Recusado",
  expired: "Expirado",
  canceled: "Cancelado",
};

export const contractStatusColors: Record<ContractStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  generated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sent: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  signing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  signed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refused: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  canceled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export interface ContractEvent {
  id: string;
  contract_id: string;
  event_type: string;
  event_description: string | null;
  actor_type: string | null;
  actor_id: string | null;
  actor_name: string | null;
  metadata: Json | null;
  payload_original: Json | null;
  created_at: string;
}

export interface ContractFile {
  id: string;
  contract_id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  document_hash: string | null;
  created_at: string;
}

export interface ContractSigner {
  id: string;
  contract_id: string;
  external_signer_id: string | null;
  name: string;
  email: string;
  cpf: string | null;
  role: string;
  sign_order: number;
  status: string;
  signed_at: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ClintWebhookEvent {
  id: string;
  source_event_id: string;
  event_type: string | null;
  received_at: string;
  payload: Json;
  processed_at: string | null;
  status: string;
  error: string | null;
  contract_id: string | null;
  created_at: string;
}
