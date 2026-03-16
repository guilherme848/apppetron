import { useState, useEffect } from 'react';
import { Wrench, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrafficOptimizations } from '@/hooks/useTrafficOptimizations';
import { useCrm } from '@/contexts/CrmContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { OptimizationMyDayTab } from '@/components/traffic-optimizations/MyDayTab';
import { OptimizationWeeklyCycleTab } from '@/components/traffic-optimizations/WeeklyCycleTab';
import { OptimizationLogTab } from '@/components/traffic-optimizations/LogTab';
import { OptimizationByClientTab } from '@/components/traffic-optimizations/ByClientTab';
import { NewOptimizationModal } from '@/components/traffic-optimizations/NewOptimizationModal';

export default function TrafficOptimizationsPage() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState<string | null>(null);
  const optimizationsData = useTrafficOptimizations();
  const { accounts } = useCrm();
  const { members: teamMembers } = useTeamMembers();
  const [trafficServiceIds, setTrafficServiceIds] = useState<Set<string>>(new Set());

  // Fetch service IDs that have traffic enabled
  useEffect(() => {
    supabase
      .from('services')
      .select('id')
      .eq('has_traffic', true)
      .then(({ data }) => {
        if (data) setTrafficServiceIds(new Set(data.map((s: any) => s.id)));
      });
  }, []);

  const activeAccounts = accounts.filter(
    (a) => a.status === 'active' && !a.deleted_at && a.service_id && trafficServiceIds.has(a.service_id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Otimizações
          </h1>
          <p className="text-muted-foreground">
            Centro operacional de otimizações de tráfego pago
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Otimização
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="meu-dia" className="w-full">
        <TabsList>
          <TabsTrigger value="meu-dia">Meu Dia</TabsTrigger>
          <TabsTrigger value="ciclo-semanal">Ciclo Semanal</TabsTrigger>
          <TabsTrigger value="log">Log de Otimizações</TabsTrigger>
          <TabsTrigger value="por-cliente">Por Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="meu-dia">
          <OptimizationMyDayTab
            {...optimizationsData}
            accounts={activeAccounts}
            teamMembers={teamMembers}
            onNewOptimization={() => setShowNewModal(true)}
            addOptimization={optimizationsData.addOptimization}
          />
        </TabsContent>

        <TabsContent value="ciclo-semanal">
          <OptimizationWeeklyCycleTab
            {...optimizationsData}
            accounts={activeAccounts}
            teamMembers={teamMembers}
            onClientClick={(clientId) => {
              setPreselectedClientId(clientId);
              setShowNewModal(true);
            }}
          />
        </TabsContent>

        <TabsContent value="log">
          <OptimizationLogTab
            {...optimizationsData}
            accounts={activeAccounts}
            teamMembers={teamMembers}
          />
        </TabsContent>

        <TabsContent value="por-cliente">
          <OptimizationByClientTab
            {...optimizationsData}
            accounts={activeAccounts}
            teamMembers={teamMembers}
          />
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <NewOptimizationModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        accounts={activeAccounts}
        teamMembers={teamMembers}
        currentMemberId={optimizationsData.currentMemberId}
        onSubmit={optimizationsData.addOptimization}
      />
    </div>
  );
}
