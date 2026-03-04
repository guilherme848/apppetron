import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CrmTemplate {
  id: string;
  name: string;
  funnel_id: string | null;
  stage_id: string | null;
  type: string;
  content: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCrmTemplates() {
  const [templates, setTemplates] = useState<CrmTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (t: Partial<CrmTemplate>) => {
    const { error } = await supabase.from('crm_templates').insert(t as any);
    if (!error) await fetch();
    return !error;
  };

  const update = async (id: string, t: Partial<CrmTemplate>) => {
    const { error } = await supabase.from('crm_templates').update({ ...t, updated_at: new Date().toISOString() } as any).eq('id', id);
    if (!error) await fetch();
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('crm_templates').delete().eq('id', id);
    if (!error) await fetch();
    return !error;
  };

  const getTemplatesForContext = (funnelId?: string, stageId?: string, type?: string) => {
    return templates.filter(t => {
      if (!t.active) return false;
      if (type && t.type !== type) return false;
      if (t.funnel_id && t.funnel_id !== funnelId) return false;
      if (t.stage_id && t.stage_id !== stageId) return false;
      return true;
    });
  };

  const replaceVariables = (content: string, vars: Record<string, string>) => {
    let result = content;
    Object.entries(vars).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });
    return result;
  };

  return { templates, loading, create, update, remove, getTemplatesForContext, replaceVariables, refetch: fetch };
}
