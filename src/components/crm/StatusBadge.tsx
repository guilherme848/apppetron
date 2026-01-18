import { Badge } from '@/components/ui/badge';
import { AccountStatus, ContractStatus, TaskStatus } from '@/types/crm';

const accountStatusConfig: Record<AccountStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  lead: { label: 'Lead', variant: 'secondary' },
  active: { label: 'Ativo', variant: 'default' },
  churned: { label: 'Churned', variant: 'destructive' },
};

const contractStatusConfig: Record<ContractStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: 'Ativo', variant: 'default' },
  paused: { label: 'Pausado', variant: 'secondary' },
  canceled: { label: 'Cancelado', variant: 'destructive' },
};

const taskStatusConfig: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  backlog: { label: 'Backlog', variant: 'outline' },
  todo: { label: 'A Fazer', variant: 'secondary' },
  doing: { label: 'Fazendo', variant: 'default' },
  done: { label: 'Concluído', variant: 'default' },
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const config = accountStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const config = contractStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = taskStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
