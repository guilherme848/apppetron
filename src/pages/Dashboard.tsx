import { Users, DollarSign, CheckSquare, Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ContentActivitySummary } from '@/components/dashboard/ContentActivitySummary';
import { ClientEvolutionChart } from '@/components/dashboard/ClientEvolutionChart';
import { useCrm } from '@/contexts/CrmContext';

export default function Dashboard() {
  const { activeAccountsCount, totalMrr, openTasksCount, loading } = useCrm();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do CRM Petron</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Clientes Ativos"
          value={activeAccountsCount}
          icon={Users}
          description="Total de clientes com status ativo"
        />
        <StatsCard
          title="MRR Total"
          value={formatCurrency(totalMrr)}
          icon={DollarSign}
          description="Receita recorrente mensal (valor mensal dos clientes ativos)"
        />
        <StatsCard
          title="Tarefas em Aberto"
          value={openTasksCount}
          icon={CheckSquare}
          description="Tarefas não concluídas"
        />
      </div>

      {/* Client Evolution Chart */}
      <ClientEvolutionChart />

      {/* Content Activity Summary */}
      <ContentActivitySummary />
    </div>
  );
}
