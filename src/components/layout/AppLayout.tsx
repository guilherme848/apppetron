import { ReactNode, createContext, useContext } from 'react';
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

// Context to share group expand/collapse with AppSidebar
interface SidebarGroupsContextType {
  toggleGroup: (module: string) => void;
  isGroupExpanded: (module: string) => boolean;
  initActiveGroup: (module: string) => void;
}

export const SidebarGroupsContext = createContext<SidebarGroupsContextType>({
  toggleGroup: () => {},
  isGroupExpanded: () => false,
  initActiveGroup: () => {},
});

export const useSidebarGroups = () => useContext(SidebarGroupsContext);

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
    <nav className="flex items-center gap-1.5 text-sm">
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
  const { sidebarExpanded, setSidebarExpanded, toggleGroup, isGroupExpanded, initActiveGroup } = useSidebarPreference();

  return (
    <SidebarGroupsContext.Provider value={{ toggleGroup, isGroupExpanded, initActiveGroup }}>
      <SidebarProvider
        open={sidebarExpanded}
        onOpenChange={(open) => setSidebarExpanded(open)}
        style={{
          '--sidebar-width': '240px',
          '--sidebar-width-icon': '200px',
        } as React.CSSProperties}
      >
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0 relative">
            <header className="h-[60px] border-b border-border flex items-center justify-between px-5 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
                <div className="w-px h-5 bg-border" />
                <Breadcrumb />
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <UserSelector />
              </div>
            </header>
            <div className="flex-1 p-6 animate-fade-in-up relative ambient-glow">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SidebarGroupsContext.Provider>
  );
}
