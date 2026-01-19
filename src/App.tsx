import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CrmProvider } from "@/contexts/CrmContext";
import { ContentProvider } from "@/contexts/ContentContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ContentProductionProvider } from "@/contexts/ContentProductionContext";
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
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

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
                    <Route path="/settings" element={<Settings />} />
                    {/* Redirects from old routes */}
                    <Route path="/settings/services" element={<Navigate to="/settings?tab=services" replace />} />
                    <Route path="/settings/niches" element={<Navigate to="/settings?tab=niches" replace />} />
                    <Route path="/settings/roles" element={<Navigate to="/settings?tab=roles" replace />} />
                    <Route path="/content/settings/stages" element={<Navigate to="/settings?tab=pipeline" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </ContentProductionProvider>
            </SettingsProvider>
          </ContentProvider>
        </CrmProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
