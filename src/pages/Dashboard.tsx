import { Users, DollarSign, TrendingDown, Loader2, Receipt, Lock } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ClientEvolutionChart } from '@/components/dashboard/ClientEvolutionChart';
import { ChurnMrrCharts } from '@/components/dashboard/ChurnMrrCharts';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
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
    services,
    niches,
    // Filters
    periodFilter,
    setPeriodFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    serviceFilter,
    setServiceFilter,
    nicheFilter,
    setNicheFilter,
    statusFilter,
    setStatusFilter,
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground">Visão estratégica de CS, retenção e performance financeira</p>
      </div>

      {/* Global Filters */}
      <DashboardFilters
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartChange={setCustomStartDate}
        onCustomEndChange={setCustomEndDate}
        serviceFilter={serviceFilter}
        onServiceChange={setServiceFilter}
        nicheFilter={nicheFilter}
        onNicheChange={setNicheFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        services={services}
        niches={niches}
      />

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
