import { Settings, Users, Layers, GitBranch, Target, Package, Shield, Briefcase, RefreshCw, RotateCcw, Link } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Tab components
import { RolesTab } from '@/components/settings/RolesTab';
import { TeamMembersTab } from '@/components/settings/TeamMembersTab';
import { DynamicAccessTab } from '@/components/settings/DynamicAccessTab';
import { ServicesTab } from '@/components/settings/ServicesTab';
import { DeliverablesTab } from '@/components/settings/DeliverablesTab';
import { NichesTab } from '@/components/settings/NichesTab';
import { PipelineTab } from '@/components/settings/PipelineTab';
import { TrafficRoutinesTab } from '@/components/settings/TrafficRoutinesTab';
import { TrafficCyclesTab } from '@/components/settings/TrafficCyclesTab';
import { MetaIntegrationTab } from '@/components/settings/MetaIntegrationTab';

const SETTINGS_TABS = [
  { id: 'roles', label: 'Cargos', icon: Briefcase, component: RolesTab },
  { id: 'users', label: 'Usuários', icon: Users, component: TeamMembersTab },
  { id: 'permissions', label: 'Acessos', icon: Shield, component: DynamicAccessTab },
  { id: 'services', label: 'Planos', icon: Layers, component: ServicesTab },
  { id: 'deliverables', label: 'Entregas', icon: Package, component: DeliverablesTab },
  { id: 'niches', label: 'Nichos', icon: Target, component: NichesTab },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch, component: PipelineTab },
  { id: 'traffic-routines', label: 'Rotinas', icon: RotateCcw, component: TrafficRoutinesTab },
  { id: 'traffic-cycles', label: 'Ciclos', icon: RefreshCw, component: TrafficCyclesTab },
  { id: 'meta', label: 'Meta Ads', icon: Link, component: MetaIntegrationTab },
] as const;

export default function SettingsCompactPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground text-sm">
          Gerencie todas as configurações do sistema.
        </p>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex h-auto p-1 bg-muted/50">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-background"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {SETTINGS_TABS.map((tab) => {
          const Component = tab.component;
          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <Component />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
