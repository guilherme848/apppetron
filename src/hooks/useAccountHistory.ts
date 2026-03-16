import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AccountHistoryEvent {
  id: string;
  account_id: string;
  event_type: string;
  description: string | null;
  member_id: string | null;
  metadata: any;
  created_at: string;
  member_name?: string | null;
}

export function useAccountHistory(accountId: string | null | undefined) {
  const [events, setEvents] = useState<AccountHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!accountId) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('account_history')
      .select('*, team_members(name)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching account history:', error);
      setEvents([]);
    } else {
      setEvents((data || []).map((e: any) => ({
        ...e,
        member_name: e.team_members?.name || null,
      })));
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { events, loading, refetch: fetchHistory };
}
