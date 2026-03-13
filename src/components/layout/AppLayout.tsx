import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserSelector } from './UserSelector';
import { ThemeToggle } from './ThemeToggle';
import { routeRegistry } from '@/config/routeRegistry';
import { ChevronRight } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

function Breadcrumb() {
  const location = useLocation();
  const currentPath = location.pathname;

  // Find matching route
  const currentRoute = routeRegistry.find((r) => {
    // Exact match for static routes
    if (r.path === currentPath) return true;
    return false;
  });

  // Find parent
  const parentRoute = currentRoute?.parentId
    ? routeRegistry.find((r) => r.id === currentRoute.parentId)
    : null;

  // Fallback label
  const crumbs: { label: string }[] = [];
  if (parentRoute) crumbs.push({ label: parentRoute.label });
  if (currentRoute) crumbs.push({ label: currentRoute.label });

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
          <span
            className={
              i === crumbs.length - 1
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            }
          >
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header — 56px */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Breadcrumb />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserSelector />
            </div>
          </header>
          <div className="flex-1 p-6 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
