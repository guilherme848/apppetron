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
import { useAuthPermissions } from '@/hooks/useAuthPermissions';
import { PermissionKey } from '@/types/permissions';
import petronLogo from '@/assets/petron-logo.png';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  permission?: PermissionKey;
}

const mainItems: MenuItem[] = [
  { title: 'Início', url: '/', icon: Home },
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
];

const crmItems: MenuItem[] = [
  { title: 'Clientes', url: '/crm', icon: Users, permission: 'view_crm' },
  { title: 'Tarefas CRM', url: '/tasks', icon: CheckSquare, permission: 'view_tasks' },
  { title: 'Tarefas Conteúdo', url: '/content/tasks', icon: ListTodo, permission: 'view_tasks' },
];

const contentItems: MenuItem[] = [
  { title: 'Dashboard Produção', url: '/content/dashboard', icon: BarChart3, permission: 'view_content' },
  { title: 'Produção de Conteúdo', url: '/content/production', icon: Layers, permission: 'view_content' },
  { title: 'Solicitações Extras', url: '/content/extra-requests', icon: FileText, permission: 'view_content' },
];

const trafficItems: MenuItem[] = [
  { title: 'Visão Geral', url: '/traffic', icon: TrendingUp, permission: 'view_traffic' },
  { title: 'Tarefas de Tráfego', url: '/traffic/tasks', icon: CheckSquare, permission: 'view_traffic' },
  { title: 'Saldos', url: '/traffic/balances', icon: BarChart3, permission: 'view_traffic' },
];

const csItems: MenuItem[] = [
  { title: 'Visão Geral', url: '/cs', icon: HeartHandshake, permission: 'view_cs' },
  { title: 'Onboarding', url: '/cs/onboarding', icon: Users, permission: 'view_cs' },
  { title: 'Reuniões', url: '/cs/meetings', icon: LayoutDashboard, permission: 'view_cs' },
  { title: 'NPS', url: '/cs/nps', icon: BarChart3, permission: 'view_cs' },
  { title: 'Risco', url: '/cs/risk', icon: TrendingUp, permission: 'view_cs' },
];

const settingsItems: MenuItem[] = [
  { title: 'Configurações', url: '/settings', icon: Settings, permission: 'manage_settings' },
];

export function AppSidebar() {
  const { can } = useAuthPermissions();

  const filterByPermission = (items: MenuItem[]) => {
    return items.filter(item => !item.permission || can(item.permission));
  };

  const visibleMainItems = filterByPermission(mainItems);
  const visibleCrmItems = filterByPermission(crmItems);
  const visibleContentItems = filterByPermission(contentItems);
  const visibleTrafficItems = filterByPermission(trafficItems);
  const visibleCsItems = filterByPermission(csItems);
  const visibleSettingsItems = filterByPermission(settingsItems);

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
        {visibleMainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleCrmItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>CRM</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleCrmItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleContentItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Criação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleContentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleTrafficItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Tráfego Pago</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleTrafficItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleCsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Customer Success</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleCsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {visibleSettingsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleSettingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
