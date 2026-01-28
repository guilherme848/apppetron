import React from 'react';
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
import { DraggableDashboard } from '@/components/dashboard/DraggableDashboard';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';

export default function Dashboard() {
  const {
    loading,
    services,
    niches,
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
    activeClients,
    churnedThisMonth,
    churnLTData,
    totalMrr,
    avgTicket,
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

  // Define dashboard items with their components
  const dashboardItems = [
    {
      key: 'health-score',
      component: <BaseHealthScoreCard />,
    },
    {
      key: 'active-clients',
      component: (
        <StatsCard
          title="Clientes Ativos"
          value={activeClients}
          icon={Users}
          description="Total de clientes com status ativo"
        />
      ),
    },
    {
      key: 'churns',
      component: (
        <StatsCard
          title="Churns (Período)"
          value={churnedThisMonth}
          icon={TrendingDown}
          description="Cancelamentos no período selecionado"
        />
      ),
    },
    {
      key: 'mrr',
      component: canViewFinancial ? (
        <StatsCard
          title="Receita Mensal"
          value={formatCurrency(totalMrr)}
          icon={DollarSign}
          description="Soma do valor mensal dos clientes ativos"
        />
      ) : (
        <StatsCard
          title="Receita Mensal"
          value={<Lock className="h-5 w-5" />}
          icon={DollarSign}
          description="Restrito ao administrador"
        />
      ),
    },
    {
      key: 'ticket',
      component: canViewFinancial ? (
        <StatsCard
          title="Ticket Médio"
          value={formatCurrency(avgTicket)}
          icon={Receipt}
          description="Média do valor mensal (ativos)"
        />
      ) : (
        <StatsCard
          title="Ticket Médio"
          value={<Lock className="h-5 w-5" />}
          icon={Receipt}
          description="Restrito ao administrador"
        />
      ),
    },
    {
      key: 'churn-mrr-charts',
      component: <ChurnMrrCharts />,
    },
    {
      key: 'client-evolution',
      component: <ClientEvolutionChart />,
    },
    {
      key: 'churn-lt',
      component: <ChurnLTCard avgMonths={churnLTData.avgMonths} count={churnLTData.count} />,
    },
    {
      key: 'cohort',
      component: <CohortAnalysis data={cohortData} />,
    },
    {
      key: 'distribution',
      component: (
        <DistributionCharts
          distributionByPlan={distributionByPlan}
          distributionByNiche={distributionByNiche}
        />
      ),
    },
    {
      key: 'ticket-niche',
      component: <TicketByNicheChart data={ticketByNiche} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
        <p className="text-muted-foreground">
          Visão estratégica de CS, retenção e performance financeira. Arraste e redimensione os cards conforme sua preferência.
        </p>
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

      {/* Draggable Dashboard Grid */}
      <DraggableDashboard items={dashboardItems} />
    </div>
  );
}
