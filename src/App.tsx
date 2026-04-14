import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CrmProvider } from "@/contexts/CrmContext";
import { ContentProvider } from "@/contexts/ContentContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ContentProductionProvider } from "@/contexts/ContentProductionContext";
import { TrafficProvider } from "@/contexts/TrafficContext";
import { RhProvider } from "@/contexts/RhContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileGuard } from "@/components/common/ProfileGuard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RouteGuard } from "./components/auth/RouteGuard";

// Core pages - eager loaded (always needed)
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import WelcomePage from "./pages/WelcomePage";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/profile/ProfilePage";
import ProfileSetupPage from "./pages/profile/ProfileSetupPage";

// --- Lazy-loaded page components ---

// CRM module
const CrmList = lazy(() => import("./pages/CrmList"));
const CrmDetail = lazy(() => import("./pages/CrmDetail"));

// Tasks module
const TaskList = lazy(() => import("./pages/TaskList"));

// Content module
const ContentPage = lazy(() => import("./pages/ContentPage"));
const ContentDetail = lazy(() => import("./pages/ContentDetail"));
const ContentProduction = lazy(() => import("./pages/ContentProduction"));
const ContentBoardPage = lazy(() => import("./pages/ContentBoardPage"));
const ContentDashboard = lazy(() => import("./pages/ContentDashboard"));
const ContentTasks = lazy(() => import("./pages/ContentTasks"));
const BatchDetail = lazy(() => import("./pages/BatchDetail"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const ExtraRequestsList = lazy(() => import("./pages/content/ExtraRequestsList"));
const ExtraRequestNew = lazy(() => import("./pages/content/ExtraRequestNew"));
const ExtraRequestDetail = lazy(() => import("./pages/content/ExtraRequestDetail"));
const DrawerPostsPage = lazy(() => import("./pages/content/DrawerPostsPage"));

// Traffic module
const TrafficDashboard = lazy(() => import("./pages/traffic/TrafficDashboard"));
const TrafficTasks = lazy(() => import("./pages/traffic/TrafficTasks"));
const TrafficClientDetail = lazy(() => import("./pages/traffic/TrafficClientDetail"));
const TrafficOverview = lazy(() => import("./pages/traffic/TrafficOverview"));
const TrafficAccountDetail = lazy(() => import("./pages/traffic/TrafficAccountDetail"));
const TrafficBenchmarks = lazy(() => import("./pages/traffic/TrafficBenchmarks"));
const TrafficOptimizationsPage = lazy(() => import("./pages/traffic/TrafficOptimizationsPage"));
const TrafficOperationalDashboard = lazy(() => import("./pages/traffic/TrafficOperationalDashboard"));
const TrafficMonitoring = lazy(() => import("./pages/traffic/TrafficMonitoring"));
const TrafficReports = lazy(() => import("./pages/traffic/TrafficReports"));
const TrafficAlerts = lazy(() => import("./pages/traffic/TrafficAlerts"));
const TrafficContacts = lazy(() => import("./pages/traffic/TrafficContacts"));
const TrafficBalancesPage = lazy(() => import("./pages/traffic/TrafficBalancesPage"));
const TrafficPlaybookTasksPage = lazy(() => import("./pages/traffic/TrafficPlaybookTasksPage"));
const CreativeRequestsList = lazy(() => import("./pages/traffic/CreativeRequestsList"));
const CreativeRequestNew = lazy(() => import("./pages/traffic/CreativeRequestNew"));
const CreativeRequestDetail = lazy(() => import("./pages/traffic/CreativeRequestDetail"));

// CS module
const CsDashboard = lazy(() => import("./pages/cs/CsDashboard"));
const CsCommandCenter = lazy(() => import("./pages/cs/CsCommandCenter"));
const CsOnboarding = lazy(() => import("./pages/cs/CsOnboarding"));
const CsMeetings = lazy(() => import("./pages/cs/CsMeetings"));
const CsNps = lazy(() => import("./pages/cs/CsNps"));
const CsRisk = lazy(() => import("./pages/cs/CsRisk"));
const CsClientDetail = lazy(() => import("./pages/cs/CsClientDetail"));
const CsOnboardingMeeting = lazy(() => import("./pages/cs/CsOnboardingMeeting"));
const CsOnboardingDetail = lazy(() => import("./pages/cs/CsOnboardingDetail"));

// Settings module
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout").then(m => ({ default: m.SettingsLayout })));
const SettingsHome = lazy(() => import("./pages/settings/SettingsHome"));
const RolesPage = lazy(() => import("./pages/settings/RolesPage"));
const UsersPage = lazy(() => import("./pages/settings/UsersPage"));
const PermissionsPage = lazy(() => import("./pages/settings/PermissionsPage"));
const ServicesPage = lazy(() => import("./pages/settings/ServicesPage"));
const DeliverablesPage = lazy(() => import("./pages/settings/DeliverablesPage"));
const PipelinePage = lazy(() => import("./pages/settings/PipelinePage"));
const NichesPage = lazy(() => import("./pages/settings/NichesPage"));
const TrafficRoutinesPage = lazy(() => import("./pages/settings/TrafficRoutinesPage"));
const TrafficCyclesPage = lazy(() => import("./pages/settings/TrafficCyclesPage"));
const TrafficPlaybookPage = lazy(() => import("./pages/settings/TrafficPlaybookPage"));
const MetaIntegrationPage = lazy(() => import("./pages/settings/MetaIntegrationPage"));
const TrafficAnalyticsSettingsTab = lazy(() => import("./components/settings/TrafficAnalyticsSettingsTab").then(m => ({ default: m.TrafficAnalyticsSettingsTab })));
const OnboardingQuestionsPage = lazy(() => import("./pages/settings/OnboardingQuestionsPage"));
const OnboardingActivitiesConfigPage = lazy(() => import("./pages/settings/OnboardingActivitiesConfigPage"));
const PetronOnboardingActivitiesPage = lazy(() => import("./pages/settings/PetronOnboardingActivitiesPage"));
const PetronOnboardingSequencesPage = lazy(() => import("./pages/settings/PetronOnboardingSequencesPage"));
const SettingsComingSoon = lazy(() => import("./pages/settings/SettingsComingSoon"));
const SalesSettingsPage = lazy(() => import("./pages/sales/SalesSettingsPage"));
const LeadScoringPage = lazy(() => import("./pages/sales/LeadScoringPage"));
const SalesTemplatesPage = lazy(() => import("./pages/sales/SalesTemplatesPage"));
const SalesAutomationsPage = lazy(() => import("./pages/sales/SalesAutomationsPage"));

// Contracts module
const ContractsList = lazy(() => import("./pages/contracts/ContractsList"));
const ContractDetail = lazy(() => import("./pages/contracts/ContractDetail"));

// Commercial module
const SalesFunnelPage = lazy(() => import("./pages/commercial/SalesFunnelPage"));
const MarketingProduction = lazy(() => import("./pages/commercial/MarketingProduction"));
const MarketingBatchDetail = lazy(() => import("./pages/commercial/MarketingBatchDetail"));
const MarketingPostDetail = lazy(() => import("./pages/commercial/MarketingPostDetail"));
const CommercialPlanningPage = lazy(() => import("./pages/commercial/CommercialPlanningPage"));
const OutboundFunnelPage = lazy(() => import("./pages/commercial/OutboundFunnelPage"));
const MatemarketingPage = lazy(() => import("./pages/commercial/MatemarketingPage"));

// Petron OS module
const PetronOSHub = lazy(() => import("./pages/petron-os/PetronOSHub"));
const PetronOSQuickTool = lazy(() => import("./pages/petron-os/PetronOSQuickTool"));
const PetronOSBuilder = lazy(() => import("./pages/petron-os/PetronOSBuilder"));
const PetronOSSettings = lazy(() => import("./pages/petron-os/PetronOSSettings"));

// RH module (Recrutamento & Seleção)
const RhDashboard = lazy(() => import("./pages/rh/RhDashboard"));
const RhJobProfilesList = lazy(() => import("./pages/rh/RhJobProfilesList"));
const RhJobProfileDetail = lazy(() => import("./pages/rh/RhJobProfileDetail"));
const RhProfileKanban = lazy(() => import("./pages/rh/RhProfileKanban"));
const RhCandidatesList = lazy(() => import("./pages/rh/RhCandidatesList"));
const RhApplicationDetail = lazy(() => import("./pages/rh/RhApplicationDetail"));
const TrabalheConoscoPage = lazy(() => import("./pages/public/TrabalheConoscoPage"));
const ReportPublicView = lazy(() => import("./pages/public/ReportPublicView"));

// Sales CRM module
const SalesDashboard = lazy(() => import("./pages/sales/SalesDashboard"));
const SalesFunnelsPage = lazy(() => import("./pages/sales/SalesFunnelsPage"));
const SalesActivities = lazy(() => import("./pages/sales/SalesActivities"));
const SalesContacts = lazy(() => import("./pages/sales/SalesContacts"));
const SalesGoalsPage = lazy(() => import("./pages/sales/SalesGoalsPage"));
const DealDetailPage = lazy(() => import("./pages/sales/DealDetailPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function AuthOnlyLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}

function ProtectedAppShell() {
  return (
    <AuthGuard>
      <AppLayout>
        <ProfileGuard>
          <Outlet />
        </ProfileGuard>
      </AppLayout>
    </AuthGuard>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CrmProvider>
            <ContentProvider>
              <SettingsProvider>
                <ContentProductionProvider>
                  <TrafficProvider>
                    <RhProvider>
                    <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/trabalhe-conosco" element={<TrabalheConoscoPage />} />
                      <Route path="/r/:token" element={<ReportPublicView />} />

                      {/* Auth-only routes (no AppShell) */}
                      <Route element={<AuthOnlyLayout />}>
                        <Route path="/profile/setup" element={<ProfileSetupPage />} />
                      </Route>

                      {/* Protected routes (with AppShell) */}
                      <Route element={<ProtectedAppShell />}>
                        <Route path="/" element={<WelcomePage />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<ProfilePage />} />

                        <Route path="/crm" element={<CrmList />} />
                        <Route path="/crm/:id" element={<CrmDetail />} />

                        <Route path="/tasks" element={<TaskList />} />

                        <Route path="/content" element={<ContentPage />} />
                        <Route path="/content/:id" element={<ContentDetail />} />
                        <Route path="/content/production" element={<ContentProduction />} />
                        <Route path="/content/production/board" element={<ContentBoardPage />} />
                        <Route path="/content/production/:id" element={<BatchDetail />} />
                        <Route path="/content/production/:batchId/posts/:postId" element={<PostDetail />} />
                        <Route path="/content/dashboard" element={<ContentDashboard />} />
                        <Route path="/content/tasks" element={<ContentTasks />} />
                        <Route path="/content/extra-requests" element={<ExtraRequestsList />} />
                        <Route path="/content/extra-requests/new" element={<ExtraRequestNew />} />
                        <Route path="/content/extra-requests/:id" element={<ExtraRequestDetail />} />
                        <Route path="/content/drawer-posts" element={<DrawerPostsPage />} />

                        {/* Traffic routes */}
                        <Route path="/traffic" element={<TrafficDashboard />} />
                        <Route path="/traffic/operational" element={<TrafficOperationalDashboard />} />
                        <Route path="/traffic/tasks" element={<TrafficTasks />} />
                        <Route path="/traffic/playbook-tasks" element={<TrafficPlaybookTasksPage />} />
                        <Route path="/traffic/clients/:id" element={<TrafficClientDetail />} />
                        <Route path="/traffic/balances" element={<TrafficBalancesPage />} />
                        <Route path="/traffic/overview" element={<TrafficOverview />} />
                        <Route path="/traffic/monitoring" element={<TrafficMonitoring />} />
                        <Route path="/traffic/reports" element={<TrafficReports />} />
                        <Route path="/traffic/alerts" element={<TrafficAlerts />} />
                        <Route path="/traffic/multi-contas" element={<TrafficAnalyticsSettingsTab />} />
                        <Route path="/traffic/accounts/:id" element={<TrafficAccountDetail />} />
                        <Route path="/traffic/benchmarks" element={<TrafficBenchmarks />} />
                        <Route path="/traffic/optimizations" element={<TrafficOptimizationsPage />} />
                        <Route path="/traffic/contacts" element={<TrafficContacts />} />

                        {/* Traffic Creative Requests */}
                        <Route path="/traffic/creative-requests" element={<CreativeRequestsList />} />
                        <Route path="/traffic/creative-requests/new" element={<CreativeRequestNew />} />
                        <Route path="/traffic/creative-requests/:id" element={<CreativeRequestDetail />} />

                        {/* CS routes */}
                        <Route path="/cs" element={<CsCommandCenter />} />
                        <Route path="/cs/dashboard" element={<CsDashboard />} />
                        <Route path="/cs/onboarding" element={<CsOnboarding />} />
                        <Route path="/cs/onboarding/:onboardingId" element={<CsOnboardingDetail />} />
                        <Route path="/cs/onboarding/meeting/:meetingId" element={<CsOnboardingMeeting />} />
                        <Route path="/cs/meetings" element={<CsMeetings />} />
                        <Route path="/cs/nps" element={<CsNps />} />
                        <Route path="/cs/risk" element={<CsRisk />} />
                        <Route path="/cs/client/:clientId" element={<CsClientDetail />} />

                        {/* Contracts routes */}
                        <Route path="/contracts" element={<ContractsList />} />
                        <Route path="/contracts/:id" element={<ContractDetail />} />

                        {/* Commercial routes */}
                        <Route path="/commercial/funnel" element={<SalesFunnelPage />} />
                        <Route path="/commercial/planning" element={<CommercialPlanningPage />} />
                        <Route path="/commercial/outbound" element={<OutboundFunnelPage />} />
                        <Route path="/commercial/matemarketing" element={<MatemarketingPage />} />
                        <Route path="/commercial/marketing" element={<MarketingProduction />} />
                        <Route path="/commercial/marketing/:id" element={<MarketingBatchDetail />} />
                        <Route path="/commercial/marketing/:batchId/posts/:postId" element={<MarketingPostDetail />} />

                        {/* Petron OS routes */}
                        <Route path="/petron-os" element={<PetronOSHub />} />
                        <Route path="/petron-os/tool/:slug" element={<PetronOSQuickTool />} />
                        <Route path="/petron-os/builder/:slug" element={<PetronOSBuilder />} />
                        <Route path="/petron-os/builder/:slug/:id" element={<PetronOSBuilder />} />
                        <Route path="/petron-os/settings" element={<PetronOSSettings />} />

                        {/* RH routes */}
                        <Route path="/rh" element={<RhDashboard />} />
                        <Route path="/rh/vagas" element={<RhJobProfilesList />} />
                        <Route path="/rh/vagas/:id" element={<RhJobProfileDetail />} />
                        <Route path="/rh/vagas/:id/kanban" element={<RhProfileKanban />} />
                        <Route path="/rh/candidatos" element={<RhCandidatesList />} />
                        <Route path="/rh/candidatos/:id" element={<RhApplicationDetail />} />

                        {/* Sales CRM routes */}
                        <Route path="/sales" element={<SalesDashboard />} />
                        <Route path="/sales/funnels" element={<SalesFunnelsPage />} />
                        <Route path="/sales/activities" element={<SalesActivities />} />
                        <Route path="/sales/contacts" element={<SalesContacts />} />
                        <Route path="/sales/goals" element={<SalesGoalsPage />} />
                        <Route path="/sales/deals/:id" element={<DealDetailPage />} />

                        {/* Settings - Admin only with internal navigation */}
                        <Route
                          path="/settings"
                          element={
                            <RouteGuard routeId="settings.home" action="view" fallback="forbidden">
                              <SettingsLayout />
                            </RouteGuard>
                          }
                        >
                          <Route index element={<SettingsHome />} />
                          <Route path="access/roles" element={<RolesPage />} />
                          <Route path="access/users" element={<UsersPage />} />
                          <Route path="access/permissions" element={<PermissionsPage />} />
                          <Route path="plans/services" element={<ServicesPage />} />
                          <Route path="plans/deliverables" element={<DeliverablesPage />} />
                          <Route path="general/pipeline" element={<PipelinePage />} />
                          <Route path="general/niches" element={<NichesPage />} />
                          <Route path="traffic/routines" element={<TrafficRoutinesPage />} />
                          <Route path="traffic/cycles" element={<TrafficCyclesPage />} />
                          <Route path="traffic/playbook" element={<TrafficPlaybookPage />} />
                          <Route path="integrations/meta" element={<MetaIntegrationPage />} />
                          <Route path="traffic/analytics" element={<TrafficAnalyticsSettingsTab />} />
                          <Route path="sales/funnels" element={<SalesSettingsPage />} />
                          <Route path="sales/scoring" element={<LeadScoringPage />} />
                          <Route path="sales/templates" element={<SalesTemplatesPage />} />
                          <Route path="sales/automations" element={<SalesAutomationsPage />} />
                          <Route path="cs/onboarding/activities" element={<OnboardingActivitiesConfigPage />} />
                          <Route path="cs/onboarding/sequences" element={<PetronOnboardingSequencesPage />} />
                          <Route path="cs/onboarding/questions" element={<OnboardingQuestionsPage />} />

                          {/* Empresa */}
                          <Route path="empresa/identidade" element={<SettingsComingSoon title="Identidade Visual" description="Configure a marca da Petron exibida em relatórios e materiais para clientes." features={["Logo principal e variações","Paleta de cores oficial","Tipografia padrão","Aplicação em PDFs e relatórios"]} />} />
                          <Route path="empresa/dados" element={<SettingsComingSoon title="Dados da Empresa" description="Razão social, CNPJ, endereço e dados de contato usados em contratos." features={["Razão social e nome fantasia","CNPJ, IE, IM","Endereço completo","Telefones e emails oficiais"]} />} />
                          <Route path="empresa/geral" element={<SettingsComingSoon title="Configurações Gerais" description="Preferências gerais da agência: fuso horário, idioma, formato de data e moeda." />} />

                          {/* CRM */}
                          <Route path="crm/loss-reasons" element={<SettingsComingSoon title="Motivos de Perda" description="Cadastre e categorize os motivos de perda de oportunidades no CRM." features={["Cadastro de motivos","Agrupamento por categoria","Estatísticas de uso","Sugestões via IA"]} tableName="crm_loss_reasons" />} />
                          <Route path="crm/cadences" element={<SettingsComingSoon title="Cadências de CRM" description="Configure sequências automáticas de follow-up para leads no funil." features={["Templates de cadência","Disparos por etapa","WhatsApp + Email + Tarefa","Métricas de conversão"]} tableName="crm_cadences" />} />

                          {/* Tráfego Pago */}
                          <Route path="trafego/metas" element={<SettingsComingSoon title="Metas por Nicho" description="Defina alvos de CPM, CTR, CPL e custo por conversa por nicho. Usados nos semáforos e benchmarks." tableName="traffic_metric_targets" />} />
                          <Route path="trafego/catalogo" element={<SettingsComingSoon title="Catálogo de Métricas" description="Métricas suportadas no sistema de tráfego, com fórmula e disponibilidade por plataforma." tableName="traffic_metric_catalog" />} />

                          {/* Conteúdo */}
                          <Route path="conteudo/etapas" element={<SettingsComingSoon title="Etapas e Responsabilidades" description="Configure as etapas do fluxo de produção de conteúdo e quem é responsável em cada uma." tableName="content_stage_responsibilities" />} />
                          <Route path="conteudo/templates" element={<SettingsComingSoon title="Templates de Briefing" description="Templates pré-configurados para iniciar briefings de posts e materiais." />} />

                          {/* CS extras */}
                          <Route path="cs/saude" element={<SettingsComingSoon title="Saúde do Cliente" description="Pesos dos componentes do health score (engajamento, NPS, atraso de pagamento etc)." tableName="cs_health_weights" />} />
                          <Route path="cs/motivos-churn" element={<SettingsComingSoon title="Motivos de Churn" description="Cadastre e categorize os motivos de cancelamento. Usados em relatórios de retenção." tableName="cs_cancellation_reasons" />} />
                          <Route path="cs/nps" element={<SettingsComingSoon title="Configuração de NPS" description="Defina periodicidade, copy do convite, tags de classificação e canais de envio." tableName="cs_nps_surveys" />} />
                          <Route path="cs/playbook" element={<SettingsComingSoon title="Playbook CS" description="Tarefas recorrentes do Customer Success com gatilhos automáticos." tableName="cs_playbooks" />} />

                          {/* RH */}
                          <Route path="rh/cargos" element={<SettingsComingSoon title="Job Profiles" description="Perfis de cargo usados como template para abertura de vagas." tableName="hr_job_profiles" />} />
                          <Route path="rh/pipeline" element={<SettingsComingSoon title="Pipeline de Candidatos" description="Etapas customizadas do funil de recrutamento." tableName="hr_pipeline_stages" />} />
                          <Route path="rh/formularios" element={<SettingsComingSoon title="Formulários" description="Templates de formulários enviados aos candidatos." tableName="hr_forms" />} />

                          {/* Integrações extras */}
                          <Route path="integracoes/contratos" element={<SettingsComingSoon title="Contratos (Autentique / ClickSign)" description="Conecte os provedores de assinatura digital usados nos contratos da Petron." features={["Conta Autentique","Conta ClickSign","Templates padrão","Webhooks de status"]} />} />
                          <Route path="integracoes/ia" element={<SettingsComingSoon title="Anthropic / IA" description="Configure chave de API, modelo padrão e limites de uso da Anthropic (Claude)." features={["API Key","Modelo padrão","Limite de tokens/mês","Logs de uso"]} />} />
                          <Route path="integracoes/matflow" element={<SettingsComingSoon title="MatFlow" description="Conexão com o SaaS MatFlow para sincronizar leads e fechamentos com o CRM da Petron." features={["Webhook bidirecional","Mapeamento de campos","Sincronização de status","Atribuição de receita"]} />} />

                          {/* Sistema */}
                          <Route path="sistema/auditoria" element={<SettingsComingSoon title="Auditoria" description="Trilha de quem fez o quê e quando no sistema." />} />
                          <Route path="sistema/backup" element={<SettingsComingSoon title="Backup" description="Política de backup automático e exportação manual de dados." />} />
                          <Route path="sistema/logs" element={<SettingsComingSoon title="Logs" description="Logs técnicos do sistema para debug e suporte." />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                    </Suspense>
                    </ErrorBoundary>
                    </RhProvider>
                  </TrafficProvider>
                </ContentProductionProvider>
              </SettingsProvider>
            </ContentProvider>
          </CrmProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
