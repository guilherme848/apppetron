import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingDown, Receipt, Lock, UserCheck } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
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

  // Extra KPIs: New clients this month, Onboardings
  const [newClientsThisMonth, setNewClientsThisMonth] = useState(0);
  const [activeOnboardings, setActiveOnboardings] = useState(0);

  useEffect(() => {
    async function fetchExtraKpis() {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const [newClientsRes, onboardingsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('id', { count: 'exact', head: true })
          .gte('start_date', monthStart)
          .is('deleted_at', null)
          .or('cliente_interno.is.null,cliente_interno.eq.false'),
        supabase
          .from('onboardings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'em_andamento'),
      ]);

      setNewClientsThisMonth(newClientsRes.count ?? 0);
      setActiveOnboardings(onboardingsRes.count ?? 0);
    }

    fetchExtraKpis();
  }, []);

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
        <h1 className="text-2xl font-bold text-gradient-primary">Dashboard Executivo</h1>
        <p className="text-muted-foreground">Visão estratégica de CS, retenção e performance financeira</p>
      </div>


      {/* Row 1: Health Score + KPIs de CS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card-enter" style={{ animationDelay: '0ms' }}><BaseHealthScoreCard /></div>
        <div className="card-enter" style={{ animationDelay: '60ms' }}>
          <StatsCard
            title="Clientes Ativos"
            value={activeClients}
            icon={Users}
            description="Total de clientes com status ativo"
          />
        </div>
        <div className="card-enter" style={{ animationDelay: '120ms' }}>
          <StatsCard
            title="Churns (Período)"
            value={churnedThisMonth}
            icon={TrendingDown}
            description="Cancelamentos no período selecionado"
          />
        </div>
        {canViewFinancial ? (
          <>
            <div className="card-enter" style={{ animationDelay: '180ms' }}>
              <StatsCard
                title="Receita Mensal"
                value={formatCurrency(totalMrr)}
                icon={DollarSign}
                description="Soma do valor mensal dos clientes ativos"
              />
            </div>
            <div className="card-enter" style={{ animationDelay: '240ms' }}>
              <StatsCard
                title="Ticket Médio"
                value={formatCurrency(avgTicket)}
                icon={Receipt}
                description="Média do valor mensal (ativos)"
              />
            </div>
          </>
        ) : (
          <>
            <div className="card-enter" style={{ animationDelay: '180ms' }}>
              <StatsCard
                title="Receita Mensal"
                value={<Lock className="h-5 w-5" />}
                icon={DollarSign}
                description="Restrito ao administrador"
              />
            </div>
            <div className="card-enter" style={{ animationDelay: '240ms' }}>
              <StatsCard
                title="Ticket Médio"
                value={<Lock className="h-5 w-5" />}
                icon={Receipt}
                description="Restrito ao administrador"
              />
            </div>
          </>
        )}
      </div>

      {/* Row 2: New Clients + Onboardings */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-enter" style={{ animationDelay: '300ms' }}>
          <StatsCard
            title="Novos Clientes no Mês"
            value={newClientsThisMonth}
            icon={UserCheck}
            description="Clientes que iniciaram neste mês"
          />
        </div>
        <div className="card-enter" style={{ animationDelay: '360ms' }}>
          <StatsCard
            title="Onboardings Ativos"
            value={activeOnboardings}
            icon={Users}
            description="Onboardings em andamento"
          />
        </div>
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
