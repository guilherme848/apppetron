import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { AccountStatus, ContractStatus, TaskStatus } from '@/types/crm';
import { 
  getAccountStatusVariant, 
  getContractStatusVariant, 
  getTaskStatusVariant 
} from '@/lib/badgeMaps';

const accountStatusLabels: Record<AccountStatus, string> = {
  lead: 'Lead',
  active: 'Ativo',
  churned: 'Churned',
};

const contractStatusLabels: Record<ContractStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  canceled: 'Cancelado',
};

const taskStatusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  doing: 'Fazendo',
  done: 'Concluído',
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const variant = getAccountStatusVariant(status);
  const label = accountStatusLabels[status] || status;
  return <Badge variant={variant}>{label}</Badge>;
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const variant = getContractStatusVariant(status);
  const label = contractStatusLabels[status] || status;
  return <Badge variant={variant}>{label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const variant = getTaskStatusVariant(status);
  const label = taskStatusLabels[status] || status;
  return <Badge variant={variant}>{label}</Badge>;
}
