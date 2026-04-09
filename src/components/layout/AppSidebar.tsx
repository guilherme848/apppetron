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
  { module: MODULES.PETRON_OS, label: 'Petron OS' },
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
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={petronLogo}
              alt="Petron"
              className={cn(
                'shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                isExpanded ? 'h-9 w-auto opacity-100' : 'h-7 w-auto opacity-80',
              )}
            />
            {isExpanded && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gradient-primary leading-tight">Petron</span>
                <span className="text-[10px] text-muted-foreground/60 font-medium">ERP Agência</span>
              </div>
            )}
          </div>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
                  onClick={toggleSidebar}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-lg flex items-center justify-center',
                    'text-muted-foreground/50',
                    'hover:bg-muted hover:text-foreground',
                    'transition-all duration-200',
                  )}
                >
                  {isExpanded ? (
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsRight className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {isExpanded ? 'Recolher menu' : 'Expandir menu'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
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
                      'px-4 pt-4 pb-1 select-none',
                      'text-[10px] font-bold uppercase tracking-[0.15em]',
                      'transition-colors duration-200',
                      moduleActive
                        ? 'text-primary'
                        : 'text-muted-foreground/40',
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
                                {...(isActive ? { 'aria-current': 'page' as const } : {})}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-1.5 mx-2 rounded-lg text-[13px] relative',
                                  'transition-all duration-200',
                                  isActive
                                    ? 'text-primary font-semibold bg-primary/[0.08] shadow-[0_0_0_1px_hsl(25_95%_53%/0.15)] sidebar-active-indicator'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                                )}
                              >
                                <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
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
