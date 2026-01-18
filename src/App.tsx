import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import BatchDetail from "./pages/BatchDetail";
import PostDetail from "./pages/PostDetail";
import SettingsServices from "./pages/SettingsServices";
import SettingsNiches from "./pages/SettingsNiches";
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
                    <Route path="/settings/services" element={<SettingsServices />} />
                    <Route path="/settings/niches" element={<SettingsNiches />} />
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
