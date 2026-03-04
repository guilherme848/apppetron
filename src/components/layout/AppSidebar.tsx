import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, CheckSquare, Layers, Settings, ListTodo, TrendingUp, BarChart3, HeartHandshake, FileText, Home, GitMerge } from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuRoutes, RouteDefinition, MODULES } from '@/config/routeRegistry';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import petronLogo from '@/assets/petron-logo.png';

// Icon mapping for routes (kept for potential future use)
const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  LayoutDashboard,
  Users,
  CheckSquare,
  Layers,
  ListTodo,
  TrendingUp,
  BarChart3,
  HeartHandshake,
  FileText,
  Settings,
};

// Get icon for a route
function getRouteIcon(route: RouteDefinition): React.ElementType {
  if (route.icon) return route.icon;
  return LayoutDashboard; // Default
}

// Module display config
const moduleConfig: { module: string; label: string | null }[] = [
  { module: MODULES.MAIN, label: null }, // No label for main items
  { module: MODULES.CRM, label: 'CRM' },
  { module: MODULES.SALES, label: 'Vendas' },
  { module: MODULES.COMMERCIAL, label: 'Comercial & Marketing' },
  { module: MODULES.CONTENT, label: 'Criação' },
  { module: MODULES.TRAFFIC, label: 'Tráfego Pago' },
  { module: MODULES.CS, label: 'Customer Success' },
  { module: MODULES.SETTINGS, label: 'Sistema' },
];

/**
 * Check if a route should be marked as active.
 * Uses EXACT matching to prevent multiple items being highlighted.
 * This fixes the bug where clicking one item activates multiple items.
 */
function isRouteActive(routePath: string, currentPath: string): boolean {
  // Exact match only - no startsWith to prevent parent routes matching children
  return currentPath === routePath;
}

// Skeleton menu for loading state
function SidebarSkeleton() {
  return (
    <>
      {/* Main group skeleton */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {[1, 2].map((i) => (
              <SidebarMenuItem key={i}>
                <div className="flex items-center gap-3 px-3 py-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      
      {/* Other groups skeleton */}
      {[1, 2, 3].map((group) => (
        <SidebarGroup key={group}>
          <Skeleton className="h-3 w-16 mb-2 ml-2" />
          <SidebarGroupContent>
            <SidebarMenu>
              {[1, 2].map((i) => (
                <SidebarMenuItem key={i}>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
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

  // Fetch funnels for dynamic menu
  const [funnels, setFunnels] = useState<{ id: string; name: string; color: string }[]>([]);
  useEffect(() => {
    supabase.from('crm_funnels').select('id, name, color').order('created_at').then(({ data }) => {
      setFunnels((data as any[]) || []);
    });
  }, []);

  // Get menu routes from registry
  const menuRoutes = getMenuRoutes();

  // Show skeleton while permissions are loading
  const isLoading = permissionsLoading || authLoading;

  // Filter routes by permission and group by module
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
        <div className="flex items-center gap-3">
          <img 
            src={petronLogo} 
            alt="Petron Logo" 
            className="h-[7.5rem] w-auto"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          moduleConfig.map(({ module, label }) => {
            const routes = routesByModule[module];
            if (!routes || routes.length === 0) return null;

            return (
              <SidebarGroup key={module}>
                {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
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
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                                isActive 
                                  ? "bg-accent text-accent-foreground font-medium" 
                                  : "hover:bg-accent/50"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{route.label}</span>
                            </RouterNavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    {/* Dynamic funnel links for Sales module */}
                    {module === MODULES.SALES && funnels.length > 0 && funnels.map(funnel => {
                      const funnelPath = `/sales/funnel/${funnel.id}`;
                      const isFunnelActive = currentPath === funnelPath;
                      return (
                        <SidebarMenuItem key={funnel.id}>
                          <SidebarMenuButton asChild data-active={isFunnelActive}>
                            <RouterNavLink
                              to={funnelPath}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                                isFunnelActive
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "hover:bg-accent/50"
                              )}
                            >
                              <div className="h-4 w-4 flex items-center justify-center">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: funnel.color }} />
                              </div>
                              <span>{funnel.name}</span>
                            </RouterNavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })
        )}
      </SidebarContent>
    </Sidebar>
  );
}
