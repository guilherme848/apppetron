import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReportHighlight {
  title: string;
  body: string;
}

export interface MatconReportData {
  current: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    conversations: number;
    leads: number;
    profile_visits: number;
    cpm: number;
    unique_ctr: number;
    cost_per_conversation: number;
    conversion_rate: number;
    frequency_avg: number;
  };
  previous: MatconReportData['current'];
  deltas: {
    conversations: number;
    cost_per_conversation: number;
    spend: number;
    reach: number;
    impressions: number;
  };
  client_name: string;
  ad_account_id: string | null;
  monthly_budget: number | null;
}

export interface MatconReport {
  id: string;
  client_id: string;
  ad_account_id: string | null;
  period_type: string;
  period_start: string;
  period_end: string;
  report_data: MatconReportData;
  narrative: { summary: string; highlights: ReportHighlight[] } | null;
  next_steps: string[] | null;
  pdf_url: string | null;
  status: 'draft' | 'generated' | 'sent' | 'viewed' | 'failed';
  sent_at: string | null;
  sent_via: string | null;
  share_token: string;
  viewed_at: string | null;
  created_at: string;
}

export interface MatconClientReportRow {
  client_id: string;
  client_name: string;
  contact_phone: string | null;
  ad_account_id: string | null;
  ad_monthly_budget: number | null;
  last_report: MatconReport | null;
}

export function useMatconReports(onlyMatCon = true) {
  const [rows, setRows] = useState<MatconClientReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Busca clientes MatCon com conta Meta ativa
      const query = supabase
        .from('client_meta_ad_accounts')
        .select('client_id, ad_account_id, accounts(id, name, niche, ad_monthly_budget, contact_phone, niches(name))')
        .eq('active', true);
      const { data: links } = await query;

      const filtered = (links || []).filter((l: any) => {
        if (!l.accounts) return false;
        if (!onlyMatCon) return true;
        const n = l.accounts.niches?.name || l.accounts.niche;
        return n === 'Material de Construção';
      });

      const clientIds = filtered.map((l: any) => l.accounts.id);
      const { data: reports } = clientIds.length
        ? await supabase
            .from('matcon_reports')
            .select('*')
            .in('client_id', clientIds)
            .order('period_start', { ascending: false })
        : { data: [] as any[] };
      const latestByClient = new Map<string, MatconReport>();
      for (const r of reports || []) {
        if (!latestByClient.has(r.client_id)) latestByClient.set(r.client_id, r as MatconReport);
      }

      setRows(filtered.map((l: any) => ({
        client_id: l.accounts.id,
        client_name: l.accounts.name,
        contact_phone: l.accounts.contact_phone || null,
        ad_account_id: l.ad_account_id,
        ad_monthly_budget: l.accounts.ad_monthly_budget,
        last_report: latestByClient.get(l.accounts.id) || null,
      })));
    } finally {
      setLoading(false);
    }
  }, [onlyMatCon]);

  const generate = useCallback(async (client_id: string) => {
    const { data, error } = await supabase.functions.invoke('generate-matcon-report', {
      body: { client_id },
    });
    if (error) throw error;
    await load();
    return data?.report as MatconReport;
  }, [load]);

  const markAsSent = useCallback(async (report_id: string, via: string, to: string) => {
    await supabase
      .from('matcon_reports')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_via: via, sent_to: to })
      .eq('id', report_id);
    await load();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, refresh: load, generate, markAsSent };
}
