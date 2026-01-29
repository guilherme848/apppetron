import { useState } from 'react';
import { Loader2, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCommandCenter } from '@/hooks/useCommandCenter';
import { CommandCenterGlobalFilters } from '@/components/command-center/CommandCenterGlobalFilters';
import { CommandCenterQuickActions } from '@/components/command-center/CommandCenterQuickActions';
import { KPICards } from '@/components/command-center/KPICards';
import { HealthDistributionCard, AlertsCard } from '@/components/command-center/HealthAndAlerts';
import { OnboardingFunnelCard, NpsDistributionCard } from '@/components/command-center/OperationsCards';
import { ChurnByDimensionCard, CohortAnalysisCard } from '@/components/command-center/ChurnAnalytics';
import { ClientList } from '@/components/command-center/ClientList';
import { PlaybooksCard } from '@/components/command-center/PlaybooksCard';
import { toast } from 'sonner';

export default function CsCommandCenter() {
  const navigate = useNavigate();
  const {
    loading,
    filters,
    setFilters,
    csMembers,
    services,
    niches,
    availableStates,
    availableOrigins,
    kpiData,
    onboardingFunnel,
    healthDistribution,
    npsDistribution,
    alerts,
    churnByNiche,
    churnByService,
    cohortData,
    activePlaybooks,
    getClientList,
  } = useCommandCenter();

  // Quick action handlers
  const handleCreateTask = () => toast.info('Funcionalidade em desenvolvimento');
  const handleRegisterMeeting = () => navigate('/cs/meetings');
  const handleSendNps = () => navigate('/cs/nps');
  const handleMarkAtRisk = () => navigate('/cs/risk');
  const handleCreatePlaybook = () => toast.info('Funcionalidade em desenvolvimento');
  const handleStartCancellation = () => navigate('/cs/risk');
  const handleOpenClient360 = () => navigate('/crm');

  const handleClientClick = (clientId: string) => navigate(`/cs/client/${clientId}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HeartHandshake className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">CS & Churn Command Center</h1>
          <p className="text-muted-foreground">Cockpit diário de Customer Success</p>
        </div>
      </div>

      {/* Global Filters */}
      <CommandCenterGlobalFilters
        filters={filters}
        onFiltersChange={setFilters}
        services={services}
        niches={niches}
        csMembers={csMembers}
        availableStates={availableStates}
        availableOrigins={availableOrigins}
      />

      {/* Quick Actions */}
      <CommandCenterQuickActions
        onCreateTask={handleCreateTask}
        onRegisterMeeting={handleRegisterMeeting}
        onSendNps={handleSendNps}
        onMarkAtRisk={handleMarkAtRisk}
        onCreatePlaybook={handleCreatePlaybook}
        onStartCancellation={handleStartCancellation}
        onOpenClient360={handleOpenClient360}
      />

      {/* SECTION 1: KPIs */}
      <section>
        <h2 className="text-lg font-semibold mb-4">KPIs Executivos</h2>
        <KPICards
          data={kpiData}
          metricMode={filters.metricMode}
          onCardClick={(type) => console.log('Card clicked:', type)}
        />
      </section>

      {/* SECTION 2 & 3: Operations + Health */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Operação de CS</h2>
          <OnboardingFunnelCard
            data={onboardingFunnel}
            onStageClick={(stage) => console.log('Stage clicked:', stage)}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Saúde e Risco</h2>
          <HealthDistributionCard
            data={healthDistribution}
            onSegmentClick={(status) => console.log('Health clicked:', status)}
          />
        </div>
      </section>

      {/* SECTION 3 continued: Alerts */}
      <AlertsCard
        alerts={alerts}
        onAlertClick={(alert) => navigate(`/cs/client/${alert.clientId}`)}
        onViewAll={() => navigate('/cs/risk')}
      />

      {/* SECTION 4: NPS */}
      <section className="grid gap-6 lg:grid-cols-2">
        <NpsDistributionCard
          data={npsDistribution}
          onSegmentClick={(classification) => console.log('NPS clicked:', classification)}
        />
        <PlaybooksCard
          playbooks={activePlaybooks}
          onPlaybookClick={(pb) => navigate(`/cs/client/${pb.clientId}`)}
          onCreatePlaybook={handleCreatePlaybook}
        />
      </section>

      {/* SECTION 6: Churn by Dimensions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Churn por Dimensões</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChurnByDimensionCard
            title="Churn por Nicho"
            data={churnByNiche}
            metricMode={filters.metricMode}
            onItemClick={(item) => console.log('Niche clicked:', item)}
          />
          <ChurnByDimensionCard
            title="Churn por Plano"
            data={churnByService}
            metricMode={filters.metricMode}
            onItemClick={(item) => console.log('Service clicked:', item)}
          />
        </div>
      </section>

      {/* SECTION 7: Cohorts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Coortes e Retenção</h2>
        <CohortAnalysisCard data={cohortData} />
      </section>

      {/* SECTION 9: Client List */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Lista Inteligente</h2>
        <ClientList
          getClientList={getClientList}
          onClientClick={handleClientClick}
        />
      </section>
    </div>
  );
}
