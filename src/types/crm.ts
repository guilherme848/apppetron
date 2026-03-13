export type AccountStatus = 'lead' | 'active' | 'churned' | 'archived';
export type ContractStatus = 'active' | 'paused' | 'canceled';
export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'done';
export type AdPaymentMethod = 'pix' | 'boleto' | 'cartao';
export type AdPaymentFrequency = 'weekly' | 'biweekly' | 'monthly';

export type AccountOrigin = 'indicacao' | 'inbound' | 'outbound';

export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  created_at: string;
  updated_at?: string;
  
  // Dados do cliente
  razao_social?: string | null;
  origin?: AccountOrigin | null;
  niche?: string | null;
  website?: string | null;
  cpf_cnpj?: string | null;
  
  // Contrato (campos de texto legados)
  service_contracted?: string | null;
  monthly_value?: number | null;
  start_date?: string | null;
  
  // Churn / Soft delete
  churned_at?: string | null;
  deleted_at?: string | null;
  
  // Novos campos FK
  service_id?: string | null;
  niche_id?: string | null;
  
  // Nome do serviço/plano (via join)
  service_name?: string | null;
  
  // Contato
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  
  // Endereço
  country?: string | null;
  postal_code?: string | null;
  state?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  street_number?: string | null;
  address_complement?: string | null;
  
  // Time da Conta (responsáveis por cargo)
  designer_member_id?: string | null;
  videomaker_member_id?: string | null;
  social_member_id?: string | null;
  traffic_member_id?: string | null;
  support_member_id?: string | null;
  cs_member_id?: string | null;
  
  // Contrato extra
  billing_day?: number | null;

  // Tráfego Pago
  ad_payment_method?: AdPaymentMethod | null;
  ad_monthly_budget?: number | null;
  ad_payment_frequency?: AdPaymentFrequency | null;
}

// Tipos de cargo responsável para posts
export type ResponsibleRoleKey = 'designer' | 'videomaker' | 'social' | 'traffic' | 'support' | 'cs';

export const RESPONSIBLE_ROLE_OPTIONS: { value: ResponsibleRoleKey; label: string; field: keyof Account }[] = [
  { value: 'designer', label: 'Designer', field: 'designer_member_id' },
  { value: 'videomaker', label: 'Videomaker', field: 'videomaker_member_id' },
  { value: 'social', label: 'Social Media', field: 'social_member_id' },
  { value: 'traffic', label: 'Tráfego', field: 'traffic_member_id' },
  { value: 'support', label: 'Atendimento', field: 'support_member_id' },
  { value: 'cs', label: 'CS', field: 'cs_member_id' },
];

export interface Contract {
  id: string;
  account_id: string;
  mrr: number;
  start_date: string;
  status: ContractStatus;
  created_at: string;
}

export interface Task {
  id: string;
  account_id: string | null;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
}
