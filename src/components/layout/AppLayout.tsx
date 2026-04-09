import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserSelector } from './UserSelector';
import { ThemeToggle } from './ThemeToggle';
import { routeRegistry } from '@/config/routeRegistry';
import { ChevronRight } from 'lucide-react';
import { useSidebarPreference } from '@/hooks/useSidebarPreference';

interface AppLayoutProps {
  children: ReactNode;
}

function Breadcrumb() {
  const location = useLocation();
  const currentPath = location.pathname;

  const currentRoute = routeRegistry.find((r) => r.path === currentPath);
  const parentRoute = currentRoute?.parentId
    ? routeRegistry.find((r) => r.id === currentRoute.parentId)
    : null;

  const crumbs: { label: string }[] = [];
  if (parentRoute) crumbs.push({ label: parentRoute.label });
  if (currentRoute) crumbs.push({ label: currentRoute.label });

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
          <span className={i === crumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarExpanded, setSidebarExpanded } = useSidebarPreference();

  return (
    <SidebarProvider
      open={sidebarExpanded}
      onOpenChange={(open) => setSidebarExpanded(open)}
      style={{
        '--sidebar-width': '240px',
        '--sidebar-width-icon': '200px',
      } as React.CSSProperties}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2">Pular para o conteúdo</a>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-[60px] border-b border-border flex items-center justify-between px-5 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors md:hidden" />
              <div className="w-px h-5 bg-border md:hidden" />
              <Breadcrumb />
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <UserSelector />
            </div>
          </header>
          <div id="main-content" className="flex-1 p-4 md:p-6 animate-fade-in-up relative ambient-glow">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
