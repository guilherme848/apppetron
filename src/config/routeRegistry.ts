/**
 * Route Registry - Single Source of Truth for Navigation
 * 
 * IMPORTANT: When adding new routes/pages to the system,
 * add them here FIRST. The permissions will be auto-synced
 * when an admin opens the Access Control page.
 */

import {
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
  Briefcase,
  UserCog,
  Shield,
  Package,
  GitBranch,
  Tag,
  Calendar,
  Clock,
  Zap,
  User,
  FilePen,
  Target,
  Megaphone,
  Archive,
  Send,
  Phone,
  GitMerge,
  Contact,
  Activity,
  Trophy,
  Wrench,
  Calculator,
  MessageCircle,
} from 'lucide-react';

// Action types for permissions
export type PermissionAction = 'view' | 'edit' | 'manage';

// Route definition interface
export interface RouteDefinition {
  id: string;                     // Unique identifier: module.page (e.g., 'content.tasks')
  path: string;                   // Route path (e.g., '/content/tasks')
  label: string;                  // Display name (e.g., 'Tarefas de Conteúdo')
  category: string;               // Category for grouping (e.g., 'Tarefas')
  module: string;                 // Module name (e.g., 'Conteúdo')
  permissions: PermissionAction[];// Available actions: ['view'], ['view', 'edit'], ['view', 'edit', 'manage']
  icon?: React.ElementType;       // Icon component
  hideInMenu?: boolean;           // Hide from main navigation
  order?: number;                 // Sort order within category
  parentId?: string;              // Parent route for nested routes (details pages)
}

// Module definitions for organization
export const MODULES = {
  MAIN: 'Principal',
  CRM: 'CRM',
  SALES: 'Vendas',
  COMMERCIAL: 'Comercial & Marketing',
  CONTENT: 'Conteúdo',
  TRAFFIC: 'Tráfego',
  CS: 'Customer Success',
  PETRON_OS: 'Petron OS',
  SETTINGS: 'Configurações',
} as const;

export type ModuleKey = keyof typeof MODULES;

// Categories for grouping
export const CATEGORIES = {
  DASHBOARD: 'Dashboard',
  CLIENTS: 'Clientes',
  TASKS: 'Tarefas',
  PRODUCTION: 'Produção',
  REQUESTS: 'Solicitações',
  ANALYTICS: 'Análises',
  MEETINGS: 'Reuniões',
  RISK: 'Risco',
  TEAM: 'Equipe',
  SERVICES: 'Serviços',
  PIPELINE: 'Pipeline',
  INTEGRATIONS: 'Integrações',
  ACCESS: 'Acessos',
  CONTRACTS: 'Contratos',
  FUNNELS: 'Funis',
  CONTACTS: 'Contatos',
  ACTIVITIES: 'Atividades',
  VOIP: 'VOIP',
} as const;

/**
 * ROUTE REGISTRY
 * Add new routes here. They will be automatically synced to the database.
 */
