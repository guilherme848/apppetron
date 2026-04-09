import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from './useTeamMembers';
import { useJobRoles } from './useJobRoles';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type UserRole = 'director' | 'designer' | 'videomaker' | 'social' | 'traffic' | 'cs' | 'commercial' | 'support' | 'admin';

export interface Alert {
  id: string;
  severity: 'danger' | 'warning';
  text: string;
  actionPath?: string;
  actionLabel?: string;
}

export interface ActivityItem {
  id: string;
  tipo: string;
  descricao: string;
  usuario_name?: string;
  cliente_name?: string;
  referencia_id?: string;
  referencia_tipo?: string;
  created_at: string;
}

export interface WeeklyHighlight {
  id: string;
  usuario_name?: string;
  cargo?: string;
  metrica: string;
  valor: number;
  descricao?: string;
}

export interface MyDayMetrics {
  forToday: number;
  overdue: number;
  inProgress: number;
  completedToday: number;
}

export interface PostTask {
  id: string;
  title: string;
  clientName?: string;
  clientId?: string;
  format?: string;
  status: string;
  dueDate?: string;
  daysOverdue?: number;
  batchId?: string;
}

export interface DirectorPillar {
  value: number;
  prevValue: number;
  variation: number; // percentage
}

function detectRole(roleName: string | null | undefined): UserRole {
  if (!roleName) return 'admin';
  const n = roleName.toLowerCase().trim();
  if (n.includes('diretor') || n.includes('sócio') || n.includes('gestão') || n.includes('admin')) return 'director';
  if (n.includes('designer')) return 'designer';
  if (n.includes('videomaker') || n.includes('video')) return 'videomaker';
  if (n.includes('social') || n.includes('redes')) return 'social';
  if (n.includes('tráfego') || n.includes('traffic') || n.includes('gestor de tráfego')) return 'traffic';
  if (n.includes('cs') || n.includes('customer') || n.includes('sucesso')) return 'cs';
  if (n.includes('comercial') || n.includes('vendas')) return 'commercial';
  if (n.includes('atendimento') || n.includes('suporte') || n.includes('support')) return 'support';
  return 'director';
}

function getWorkingDaysRemaining(): number {
  const today = new Date();
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: today, end: monthEnd });
  return days.filter(d => !isWeekend(d)).length;
}

function getWorkingDaysInMonth(): number {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  return days.filter(d => !isWeekend(d)).length;
}

function calcVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function useWelcomeCommandCenter() {
  const { member: currentMember, loading: authLoading, isAdmin } = useAuth();
  const { members, loading: membersLoading } = useTeamMembers();
  const { roles } = useJobRoles();
  const [loading, setLoading] = useState(true);
  const [aiPhrase, setAiPhrase] = useState<string | null>(null);
  const [aiPhraseLoading, setAiPhraseLoading] = useState(false);

  // Director data
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [highlights, setHighlights] = useState<WeeklyHighlight[]>([]);
  const [contentPillar, setContentPillar] = useState<DirectorPillar>({ value: 0, prevValue: 0, variation: 0 });
  const [mediaPillar, setMediaPillar] = useState<DirectorPillar>({ value: 0, prevValue: 0, variation: 0 });
  const [contractsPillar, setContractsPillar] = useState<DirectorPillar>({ value: 0, prevValue: 0, variation: 0 });

  // Keep legacy for AI phrase
  const [monthDeliveries, setMonthDeliveries] = useState(0);
  const [monthGoal, setMonthGoal] = useState(0);

  // Execution data
  const [myDayMetrics, setMyDayMetrics] = useState<MyDayMetrics>({ forToday: 0, overdue: 0, inProgress: 0, completedToday: 0 });
  const [myPosts, setMyPosts] = useState<PostTask[]>([]);
  const [monthlyDeliveries, setMonthlyDeliveries] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [avgPerDay, setAvgPerDay] = useState(0);

  const currentMemberId = currentMember?.id || null;
  const roleName = useMemo(() => {
    if (!currentMember?.role_id || !roles.length) return null;
    const role = roles.find(r => r.id === currentMember.role_id);
    return role?.name || null;
  }, [currentMember, roles]);

  const userRole = useMemo(() => detectRole(roleName), [roleName]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const userName = currentMember?.full_name?.split(' ')[0] || currentMember?.name?.split(' ')[0] || 'Usuário';
  const today = new Date();
  const formattedDate = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const workingDaysRemaining = getWorkingDaysRemaining();
  const currentMonth = format(today, 'MMMM', { locale: ptBR });
  const prevMonthDate = subMonths(today, 1);
  const prevMonthName = format(prevMonthDate, 'MMMM', { locale: ptBR });

  // Fetch data based on role
  const fetchData = useCallback(async () => {
    if (!currentMemberId) return;
    setLoading(true);
    const todayStr = format(today, 'yyyy-MM-dd');
    const monthRef = format(today, 'yyyy-MM');
    const monthStart = `${monthRef}-01`;
    const prevMonthRef = format(prevMonthDate, 'yyyy-MM');
    const prevMonthStart = `${prevMonthRef}-01`;
    const prevMonthEnd = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd');

    try {
      if (userRole === 'director' || isAdmin) {
        // Parallel fetch all director data
        const [
          postsRes, activityRes,
          doneCountRes, prevDoneCountRes,
          activeAccountsRes,
          newContractsRes, prevContractsRes,
        ] = await Promise.all([
          // Open posts for alerts
          supabase
            .from('content_posts')
            .select('id, title, status, due_date, data_conclusao, assignee_id, batch_id')
            .is('data_conclusao', null)
            .not('status', 'eq', 'done')
            .or('archived.is.null,archived.eq.false')
            .limit(500),
          // Activity feed
          supabase
            .from('atividade_sistema')
            .select('*, team_members:usuario_id(name), accounts:cliente_id(name)')
            .order('created_at', { ascending: false })
            .limit(10),
          // Content pillar: current month
          supabase
            .from('content_posts')
            .select('id', { count: 'exact', head: true })
            .not('data_conclusao', 'is', null)
            .gte('data_conclusao', monthStart)
            .or('archived.is.null,archived.eq.false'),
          // Content pillar: previous month
          supabase
            .from('content_posts')
            .select('id', { count: 'exact', head: true })
            .not('data_conclusao', 'is', null)
            .gte('data_conclusao', prevMonthStart)
            .lte('data_conclusao', prevMonthEnd)
            .or('archived.is.null,archived.eq.false'),
          // Media pillar: active accounts with budget
          supabase
            .from('accounts')
            .select('ad_monthly_budget, start_date')
            .eq('status', 'active')
            .is('deleted_at', null)
            .or('cliente_interno.is.null,cliente_interno.eq.false'),
          // Contracts pillar: current month
          supabase
            .from('accounts')
            .select('id', { count: 'exact', head: true })
            .gte('start_date', monthStart)
            .is('deleted_at', null)
            .or('cliente_interno.is.null,cliente_interno.eq.false'),
          // Contracts pillar: previous month
          supabase
            .from('accounts')
            .select('id', { count: 'exact', head: true })
            .gte('start_date', prevMonthStart)
            .lte('start_date', prevMonthEnd)
            .is('deleted_at', null)
            .or('cliente_interno.is.null,cliente_interno.eq.false'),
        ]);

        // ─── Content Pillar ───
        const currentContent = doneCountRes.count || 0;
        const prevContent = prevDoneCountRes.count || 0;
        setContentPillar({
          value: currentContent,
          prevValue: prevContent,
          variation: calcVariation(currentContent, prevContent),
        });
        setMonthDeliveries(currentContent);

        // ─── Media Pillar ───
        const activeAccounts = activeAccountsRes.data || [];
        const currentMediaTotal = activeAccounts.reduce((sum: number, a: any) => sum + (a.ad_monthly_budget || 0), 0);
        // For prev month comparison, we use the same active accounts (simplified)
        setMediaPillar({
          value: currentMediaTotal,
          prevValue: currentMediaTotal, // Same accounts, no historical tracking
          variation: 0,
        });

        // ─── Contracts Pillar ───
        const currentContracts = newContractsRes.count || 0;
        const prevContracts = prevContractsRes.count || 0;
        setContractsPillar({
          value: currentContracts,
          prevValue: prevContracts,
          variation: calcVariation(currentContracts, prevContracts),
        });

        // ─── Alerts ───
        const openPosts = postsRes.data || [];
        const alertsList: Alert[] = [];
        const overdueByAssignee: Record<string, number> = {};
        openPosts.forEach(p => {
          if (p.due_date && p.due_date < todayStr && p.assignee_id) {
            overdueByAssignee[p.assignee_id] = (overdueByAssignee[p.assignee_id] || 0) + 1;
          }
        });

        Object.entries(overdueByAssignee).forEach(([memberId, count]) => {
          if (count > 3) {
            const member = members.find(m => m.id === memberId);
            alertsList.push({
              id: `overdue-${memberId}`,
              severity: 'danger',
              text: `${member?.name || 'Profissional'} tem ${count} posts atrasados`,
              actionPath: '/content/dashboard',
              actionLabel: 'Ver',
            });
          }
        });

        setAlerts(alertsList);

        // ─── Activities ───
        const acts = (activityRes.data || []).map((a: any) => ({
          id: a.id,
          tipo: a.tipo,
          descricao: a.descricao,
          usuario_name: a.team_members?.name,
          cliente_name: a.accounts?.name,
          referencia_id: a.referencia_id,
          referencia_tipo: a.referencia_tipo,
          created_at: a.created_at,
        }));
        setActivities(acts);

      } else {
        // Execution roles: fetch my posts
        const { data: myPostsData } = await supabase
          .from('content_posts')
          .select('id, title, status, due_date, data_conclusao, format, batch_id, content_batches!inner(client_id, month_ref, accounts!inner(name))')
          .eq('assignee_id', currentMemberId)
          .is('data_conclusao', null)
          .not('status', 'eq', 'done')
          .or('archived.is.null,archived.eq.false')
          .order('due_date', { ascending: true });

        const posts = (myPostsData || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          clientName: p.content_batches?.accounts?.name,
          clientId: p.content_batches?.client_id,
          format: p.format,
          status: p.status,
          dueDate: p.due_date,
          batchId: p.batch_id,
          daysOverdue: p.due_date && p.due_date < todayStr ? differenceInDays(today, parseISO(p.due_date)) : 0,
        }));
        setMyPosts(posts);

        const forToday = posts.filter(p => p.dueDate === todayStr).length;
        const overdue = posts.filter(p => p.dueDate && p.dueDate < todayStr).length;
        const inProgress = posts.filter(p => p.status === 'doing').length;

        const { count: completedToday } = await supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', currentMemberId)
          .gte('data_conclusao', todayStr);
        
        setMyDayMetrics({ forToday, overdue, inProgress, completedToday: completedToday || 0 });

        const { count: monthDone } = await supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', currentMemberId)
          .not('data_conclusao', 'is', null)
          .gte('data_conclusao', `${monthRef}-01`);
        
        setMonthlyDeliveries(monthDone || 0);

        const roleKey = userRole === 'designer' ? 'designer' : userRole === 'videomaker' ? 'videomaker' : 'social';
        const { data: goalData } = await supabase
          .from('metas_producao_diaria')
          .select('meta_diaria')
          .eq('cargo', roleKey)
          .maybeSingle();

        const dailyGoal = goalData?.meta_diaria || 3;
        setMonthlyGoal(dailyGoal * getWorkingDaysInMonth());
        
        const workingDaysPassed = getWorkingDaysInMonth() - workingDaysRemaining;
        setAvgPerDay(workingDaysPassed > 0 ? Math.round(((monthDone || 0) / workingDaysPassed) * 10) / 10 : 0);
      }
    } catch (error) {
      console.error('Error fetching welcome command center data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMemberId, userRole, isAdmin, members]);

  // Fetch AI phrase (once per session)
  const fetchAiPhrase = useCallback(async () => {
    const cacheKey = `ai_phrase_${format(today, 'yyyy-MM-dd')}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setAiPhrase(cached);
      return;
    }

    setAiPhraseLoading(true);
    try {
      const contextData = [
        `- Conteúdos entregues no mês: ${contentPillar.value}`,
        `- Variação vs mês anterior: ${contentPillar.variation > 0 ? '+' : ''}${contentPillar.variation}%`,
        `- Investimento em mídia total: R$ ${mediaPillar.value.toLocaleString('pt-BR')}`,
        `- Contratos fechados no mês: ${contractsPillar.value}`,
        `- Alertas ativos: ${alerts.length}`,
        `- Dias úteis restantes: ${workingDaysRemaining}`,
      ].join('\n');

      const { data, error } = await supabase.functions.invoke('welcome-ai-phrase', {
        body: { contextData, userName },
      });

      if (!error && data?.phrase) {
        setAiPhrase(data.phrase);
        sessionStorage.setItem(cacheKey, data.phrase);
      }
    } catch {
      // Fallback handled in component
    } finally {
      setAiPhraseLoading(false);
    }
  }, [contentPillar.value, contentPillar.variation, mediaPillar.value, contractsPillar.value, alerts.length, workingDaysRemaining, userName]);

  useEffect(() => {
    if (!authLoading && !membersLoading && currentMemberId) {
      fetchData();
    }
  }, [authLoading, membersLoading, currentMemberId, fetchData]);

  useEffect(() => {
    if (!loading && currentMemberId) {
      fetchAiPhrase();
    }
  }, [loading, currentMemberId]);

  // Quick action: change post status
  const changePostStatus = useCallback(async (postId: string, newStatus: string) => {
    const { error } = await supabase
      .from('content_posts')
      .update({ status: newStatus })
      .eq('id', postId);
    
    if (!error) {
      setMyPosts(prev => prev.filter(p => p.id !== postId));
      setMyDayMetrics(prev => ({
        ...prev,
        completedToday: newStatus === 'done' ? prev.completedToday + 1 : prev.completedToday,
        forToday: prev.forToday > 0 ? prev.forToday - 1 : 0,
      }));
    }
    return !error;
  }, []);

  return {
    loading: loading || authLoading || membersLoading,
    userRole,
    roleName,
    greeting,
    userName,
    capitalizedDate,
    currentMonth,
    prevMonthName,
    workingDaysRemaining,

    // AI phrase
    aiPhrase,
    aiPhraseLoading,

    // Director pillars
    contentPillar,
    mediaPillar,
    contractsPillar,

    // Director
    alerts,
    activities,
    highlights,
    monthDeliveries,
    monthGoal,

    // Execution
    myDayMetrics,
    myPosts,
    monthlyDeliveries,
    monthlyGoal,
    punctuality,
    avgPerDay,

    // Actions
    changePostStatus,

    // Birthday data
    currentMember,
    members,
  };
}
