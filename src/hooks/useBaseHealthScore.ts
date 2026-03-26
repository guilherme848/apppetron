import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, parseISO, differenceInMonths } from 'date-fns';

interface ScoreComponent {
  key: string;
  label: string;
  weight: number;
}

interface NormalizationRules {
  churn_rate: { excellent: number; good: number; warning: number; critical: number };
  avg_lt_active: { excellent: number; good: number; warning: number; critical: number };
  cohort_retention: { excellent: number; good: number; warning: number; critical: number };
  base_distribution: { max_plan_concentration: number; max_niche_concentration: number; min_mature_lt_months: number };
}

interface ScoreConfig {
  id: string;
  name: string;
  components: ScoreComponent[];
  normalization_rules: NormalizationRules;
  green_threshold: number;
  yellow_threshold: number;
}

interface ComponentScore {
  key: string;
  label: string;
  weight: number;
  rawValue: number;
  normalizedScore: number;
  weightedScore: number;
}

interface HistoryPoint {
  period_start: string;
  period_end: string;
  score_value: number;
  created_at: string;
}

export function useBaseHealthScore() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ScoreConfig | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch config
        const { data: configData } = await supabase
          .from('base_health_score_config')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();

        if (configData) {
          setConfig({
            id: configData.id,
            name: configData.name,
            components: configData.components as unknown as ScoreComponent[],
            normalization_rules: configData.normalization_rules as unknown as NormalizationRules,
            green_threshold: configData.green_threshold,
            yellow_threshold: configData.yellow_threshold,
          });
        }

        // Fetch accounts
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, status, start_date, churned_at, service_id, niche_id, deleted_at, cliente_interno')
          .is('deleted_at', null)
          .or('cliente_interno.is.null,cliente_interno.eq.false');

        setAccounts(accountsData || []);

        // Fetch history (last 12 months)
        const { data: historyData } = await supabase
          .from('base_health_score_history')
          .select('period_start, period_end, score_value, created_at')
          .order('period_start', { ascending: true })
          .limit(12);

        setHistory(historyData || []);
      } catch (error) {
        console.error('Error fetching base health score data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const scoreData = useMemo(() => {
    if (!config || accounts.length === 0) {
      return {
        totalScore: 0,
        components: [],
        status: 'unknown' as const,
        statusLabel: 'Sem dados',
      };
    }

    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = endOfMonth(now);

    // Active clients
    const activeClients = accounts.filter((a) => a.status === 'active');
    const activeCount = activeClients.length;

    // Churns in period
    const churnsThisPeriod = accounts.filter((a) => {
      if (a.status !== 'canceled' || !a.churned_at) return false;
      const churnDate = parseISO(a.churned_at);
      return churnDate >= periodStart && churnDate <= periodEnd;
    });

    // Calculate each metric
    const rawMetrics: Record<string, number> = {};
    const componentScores: ComponentScore[] = [];

    const rules = config.normalization_rules;

    config.components.forEach((comp) => {
      let rawValue = 0;
      let normalizedScore = 0;

      switch (comp.key) {
        case 'churn_rate': {
          // Churn rate = churns / (active + churns at start)
          const startActiveCount = activeCount + churnsThisPeriod.length;
          rawValue = startActiveCount > 0 ? (churnsThisPeriod.length / startActiveCount) * 100 : 0;
          rawMetrics.churn_rate = rawValue;

          // Lower is better: excellent <= 2%, critical >= 8%
          const r = rules.churn_rate;
          if (rawValue <= r.excellent) normalizedScore = 100;
          else if (rawValue <= r.good) normalizedScore = 85;
          else if (rawValue <= r.warning) normalizedScore = 60;
          else if (rawValue <= r.critical) normalizedScore = 30;
          else normalizedScore = 10;
          break;
        }

        case 'avg_lt_active': {
          // Average LT of active clients in months
          const lts = activeClients
            .filter((a) => a.start_date)
            .map((a) => differenceInMonths(now, parseISO(a.start_date)));
          rawValue = lts.length > 0 ? lts.reduce((s, v) => s + v, 0) / lts.length : 0;
          rawMetrics.avg_lt_active = rawValue;

          // Higher is better
          const r = rules.avg_lt_active;
          if (rawValue >= r.excellent) normalizedScore = 100;
          else if (rawValue >= r.good) normalizedScore = 80;
          else if (rawValue >= r.warning) normalizedScore = 55;
          else if (rawValue >= r.critical) normalizedScore = 30;
          else normalizedScore = 15;
          break;
        }

        case 'cohort_retention': {
          // Calculate avg retention at M3 for last 6 cohorts
          const cohortRetentions: number[] = [];
          for (let i = 3; i <= 8; i++) {
            const cohortMonth = subMonths(now, i);
            const cohortStart = startOfMonth(cohortMonth);
            const cohortEnd = endOfMonth(cohortMonth);

            const cohortClients = accounts.filter((a) => {
              if (!a.start_date) return false;
              const entryDate = parseISO(a.start_date);
              return entryDate >= cohortStart && entryDate <= cohortEnd;
            });

            if (cohortClients.length === 0) continue;

            // Check how many still active at M3
            const targetDate = endOfMonth(subMonths(now, i - 3));
            const stillActive = cohortClients.filter((a) => {
              if (a.status === 'active') return true;
              if (a.churned_at) {
                return parseISO(a.churned_at) > targetDate;
              }
              return true;
            }).length;

            cohortRetentions.push((stillActive / cohortClients.length) * 100);
          }

          rawValue = cohortRetentions.length > 0
            ? cohortRetentions.reduce((s, v) => s + v, 0) / cohortRetentions.length
            : 0;
          rawMetrics.cohort_retention = rawValue;

          // Higher is better
          const r = rules.cohort_retention;
          if (rawValue >= r.excellent) normalizedScore = 100;
          else if (rawValue >= r.good) normalizedScore = 75;
          else if (rawValue >= r.warning) normalizedScore = 50;
          else if (rawValue >= r.critical) normalizedScore = 25;
          else normalizedScore = 10;
          break;
        }

        case 'base_distribution': {
          // Check concentration risk
          const r = rules.base_distribution;

          // Plan concentration
          const planCounts: Record<string, number> = {};
          activeClients.forEach((a) => {
            const key = a.service_id || 'none';
            planCounts[key] = (planCounts[key] || 0) + 1;
          });
          const maxPlanConcentration = activeCount > 0
            ? (Math.max(...Object.values(planCounts)) / activeCount) * 100
            : 0;

          // Niche concentration
          const nicheCounts: Record<string, number> = {};
          activeClients.forEach((a) => {
            const key = a.niche_id || 'none';
            nicheCounts[key] = (nicheCounts[key] || 0) + 1;
          });
          const maxNicheConcentration = activeCount > 0
            ? (Math.max(...Object.values(nicheCounts)) / activeCount) * 100
            : 0;

          // Immature clients (LT < 3 months)
          const immatureClients = activeClients.filter((a) => {
            if (!a.start_date) return true;
            return differenceInMonths(now, parseISO(a.start_date)) < r.min_mature_lt_months;
          }).length;
          const immaturePercentage = activeCount > 0 ? (immatureClients / activeCount) * 100 : 0;

          // Composite distribution score
          let distributionScore = 100;
          if (maxPlanConcentration > r.max_plan_concentration) {
            distributionScore -= 20;
          }
          if (maxNicheConcentration > r.max_niche_concentration) {
            distributionScore -= 20;
          }
          if (immaturePercentage > 40) {
            distributionScore -= 30;
          } else if (immaturePercentage > 25) {
            distributionScore -= 15;
          }

          rawValue = Math.max(0, distributionScore);
          normalizedScore = rawValue;
          rawMetrics.base_distribution = rawValue;
          rawMetrics.plan_concentration = maxPlanConcentration;
          rawMetrics.niche_concentration = maxNicheConcentration;
          rawMetrics.immature_percentage = immaturePercentage;
          break;
        }
      }

      componentScores.push({
        key: comp.key,
        label: comp.label,
        weight: comp.weight,
        rawValue,
        normalizedScore,
        weightedScore: (normalizedScore * comp.weight) / 100,
      });
    });

    const totalScore = Math.round(
      componentScores.reduce((sum, c) => sum + c.weightedScore, 0)
    );

    let status: 'healthy' | 'attention' | 'risk' | 'unknown';
    let statusLabel: string;

    if (totalScore >= config.green_threshold) {
      status = 'healthy';
      statusLabel = 'Base saudável';
    } else if (totalScore >= config.yellow_threshold) {
      status = 'attention';
      statusLabel = 'Atenção à retenção';
    } else {
      status = 'risk';
      statusLabel = 'Risco de churn';
    }

    return {
      totalScore,
      components: componentScores,
      status,
      statusLabel,
      rawMetrics,
      config,
    };
  }, [config, accounts]);

  return {
    loading,
    ...scoreData,
    history,
    config,
  };
}
