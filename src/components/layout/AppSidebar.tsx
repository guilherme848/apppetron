import { useState, useCallback } from 'react';
import { LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
                    <Skeleton className="h-3.5 w-24 rounded" />
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

  // Expanded groups state (hover or pinned)
  const [expandedAll, setExpandedAll] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

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

  const isModuleActive = useCallback(
    (module: string) => {
      const routes = routesByModule[module];
      if (!routes) return false;
      return routes.some((r) => isRouteActive(r.path, currentPath));
    },
    [routesByModule, currentPath],
  );

  const isGroupOpen = useCallback(
    (module: string) => {
      if (expandedAll) return true;
      if (hoveredModule === module) return true;
      if (isModuleActive(module)) return true;
      // Main module always open
      if (module === MODULES.MAIN) return true;
      return false;
    },
    [expandedAll, hoveredModule, isModuleActive],
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <img
            src={petronLogo}
            alt="Petron"
            className="h-20 w-auto"
          />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => setExpandedAll((prev) => !prev)}
                >
                  <ChevronLeft
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      !expandedAll && 'rotate-180',
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {expandedAll ? 'Recolher menu' : 'Expandir menu'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          moduleConfig.map(({ module, label }) => {
            const routes = routesByModule[module];
            if (!routes || routes.length === 0) return null;

            const open = isGroupOpen(module);
            const moduleActive = isModuleActive(module);

            return (
              <SidebarGroup
                key={module}
                className="py-0.5"
                onMouseEnter={() => !expandedAll && setHoveredModule(module)}
                onMouseLeave={() => !expandedAll && setHoveredModule(null)}
              >
                {/* Group label — always visible */}
                {label && (
                  <div
                    className={cn(
                      'px-3 py-2 cursor-default select-none',
                      'text-[11px] font-semibold uppercase tracking-[0.08em]',
                      moduleActive
                        ? 'text-sidebar-primary'
                        : 'text-sidebar-foreground/50',
                      'transition-colors duration-200',
                    )}
                  >
                    {label}
                  </div>
                )}

                {/* Sub-items — collapsible */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200 ease-out',
                    open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
                  )}
                >
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
                                  'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 text-sm relative',
                                  isActive
                                    ? 'text-sidebar-primary font-medium bg-sidebar-accent sidebar-active-indicator'
                                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
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
                </div>
              </SidebarGroup>
            );
          })
        )}
      </SidebarContent>
    </Sidebar>
  );
}
