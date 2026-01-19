export type AccountStatus = 'lead' | 'active' | 'churned';
export type ContractStatus = 'active' | 'paused' | 'canceled';
export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'done';

export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  created_at: string;
  updated_at?: string;
  
  // Dados do cliente
  niche?: string | null;
  website?: string | null;
  cpf_cnpj?: string | null;
  
  // Contrato (campos de texto legados)
  service_contracted?: string | null;
  monthly_value?: number | null;
  start_date?: string | null;
  
  // Churn
  churned_at?: string | null;
  
  // Novos campos FK
  service_id?: string | null;
  niche_id?: string | null;
  
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
}

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
