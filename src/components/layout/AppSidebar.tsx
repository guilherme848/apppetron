import { LayoutDashboard, Users, CheckSquare, Layers, Settings, ListTodo, TrendingUp, BarChart3, HeartHandshake, FileText, Home } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
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
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { getMenuRoutes, RouteDefinition, MODULES } from '@/config/routeRegistry';
import petronLogo from '@/assets/petron-logo.png';

// Icon mapping for routes
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

export function AppSidebar() {
  const { canAccess } = useRouteAccess();

  // Get menu routes from registry
  const menuRoutes = getMenuRoutes();

  // Filter routes by permission and group by module
  const routesByModule: Record<string, RouteDefinition[]> = {};
  
  for (const route of menuRoutes) {
    // Check if user can view this route
    if (!canAccess(route.id, 'view')) continue;

    if (!routesByModule[route.module]) {
      routesByModule[route.module] = [];
    }
    routesByModule[route.module].push(route);
  }

  // Module display config
  const moduleConfig: { module: string; label: string | null }[] = [
    { module: MODULES.MAIN, label: null }, // No label for main items
    { module: MODULES.CRM, label: 'CRM' },
    { module: MODULES.CONTENT, label: 'Criação' },
    { module: MODULES.TRAFFIC, label: 'Tráfego Pago' },
    { module: MODULES.CS, label: 'Customer Success' },
    { module: MODULES.SETTINGS, label: 'Sistema' },
  ];

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
        {moduleConfig.map(({ module, label }) => {
          const routes = routesByModule[module];
          if (!routes || routes.length === 0) return null;

          return (
            <SidebarGroup key={module}>
              {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {routes.map((route) => {
                    const Icon = getRouteIcon(route);
                    return (
                      <SidebarMenuItem key={route.id}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={route.path}
                            end={route.path === '/'}
                            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                            activeClassName="bg-accent text-accent-foreground font-medium"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{route.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
