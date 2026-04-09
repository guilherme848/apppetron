import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScoringCriterion {
  id: string;
  group_key: string;
  group_label: string;
  criterion_key: string;
  criterion_label: string;
  points: number;
  active: boolean;
  sort_order: number;
}

export interface DealScore {
  id: string;
  deal_id: string;
  score: number;
  breakdown: Record<string, number>;
  calculated_at: string;
}

export function useLeadScoring() {
  const [criteria, setCriteria] = useState<ScoringCriterion[]>([]);
  const [scores, setScores] = useState<DealScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCriteria = useCallback(async () => {
    const { data } = await supabase
      .from('crm_scoring_config')
      .select('*')
      .order('sort_order');
    setCriteria((data as any[]) || []);
  }, []);

  const fetchScores = useCallback(async () => {
    const { data } = await supabase
      .from('crm_deal_scores')
      .select('*')
      .order('calculated_at', { ascending: false });
    setScores((data as any[]) || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCriteria(), fetchScores()]);
      setLoading(false);
    };
    load();
  }, [fetchCriteria, fetchScores]);

  const updateCriterion = async (id: string, updates: Partial<ScoringCriterion>) => {
    await supabase.from('crm_scoring_config').update(updates as any).eq('id', id);
    await fetchCriteria();
  };

  const getScoreForDeal = (dealId: string): number => {
    const dealScore = scores.find(s => s.deal_id === dealId);
    return dealScore?.score || 0;
  };

  const getScoreHistory = (dealId: string): DealScore[] => {
    return scores.filter(s => s.deal_id === dealId);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Hot', color: '#EF4444', pulse: true };
    if (score >= 70) return { label: 'Quente', color: '#0F766E', pulse: false };
    if (score >= 40) return { label: 'Morno', color: '#F4762D', pulse: false };
    return { label: 'Frio', color: '#94A3B8', pulse: false };
  };

  const recalculateAllScores = async (deals: any[], contacts: any[], activities: any[]) => {
    const activeCriteria = criteria.filter(c => c.active);
    const avgTicket = deals.length > 0 
      ? deals.reduce((s, d) => s + Number(d.value || 0), 0) / deals.length 
      : 0;

    for (const deal of deals.filter(d => d.status === 'open')) {
      let score = 0;
      const breakdown: Record<string, number> = {};
      const contact = contacts.find(c => c.id === deal.contact_id);
      const dealActivities = activities.filter(a => a.deal_id === deal.id);

      for (const c of activeCriteria) {
        let applies = false;
        switch (c.criterion_key) {
          case 'has_phone': applies = !!contact?.phone; break;
          case 'has_email': applies = !!contact?.email; break;
          case 'has_company': applies = !!contact?.company; break;
          case 'origin_referral': applies = contact?.origin === 'indicacao'; break;
          case 'origin_inbound': applies = contact?.origin === 'inbound'; break;
          case 'activity_answered': applies = dealActivities.some(a => a.result === 'answered'); break;
          case 'meeting_done': applies = dealActivities.some(a => a.type === 'meeting' && a.status === 'completed'); break;
          case 'proposal_sent': applies = dealActivities.some(a => a.result === 'converted' || a.title?.toLowerCase().includes('proposta')); break;
          case 'above_avg_ticket': applies = Number(deal.value || 0) > avgTicket; break;
          case 'above_2x_ticket': applies = Number(deal.value || 0) > avgTicket * 2; break;
          case 'overdue_3_plus': {
            const overdue = dealActivities.filter(a => a.status === 'pending' && a.scheduled_at && a.scheduled_at < new Date().toISOString());
            applies = overdue.length > 3;
            break;
          }
          case 'no_activity_7d': {
            const last = dealActivities.filter(a => a.completed_at).sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))[0];
            if (last) {
              const diff = (Date.now() - new Date(last.completed_at!).getTime()) / (1000 * 60 * 60 * 24);
              applies = diff > 7;
            } else {
              const daysSinceCreation = (Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24);
              applies = daysSinceCreation > 7;
            }
            break;
          }
          default: applies = false;
        }
        if (applies) {
          score += c.points;
          breakdown[c.criterion_key] = c.points;
        }
      }

      score = Math.max(0, Math.min(100, score));

      await supabase.from('crm_deal_scores').upsert({
        deal_id: deal.id,
        score,
        breakdown,
      } as any, { onConflict: 'deal_id' });
    }
    await fetchScores();
  };

  return {
    criteria,
    scores,
    loading,
    updateCriterion,
    getScoreForDeal,
    getScoreHistory,
    getScoreBadge,
    recalculateAllScores,
    refetch: fetchScores,
  };
}
