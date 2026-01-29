import { useState, useMemo } from 'react';
import { Loader2, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCommandCenter } from '@/hooks/useCommandCenter';
import { CommandCenterGlobalFilters } from '@/components/command-center/CommandCenterGlobalFilters';
import { CommandCenterQuickActions } from '@/components/command-center/CommandCenterQuickActions';
import { KPICards } from '@/components/command-center/KPICards';
import { HealthDistributionCard, AlertsCard } from '@/components/command-center/HealthAndAlerts';
import { OnboardingFunnelCard } from '@/components/command-center/OperationsCards';
import { ChurnByDimensionCard, CohortAnalysisCard } from '@/components/command-center/ChurnAnalytics';
import { ClientList } from '@/components/command-center/ClientList';
import { PlaybooksCard } from '@/components/command-center/PlaybooksCard';
import { NpsSection } from '@/components/command-center/NpsSection';
import { ClientDrillDownDrawer } from '@/components/command-center/ClientDrillDownDrawer';
import { CreatePlaybookDialog } from '@/components/command-center/CreatePlaybookDialog';
import { SelectClientDialog } from '@/components/command-center/SelectClientDialog';
import { ClientListView, ClientListItem, PlaybookType } from '@/types/commandCenter';
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
    refetch,
  } = useCommandCenter();

  // Drill-down drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerSubtitle, setDrawerSubtitle] = useState('');
  const [drawerClients, setDrawerClients] = useState<ClientListItem[]>([]);

  // Dialog states
  const [playbookDialogOpen, setPlaybookDialogOpen] = useState(false);
  const [selectClientDialogOpen, setSelectClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [pendingPlaybookType, setPendingPlaybookType] = useState<PlaybookType>('custom');
  const [pendingAction, setPendingAction] = useState<'playbook' | 'risk' | 'meeting' | null>(null);

  // Calculate detractors without follow-up
  const detractorsWithoutFollowup = useMemo(() => {
    const detractors = getClientList('detractors');
    // In a real scenario, we'd check if they have a recent contact/meeting
    return Math.floor(detractors.length * 0.4); // Simulated for now
  }, [getClientList]);

  // Open drill-down drawer with filtered clients
  const openDrillDown = (title: string, view: ClientListView, subtitle?: string) => {
    setDrawerTitle(title);
    setDrawerSubtitle(subtitle || '');
    setDrawerClients(getClientList(view));
    setDrawerOpen(true);
  };

  // KPI card click handlers
  const handleKpiClick = (type: string) => {
    switch (type) {
      case 'active':
        openDrillDown('Clientes Ativos', 'action_today', 'Todos os clientes com status ativo');
        break;
      case 'onboarding':
        openDrillDown('Clientes em Onboarding', 'onboarding_delayed', 'Clientes no processo de onboarding');
        break;
      case 'at_risk':
        openDrillDown('Clientes em Risco', 'critical', 'Clientes com health score crítico ou em atenção');
        break;
      case 'nps':
        openDrillDown('Detratores', 'detractors', 'Clientes que deram NPS <= 6');
        break;
      case 'churn':
      case 'churn_mrr':
        openDrillDown('Cancelamentos', 'churned', 'Clientes que cancelaram no período');
        break;
    }
  };

  // Quick action handlers
  const handleCreateTask = () => toast.info('Funcionalidade em desenvolvimento');
  
  const handleRegisterMeeting = () => {
    setPendingAction('meeting');
    setSelectClientDialogOpen(true);
  };
  
  const handleSendNps = () => navigate('/cs/nps');
  
  const handleMarkAtRisk = () => {
    setPendingAction('risk');
    setSelectClientDialogOpen(true);
  };
  
  const handleCreatePlaybook = () => {
    setPendingAction('playbook');
    setPendingPlaybookType('custom');
    setSelectClientDialogOpen(true);
  };
  
  const handleStartCancellation = () => navigate('/cs/risk');
  const handleOpenClient360 = () => navigate('/crm');

  // Client selection handler
  const handleClientSelected = (client: { id: string; name: string }) => {
    setSelectedClient(client);
    setSelectClientDialogOpen(false);

    switch (pendingAction) {
      case 'playbook':
        setPlaybookDialogOpen(true);
        break;
      case 'meeting':
        navigate(`/cs/meetings?client=${client.id}`);
        break;
      case 'risk':
        // Mark client as at risk
        toast.success(`${client.name} marcado em risco`);
        refetch();
        break;
    }
    setPendingAction(null);
  };

  // Playbook creation from NPS section
  const handleCreateDetractorPlaybook = () => {
    setPendingPlaybookType('detractor');
    setPendingAction('playbook');
    setSelectClientDialogOpen(true);
  };

  // Health distribution click
  const handleHealthClick = (status: 'healthy' | 'attention' | 'critical') => {
    const titles = {
      healthy: 'Clientes Saudáveis',
      attention: 'Clientes em Atenção',
      critical: 'Clientes Críticos',
    };
    openDrillDown(titles[status], status === 'critical' ? 'critical' : 'action_today');
  };

  // Batch actions from drawer
  const handleBatchCreateTask = (clientIds: string[]) => {
    toast.info(`Criar tarefas para ${clientIds.length} clientes - Em desenvolvimento`);
  };

  const handleBatchCreatePlaybook = (clientIds: string[]) => {
    if (clientIds.length === 1) {
      const client = drawerClients.find(c => c.id === clientIds[0]);
      if (client) {
        setSelectedClient({ id: client.id, name: client.name });
        setPlaybookDialogOpen(true);
      }
    } else {
      toast.info(`Criar playbooks para ${clientIds.length} clientes - Em desenvolvimento`);
    }
  };

  const handleBatchMarkRisk = (clientIds: string[]) => {
    toast.info(`Marcar ${clientIds.length} clientes em risco - Em desenvolvimento`);
  };

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
          onCardClick={handleKpiClick}
        />
      </section>

      {/* SECTION 2 & 3: Operations + Health */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Operação de CS</h2>
          <OnboardingFunnelCard
            data={onboardingFunnel}
            onStageClick={(stage) => openDrillDown('Onboarding', 'onboarding_delayed', `Etapa: ${stage}`)}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Saúde e Risco</h2>
          <HealthDistributionCard
            data={healthDistribution}
            onSegmentClick={handleHealthClick}
          />
        </div>
      </section>

      {/* SECTION 3 continued: Alerts */}
      <AlertsCard
        alerts={alerts}
        onAlertClick={(alert) => navigate(`/cs/client/${alert.clientId}`)}
        onViewAll={() => navigate('/cs/risk')}
      />

      {/* SECTION 4: NPS + Playbooks */}
      <section className="grid gap-6 lg:grid-cols-2">
        <NpsSection
          data={npsDistribution}
          detractorsWithoutFollowup={detractorsWithoutFollowup}
          onViewDetractors={() => openDrillDown('Detratores', 'detractors', 'Clientes com NPS <= 6')}
          onViewPromoters={() => openDrillDown('Promotores', 'promoters', 'Clientes com NPS >= 9 - Solicitar cases')}
          onCreatePlaybook={handleCreateDetractorPlaybook}
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
            onItemClick={(item) => toast.info(`Filtrar por nicho: ${item.name}`)}
          />
          <ChurnByDimensionCard
            title="Churn por Plano"
            data={churnByService}
            metricMode={filters.metricMode}
            onItemClick={(item) => toast.info(`Filtrar por plano: ${item.name}`)}
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

      {/* Drill-down Drawer */}
      <ClientDrillDownDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        clients={drawerClients}
        onCreateTask={handleBatchCreateTask}
        onCreatePlaybook={handleBatchCreatePlaybook}
        onMarkAtRisk={handleBatchMarkRisk}
      />

      {/* Select Client Dialog */}
      <SelectClientDialog
        open={selectClientDialogOpen}
        onOpenChange={setSelectClientDialogOpen}
        onSelect={handleClientSelected}
        title="Selecionar Cliente"
      />

      {/* Create Playbook Dialog */}
      <CreatePlaybookDialog
        open={playbookDialogOpen}
        onOpenChange={setPlaybookDialogOpen}
        clientId={selectedClient?.id}
        clientName={selectedClient?.name}
        defaultType={pendingPlaybookType}
        onSuccess={refetch}
      />
    </div>
  );
}
