import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AlertRule {
  id: string;
  name: string;
  metric_slug: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte';
  threshold: number | null;
  window_days: number;
  severity: 'info' | 'attention' | 'critical';
  message: string;
  action_hint: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface MetricCatalogItem {
  slug: string;
  name: string;
  category: string;
  unit: string;
}

export function useAlertRules() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [catalog, setCatalog] = useState<MetricCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, c] = await Promise.all([
      supabase.from('traffic_alert_rules').select('*').order('name'),
      supabase.from('traffic_metric_catalog').select('slug, name, category, unit').eq('is_active', true).order('default_order'),
    ]);
    setRules((r.data || []) as AlertRule[]);
    setCatalog((c.data || []) as MetricCatalogItem[]);
    setLoading(false);
  }, []);

  const saveRule = useCallback(async (id: string | null, patch: Partial<AlertRule>) => {
    const payload: any = { ...patch, updated_at: new Date().toISOString() };
    if (id) {
      const { error } = await supabase.from('traffic_alert_rules').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('traffic_alert_rules').insert(payload);
      if (error) throw error;
    }
    await load();
  }, [load]);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase.from('traffic_alert_rules').delete().eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const toggleActive = useCallback(async (id: string, is_active: boolean) => {
    await supabase.from('traffic_alert_rules').update({ is_active }).eq('id', id);
    await load();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { rules, catalog, loading, refresh: load, saveRule, deleteRule, toggleActive };
}

export async function snoozeAlert(args: {
  rule_id?: string | null;
  client_id?: string | null;
  ad_account_id?: string | null;
  kind?: string | null;
  hours: number;
  reason?: string;
}) {
  const { error } = await supabase.rpc('snooze_alert', {
    p_rule_id: args.rule_id ?? null,
    p_client_id: args.client_id ?? null,
    p_ad_account_id: args.ad_account_id ?? null,
    p_kind: args.kind ?? null,
    p_hours: args.hours,
    p_reason: args.reason ?? null,
  });
  if (error) throw error;
}
