import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Layers, 
  Settings, 
  ListTodo, 
  TrendingUp, 
  BarChart3,
  ClipboardList,
  Kanban,
  ChevronDown
} from 'lucide-react';
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
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useCurrentUserPermissions } from '@/hooks/usePermissions';
import { PermissionKey } from '@/types/permissions';
import petronLogo from '@/assets/petron-logo.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  permission?: PermissionKey;
}

// Dashboard - Primeiro item destacado
const dashboardItem: MenuItem = {
  title: 'Dashboard',
  url: '/',
  icon: LayoutDashboard,
  permission: 'view_dashboard',
};

// Bloco: Tarefas
const tasksItems: MenuItem[] = [
  { title: 'Tarefas de Conteúdo', url: '/content/tasks', icon: ListTodo, permission: 'view_tasks' },
  { title: 'Tarefas de Tráfego', url: '/traffic/tasks', icon: CheckSquare, permission: 'view_traffic' },
  { title: 'Tarefas CRM', url: '/tasks', icon: ClipboardList, permission: 'view_tasks' },
];

// Bloco: Quadros (Operação)
const boardsItems: MenuItem[] = [
  { title: 'Quadro de Conteúdo', url: '/content/production', icon: Kanban, permission: 'view_content' },
  { title: 'Dashboard de Conteúdo', url: '/content/dashboard', icon: BarChart3, permission: 'view_content' },
  { title: 'Quadro de Performance', url: '/traffic', icon: TrendingUp, permission: 'view_traffic' },
  { title: 'Clientes', url: '/crm', icon: Users, permission: 'view_crm' },
];

// Bloco: Configurações
const settingsItems: MenuItem[] = [
  { title: 'Configurações', url: '/settings', icon: Settings, permission: 'manage_settings' },
];

export function AppSidebar() {
  const { can } = useCurrentUserPermissions();
  const location = useLocation();
  
  // Check if current path is in a group
  const isInTasks = ['/content/tasks', '/traffic/tasks', '/tasks'].some(p => location.pathname.startsWith(p));
  const isInBoards = ['/content/production', '/content/dashboard', '/traffic', '/crm'].some(p => 
    location.pathname === p || location.pathname.startsWith(p + '/')
  );
  const isInSettings = location.pathname.startsWith('/settings');
  
  const [tasksOpen, setTasksOpen] = useState(isInTasks);
  const [boardsOpen, setBoardsOpen] = useState(isInBoards);
  const [settingsOpen, setSettingsOpen] = useState(isInSettings);

  const filterByPermission = (items: MenuItem[]) => {
    return items.filter(item => !item.permission || can(item.permission));
  };

  const canViewDashboard = !dashboardItem.permission || can(dashboardItem.permission);
  const visibleTasksItems = filterByPermission(tasksItems);
  const visibleBoardsItems = filterByPermission(boardsItems);
  const visibleSettingsItems = filterByPermission(settingsItems);

  const renderMenuItem = (item: MenuItem, end = false) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={end}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
          activeClassName="bg-accent text-accent-foreground font-medium"
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

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
        {/* Dashboard - Primeiro item destacado */}
        {canViewDashboard && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/"
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span className="text-base">Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Bloco: Tarefas */}
        {visibleTasksItems.length > 0 && (
          <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
            <SidebarGroup>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 transition-colors">
                  <span className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    Tarefas
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tasksOpen ? 'rotate-180' : ''}`} />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleTasksItems.map((item) => renderMenuItem(item))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        <SidebarSeparator />

        {/* Bloco: Quadros */}
        {visibleBoardsItems.length > 0 && (
          <Collapsible open={boardsOpen} onOpenChange={setBoardsOpen}>
            <SidebarGroup>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 transition-colors">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    Quadros
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${boardsOpen ? 'rotate-180' : ''}`} />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleBoardsItems.map((item) => renderMenuItem(item))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        <SidebarSeparator />

        {/* Bloco: Configurações */}
        {visibleSettingsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleSettingsItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
