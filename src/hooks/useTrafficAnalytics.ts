import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCrm } from '@/contexts/CrmContext';
import { useMetaAds } from './useMetaAds';
import { useTeamMembers } from './useTeamMembers';
import { useSettings } from '@/contexts/SettingsContext';
import {
  TrafficMetricCatalog,
  TrafficMetricTarget,
  TrafficScore,
  TrafficAlertRule,
  TrafficDashboardLayout,
  TrafficSavedView,
  AdAccountMetricsDaily,
  AccountPerformanceRow,
  HealthStatus,
  AccountAlert,
  BenchmarkData,
} from '@/types/trafficAnalytics';

export interface TrafficAnalyticsFilters {
  period: string;
  managerId: string;
  clientId: string;
  platform: string;
  objective: string;
  nicheId: string;
  status: string;
}

const defaultFilters: TrafficAnalyticsFilters = {
  period: '30',
  managerId: 'all',
  clientId: 'all',
  platform: 'meta',
  objective: 'all',
  nicheId: 'all',
  status: 'active',
};

export function useTrafficAnalytics() {
  const { member, isAdmin } = useAuth();
  const { accounts } = useCrm();
  const { adAccounts, clientLinks, getClientAdAccounts, getLatestSnapshot } = useMetaAds();
  const { members, getMemberById } = useTeamMembers();
  const { niches } = useSettings();

  // State
  const [metrics, setMetrics] = useState<TrafficMetricCatalog[]>([]);
  const [targets, setTargets] = useState<TrafficMetricTarget[]>([]);
  const [scores, setScores] = useState<TrafficScore[]>([]);
  const [alertRules, setAlertRules] = useState<TrafficAlertRule[]>([]);
  const [layouts, setLayouts] = useState<TrafficDashboardLayout[]>([]);
  const [savedViews, setSavedViews] = useState<TrafficSavedView[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<AdAccountMetricsDaily[]>([]);
  const [filters, setFilters] = useState<TrafficAnalyticsFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);

  // Fetch functions
  const fetchMetrics = useCallback(async () => {
    const { data } = await supabase
      .from('traffic_metric_catalog')
      .select('*')
      .order('default_order');
    setMetrics((data || []) as TrafficMetricCatalog[]);
  }, []);

  const fetchTargets = useCallback(async () => {
    const { data } = await supabase
      .from('traffic_metric_targets')
      .select('*');
    setTargets((data || []) as TrafficMetricTarget[]);
  }, []);

  const fetchScores = useCallback(async () => {
    const { data } = await supabase
      .from('traffic_scores')
      .select('*');
    setScores((data || []) as unknown as TrafficScore[]);
  }, []);

  const fetchAlertRules = useCallback(async () => {
    const { data } = await supabase
      .from('traffic_alert_rules')
      .select('*')
      .eq('is_active', true);
    setAlertRules((data || []) as TrafficAlertRule[]);
  }, []);

  const fetchLayouts = useCallback(async () => {
    const { data } = await supabase
      .from('traffic_dashboard_layout')
      .select('*');
    setLayouts((data || []) as unknown as TrafficDashboardLayout[]);
  }, []);

  const fetchSavedViews = useCallback(async () => {
    if (!member) return;
    const { data } = await supabase
      .from('traffic_saved_views')
      .select('*')
      .eq('user_id', member.id);
    setSavedViews((data || []) as unknown as TrafficSavedView[]);
  }, [member]);

  const fetchDailyMetrics = useCallback(async (startDate: string, endDate: string) => {
    const { data } = await supabase
      .from('ad_account_metrics_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    setDailyMetrics((data || []) as AdAccountMetricsDaily[]);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchTargets(),
      fetchScores(),
      fetchAlertRules(),
      fetchLayouts(),
      fetchSavedViews(),
    ]);
    setLoading(false);
  }, [fetchMetrics, fetchTargets, fetchScores, fetchAlertRules, fetchLayouts, fetchSavedViews]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Load daily metrics when period changes
  useEffect(() => {
    const days = parseInt(filters.period) || 30;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fetchDailyMetrics(startDate, endDate);
  }, [filters.period, fetchDailyMetrics]);

  // Active metrics (visible and active)
  const activeMetrics = useMemo(() => {
    return metrics.filter(m => m.is_active && (isAdmin || m.visible_for_managers));
  }, [metrics, isAdmin]);

  // Current layout
  const currentLayout = useMemo(() => {
    const objectiveLayout = layouts.find(l => l.scope === 'objective' && l.objective === filters.objective);
    return objectiveLayout || layouts.find(l => l.scope === 'global') || null;
  }, [layouts, filters.objective]);

  // Active score config
  const activeScore = useMemo(() => {
    return scores.find(s => s.is_active) || null;
  }, [scores]);

  // Calculate metric value from formula
  const calculateMetricValue = useCallback((
    metric: TrafficMetricCatalog,
    rawMetrics: Record<string, number>
  ): number | null => {
    if (metric.metric_type === 'simple') {
      return rawMetrics[metric.slug] ?? null;
    }

    if (!metric.formula || !metric.dependencies) return null;

    // Check all dependencies are available
    for (const dep of metric.dependencies) {
      if (rawMetrics[dep] === undefined || rawMetrics[dep] === null) {
        return null;
      }
    }

    // Evaluate formula safely
    try {
      let formula = metric.formula;
      for (const dep of metric.dependencies) {
        const value = rawMetrics[dep];
        if (value === 0 && formula.includes(`/ ${dep}`)) {
          return null; // Avoid division by zero
        }
        formula = formula.replace(new RegExp(dep, 'g'), value.toString());
      }
      // Simple eval for basic math expressions
      const result = Function(`"use strict"; return (${formula})`)();
      return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }, []);

  // Aggregate metrics for an account over the period
  const aggregateAccountMetrics = useCallback((
    adAccountId: string,
    periodDays: number
  ): Record<string, number> => {
    const accountMetrics = dailyMetrics.filter(m => m.ad_account_id === adAccountId);
    if (accountMetrics.length === 0) return {};

    const aggregated: Record<string, number> = {};
    
    // Sum all simple metrics
    for (const daily of accountMetrics) {
      for (const [key, value] of Object.entries(daily.metrics_json)) {
        if (typeof value === 'number') {
          aggregated[key] = (aggregated[key] || 0) + value;
        }
      }
    }

    return aggregated;
  }, [dailyMetrics]);

  // Determine health status based on targets or score
  const getHealthStatus = useCallback((
    metricValues: Record<string, number | null>,
    score: number | null
  ): HealthStatus => {
    if (score !== null && activeScore) {
      if (score >= activeScore.green_threshold) return 'green';
      if (score >= activeScore.yellow_threshold) return 'yellow';
      return 'red';
    }
    return 'yellow'; // Default when no score
  }, [activeScore]);

  // Check alerts for an account
  const checkAlerts = useCallback((
    metricValues: Record<string, number | null>
  ): AccountAlert[] => {
    const alerts: AccountAlert[] = [];

    for (const rule of alertRules) {
      const value = metricValues[rule.metric_slug];
      if (value === null || value === undefined) continue;

      let triggered = false;
      
      switch (rule.condition) {
        case 'gt':
          triggered = rule.threshold !== null && value > rule.threshold;
          break;
        case 'lt':
          triggered = rule.threshold !== null && value < rule.threshold;
          break;
        // Other conditions can be added as needed
      }

      if (triggered) {
        alerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          metricSlug: rule.metric_slug,
          severity: rule.severity,
          message: rule.message,
          actionHint: rule.action_hint,
        });
      }
    }

    return alerts;
  }, [alertRules]);

  // Build performance rows for the table
  const performanceRows = useMemo((): AccountPerformanceRow[] => {
    const rows: AccountPerformanceRow[] = [];
    const periodDays = parseInt(filters.period) || 30;

    // Filter accounts based on user permissions
    let filteredAccounts = accounts.filter(a => {
      // Status filter
      if (filters.status !== 'all' && a.status !== filters.status) return false;
      
      // Manager filter (for non-admins, only show assigned accounts)
      if (!isAdmin && member) {
        if (a.traffic_member_id !== member.id) return false;
      } else if (filters.managerId !== 'all') {
        if (a.traffic_member_id !== filters.managerId) return false;
      }

      // Client filter
      if (filters.clientId !== 'all' && a.id !== filters.clientId) return false;

      // Niche filter
      if (filters.nicheId !== 'all' && filters.nicheId !== '_none_') {
        if (a.niche_id !== filters.nicheId) return false;
      } else if (filters.nicheId === '_none_' && a.niche_id) {
        return false;
      }

      return true;
    });

    for (const account of filteredAccounts) {
      const accountAdAccounts = getClientAdAccounts(account.id);
      
      for (const adAccount of accountAdAccounts) {
        // Aggregate raw metrics
        const rawMetrics = aggregateAccountMetrics(adAccount.ad_account_id, periodDays);
        
        // Calculate all metric values
        const metricValues: Record<string, number | null> = {};
        for (const metric of activeMetrics) {
          metricValues[metric.slug] = calculateMetricValue(metric, rawMetrics);
        }

        // Calculate score (simplified - just average of weighted metrics)
        let score: number | null = null;
        if (activeScore) {
          const weights = activeScore.config_json.metrics;
          let totalWeight = 0;
          let weightedSum = 0;
          
          for (const { slug, weight } of weights) {
            const value = metricValues[slug];
            if (value !== null) {
              // Normalize based on targets (simplified)
              weightedSum += weight; // Placeholder - real normalization would use benchmarks
              totalWeight += weight;
            }
          }
          
          if (totalWeight > 0) {
            score = Math.round((weightedSum / totalWeight) * 100);
          }
        }

        // Check alerts
        const alerts = checkAlerts(metricValues);

        // Get health status
        const healthStatus = getHealthStatus(metricValues, score);

        // Manager info
        const manager = getMemberById(account.traffic_member_id || null);
        
        // Niche info
        const niche = niches.find(n => n.id === account.niche_id);

        rows.push({
          clientId: account.id,
          clientName: account.name,
          adAccountId: adAccount.ad_account_id,
          adAccountName: adAccount.name,
          managerId: account.traffic_member_id,
          managerName: manager?.name || null,
          platform: 'meta',
          nicheId: account.niche_id,
          nicheName: niche?.name || null,
          status: account.status,
          metrics: metricValues,
          score,
          healthStatus,
          alerts,
        });
      }
    }

    return rows;
  }, [
    accounts,
    filters,
    isAdmin,
    member,
    getClientAdAccounts,
    aggregateAccountMetrics,
    activeMetrics,
    calculateMetricValue,
    activeScore,
    checkAlerts,
    getHealthStatus,
    getMemberById,
    niches,
  ]);

  // Summary stats
  const healthSummary = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 };
    for (const row of performanceRows) {
      counts[row.healthStatus]++;
    }
    const total = performanceRows.length;
    return {
      ...counts,
      total,
      greenPct: total > 0 ? Math.round((counts.green / total) * 100) : 0,
      yellowPct: total > 0 ? Math.round((counts.yellow / total) * 100) : 0,
      redPct: total > 0 ? Math.round((counts.red / total) * 100) : 0,
    };
  }, [performanceRows]);

  // Top risks (lowest scores)
  const topRisks = useMemo(() => {
    return [...performanceRows]
      .filter(r => r.score !== null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 10);
  }, [performanceRows]);

  // Top performers (highest scores)
  const topPerformers = useMemo(() => {
    return [...performanceRows]
      .filter(r => r.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10);
  }, [performanceRows]);

  // Aggregate totals for cards
  const aggregateTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    for (const row of performanceRows) {
      for (const [slug, value] of Object.entries(row.metrics)) {
        if (value !== null) {
          // Only sum simple metrics, not ratios
          const metric = activeMetrics.find(m => m.slug === slug);
          if (metric && metric.metric_type === 'simple') {
            totals[slug] = (totals[slug] || 0) + value;
          }
        }
      }
    }

    // Calculate aggregate calculated metrics
    const aggregateCalculated: Record<string, number | null> = { ...totals };
    for (const metric of activeMetrics) {
      if (metric.metric_type === 'calculated') {
        aggregateCalculated[metric.slug] = calculateMetricValue(metric, totals);
      }
    }

    return aggregateCalculated;
  }, [performanceRows, activeMetrics, calculateMetricValue]);

  // Calculate benchmarks
  const benchmarks = useMemo((): BenchmarkData[] => {
    const metricData: Record<string, number[]> = {};

    for (const row of performanceRows) {
      for (const [slug, value] of Object.entries(row.metrics)) {
        if (value !== null) {
          if (!metricData[slug]) metricData[slug] = [];
          metricData[slug].push(value);
        }
      }
    }

    return Object.entries(metricData).map(([slug, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const len = sorted.length;
      return {
        metric_slug: slug,
        p25: len > 0 ? sorted[Math.floor(len * 0.25)] : 0,
        p50: len > 0 ? sorted[Math.floor(len * 0.5)] : 0,
        p75: len > 0 ? sorted[Math.floor(len * 0.75)] : 0,
        count: len,
      };
    });
  }, [performanceRows]);

  // CRUD for saved views
  const saveView = async (name: string) => {
    if (!member) return { error: 'Not authenticated' };
    
    const insertData = {
      user_id: member.id,
      name,
      filters_json: JSON.parse(JSON.stringify(filters)),
      columns_json: JSON.parse(JSON.stringify(currentLayout?.columns || [])),
    };

    const { data, error } = await supabase
      .from('traffic_saved_views')
      .insert([insertData])
      .select()
      .single();

    if (!error && data) {
      setSavedViews(prev => [...prev, data as unknown as TrafficSavedView]);
    }
    return { data, error };
  };

  const deleteView = async (id: string) => {
    const { error } = await supabase
      .from('traffic_saved_views')
      .delete()
      .eq('id', id);

    if (!error) {
      setSavedViews(prev => prev.filter(v => v.id !== id));
    }
    return { error };
  };

  const loadView = (view: TrafficSavedView) => {
    setFilters(view.filters_json as TrafficAnalyticsFilters);
  };

  return {
    // Data
    metrics,
    activeMetrics,
    targets,
    scores,
    activeScore,
    alertRules,
    layouts,
    currentLayout,
    savedViews,
    dailyMetrics,
    
    // Computed
    performanceRows,
    healthSummary,
    topRisks,
    topPerformers,
    aggregateTotals,
    benchmarks,
    
    // State
    filters,
    setFilters,
    loading,
    
    // Actions
    saveView,
    deleteView,
    loadView,
    refetch: fetchAll,
  };
}
