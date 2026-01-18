export type AccountStatus = 'lead' | 'active' | 'churned';
export type ContractStatus = 'active' | 'paused' | 'canceled';
export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'done';

export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  created_at: string;
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
