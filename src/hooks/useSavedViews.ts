import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  filters_json: Record<string, any>;
  created_at: string;
}

export function useSavedViews() {
  const { member } = useAuth();
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!member?.id) { setViews([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('traffic_saved_views')
      .select('*')
      .eq('user_id', member.id)
      .order('created_at', { ascending: false });
    setViews((data || []) as SavedView[]);
    setLoading(false);
  }, [member?.id]);

  const saveView = useCallback(async (name: string, filters: Record<string, any>) => {
    if (!member?.id) throw new Error('not authenticated');
    const { error } = await supabase
      .from('traffic_saved_views')
      .insert({ user_id: member.id, name, filters_json: filters, columns_json: [] });
    if (error) throw error;
    await load();
  }, [member?.id, load]);

  const deleteView = useCallback(async (id: string) => {
    await supabase.from('traffic_saved_views').delete().eq('id', id);
    await load();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { views, loading, saveView, deleteView, refresh: load };
}
