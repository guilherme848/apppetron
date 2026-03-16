import { LayoutDashboard, ChevronLeft } from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuRoutes, RouteDefinition, MODULES } from '@/config/routeRegistry';
import { cn } from '@/lib/utils';
import petronLogo from '@/assets/petron-logo.png';

function getRouteIcon(route: RouteDefinition): React.ElementType {
  return route.icon || LayoutDashboard;
}

const moduleConfig: { module: string; label: string | null }[] = [
  { module: MODULES.MAIN, label: null },
  { module: MODULES.CRM, label: 'CRM' },
  { module: MODULES.SALES, label: 'Vendas' },
  { module: MODULES.COMMERCIAL, label: 'Comercial & Marketing' },
  { module: MODULES.CONTENT, label: 'Criação' },
  { module: MODULES.TRAFFIC, label: 'Tráfego Pago' },
  { module: MODULES.CS, label: 'Customer Success' },
  { module: MODULES.SETTINGS, label: 'Sistema' },
];

function isRouteActive(routePath: string, currentPath: string): boolean {
  return currentPath === routePath;
}

function SidebarSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((group) => (
        <SidebarGroup key={group}>
          <Skeleton className="h-3 w-20 mb-3 ml-3 rounded" />
          <SidebarGroupContent>
            <SidebarMenu>
              {[1, 2].map((i) => (
                <SidebarMenuItem key={i}>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function AppSidebar() {
  const { canAccess, loading: permissionsLoading } = useRouteAccess();
  const { loading: authLoading } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const { state: sidebarState } = useSidebar();

  const isExpanded = sidebarState === 'expanded';

  const menuRoutes = getMenuRoutes();
  const isLoading = permissionsLoading || authLoading;

  const routesByModule: Record<string, RouteDefinition[]> = {};
  if (!isLoading) {
    for (const route of menuRoutes) {
      if (!canAccess(route.id, 'view')) continue;
      if (!routesByModule[route.module]) {
        routesByModule[route.module] = [];
      }
      routesByModule[route.module].push(route);
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <img
            src={petronLogo}
            alt="Petron"
            className="h-16 w-auto"
          />
          <SidebarToggleButton isExpanded={isExpanded} />
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </SidebarHeader>

      <SidebarContent className="py-2">
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          moduleConfig.map(({ module, label }) => {
            const routes = routesByModule[module];
            if (!routes || routes.length === 0) return null;

            const moduleActive = routes.some((r) => isRouteActive(r.path, currentPath));

            return (
              <SidebarGroup key={module} className="py-0.5">
                {label && (
                  <div
                    className={cn(
                      'px-3 py-2 cursor-default select-none',
                      'text-[10px] font-semibold uppercase tracking-[0.12em]',
                      moduleActive
                        ? 'text-sidebar-primary'
                        : 'text-sidebar-foreground/35',
                      'transition-colors duration-200',
                    )}
                  >
                    {label}
                  </div>
                )}

                {/* In collapsed state, only group labels are shown — no items */}
                {isExpanded && (
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {routes.map((route) => {
                        const Icon = getRouteIcon(route);
                        const isActive = isRouteActive(route.path, currentPath);

                        return (
                          <SidebarMenuItem key={route.id}>
                            <SidebarMenuButton asChild data-active={isActive}>
                              <RouterNavLink
                                to={route.path}
                                end
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-[13px] relative',
                                  isActive
                                    ? 'text-sidebar-primary font-medium bg-primary/[0.08] sidebar-active-indicator'
                                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{route.label}</span>
                              </RouterNavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            );
          })
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function SidebarToggleButton({ isExpanded }: { isExpanded: boolean }) {
  const { toggleSidebar } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleSidebar}
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center',
              'bg-card border border-border',
              'text-sidebar-foreground/50 hover:text-sidebar-foreground',
              'transition-colors duration-150',
            )}
          >
            <ChevronLeft
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-[250ms]',
                !isExpanded && 'rotate-180',
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {isExpanded ? 'Recolher menu' : 'Expandir menu'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
