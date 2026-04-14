import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Users, Briefcase, Shield, Layers, Package, GitBranch, Target, ChevronDown, ChevronRight, Menu, RotateCcw, RefreshCw, HeartHandshake, MessageSquareText, GitMerge, FilePen, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SettingsCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  items: {
    id: string;
    label: string;
    path: string;
    isGroup?: boolean;
    parent?: string;
  }[];
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'empresa',
    label: 'Empresa',
    description: 'Identidade visual, dados da agência e configurações gerais.',
    icon: Settings,
    items: [
      { id: 'identidade', label: 'Identidade Visual', path: '/settings/empresa/identidade' },
      { id: 'dados-empresa', label: 'Dados da Empresa', path: '/settings/empresa/dados' },
      { id: 'config-geral', label: 'Configurações Gerais', path: '/settings/empresa/geral' },
    ],
  },
  {
    id: 'access',
    label: 'Gestão e Acessos',
    description: 'Pessoas, cargos e permissões.',
    icon: Users,
    items: [
      { id: 'roles', label: 'Cargos', path: '/settings/access/roles' },
      { id: 'users', label: 'Usuários', path: '/settings/access/users' },
      { id: 'permissions', label: 'Acessos & Permissões', path: '/settings/access/permissions' },
    ],
  },
  {
    id: 'plans',
    label: 'Planos e Serviços',
    description: 'Planos comerciais, entregáveis, nichos e pipeline.',
    icon: Layers,
    items: [
      { id: 'services', label: 'Planos', path: '/settings/plans/services' },
      { id: 'deliverables', label: 'Entregáveis', path: '/settings/plans/deliverables' },
      { id: 'niches', label: 'Nichos', path: '/settings/general/niches' },
      { id: 'pipeline', label: 'Pipeline de planos', path: '/settings/general/pipeline' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM e Vendas',
    description: 'Funis, scoring, templates, cadências e motivos de perda.',
    icon: TrendingUp,
    items: [
      { id: 'sales-funnels', label: 'Funis e Etapas', path: '/settings/sales/funnels' },
      { id: 'sales-scoring', label: 'Lead Scoring', path: '/settings/sales/scoring' },
      { id: 'sales-templates', label: 'Templates', path: '/settings/sales/templates' },
      { id: 'sales-automations', label: 'Automações', path: '/settings/sales/automations' },
      { id: 'crm-loss-reasons', label: 'Motivos de perda', path: '/settings/crm/loss-reasons' },
      { id: 'crm-cadences', label: 'Cadências', path: '/settings/crm/cadences' },
    ],
  },
  {
    id: 'trafego',
    label: 'Tráfego Pago',
    description: 'Playbook, rotinas, ciclos, metas e regras de alertas.',
    icon: TrendingUp,
    items: [
      { id: 'traffic-playbook', label: 'Playbook', path: '/settings/traffic/playbook' },
      { id: 'traffic-routines', label: 'Rotinas', path: '/settings/traffic/routines' },
      { id: 'traffic-cycles', label: 'Ciclos', path: '/settings/traffic/cycles' },
      { id: 'traffic-metas', label: 'Metas por nicho', path: '/settings/trafego/metas' },
      { id: 'traffic-rules-link', label: 'Regras de alertas', path: '/traffic/alerts' },
      { id: 'traffic-catalog', label: 'Catálogo de métricas', path: '/settings/trafego/catalogo' },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    description: 'Etapas de produção, responsabilidades e templates.',
    icon: FilePen,
    items: [
      { id: 'content-stages', label: 'Etapas e responsabilidades', path: '/settings/conteudo/etapas' },
      { id: 'content-templates', label: 'Templates de briefing', path: '/settings/conteudo/templates' },
    ],
  },
  {
    id: 'cs',
    label: 'Customer Success',
    description: 'Onboarding, saúde do cliente, churn e NPS.',
    icon: HeartHandshake,
    items: [
      { id: 'onboarding', label: 'Onboarding', path: '', isGroup: true },
      { id: 'petron-sequences', label: 'Sequências', path: '/settings/cs/onboarding/sequences', parent: 'onboarding' },
      { id: 'petron-activities', label: 'Atividades', path: '/settings/cs/onboarding/activities', parent: 'onboarding' },
      { id: 'onboarding-questions', label: 'Perguntas', path: '/settings/cs/onboarding/questions', parent: 'onboarding' },
      { id: 'cs-health', label: 'Saúde do cliente', path: '/settings/cs/saude' },
      { id: 'cs-churn', label: 'Motivos de churn', path: '/settings/cs/motivos-churn' },
      { id: 'cs-nps', label: 'Configuração de NPS', path: '/settings/cs/nps' },
      { id: 'cs-playbook', label: 'Playbook CS', path: '/settings/cs/playbook' },
    ],
  },
  {
    id: 'rh',
    label: 'Recrutamento (RH)',
    description: 'Vagas, pipeline de candidatos e formulários.',
    icon: Briefcase,
    items: [
      { id: 'rh-cargos', label: 'Job profiles', path: '/settings/rh/cargos' },
      { id: 'rh-pipeline', label: 'Pipeline de candidatos', path: '/settings/rh/pipeline' },
      { id: 'rh-formularios', label: 'Formulários', path: '/settings/rh/formularios' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrações',
    description: 'Meta Ads, contratos, IA e demais conexões.',
    icon: GitMerge,
    items: [
      { id: 'meta-ads', label: 'Meta Ads', path: '/settings/integrations/meta' },
      { id: 'contracts', label: 'Contratos (Autentique/ClickSign)', path: '/settings/integracoes/contratos' },
      { id: 'ai', label: 'Anthropic / IA', path: '/settings/integracoes/ia' },
      { id: 'matflow', label: 'MatFlow', path: '/settings/integracoes/matflow' },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    description: 'Auditoria, backup e logs.',
    icon: Shield,
    items: [
      { id: 'audit', label: 'Auditoria', path: '/settings/sistema/auditoria' },
      { id: 'backup', label: 'Backup', path: '/settings/sistema/backup' },
      { id: 'logs', label: 'Logs', path: '/settings/sistema/logs' },
    ],
  },
];

function getCategoryIcon(categoryId: string) {
  switch (categoryId) {
    case 'empresa':
      return Settings;
    case 'access':
      return Users;
    case 'plans':
      return Layers;
    case 'crm':
      return TrendingUp;
    case 'trafego':
      return Zap;
    case 'conteudo':
      return FilePen;
    case 'cs':
      return HeartHandshake;
    case 'rh':
      return Briefcase;
    case 'integrations':
      return GitMerge;
    case 'sistema':
      return Shield;
    default:
      return Settings;
  }
}

function getItemIcon(itemId: string) {
  switch (itemId) {
    case 'roles':
      return Briefcase;
    case 'users':
      return Users;
    case 'permissions':
      return Shield;
    case 'services':
      return Layers;
    case 'deliverables':
      return Package;
    case 'pipeline':
      return GitBranch;
    case 'niches':
      return Target;
    case 'traffic-routines':
      return RotateCcw;
    case 'traffic-cycles':
      return RefreshCw;
    case 'onboarding-questions':
      return MessageSquareText;
    case 'sales-funnels':
      return GitMerge;
    case 'sales-scoring':
      return Target;
    case 'sales-templates':
      return FilePen;
    case 'sales-automations':
      return Zap;
    default:
      return Settings;
  }
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveCategoryId = () => {
    for (const cat of SETTINGS_CATEGORIES) {
      if (cat.items.some(item => item.path && location.pathname === item.path)) {
        return cat.id;
      }
    }
    return SETTINGS_CATEGORIES[0].id;
  };

  const [openCategories, setOpenCategories] = useState<string[]>([getActiveCategoryId()]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações
        </h2>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {SETTINGS_CATEGORIES.map((category) => {
            const CategoryIcon = getCategoryIcon(category.id);
            const isOpen = openCategories.includes(category.id);
            const isActiveCategory = category.items.some(item => item.path && location.pathname === item.path);

            return (
              <Collapsible
                key={category.id}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between px-3 py-2 h-auto",
                      isActiveCategory && "bg-muted"
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <CategoryIcon className="h-4 w-4" />
                      {category.label}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {category.items.filter(item => !item.parent).map((item) => {
                    const ItemIcon = getItemIcon(item.id);
                    const isActive = location.pathname === item.path;
                    const childItems = category.items.filter(child => child.parent === item.id);

                    if (item.isGroup && childItems.length > 0) {
                      return (
                        <div key={item.id} className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 block">
                            {item.label}
                          </span>
                          {childItems.map((child) => {
                            const ChildIcon = getItemIcon(child.id);
                            const isChildActive = location.pathname === child.path;

                            return (
                              <Button
                                key={child.id}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "w-full justify-start px-3 ml-2",
                                  isChildActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                )}
                                onClick={() => handleNavigate(child.path)}
                              >
                                <ChildIcon className="h-4 w-4 mr-2" />
                                {child.label}
                              </Button>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start px-3",
                          isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                        onClick={() => handleNavigate(item.path)}
                      >
                        <ItemIcon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function SettingsLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-[4rem] left-0 right-0 z-10 bg-background border-b p-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Menu className="h-4 w-4" />
              Menu de Configurações
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 md:pt-6 pt-16 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export { SETTINGS_CATEGORIES };
