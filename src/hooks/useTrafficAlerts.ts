import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrafficAlert {
  id: string;
  rule_id: string | null;
  ad_account_id: string;
  client_id: string | null;
  severity: 'info' | 'attention' | 'critical';
  kind: string;
  message: string;
  metric_value: number | null;
  baseline_value: number | null;
  action_hint: string | null;
  triggered_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  client_name?: string;
}

export function useTrafficAlerts(autoRefreshMs = 60_000) {
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Active alerts: not resolved
    const { data: alertRows, error } = await supabase
      .from('alerts_triggered')
      .select('*')
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false })
      .limit(200);
    if (error) {
      console.error('[useTrafficAlerts]', error);
      setLoading(false);
      return;
    }
    // Enrich with client name via join
    const clientIds = [...new Set((alertRows || []).map(a => a.client_id).filter(Boolean) as string[])];
    let nameMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const { data: accs } = await supabase
        .from('accounts')
        .select('id, name')
        .in('id', clientIds);
      nameMap = new Map((accs || []).map(a => [a.id, a.name]));
    }
    setAlerts((alertRows || []).map(a => ({ ...a, client_name: a.client_id ? nameMap.get(a.client_id) : undefined })));
    setLoading(false);
  }, []);

  const acknowledge = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from('alerts_triggered')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    if (error) console.error('[acknowledge]', error);
    else load();
  }, [load]);

  const acknowledgeMany = useCallback(async (alertIds: string[]) => {
    if (alertIds.length === 0) return;
    const { error } = await supabase
      .from('alerts_triggered')
      .update({ resolved_at: new Date().toISOString() })
      .in('id', alertIds);
    if (error) console.error('[acknowledgeMany]', error);
    else load();
  }, [load]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(load, autoRefreshMs);
    return () => clearInterval(id);
  }, [load, autoRefreshMs]);

  return { alerts, loading, refresh: load, acknowledge, acknowledgeMany };
}
