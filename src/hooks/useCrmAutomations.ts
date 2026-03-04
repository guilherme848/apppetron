import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CrmAutomation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: any[];
  actions: any[];
  active: boolean;
  executions_count: number;
  created_at: string;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  deal_id: string | null;
  trigger_event: string | null;
  actions_executed: any[];
  status: string;
  error_message: string | null;
  executed_at: string;
}

export const TRIGGER_TYPES = [
  { value: 'deal_stage_changed', label: 'Deal movido para etapa' },
  { value: 'deal_no_activity', label: 'Deal sem atividade há N dias' },
  { value: 'activity_completed', label: 'Atividade concluída com resultado' },
  { value: 'score_reached', label: 'Score atingiu N pontos' },
  { value: 'deal_created', label: 'Deal criado no funil' },
  { value: 'activity_overdue', label: 'Atividade atrasada há N dias' },
  { value: 'deal_stale', label: 'Deal parado na etapa há N dias' },
];

export const ACTION_TYPES = [
  { value: 'move_stage', label: 'Mover deal para etapa' },
  { value: 'assign_responsible', label: 'Atribuir responsável' },
  { value: 'start_cadence', label: 'Iniciar cadência' },
  { value: 'create_activity', label: 'Criar atividade' },
  { value: 'add_tag', label: 'Adicionar tag' },
  { value: 'notify', label: 'Enviar notificação' },
  { value: 'change_score', label: 'Alterar score' },
];

export function useCrmAutomations() {
  const [automations, setAutomations] = useState<CrmAutomation[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAutomations = useCallback(async () => {
    const { data } = await supabase
      .from('crm_automations')
      .select('*')
      .order('created_at', { ascending: false });
    setAutomations((data as any[]) || []);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('crm_automation_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(100);
    setLogs((data as any[]) || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAutomations(), fetchLogs()]);
      setLoading(false);
    };
    load();
  }, [fetchAutomations, fetchLogs]);

  const create = async (a: Partial<CrmAutomation>) => {
    const { error } = await supabase.from('crm_automations').insert(a as any);
    if (!error) await fetchAutomations();
    return !error;
  };

  const update = async (id: string, a: Partial<CrmAutomation>) => {
    const { error } = await supabase.from('crm_automations').update({ ...a, updated_at: new Date().toISOString() } as any).eq('id', id);
    if (!error) await fetchAutomations();
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('crm_automations').delete().eq('id', id);
    if (!error) await fetchAutomations();
    return !error;
  };

  const toggle = async (id: string, active: boolean) => {
    return update(id, { active });
  };

  return { automations, logs, loading, create, update, remove, toggle, refetch: fetchAutomations, refetchLogs: fetchLogs };
}
