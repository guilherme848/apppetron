import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CrmProvider } from "@/contexts/CrmContext";
import { ContentProvider } from "@/contexts/ContentContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ContentProductionProvider } from "@/contexts/ContentProductionContext";
import { TrafficProvider } from "@/contexts/TrafficContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileGuard } from "@/components/common/ProfileGuard";
import { AuthGuard } from "@/components/auth/AuthGuard";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import WelcomePage from "./pages/WelcomePage";
import CrmList from "./pages/CrmList";
import CrmDetail from "./pages/CrmDetail";
import TaskList from "./pages/TaskList";
import ContentPage from "./pages/ContentPage";
import ContentDetail from "./pages/ContentDetail";
import ContentProduction from "./pages/ContentProduction";
import ContentDashboard from "./pages/ContentDashboard";
import ContentTasks from "./pages/ContentTasks";
import BatchDetail from "./pages/BatchDetail";
import PostDetail from "./pages/PostDetail";
import ExtraRequestsList from "./pages/content/ExtraRequestsList";
import ExtraRequestNew from "./pages/content/ExtraRequestNew";
import ExtraRequestDetail from "./pages/content/ExtraRequestDetail";
import NotFound from "./pages/NotFound";


// Profile pages
import ProfilePage from "./pages/profile/ProfilePage";
import ProfileSetupPage from "./pages/profile/ProfileSetupPage";

// Traffic pages
import TrafficDashboard from "./pages/traffic/TrafficDashboard";
import TrafficTasks from "./pages/traffic/TrafficTasks";
import TrafficClientDetail from "./pages/traffic/TrafficClientDetail";

// CS pages
import CsDashboard from "./pages/cs/CsDashboard";
import CsOnboarding from "./pages/cs/CsOnboarding";
import CsMeetings from "./pages/cs/CsMeetings";
import CsNps from "./pages/cs/CsNps";
import CsRisk from "./pages/cs/CsRisk";
import CsClientDetail from "./pages/cs/CsClientDetail";

// Settings pages
import { SettingsLayout } from "./pages/settings/SettingsLayout";
import SettingsHome from "./pages/settings/SettingsHome";
import RolesPage from "./pages/settings/RolesPage";
import UsersPage from "./pages/settings/UsersPage";
import PermissionsPage from "./pages/settings/PermissionsPage";
import ServicesPage from "./pages/settings/ServicesPage";
import DeliverablesPage from "./pages/settings/DeliverablesPage";
import PipelinePage from "./pages/settings/PipelinePage";
import NichesPage from "./pages/settings/NichesPage";
import TrafficRoutinesPage from "./pages/settings/TrafficRoutinesPage";
import TrafficCyclesPage from "./pages/settings/TrafficCyclesPage";
import MetaIntegrationPage from "./pages/settings/MetaIntegrationPage";
import { AdminGuard } from "./components/auth/AdminGuard";
import TrafficBalancesPage from "./pages/traffic/TrafficBalancesPage";

// Traffic Creative Requests
import CreativeRequestsList from "./pages/traffic/CreativeRequestsList";
import CreativeRequestNew from "./pages/traffic/CreativeRequestNew";
import CreativeRequestDetail from "./pages/traffic/CreativeRequestDetail";

const queryClient = new QueryClient();

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
                    <Routes>
                      {/* Public routes */}
                      <Route path="/login" element={<LoginPage />} />
                      
                      {/* Profile setup - requires auth but not profile guard */}
                      <Route path="/profile/setup" element={
                        <AuthGuard>
                          <ProfileSetupPage />
                        </AuthGuard>
                      } />
                      
                      {/* Protected routes */}
                      <Route path="/*" element={
                        <AuthGuard>
                          <AppLayout>
                            <ProfileGuard>
                              <Routes>
                                <Route path="/" element={<WelcomePage />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/crm" element={<CrmList />} />
                                <Route path="/crm/:id" element={<CrmDetail />} />
                                <Route path="/tasks" element={<TaskList />} />
                                <Route path="/content" element={<ContentPage />} />
                                <Route path="/content/:id" element={<ContentDetail />} />
                                <Route path="/content/production" element={<ContentProduction />} />
                                <Route path="/content/production/:id" element={<BatchDetail />} />
                                <Route path="/content/production/:batchId/posts/:postId" element={<PostDetail />} />
                                <Route path="/content/dashboard" element={<ContentDashboard />} />
                                <Route path="/content/tasks" element={<ContentTasks />} />
                                <Route path="/content/extra-requests" element={<ExtraRequestsList />} />
                                <Route path="/content/extra-requests/new" element={<ExtraRequestNew />} />
                                <Route path="/content/extra-requests/:id" element={<ExtraRequestDetail />} />
                                
                                {/* Traffic routes */}
                                <Route path="/traffic" element={<TrafficDashboard />} />
                                <Route path="/traffic/tasks" element={<TrafficTasks />} />
                                <Route path="/traffic/clients/:id" element={<TrafficClientDetail />} />
                                <Route path="/traffic/balances" element={<TrafficBalancesPage />} />
                                
                                {/* CS routes */}
                                <Route path="/cs" element={<CsDashboard />} />
                                <Route path="/cs/onboarding" element={<CsOnboarding />} />
                                <Route path="/cs/meetings" element={<CsMeetings />} />
                                <Route path="/cs/nps" element={<CsNps />} />
                                <Route path="/cs/risk" element={<CsRisk />} />
                                <Route path="/cs/client/:clientId" element={<CsClientDetail />} />
                                
                                {/* Settings - Admin only with internal navigation */}
                                <Route path="/settings" element={
                                  <AdminGuard>
                                    <SettingsLayout />
                                  </AdminGuard>
                                }>
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
                                  <Route path="integrations/meta" element={<MetaIntegrationPage />} />
                                </Route>
                                
                                {/* Traffic Creative Requests */}
                                <Route path="/traffic/creative-requests" element={<CreativeRequestsList />} />
                                <Route path="/traffic/creative-requests/new" element={<CreativeRequestNew />} />
                                <Route path="/traffic/creative-requests/:id" element={<CreativeRequestDetail />} />
                                
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </ProfileGuard>
                          </AppLayout>
                        </AuthGuard>
                      } />
                    </Routes>
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
