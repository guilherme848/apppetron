import { Users, DollarSign, TrendingDown, Receipt, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ClientEvolutionChart } from '@/components/dashboard/ClientEvolutionChart';
import { ChurnMrrCharts } from '@/components/dashboard/ChurnMrrCharts';
import { ChurnLTCard } from '@/components/dashboard/ChurnLTCard';
import { CohortAnalysis } from '@/components/dashboard/CohortAnalysis';
import { DistributionCharts } from '@/components/dashboard/DistributionCharts';
import { TicketByNicheChart } from '@/components/dashboard/TicketByNicheChart';
import { BaseHealthScoreCard } from '@/components/dashboard/BaseHealthScoreCard';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';
export default function Dashboard() {
  const {
    loading,
    // KPIs
    activeClients,
    churnedThisMonth,
    churnLTData,
    totalMrr,
    avgTicket,
    // Analytics
    cohortData,
    distributionByPlan,
    distributionByNiche,
    ticketByNiche,
  } = useExecutiveDashboard();

  const { canViewFinancialValues, loading: permissionLoading } = useSensitivePermission();
  const canViewFinancial = canViewFinancialValues();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading || permissionLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 mt-2" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground">Visão estratégica de CS, retenção e performance financeira</p>
      </div>


      {/* Row 1: Health Score + KPIs de CS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BaseHealthScoreCard />
        <StatsCard
          title="Clientes Ativos"
          value={activeClients}
          icon={Users}
          description="Total de clientes com status ativo"
        />
        <StatsCard
          title="Churns (Período)"
          value={churnedThisMonth}
          icon={TrendingDown}
          description="Cancelamentos no período selecionado"
        />
        {canViewFinancial ? (
          <>
            <StatsCard
              title="Receita Mensal"
              value={formatCurrency(totalMrr)}
              icon={DollarSign}
              description="Soma do valor mensal dos clientes ativos"
            />
            <StatsCard
              title="Ticket Médio"
              value={formatCurrency(avgTicket)}
              icon={Receipt}
              description="Média do valor mensal (ativos)"
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Receita Mensal"
              value={<Lock className="h-5 w-5" />}
              icon={DollarSign}
              description="Restrito ao administrador"
            />
            <StatsCard
              title="Ticket Médio"
              value={<Lock className="h-5 w-5" />}
              icon={Receipt}
              description="Restrito ao administrador"
            />
          </>
        )}
      </div>

      {/* Churn and MRR Charts (existing) */}
      <ChurnMrrCharts />

      {/* Client Evolution Chart (existing) */}
      <ClientEvolutionChart />

      {/* LT dos Churns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChurnLTCard avgMonths={churnLTData.avgMonths} count={churnLTData.count} />
      </div>

      {/* Cohort Analysis */}
      <CohortAnalysis data={cohortData} />

      {/* Distribution Charts (Plan / Niche) */}
      <DistributionCharts
        distributionByPlan={distributionByPlan}
        distributionByNiche={distributionByNiche}
      />

      {/* Ticket by Niche */}
      <TicketByNicheChart data={ticketByNiche} />
    </div>
  );
}
