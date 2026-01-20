import { Users, DollarSign, CheckSquare, Loader2, Receipt, Clock } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ContentActivitySummary } from '@/components/dashboard/ContentActivitySummary';
import { ClientEvolutionChart } from '@/components/dashboard/ClientEvolutionChart';
import { ChurnMrrCharts } from '@/components/dashboard/ChurnMrrCharts';
import { useCrm } from '@/contexts/CrmContext';

export default function Dashboard() {
  const { activeAccountsCount, totalMrr, openTasksCount, averageTicket, averageLifetimeMonths, loading } = useCrm();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLifetime = (months: number) => {
    const years = months / 12;
    return {
      months: months.toFixed(1).replace('.', ','),
      years: years.toFixed(1).replace('.', ','),
    };
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Clientes Ativos"
          value={activeAccountsCount}
          icon={Users}
          description="Total de clientes com status ativo"
        />
        <StatsCard
          title="Receita Mensal (Ativos)"
          value={formatCurrency(totalMrr)}
          icon={DollarSign}
          description="Soma do valor mensal dos clientes ativos"
        />
        <StatsCard
          title="Ticket Médio"
          value={formatCurrency(averageTicket)}
          icon={Receipt}
          description="Média do valor mensal (ativos)"
        />
        <StatsCard
          title="LT Médio"
          value={`${formatLifetime(averageLifetimeMonths).months} meses`}
          icon={Clock}
          description={`≈ ${formatLifetime(averageLifetimeMonths).years} anos`}
        />
        <StatsCard
          title="Tarefas em Aberto"
          value={openTasksCount}
          icon={CheckSquare}
          description="Tarefas não concluídas"
        />
      </div>

      {/* Churn and MRR Charts */}
      <ChurnMrrCharts />

      {/* Client Evolution Chart */}
      <ClientEvolutionChart />

      {/* Content Activity Summary */}
      <ContentActivitySummary />
    </div>
  );
}
