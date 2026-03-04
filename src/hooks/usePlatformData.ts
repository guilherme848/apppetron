import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, isValid, startOfMonth, endOfMonth, format } from 'date-fns';

interface AccountRow {
  id: string;
  status: string;
  start_date: string | null;
  churned_at: string | null;
  monthly_value: number | null;
  origin: string | null;
}

export interface MonthlyActuals {
  month: number; // 0-11
  newContracts: number;
  newContractsValue: number;
  // By channel (origin mapping)
  inboundQty: number;
  inboundValue: number;
  indicacaoQty: number;
  indicacaoValue: number;
  prospeccaoQty: number;
  prospeccaoValue: number;
  churnQty: number;
  churnMrrLost: number;
  // MRR snapshot at end of month
  mrrAtMonth: number;
  activeClientsAtMonth: number;
}

function mapOriginToChannel(origin: string | null): 'inbound' | 'indicacao' | 'prospeccao' {
  if (!origin) return 'inbound';
  const lower = origin.toLowerCase();
  if (lower === 'indicação' || lower === 'indicacao') return 'indicacao';
  if (lower === 'prospecção' || lower === 'prospeccao' || lower === 'prospecção ativa') return 'prospeccao';
  // "clint", "other", "inbound" and anything else → inbound
  return 'inbound';
}

export function usePlatformData(year: number) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('accounts')
      .select('id, status, start_date, churned_at, monthly_value, origin')
      .is('deleted_at', null);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setAccounts(data || []);
    setLastFetched(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Active clients right now
  const activeClients = useMemo(() =>
    accounts.filter(a => a.status === 'active').length,
  [accounts]);

  // Total MRR from active clients
  const totalMrr = useMemo(() =>
    accounts
      .filter(a => a.status === 'active')
      .reduce((sum, a) => sum + Number(a.monthly_value || 0), 0),
  [accounts]);

  // Average ticket from active clients with value > 0
  const avgTicket = useMemo(() => {
    const withValue = accounts.filter(a => a.status === 'active' && a.monthly_value && a.monthly_value > 0);
    if (withValue.length === 0) return 0;
    return withValue.reduce((sum, a) => sum + Number(a.monthly_value), 0) / withValue.length;
  }, [accounts]);

  // Monthly actuals for the selected year
  const monthlyActuals = useMemo((): MonthlyActuals[] => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthStart = startOfMonth(new Date(year, monthIdx, 1));
      const monthEnd = endOfMonth(new Date(year, monthIdx, 1));

      // New contracts started in this month
      const newInMonth = accounts.filter(a => {
        if (!a.start_date) return false;
        const d = parseISO(a.start_date);
        return isValid(d) && d >= monthStart && d <= monthEnd;
      });

      // Churn in this month
      const churnInMonth = accounts.filter(a => {
        if (!a.churned_at) return false;
        const d = parseISO(a.churned_at);
        return isValid(d) && d >= monthStart && d <= monthEnd;
      });

      // MRR snapshot at end of month: clients active at that point
      // A client is active at monthEnd if:
      // - start_date <= monthEnd
      // - AND (churned_at is null OR churned_at > monthEnd)
      const activeAtMonthEnd = accounts.filter(a => {
        if (!a.start_date) return false;
        const sd = parseISO(a.start_date);
        if (!isValid(sd) || sd > monthEnd) return false;
        if (a.churned_at) {
          const cd = parseISO(a.churned_at);
          if (isValid(cd) && cd <= monthEnd) return false;
        }
        return true;
      });

      const mrrAtMonth = activeAtMonthEnd.reduce((s, a) => s + Number(a.monthly_value || 0), 0);

      let inboundQty = 0, inboundValue = 0;
      let indicacaoQty = 0, indicacaoValue = 0;
      let prospeccaoQty = 0, prospeccaoValue = 0;

      newInMonth.forEach(a => {
        const ch = mapOriginToChannel(a.origin);
        const val = Number(a.monthly_value || 0);
        if (ch === 'inbound') { inboundQty++; inboundValue += val; }
        else if (ch === 'indicacao') { indicacaoQty++; indicacaoValue += val; }
        else { prospeccaoQty++; prospeccaoValue += val; }
      });

      return {
        month: monthIdx,
        newContracts: newInMonth.length,
        newContractsValue: newInMonth.reduce((s, a) => s + Number(a.monthly_value || 0), 0),
        inboundQty, inboundValue,
        indicacaoQty, indicacaoValue,
        prospeccaoQty, prospeccaoValue,
        churnQty: churnInMonth.length,
        churnMrrLost: churnInMonth.reduce((s, a) => s + Number(a.monthly_value || 0), 0),
        mrrAtMonth,
        activeClientsAtMonth: activeAtMonthEnd.length,
      };
    });
  }, [accounts, year]);

  return {
    loading,
    error,
    lastFetched,
    activeClients,
    totalMrr,
    avgTicket,
    monthlyActuals,
    refetch: fetchData,
  };
}
