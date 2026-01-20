import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CrmProvider } from "@/contexts/CrmContext";
import { ContentProvider } from "@/contexts/ContentContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ContentProductionProvider } from "@/contexts/ContentProductionContext";
import { TrafficProvider } from "@/contexts/TrafficContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CrmList from "./pages/CrmList";
import CrmDetail from "./pages/CrmDetail";
import TaskList from "./pages/TaskList";
import ContentPage from "./pages/ContentPage";
import ContentDetail from "./pages/ContentDetail";
import ContentProduction from "./pages/ContentProduction";
import ContentTasks from "./pages/ContentTasks";
import BatchDetail from "./pages/BatchDetail";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";

// Traffic pages
import TrafficDashboard from "./pages/traffic/TrafficDashboard";
import TrafficTasks from "./pages/traffic/TrafficTasks";
import TrafficClientDetail from "./pages/traffic/TrafficClientDetail";

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
import TrafficCyclesPage from "./pages/settings/TrafficCyclesPage";
import TrafficCycleTasksPage from "./pages/settings/TrafficCycleTasksPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CrmProvider>
          <ContentProvider>
            <SettingsProvider>
              <ContentProductionProvider>
                <TrafficProvider>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/crm" element={<CrmList />} />
                      <Route path="/crm/:id" element={<CrmDetail />} />
                      <Route path="/tasks" element={<TaskList />} />
                      <Route path="/content" element={<ContentPage />} />
                      <Route path="/content/:id" element={<ContentDetail />} />
                      <Route path="/content/production" element={<ContentProduction />} />
                      <Route path="/content/production/:id" element={<BatchDetail />} />
                      <Route path="/content/production/:batchId/posts/:postId" element={<PostDetail />} />
                      <Route path="/content/tasks" element={<ContentTasks />} />
                      
                      {/* Traffic routes */}
                      <Route path="/traffic" element={<TrafficDashboard />} />
                      <Route path="/traffic/tasks" element={<TrafficTasks />} />
                      <Route path="/traffic/clients/:id" element={<TrafficClientDetail />} />
                      
                      {/* Settings with nested routes */}
                      <Route path="/settings" element={<SettingsLayout />}>
                        <Route index element={<SettingsHome />} />
                        <Route path="access/roles" element={<RolesPage />} />
                        <Route path="access/users" element={<UsersPage />} />
                        <Route path="access/permissions" element={<PermissionsPage />} />
                        <Route path="plans/services" element={<ServicesPage />} />
                        <Route path="plans/deliverables" element={<DeliverablesPage />} />
                        <Route path="general/pipeline" element={<PipelinePage />} />
                        <Route path="general/niches" element={<NichesPage />} />
                        <Route path="general/traffic-cycles" element={<TrafficCyclesPage />} />
                        <Route path="traffic/cycle-tasks" element={<TrafficCycleTasksPage />} />
                      </Route>
                      
                      {/* Redirects from old routes */}
                      <Route path="/settings/services" element={<Navigate to="/settings/plans/services" replace />} />
                      <Route path="/settings/niches" element={<Navigate to="/settings/general/niches" replace />} />
                      <Route path="/settings/roles" element={<Navigate to="/settings/access/roles" replace />} />
                      <Route path="/content/settings/stages" element={<Navigate to="/settings/general/pipeline" replace />} />
                      
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </TrafficProvider>
              </ContentProductionProvider>
            </SettingsProvider>
          </ContentProvider>
        </CrmProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
