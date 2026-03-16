import { LayoutDashboard, ChevronsLeft, ChevronsRight } from 'lucide-react';
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

export function AppSidebar() {
  const { canAccess, loading: permissionsLoading } = useRouteAccess();
  const { loading: authLoading } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const { state: sidebarState, toggleSidebar } = useSidebar();

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
    <Sidebar collapsible="icon">
      {/* Header — logo + toggle button */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between">
          <img
            src={petronLogo}
            alt="Petron"
            className={cn(
              'shrink-0 transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              isExpanded ? 'h-10 w-auto opacity-100' : 'h-8 w-auto opacity-80',
            )}
          />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-full flex items-center justify-center',
                    'bg-card border border-border',
                    'text-sidebar-foreground/50',
                    'hover:bg-accent hover:border-border hover:text-sidebar-foreground',
                    'transition-all duration-150',
                  )}
                >
                  {isExpanded ? (
                    <ChevronsLeft className="h-3.5 w-3.5 transition-transform duration-300 ease-out" />
                  ) : (
                    <ChevronsRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {isExpanded ? 'Recolher menu' : 'Expandir menu'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-2 petron-sidebar-scroll">
        {!isLoading &&
          moduleConfig.map(({ module, label }) => {
            const routes = routesByModule[module];
            if (!routes || routes.length === 0) return null;

            const moduleActive = routes.some((r) => isRouteActive(r.path, currentPath));

            return (
              <SidebarGroup key={module} className="py-0.5">
                {/* Group label — always visible */}
                {label && (
                  <div
                    className={cn(
                      'px-3 py-2 select-none',
                      'text-[10px] font-semibold uppercase tracking-[0.12em]',
                      'transition-colors duration-200',
                      moduleActive
                        ? 'text-sidebar-primary'
                        : 'text-sidebar-foreground/35',
                    )}
                  >
                    {label}
                  </div>
                )}

                {/* Sub-items — only when expanded */}
                {isExpanded && (
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {routes.map((route, idx) => {
                        const Icon = getRouteIcon(route);
                        const isActive = isRouteActive(route.path, currentPath);

                        return (
                          <SidebarMenuItem
                            key={route.id}
                            className="animate-fade-in"
                            style={{
                              animationDelay: `${idx * 30}ms`,
                              animationFillMode: 'both',
                            }}
                          >
                            <SidebarMenuButton asChild data-active={isActive}>
                              <RouterNavLink
                                to={route.path}
                                end
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] relative',
                                  'transition-all duration-150',
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
          })}
      </SidebarContent>
    </Sidebar>
  );
}
