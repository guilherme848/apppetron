import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeamMembers } from './useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';

export interface BirthdayMember {
  id: string;
  name: string;
  full_name: string | null;
  birth_date: string;
  profile_photo_path: string | null;
  day: number;
  isToday: boolean;
  isCurrentUser: boolean;
}

export interface NextStepItem {
  type: 'birthday' | 'meeting' | 'onboarding' | 'cs_followup' | 'nps' | 'balance_critical';
  priority: number;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
  detailsPath?: string;
  data?: any;
}

export interface RoutineMetrics {
  pendencias: {
    aFazer: number;
    emAndamento: number;
    delegado: number;
  };
  cs: {
    onboardingsAtivos: number;
    acompanhamentosAtrasados: number;
  };
  nps: {
    pesquisasPendentes: number;
  };
}

export function useWelcomeData() {
  const { members, loading: membersLoading } = useTeamMembers();
  const { member: currentMember, loading: authLoading } = useAuth();
  const currentMemberId = currentMember?.id || null;
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RoutineMetrics>({
    pendencias: { aFazer: 0, emAndamento: 0, delegado: 0 },
    cs: { onboardingsAtivos: 0, acompanhamentosAtrasados: 0 },
    nps: { pesquisasPendentes: 0 },
  });
  const [nextStepItems, setNextStepItems] = useState<NextStepItem[]>([]);
  const [todayMeetings, setTodayMeetings] = useState<any[]>([]);
  const [lowBalanceAccounts, setLowBalanceAccounts] = useState<any[]>([]);

  // Birthday members for current month
  const birthdayMembers = useMemo((): BirthdayMember[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    
    return members
      .filter(m => m.active && m.birth_date)
      .map(m => {
        const birthDate = parseISO(m.birth_date!);
        const day = birthDate.getDate();
        const month = birthDate.getMonth();
        
        // Check if birthday is this month
        if (month !== currentMonth) return null;
        
        // Check if today is the birthday
        const todayBirthday = day === now.getDate() && month === now.getMonth();
        
        return {
          id: m.id,
          name: m.name,
          full_name: m.full_name,
          birth_date: m.birth_date!,
          profile_photo_path: m.profile_photo_path,
          day,
          isToday: todayBirthday,
          isCurrentUser: m.id === currentMemberId,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Today first, then current user, then by day
        if (a!.isToday && !b!.isToday) return -1;
        if (!a!.isToday && b!.isToday) return 1;
        if (a!.isCurrentUser && !b!.isCurrentUser) return -1;
        if (!a!.isCurrentUser && b!.isCurrentUser) return 1;
        return a!.day - b!.day;
      }) as BirthdayMember[];
  }, [members, currentMemberId]);

  const isUserBirthdayToday = useMemo(() => {
    if (!currentMember?.birth_date) return false;
    const birthDate = parseISO(currentMember.birth_date);
    const now = new Date();
    return birthDate.getDate() === now.getDate() && birthDate.getMonth() === now.getMonth();
  }, [currentMember]);

  const isUserBirthdayMonth = useMemo(() => {
    if (!currentMember?.birth_date) return false;
    const birthDate = parseISO(currentMember.birth_date);
    return birthDate.getMonth() === new Date().getMonth();
  }, [currentMember]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');

    try {
      // Fetch tasks/posts assigned to current user
      const [postsRes, onboardingsRes, meetingsRes, npsRes, balanceRes] = await Promise.all([
        // Content posts for current user
        supabase
          .from('content_posts')
          .select('id, status, assignee_id')
          .eq('assignee_id', currentMemberId)
          .neq('status', 'done')
          .or('archived.is.null,archived.eq.false'),
        
        // Active onboardings
        supabase
          .from('cs_client_onboarding')
          .select('id, status, expected_end_at')
          .in('status', ['not_started', 'in_progress']),
        
        // Today meetings
        supabase
          .from('cs_meetings')
          .select('id, meeting_date, type, status, client_id, accounts:client_id(name)')
          .eq('meeting_date', todayStr)
          .neq('status', 'completed'),
        
        // NPS pending (no response in current quarter)
        supabase
          .from('cs_nps_responses')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Low balance accounts (Pix/Boleto only)
        supabase
          .from('client_meta_ad_accounts')
          .select(`
            id,
            ad_account_id,
            client_id,
            accounts:client_id(name, ad_payment_method)
          `)
          .eq('active', true),
      ]);

      // Calculate metrics
      const posts = postsRes.data || [];
      const aFazer = posts.filter(p => p.status === 'backlog' || p.status === 'todo').length;
      const emAndamento = posts.filter(p => p.status === 'in_progress' || p.status === 'review').length;
      const delegado = posts.filter(p => p.assignee_id && p.assignee_id !== currentMemberId).length;

      const onboardings = onboardingsRes.data || [];
      const onboardingsAtivos = onboardings.length;
      const acompanhamentosAtrasados = onboardings.filter(o => 
        o.expected_end_at && isBefore(parseISO(o.expected_end_at), today)
      ).length;

      const meetings = meetingsRes.data || [];
      setTodayMeetings(meetings);

      setMetrics({
        pendencias: { aFazer, emAndamento, delegado },
        cs: { onboardingsAtivos, acompanhamentosAtrasados },
        nps: { pesquisasPendentes: 0 }, // Simplified for now
      });

      // Build next step items
      const items: NextStepItem[] = [];

      // Priority 1: User birthday (handled separately)
      
      // Priority 2: Meeting today
      if (meetings.length > 0) {
        const meeting = meetings[0];
        items.push({
          type: 'meeting',
          priority: 2,
          title: 'Reunião agendada para hoje',
          description: `${meeting.type === 'monthly' ? 'Reunião mensal' : 'Reunião'} com ${(meeting as any).accounts?.name || 'cliente'}`,
          actionLabel: 'Ver reunião',
          actionPath: '/cs/meetings',
          data: meeting,
        });
      }

      // Priority 3: Onboarding tasks pending
      if (onboardingsAtivos > 0) {
        items.push({
          type: 'onboarding',
          priority: 3,
          title: 'Onboardings ativos',
          description: `Você tem ${onboardingsAtivos} onboarding${onboardingsAtivos > 1 ? 's' : ''} em andamento`,
          actionLabel: 'Ver onboardings',
          actionPath: '/cs/onboarding',
        });
      }

      // Priority 4: CS follow-up overdue
      if (acompanhamentosAtrasados > 0) {
        items.push({
          type: 'cs_followup',
          priority: 4,
          title: 'Acompanhamentos atrasados',
          description: `${acompanhamentosAtrasados} acompanhamento${acompanhamentosAtrasados > 1 ? 's' : ''} precisa${acompanhamentosAtrasados > 1 ? 'm' : ''} de atenção`,
          actionLabel: 'Resolver agora',
          actionPath: '/cs/onboarding',
        });
      }

      setNextStepItems(items.sort((a, b) => a.priority - b.priority));

    } catch (error) {
      console.error('Error fetching welcome data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMemberId]);

  useEffect(() => {
    if (!membersLoading && !authLoading) {
      fetchMetrics();
    }
  }, [membersLoading, authLoading, fetchMetrics]);

  // Dynamic greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Contextual message
  const contextualMessage = useMemo(() => {
    const totalPending = metrics.pendencias.aFazer + metrics.pendencias.emAndamento;
    if (totalPending > 5) {
      return 'Vamos organizar seu dia em poucos passos.';
    }
    return 'Um bom dia para avançar com consistência.';
  }, [metrics]);

  const userName = currentMember?.full_name || currentMember?.name || 'Usuário';

  return {
    loading: loading || membersLoading || authLoading,
    greeting,
    userName,
    contextualMessage,
    metrics,
    nextStepItems,
    birthdayMembers,
    isUserBirthdayToday,
    isUserBirthdayMonth,
    currentMember,
    todayMeetings,
  };
}
