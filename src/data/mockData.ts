import { Account, Contract, Task } from '@/types/crm';

export const mockAccounts: Account[] = [
  { id: '1', name: 'TechCorp Brasil', status: 'active', created_at: '2024-01-15' },
  { id: '2', name: 'Inovação Ltda', status: 'active', created_at: '2024-02-20' },
  { id: '3', name: 'StartUp ABC', status: 'lead', created_at: '2024-03-10' },
  { id: '4', name: 'Empresa XYZ', status: 'churned', created_at: '2023-11-05' },
  { id: '5', name: 'Global Services', status: 'active', created_at: '2024-01-25' },
];

export const mockContracts: Contract[] = [
  { id: '1', account_id: '1', mrr: 5000, start_date: '2024-01-15', status: 'active', created_at: '2024-01-15' },
  { id: '2', account_id: '2', mrr: 3500, start_date: '2024-02-20', status: 'active', created_at: '2024-02-20' },
  { id: '3', account_id: '1', mrr: 2000, start_date: '2024-03-01', status: 'active', created_at: '2024-03-01' },
  { id: '4', account_id: '4', mrr: 1500, start_date: '2023-11-05', status: 'canceled', created_at: '2023-11-05' },
  { id: '5', account_id: '5', mrr: 4000, start_date: '2024-01-25', status: 'active', created_at: '2024-01-25' },
];

export const mockTasks: Task[] = [
  { id: '1', account_id: '1', title: 'Reunião de kickoff', status: 'done', due_date: '2024-01-20', created_at: '2024-01-15' },
  { id: '2', account_id: '2', title: 'Enviar proposta comercial', status: 'doing', due_date: '2024-03-25', created_at: '2024-03-15' },
  { id: '3', account_id: '3', title: 'Agendar demo do produto', status: 'todo', due_date: '2024-03-28', created_at: '2024-03-20' },
  { id: '4', account_id: null, title: 'Atualizar documentação', status: 'backlog', due_date: null, created_at: '2024-03-18' },
  { id: '5', account_id: '1', title: 'Review trimestral', status: 'todo', due_date: '2024-04-01', created_at: '2024-03-22' },
  { id: '6', account_id: '5', title: 'Treinamento equipe', status: 'doing', due_date: '2024-03-30', created_at: '2024-03-20' },
];