export const routeRegistry: RouteDefinition[] = [
  // ============================================
  // MAIN MODULE
  // ============================================
  {
    id: 'main.welcome',
    path: '/',
    label: 'Início',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.MAIN,
    permissions: ['view'],
    icon: Home,
    order: 1,
  },
  {
    id: 'main.dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.MAIN,
    permissions: ['view'],
    icon: LayoutDashboard,
    order: 2,
  },
  {
    id: 'main.profile',
    path: '/profile',
    label: 'Meu Perfil',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.MAIN,
    permissions: ['view', 'edit'],
    icon: User,
    hideInMenu: true,
    order: 3,
  },

  // ============================================
  // CRM MODULE
  // ============================================
  {
    id: 'crm.clients',
    path: '/crm',
    label: 'Clientes',
    category: CATEGORIES.CLIENTS,
    module: MODULES.CRM,
    permissions: ['view', 'edit'],
    icon: Users,
    order: 1,
  },
  {
    id: 'crm.client_detail',
    path: '/crm/:id',
    label: 'Detalhes do Cliente',
    category: CATEGORIES.CLIENTS,
    module: MODULES.CRM,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'crm.clients',
    order: 2,
  },
  {
    id: 'crm.tasks',
    path: '/tasks',
    label: 'Tarefas CRM',
    category: CATEGORIES.TASKS,
    module: MODULES.CRM,
    permissions: ['view', 'edit'],
    icon: CheckSquare,
    hideInMenu: true,
    order: 3,
  },
  {
    id: 'crm.content_tasks',
    path: '/content/tasks',
    label: 'Tarefas de Conteúdo',
    category: CATEGORIES.TASKS,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    icon: ListTodo,
    order: 4,
  },

  // ============================================
  // SALES MODULE (CRM de Vendas)
  // ============================================
  {
    id: 'sales.dashboard',
    path: '/sales',
    label: 'Dashboard',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.SALES,
    permissions: ['view'],
    icon: BarChart3,
    order: 0,
  },
  {
    id: 'sales.funnels',
    path: '/sales/funnels',
    label: 'Funis de Vendas',
    category: CATEGORIES.FUNNELS,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: GitMerge,
    order: 1,
  },
  {
    id: 'sales.activities',
    path: '/sales/activities',
    label: 'Atividades',
    category: CATEGORIES.ACTIVITIES,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: Activity,
    order: 2,
  },
  {
    id: 'sales.contacts',
    path: '/sales/contacts',
    label: 'Contatos',
    category: CATEGORIES.CONTACTS,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: Contact,
    order: 3,
  },
  {
    id: 'sales.dialer',
    path: '/sales/dialer',
    label: 'Discador VOIP',
    category: CATEGORIES.VOIP,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: Phone,
    order: 4,
    hideInMenu: true,
  },
  {
    id: 'sales.scoring',
    path: '/sales/scoring',
    label: 'Lead Scoring',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: Target,
    order: 5,
    hideInMenu: true,
  },
  {
    id: 'sales.templates',
    path: '/sales/templates',
    label: 'Templates',
    category: CATEGORIES.PIPELINE,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: FilePen,
    order: 6,
    hideInMenu: true,
  },
  {
    id: 'sales.automations',
    path: '/sales/automations',
    label: 'Automações',
    category: CATEGORIES.PIPELINE,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: Zap,
    order: 7,
    hideInMenu: true,
  },
  {
    id: 'sales.goals',
    path: '/sales/goals',
    label: 'Metas e Ranking',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.SALES,
    permissions: ['view', 'edit'],
    icon: Trophy,
    order: 8,
  },
  {
    id: 'sales.settings',
    path: '/sales/settings',
    label: 'Configurações',
    category: CATEGORIES.FUNNELS,
    module: MODULES.SALES,
    permissions: ['view', 'edit', 'manage'],
    icon: Settings,
    order: 9,
    hideInMenu: true,
  },

  // ============================================
  // CONTENT MODULE
  // ============================================
  {
    id: 'content.dashboard',
    path: '/content/dashboard',
    label: 'Dashboard Produção',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.CONTENT,
    permissions: ['view'],
    icon: BarChart3,
    order: 0, // Always first in module
  },
  {
    id: 'content.production',
    path: '/content/production',
    label: 'Produção de Conteúdo',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    icon: Layers,
    order: 1,
  },
  {
    id: 'content.extra_requests',
    path: '/content/extra-requests',
    label: 'Solicitações Extras',
    category: CATEGORIES.REQUESTS,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    icon: FileText,
    order: 2,
  },
  {
    id: 'content.batch_detail',
    path: '/content/production/:id',
    label: 'Detalhes do Lote',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'content.production',
    order: 90,
  },
  {
    id: 'content.post_detail',
    path: '/content/production/:batchId/posts/:postId',
    label: 'Detalhes do Post',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'content.production',
    order: 91,
  },
  {
    id: 'content.extra_request_new',
    path: '/content/extra-requests/new',
    label: 'Nova Solicitação Extra',
    category: CATEGORIES.REQUESTS,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'content.extra_requests',
    order: 92,
  },
  {
    id: 'content.extra_request_detail',
    path: '/content/extra-requests/:id',
    label: 'Detalhes da Solicitação Extra',
    category: CATEGORIES.REQUESTS,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'content.extra_requests',
    order: 93,
  },
  {
    id: 'content.drawer_posts',
    path: '/content/drawer-posts',
    label: 'Posts Gaveta',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.CONTENT,
    permissions: ['view'],
    icon: Archive,
    order: 3,
  },
  {
    id: 'content.legacy',
    path: '/content',
    label: 'Conteúdo (Legado)',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    order: 99,
  },
  {
    id: 'content.legacy_detail',
    path: '/content/:id',
    label: 'Detalhes Conteúdo (Legado)',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.CONTENT,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'content.legacy',
    order: 100,
  },

  // ============================================
  // TRAFFIC MODULE
  // ============================================
  {
    id: 'traffic.dashboard',
    path: '/traffic',
    label: 'Visão Geral',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.TRAFFIC,
    permissions: ['view'],
    icon: TrendingUp,
    order: 0, // Always first in module
  },
  {
    id: 'traffic.operational',
    path: '/traffic/operational',
    label: 'Dashboard Operacional',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.TRAFFIC,
    permissions: ['view'],
    icon: LayoutDashboard,
    order: 1,
    hideInMenu: true,
  },
  {
    id: 'traffic.tasks',
    path: '/traffic/playbook-tasks',
    label: 'Tarefas de Tráfego',
    category: CATEGORIES.TASKS,
    module: MODULES.TRAFFIC,
    permissions: ['view', 'edit'],
    icon: CheckSquare,
    hideInMenu: true,
    order: 1.5,
  },
  {
    id: 'traffic.balances',
    path: '/traffic/balances',
    label: 'Saldos',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.TRAFFIC,
    permissions: ['view'],
    icon: BarChart3,
    order: 2,
  },
  {
    id: 'traffic.optimizations',
    path: '/traffic/optimizations',
    label: 'Otimizações',
    category: CATEGORIES.TASKS,
    module: MODULES.TRAFFIC,
    permissions: ['view', 'edit'],
    icon: Wrench,
    order: 3,
  },
  {
    id: 'traffic.overview',
    path: '/traffic/overview',
    label: 'Dashboard Multi-Contas',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.TRAFFIC,
    permissions: ['view'],
    icon: BarChart3,
    hideInMenu: true,
    order: 3,
  },
  {
    id: 'traffic.benchmarks',
    path: '/traffic/benchmarks',
    label: 'Benchmarks',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.TRAFFIC,
    permissions: ['view'],
    icon: TrendingUp,
    hideInMenu: true,
    order: 4,
  },
  {
    id: 'traffic.creative_requests',
    path: '/traffic/creative-requests',
    label: 'Solicitações de Criativos',
    category: CATEGORIES.REQUESTS,
    module: MODULES.TRAFFIC,
    permissions: ['view', 'edit'],
    icon: FileText,
    order: 5,
  },
  {
    id: 'traffic.client_detail',
    path: '/traffic/clients/:id',
    label: 'Detalhes do Cliente (Tráfego)',
    category: CATEGORIES.CLIENTS,
    module: MODULES.TRAFFIC,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'traffic.dashboard',
    order: 90,
  },
  {
    id: 'traffic.creative_request_new',
    path: '/traffic/creative-requests/new',
    label: 'Nova Solicitação de Criativo',
    category: CATEGORIES.REQUESTS,
    module: MODULES.TRAFFIC,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'traffic.creative_requests',
    order: 91,
  },
  {
    id: 'traffic.creative_request_detail',
    path: '/traffic/creative-requests/:id',
    label: 'Detalhes da Solicitação de Criativo',
    category: CATEGORIES.REQUESTS,
    module: MODULES.TRAFFIC,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'traffic.creative_requests',
    order: 92,
  },
  {
    id: 'traffic.account_detail',
    path: '/traffic/accounts/:id',
    label: 'Detalhes da Conta',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.TRAFFIC,
    permissions: ['view'],
    hideInMenu: true,
    parentId: 'traffic.overview',
    order: 93,
  },
  {
    id: 'traffic.contacts',
    path: '/traffic/contacts',
    label: 'Pontos de Contato',
    category: CATEGORIES.CONTACTS,
    module: MODULES.TRAFFIC,
    permissions: ['view', 'edit', 'manage'],
    icon: MessageCircle,
    order: 4.5,
  },
  // ============================================
  // CUSTOMER SUCCESS MODULE
  // ============================================
  {
    id: 'cs.dashboard',
    path: '/cs',
    label: 'Visão Geral',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.CS,
    permissions: ['view', 'manage'],
    icon: HeartHandshake,
    order: 0, // Always first in module
  },
  {
    id: 'cs.onboarding',
    path: '/cs/onboarding',
    label: 'Onboarding',
    category: CATEGORIES.CLIENTS,
    module: MODULES.CS,
    permissions: ['view', 'edit'],
    icon: Users,
    order: 2,
  },
  {
    id: 'cs.meetings',
    path: '/cs/meetings',
    label: 'Reuniões',
    category: CATEGORIES.MEETINGS,
    module: MODULES.CS,
    permissions: ['view', 'edit'],
    icon: LayoutDashboard,
    order: 3,
  },
  {
    id: 'cs.nps',
    path: '/cs/nps',
    label: 'NPS',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.CS,
    permissions: ['view', 'edit'],
    icon: BarChart3,
    order: 4,
  },
  {
    id: 'cs.risk',
    path: '/cs/risk',
    label: 'Risco',
    category: CATEGORIES.RISK,
    module: MODULES.CS,
    permissions: ['view', 'edit'],
    icon: TrendingUp,
    order: 5,
  },
  {
    id: 'cs.client_detail',
    path: '/cs/clients/:id',
    label: 'Detalhes do Cliente (CS)',
    category: CATEGORIES.CLIENTS,
    module: MODULES.CS,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'cs.dashboard',
    order: 90,
  },
  {
    id: 'cs.onboarding_detail',
    path: '/cs/onboarding/:id',
    label: 'Detalhes do Onboarding',
    category: CATEGORIES.CLIENTS,
    module: MODULES.CS,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    order: 91,
  },
  {
    id: 'cs.onboarding_meeting',
    path: '/cs/onboarding/:id/meeting',
    label: 'Reunião de Onboarding',
    category: CATEGORIES.MEETINGS,
    module: MODULES.CS,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    order: 92,
  },

  // ============================================
  // CONTRACTS (within CRM module)
  // ============================================
  {
    id: 'crm.contracts',
    path: '/contracts',
    label: 'Contratos',
    category: CATEGORIES.CONTRACTS,
    module: MODULES.CRM,
    permissions: ['view', 'edit'],
    icon: FilePen,
    hideInMenu: true,
    order: 5,
  },
  {
    id: 'crm.contract_detail',
    path: '/contracts/:id',
    label: 'Detalhes do Contrato',
    category: CATEGORIES.CONTRACTS,
    module: MODULES.CRM,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'crm.contracts',
    order: 6,
  },
  // Sensitive permission for financial values (data-level, not route)
  // Applies to: contract MRR/setup fees, client monthly_value, ad budgets
  {
    id: 'financial.values',
    path: '/crm', // Associated route
    label: 'Ver Valores Financeiros',
    category: CATEGORIES.CONTRACTS,
    module: MODULES.CRM,
    permissions: ['view'], // Only view action, no edit
    hideInMenu: true, // Not a navigation item, just a permission
    order: 7,
  },

  // ============================================
  // COMMERCIAL MODULE
  // ============================================
  {
    id: 'commercial.planning',
    path: '/commercial/planning',
    label: 'Planejamento Comercial',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.COMMERCIAL,
    permissions: ['view', 'edit'],
    icon: BarChart3,
    order: 0,
  },
  {
    id: 'commercial.funnel',
    path: '/commercial/funnel',
    label: 'Inbound',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.COMMERCIAL,
    permissions: ['view', 'edit'],
    icon: Target,
    order: 1,
  },
  {
    id: 'commercial.outbound',
    path: '/commercial/outbound',
    label: 'Outbound',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.COMMERCIAL,
    permissions: ['view', 'edit'],
    icon: Send,
    order: 2,
  },
  {
    id: 'commercial.marketing',
    path: '/commercial/marketing',
    label: 'Marketing',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.COMMERCIAL,
    permissions: ['view', 'edit'],
    icon: Megaphone,
    order: 3,
  },
  {
    id: 'commercial.matemarketing',
    path: '/commercial/matemarketing',
    label: 'Matemarketing',
    category: CATEGORIES.ANALYTICS,
    module: MODULES.COMMERCIAL,
    permissions: ['view'],
    icon: Calculator,
    order: 4,
  },
  {
    id: 'commercial.marketing_detail',
    path: '/commercial/marketing/:id',
    label: 'Detalhes do Planejamento',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.COMMERCIAL,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'commercial.marketing',
    order: 4,
  },
  {
    id: 'commercial.marketing_post',
    path: '/commercial/marketing/:batchId/posts/:postId',
    label: 'Detalhes do Post (Marketing)',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.COMMERCIAL,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'commercial.marketing',
    order: 5,
  },
  {
    id: 'commercial.marketing_board',
    path: '/commercial/marketing/board',
    label: 'Quadro Marketing',
    category: CATEGORIES.PRODUCTION,
    module: MODULES.COMMERCIAL,
    permissions: ['view', 'edit'],
    hideInMenu: true,
    parentId: 'commercial.marketing',
    order: 6,
  },

  // ============================================
  // PETRON OS MODULE
  // ============================================
  {
    id: 'petronos.hub',
    path: '/petron-os',
    label: 'Ferramentas',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.PETRON_OS,
    permissions: ['view'],
    icon: Zap,
    order: 1,
  },
  {
    id: 'petronos.tool',
    path: '/petron-os/tool/:slug',
    label: 'Ferramenta',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.PETRON_OS,
    permissions: ['view'],
    hideInMenu: true,
    parentId: 'petronos.hub',
    order: 2,
  },
  {
    id: 'petronos.builder',
    path: '/petron-os/builder/:slug',
    label: 'Construtor',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.PETRON_OS,
    permissions: ['view'],
    hideInMenu: true,
    parentId: 'petronos.hub',
    order: 3,
  },
  {
    id: 'petronos.builder_edit',
    path: '/petron-os/builder/:slug/:id',
    label: 'Editor de Documento',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.PETRON_OS,
    permissions: ['view'],
    hideInMenu: true,
    parentId: 'petronos.hub',
    order: 4,
  },
  {
    id: 'petronos.settings',
    path: '/petron-os/settings',
    label: 'Configurações Petron OS',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.PETRON_OS,
    permissions: ['view', 'manage'],
    hideInMenu: true,
    parentId: 'petronos.hub',
    order: 5,
  },

  // ============================================
  // SETTINGS MODULE (Admin Only - Single Menu Entry)
  // All settings sub-pages are accessed through internal navigation
  // ============================================
  {
    id: 'settings.home',
    path: '/settings',
    label: 'Configurações',
    category: CATEGORIES.DASHBOARD,
    module: MODULES.SETTINGS,
    permissions: ['view', 'manage'],
    icon: Settings,
    order: 1,
  },
  // Sub-pages are hidden from main menu (accessed via internal settings navigation)
  {
    id: 'settings.roles',
    path: '/settings/access/roles',
    label: 'Cargos',
    category: CATEGORIES.TEAM,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 2,
  },
  {
    id: 'settings.users',
    path: '/settings/access/users',
    label: 'Usuários',
    category: CATEGORIES.TEAM,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 3,
  },
  {
    id: 'settings.permissions',
    path: '/settings/access/permissions',
    label: 'Controle de Acessos',
    category: CATEGORIES.ACCESS,
    module: MODULES.SETTINGS,
    permissions: ['view', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 4,
  },
  {
    id: 'settings.services',
    path: '/settings/plans/services',
    label: 'Serviços',
    category: CATEGORIES.SERVICES,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 5,
  },
  {
    id: 'settings.deliverables',
    path: '/settings/plans/deliverables',
    label: 'Entregáveis',
    category: CATEGORIES.SERVICES,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 6,
  },
  {
    id: 'settings.pipeline',
    path: '/settings/general/pipeline',
    label: 'Pipeline de Produção',
    category: CATEGORIES.PIPELINE,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 7,
  },
  {
    id: 'settings.niches',
    path: '/settings/general/niches',
    label: 'Nichos',
    category: CATEGORIES.CLIENTS,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 8,
  },
  {
    id: 'settings.traffic_routines',
    path: '/settings/traffic/routines',
    label: 'Rotinas de Tráfego',
    category: CATEGORIES.PIPELINE,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 9,
  },
  {
    id: 'settings.traffic_cycles',
    path: '/settings/traffic/cycles',
    label: 'Ciclos de Tráfego',
    category: CATEGORIES.PIPELINE,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 10,
  },
 {
   id: 'settings.traffic_playbook',
   path: '/settings/traffic/playbook',
   label: 'Playbook de Tráfego',
   category: CATEGORIES.PIPELINE,
   module: MODULES.SETTINGS,
   permissions: ['view', 'edit', 'manage'],
   hideInMenu: true,
   parentId: 'settings.home',
   order: 11,
 },
  {
    id: 'settings.meta_integration',
    path: '/settings/integrations/meta',
    label: 'Integração Meta',
    category: CATEGORIES.INTEGRATIONS,
    module: MODULES.SETTINGS,
    permissions: ['view', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 11,
  },
  {
    id: 'settings.traffic_analytics',
    path: '/settings/traffic/analytics',
    label: 'Painel Multi-Contas',
    category: CATEGORIES.INTEGRATIONS,
    module: MODULES.SETTINGS,
    permissions: ['view', 'manage'],
    hideInMenu: true,
    parentId: 'settings.home',
    order: 12,
  },
  // CS Settings
  {
    id: 'settings.cs_sequences',
    path: '/settings/cs/onboarding/sequences',
    label: 'Sequências de Onboarding',
    category: CATEGORIES.CLIENTS,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    order: 13,
  },
  {
    id: 'settings.cs_activities',
    path: '/settings/cs/onboarding/activities',
    label: 'Atividades de Onboarding',
    category: CATEGORIES.CLIENTS,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    order: 14,
  },
  {
    id: 'settings.cs_questions',
    path: '/settings/cs/onboarding/questions',
    label: 'Perguntas de Onboarding',
    category: CATEGORIES.CLIENTS,
    module: MODULES.SETTINGS,
    permissions: ['view', 'edit', 'manage'],
    hideInMenu: true,
    order: 15,
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all routes for menu rendering (excluding hidden routes)
 */
export function getMenuRoutes(): RouteDefinition[] {
  return routeRegistry.filter(r => !r.hideInMenu).sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Get routes grouped by module
 */
export function getRoutesByModule(): Record<string, RouteDefinition[]> {
  const grouped: Record<string, RouteDefinition[]> = {};
  
  for (const route of getMenuRoutes()) {
    if (!grouped[route.module]) {
      grouped[route.module] = [];
    }
    grouped[route.module].push(route);
  }
  
  return grouped;
}

/**
 * Get a route by ID
 */
export function getRouteById(id: string): RouteDefinition | undefined {
  return routeRegistry.find(r => r.id === id);
}

/**
 * Get a route by path
 */
export function getRouteByPath(path: string): RouteDefinition | undefined {
  return routeRegistry.find(r => r.path === path);
}

/**
 * Generate permission key from route ID and action
 * Format: action:route_id (e.g., view:content.tasks)
 */
export function generatePermissionKey(routeId: string, action: PermissionAction): string {
  return `${action}:${routeId}`;
}

/**
 * Parse permission key to get route ID and action
 */
export function parsePermissionKey(key: string): { action: PermissionAction; routeId: string } | null {
  const parts = key.split(':');
  if (parts.length !== 2) return null;
  
  const action = parts[0] as PermissionAction;
  const routeId = parts[1];
  
  if (!['view', 'edit', 'manage'].includes(action)) return null;
  
  return { action, routeId };
}

/**
 * Get all permission keys that should exist based on registry
 */
export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  
  for (const route of routeRegistry) {
    for (const action of route.permissions) {
      keys.push(generatePermissionKey(route.id, action));
    }
  }
  
  return keys;
}

/**
 * Get routes grouped by module and category for the Access Control page
 */
export function getRoutesForAccessControl(): Record<string, Record<string, RouteDefinition[]>> {
  const result: Record<string, Record<string, RouteDefinition[]>> = {};
  
  for (const route of routeRegistry) {
    // Skip detail pages (use parent permissions)
    if (route.parentId) continue;
    
    if (!result[route.module]) {
      result[route.module] = {};
    }
    if (!result[route.module][route.category]) {
      result[route.module][route.category] = [];
    }
    
    result[route.module][route.category].push(route);
  }
  
  // Sort routes within categories
  for (const module of Object.keys(result)) {
    for (const category of Object.keys(result[module])) {
      result[module][category].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  }
  
  return result;
}

/**
 * Module order for display
 */
export const MODULE_ORDER: string[] = [
  MODULES.MAIN,
  MODULES.CRM,
  MODULES.SALES,
  MODULES.COMMERCIAL,
  MODULES.CONTENT,
  MODULES.TRAFFIC,
  MODULES.CS,
  MODULES.PETRON_OS,
  MODULES.SETTINGS,
];
