import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OverviewClient {
  id: string;
  name: string;
  ad_monthly_budget: number | null;
  traffic_member_id: string | null;
}

interface OverviewOptimization {
  id: string;
  client_id: string;
  task_type: string;
  description: string | null;
  tempo_gasto_minutos: number;
  optimization_date: string;
  created_at: string;
}

interface BalanceRow {
  client_id: string;
  balance: number | null;
}

interface CreativeRequestRow {
  id: string;
  client_id: string;
  title: string;
  status: string;
}

export function useTrafficOverview() {
  const { user, isAdmin } = useAuth();
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [clients, setClients] = useState<OverviewClient[]>([]);
  const [optimizations, setOptimizations] = useState<OverviewOptimization[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [creativeRequests, setCreativeRequests] = useState<CreativeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current member
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('team_members')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCurrentMemberId(data.id);
      });
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    if (!currentMemberId) return;
    setLoading(true);

    // Fetch active clients assigned to this manager
    const clientsQuery = supabase
      .from('accounts')
      .select('id, name, ad_monthly_budget, traffic_member_id')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (!isAdmin) {
      clientsQuery.eq('traffic_member_id', currentMemberId);
    }

    const [clientsRes, optsRes, balancesRes, creativesRes] = await Promise.all([
      clientsQuery,
      supabase
        .from('traffic_optimizations')
        .select('id, client_id, task_type, description, tempo_gasto_minutos, optimization_date, created_at')
        .eq('member_id', currentMemberId)
        .order('optimization_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('meta_ad_account_snapshots')
        .select('ad_account_id, balance, fetched_at')
        .order('fetched_at', { ascending: false }),
      supabase
        .from('traffic_creative_requests')
        .select('id, client_id, title, status')
        .in('status', ['pending', 'in_progress']),
    ]);

    if (clientsRes.data) setClients(clientsRes.data as OverviewClient[]);
    if (optsRes.data) setOptimizations(optsRes.data as OverviewOptimization[]);

    // Map balances by client via client_meta_ad_accounts
    if (balancesRes.data) {
      // Fetch client-adAccount links
      const { data: links } = await supabase
        .from('client_meta_ad_accounts')
        .select('client_id, ad_account_id')
        .eq('active', true);

      if (links) {
        const latestByAccount = new Map<string, number | null>();
        for (const snap of balancesRes.data as any[]) {
          if (!latestByAccount.has(snap.ad_account_id)) {
            latestByAccount.set(snap.ad_account_id, snap.balance);
          }
        }

        const clientBalances: BalanceRow[] = [];
        for (const link of links) {
          const bal = latestByAccount.get(link.ad_account_id);
          if (bal !== undefined) {
            clientBalances.push({ client_id: link.client_id, balance: bal });
          }
        }
        setBalances(clientBalances);
      }
    }

    if (creativesRes.data) setCreativeRequests(creativesRes.data as CreativeRequestRow[]);

    setLoading(false);
  }, [currentMemberId, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Week boundaries (Monday-Sunday)
  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  }, []);

  const myClientIds = useMemo(() => {
    if (isAdmin) return clients.map(c => c.id);
    return clients.filter(c => c.traffic_member_id === currentMemberId).map(c => c.id);
  }, [clients, currentMemberId, isAdmin]);

  const myClients = useMemo(() => {
    return clients.filter(c => myClientIds.includes(c.id));
  }, [clients, myClientIds]);

  // KPIs
  const totalActiveClients = myClients.length;

  const lowBalanceClients = useMemo(() => {
    return myClients.filter(c => {
      if (!c.ad_monthly_budget || c.ad_monthly_budget <= 0) return false;
      const bal = balances.find(b => b.client_id === c.id);
      if (!bal || bal.balance === null) return false;
      return bal.balance < c.ad_monthly_budget * 0.2;
    });
  }, [myClients, balances]);

  const todayCheckins = useMemo(() => {
    return optimizations.filter(o => o.optimization_date === todayStr && o.task_type === 'checkin');
  }, [optimizations, todayStr]);

  const clientsWithoutCheckin = useMemo(() => {
    const checkedClientIds = new Set(todayCheckins.map(o => o.client_id));
    return myClients.filter(c => !checkedClientIds.has(c.id));
  }, [myClients, todayCheckins]);

  const weekOptimizations = useMemo(() => {
    return optimizations.filter(o => o.optimization_date >= weekStart);
  }, [optimizations, weekStart]);

  // Alerts
  const pendingCreatives = useMemo(() => {
    return creativeRequests.filter(cr => myClientIds.includes(cr.client_id));
  }, [creativeRequests, myClientIds]);

  // Recent optimizations (this week)
  const recentOptimizations = useMemo(() => {
    return weekOptimizations.slice(0, 20).map(o => ({
      ...o,
      clientName: clients.find(c => c.id === o.client_id)?.name || '—',
    }));
  }, [weekOptimizations, clients]);

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || '—';
  const getClientBalance = (clientId: string) => balances.find(b => b.client_id === clientId)?.balance ?? null;

  return {
    loading,
    totalActiveClients,
    lowBalanceClients,
    todayCheckins,
    clientsWithoutCheckin,
    weekOptimizations,
    pendingCreatives,
    recentOptimizations,
    getClientName,
    getClientBalance,
    refetch: fetchData,
  };
}
