import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OverviewClient {
  id: string;
  name: string;
  ad_monthly_budget: number | null;
  ad_payment_method: string | null;
  traffic_member_id: string | null;
  service_id: string | null;
}

interface OverviewOptimization {
  id: string;
  client_id: string;
  member_id: string | null;
  task_type: string;
  description: string | null;
  tempo_gasto_minutos: number;
  optimization_date: string;
  created_at: string;
}

interface BalanceRow {
  client_id: string;
  available_balance: number | null;
}

interface CreativeRequestRow {
  id: string;
  client_id: string;
  title: string;
  status: string;
}

export interface ManagerStat {
  id: string;
  name: string;
  clientCount: number;
  checkinsToday: number;
  lowBalanceCount: number;
  weekOptimizations: number;
}

export function useTrafficOverview() {
  const { user, isAdmin } = useAuth();
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [clients, setClients] = useState<OverviewClient[]>([]);
  const [optimizations, setOptimizations] = useState<OverviewOptimization[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [creativeRequests, setCreativeRequests] = useState<CreativeRequestRow[]>([]);
  const [teamMembersMap, setTeamMembersMap] = useState<Map<string, string>>(new Map());
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

    // Fetch active clients with has_traffic = true (via service plan)
    const clientsQuery = supabase
      .from('accounts')
      .select('id, name, ad_monthly_budget, ad_payment_method, traffic_member_id, service_id, services!inner(has_traffic)')
      .eq('status', 'active')
      .is('deleted_at', null)
      .or('cliente_interno.is.null,cliente_interno.eq.false')
      .eq('services.has_traffic', true);

    if (!isAdmin) {
      clientsQuery.eq('traffic_member_id', currentMemberId);
    }

    // Optimizations: admin gets all, non-admin gets own
    const optsQuery = supabase
      .from('traffic_optimizations')
      .select('id, client_id, member_id, task_type, description, tempo_gasto_minutos, optimization_date, created_at')
      .order('optimization_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      optsQuery.eq('member_id', currentMemberId);
    }

    const [clientsRes, optsRes, balancesRes, creativesRes] = await Promise.all([
      clientsQuery,
      optsQuery,
      supabase
        .from('meta_ad_account_snapshots')
        .select('ad_account_id, available_balance, fetched_at')
        .order('fetched_at', { ascending: false }),
      supabase
        .from('traffic_creative_requests')
        .select('id, client_id, title, status')
        .in('status', ['pending', 'in_progress']),
    ]);

    const clientsData = (clientsRes.data || []) as OverviewClient[];
    setClients(clientsData);
    setOptimizations((optsRes.data || []) as OverviewOptimization[]);

    // Map balances by client via client_meta_ad_accounts
    if (balancesRes.data) {
      const { data: links } = await supabase
        .from('client_meta_ad_accounts')
        .select('client_id, ad_account_id')
        .eq('active', true);

      if (links) {
        const latestByAccount = new Map<string, number | null>();
        for (const snap of balancesRes.data as any[]) {
          if (!latestByAccount.has(snap.ad_account_id)) {
            latestByAccount.set(snap.ad_account_id, snap.available_balance);
          }
        }

        const clientBalances: BalanceRow[] = [];
        for (const link of links) {
          const bal = latestByAccount.get(link.ad_account_id);
          if (bal !== undefined) {
            clientBalances.push({ client_id: link.client_id, available_balance: bal });
          }
        }
        setBalances(clientBalances);
      }
    }

    if (creativesRes.data) setCreativeRequests(creativesRes.data as CreativeRequestRow[]);

    // Fetch team member names for manager stats
    const trafficMemberIds = [...new Set(
      clientsData.map(c => c.traffic_member_id).filter(Boolean) as string[]
    )];
    if (trafficMemberIds.length > 0) {
      const { data: members } = await supabase
        .from('team_members')
        .select('id, name')
        .in('id', trafficMemberIds);
      if (members) {
        const map = new Map<string, string>();
        members.forEach(m => map.set(m.id, m.name));
        setTeamMembersMap(map);
      }
    }

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

  const isLowBalance = useCallback((client: OverviewClient) => {
    if (!client.ad_monthly_budget || client.ad_monthly_budget <= 0) return false;
    // Cartão accounts: balance forced to 0, skip low balance
    const pm = (client.ad_payment_method || '').toLowerCase();
    if (pm === 'cartao' || pm === 'cartão' || pm === 'credit_card') return false;
    const bal = balances.find(b => b.client_id === client.id);
    if (!bal || bal.available_balance === null) return false;
    return bal.available_balance < client.ad_monthly_budget * 0.2;
  }, [balances]);

  const lowBalanceClients = useMemo(() => {
    return myClients.filter(isLowBalance);
  }, [myClients, isLowBalance]);

  const todayCheckins = useMemo(() => {
    return optimizations.filter(o =>
      o.optimization_date === todayStr &&
      o.task_type === 'checkin' &&
      (isAdmin || o.member_id === currentMemberId)
    );
  }, [optimizations, todayStr, isAdmin, currentMemberId]);

  const clientsWithoutCheckin = useMemo(() => {
    const checkedClientIds = new Set(todayCheckins.map(o => o.client_id));
    return myClients.filter(c => !checkedClientIds.has(c.id));
  }, [myClients, todayCheckins]);

  const weekOptimizations = useMemo(() => {
    return optimizations.filter(o =>
      o.optimization_date >= weekStart &&
      (isAdmin || o.member_id === currentMemberId)
    );
  }, [optimizations, weekStart, isAdmin, currentMemberId]);

  // Alerts
  const pendingCreatives = useMemo(() => {
    return creativeRequests.filter(cr => myClientIds.includes(cr.client_id));
  }, [creativeRequests, myClientIds]);

  // Recent optimizations (this week)
  const recentOptimizations = useMemo(() => {
    const myWeek = optimizations.filter(o =>
      o.optimization_date >= weekStart &&
      (isAdmin || o.member_id === currentMemberId)
    );
    return myWeek.slice(0, 20).map(o => ({
      ...o,
      clientName: clients.find(c => c.id === o.client_id)?.name || '—',
    }));
  }, [optimizations, weekStart, clients, isAdmin, currentMemberId]);

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || '—';
  const getClientBalance = (clientId: string) => balances.find(b => b.client_id === clientId)?.available_balance ?? null;
  const getClientBudget = (clientId: string) => clients.find(c => c.id === clientId)?.ad_monthly_budget ?? null;

  // ── Manager Stats (Visão por Gestores) ──
  const managerStats = useMemo((): ManagerStat[] => {
    const managers = new Map<string, ManagerStat>();

    // Group clients by traffic_member_id
    for (const client of clients) {
      if (!client.traffic_member_id) continue;
      if (!managers.has(client.traffic_member_id)) {
        managers.set(client.traffic_member_id, {
          id: client.traffic_member_id,
          name: teamMembersMap.get(client.traffic_member_id) || 'Gestor',
          clientCount: 0,
          checkinsToday: 0,
          lowBalanceCount: 0,
          weekOptimizations: 0,
        });
      }
      const stat = managers.get(client.traffic_member_id)!;
      stat.clientCount++;

      // Check low balance
      if (isLowBalance(client)) {
        stat.lowBalanceCount++;
      }
    }

    // Count check-ins per manager (today only, task_type = checkin)
    for (const opt of optimizations) {
      if (opt.optimization_date !== todayStr || opt.task_type !== 'checkin') continue;
      if (opt.member_id && managers.has(opt.member_id)) {
        managers.get(opt.member_id)!.checkinsToday++;
      }
    }

    // Count week optimizations per manager
    for (const opt of optimizations) {
      if (opt.optimization_date < weekStart) continue;
      if (opt.member_id && managers.has(opt.member_id)) {
        managers.get(opt.member_id)!.weekOptimizations++;
      }
    }

    let stats = [...managers.values()].sort((a, b) => b.clientCount - a.clientCount);
    if (!isAdmin && currentMemberId) {
      stats = stats.filter(s => s.id === currentMemberId);
    }

    return stats;
  }, [clients, optimizations, balances, teamMembersMap, todayStr, weekStart, isAdmin, currentMemberId, isLowBalance]);

  return {
    loading,
    isAdmin,
    totalActiveClients,
    lowBalanceClients,
    todayCheckins,
    clientsWithoutCheckin,
    weekOptimizations,
    pendingCreatives,
    recentOptimizations,
    managerStats,
    getClientName,
    getClientBalance,
    getClientBudget,
    refetch: fetchData,
  };
}
