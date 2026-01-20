import { LayoutDashboard, Users, CheckSquare, Layers, Settings, ListTodo } from 'lucide-react';
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
import { useCurrentUserPermissions } from '@/hooks/usePermissions';
import { PermissionKey } from '@/types/permissions';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  permission?: PermissionKey;
}

const crmItems: MenuItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, permission: 'view_dashboard' },
  { title: 'Clientes', url: '/crm', icon: Users, permission: 'view_crm' },
  { title: 'Tarefas CRM', url: '/tasks', icon: CheckSquare, permission: 'view_tasks' },
  { title: 'Tarefas Conteúdo', url: '/content/tasks', icon: ListTodo, permission: 'view_tasks' },
];

const contentItems: MenuItem[] = [
  { title: 'Produção de Conteúdo', url: '/content/production', icon: Layers, permission: 'view_content' },
];

const settingsItems: MenuItem[] = [
  { title: 'Configurações', url: '/settings', icon: Settings, permission: 'manage_settings' },
];

export function AppSidebar() {
  const { can } = useCurrentUserPermissions();

  const filterByPermission = (items: MenuItem[]) => {
    return items.filter(item => !item.permission || can(item.permission));
  };

  const visibleCrmItems = filterByPermission(crmItems);
  const visibleContentItems = filterByPermission(contentItems);
  const visibleSettingsItems = filterByPermission(settingsItems);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-lg">Petron</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
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
