import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MetaBmConnection {
  id: string;
  business_id: string;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdAccount {
  id: string;
  ad_account_id: string;
  name: string;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdAccountSnapshot {
  id: string;
  ad_account_id: string;
  fetched_at: string;
  amount_spent: number | null;
  spend_cap: number | null;
  available_balance: number | null;
}

export interface ClientMetaAdAccount {
  id: string;
  client_id: string;
  ad_account_id: string;
  active: boolean;
  created_at: string;
}

export function useMetaAds() {
  const [connection, setConnection] = useState<MetaBmConnection | null>(null);
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [snapshots, setSnapshots] = useState<MetaAdAccountSnapshot[]>([]);
  const [clientLinks, setClientLinks] = useState<ClientMetaAdAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnection = useCallback(async () => {
    const { data } = await supabase
      .from('meta_bm_connection')
      .select('*')
      .limit(1)
      .maybeSingle();
    setConnection(data);
  }, []);

  const fetchAdAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('meta_bm_ad_accounts')
      .select('*')
      .order('name');
    setAdAccounts(data || []);
  }, []);

  const fetchSnapshots = useCallback(async () => {
    // Get latest snapshot for each account
    const { data } = await supabase
      .from('meta_ad_account_snapshots')
      .select('*')
      .order('fetched_at', { ascending: false });
    
    // Keep only the latest per account
    const latestByAccount = new Map<string, MetaAdAccountSnapshot>();
    for (const snapshot of data || []) {
      if (!latestByAccount.has(snapshot.ad_account_id)) {
        latestByAccount.set(snapshot.ad_account_id, snapshot);
      }
    }
    setSnapshots(Array.from(latestByAccount.values()));
  }, []);

  const fetchClientLinks = useCallback(async () => {
    const { data } = await supabase
      .from('client_meta_ad_accounts')
      .select('*')
      .eq('active', true);
    setClientLinks(data || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchConnection(),
      fetchAdAccounts(),
      fetchSnapshots(),
      fetchClientLinks(),
    ]);
    setLoading(false);
  }, [fetchConnection, fetchAdAccounts, fetchSnapshots, fetchClientLinks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const startOAuth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('meta-oauth-start');
      if (error) throw error;
      if (data?.authUrl) {
        // Open popup
        const popup = window.open(data.authUrl, 'meta-oauth', 'width=600,height=700');
        
        // Listen for success message
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'META_OAUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            toast.success('Meta conectado com sucesso!');
            fetchAll();
          }
        };
        window.addEventListener('message', handleMessage);
      }
    } catch (error: any) {
      console.error('OAuth start error:', error);
      toast.error('Erro ao iniciar conexão: ' + error.message);
    }
  };

  const syncAdAccounts = async (alsoFetchFinance = true) => {
    try {
      const { data, error } = await supabase.functions.invoke('meta-fetch-ad-accounts');
      if (error) throw error;
      toast.success(`${data.count} contas sincronizadas`);
      await fetchAdAccounts();
      
      // Also fetch finance data for all accounts
      if (alsoFetchFinance && data.count > 0) {
        toast.info('Buscando saldos financeiros...');
        await fetchFinanceData();
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar: ' + error.message);
    }
  };

  const fetchFinanceData = async (adAccountIds?: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('meta-fetch-finance', {
        body: { adAccountIds },
      });
      
      // supabase.functions.invoke wraps non-2xx as error
      if (error) {
        // Try to parse the error context for token expiration
        const errorMsg = typeof error === 'object' && error.message ? error.message : String(error);
        if (errorMsg.includes('TOKEN_EXPIRED') || errorMsg.includes('expirado') || errorMsg.includes('401')) {
          toast.error('Token do Meta Ads expirado. Reconecte sua conta Meta nas configurações.', { duration: 8000 });
        } else {
          toast.error('Erro ao buscar saldos: ' + errorMsg);
        }
        return null;
      }

      // Check if response body itself has error
      if (data?.error) {
        if (data.errorCode === 'TOKEN_EXPIRED') {
          toast.error('Token do Meta Ads expirado. Reconecte sua conta Meta nas configurações.', { duration: 8000 });
        } else {
          toast.error(data.error);
        }
        return null;
      }
      
      if (data?.errorCount > 0) {
        toast.warning(`Atualizado com ${data.errorCount} erro(s) em ${data.count + data.errorCount} contas`);
      } else {
        toast.success(`Dados financeiros atualizados (${data.count} contas)`);
      }
      await fetchSnapshots();
      return data.snapshots;
    } catch (error: any) {
      console.error('Finance fetch error:', error);
      toast.error('Erro ao buscar dados: ' + (error?.message || 'erro desconhecido'));
      return null;
    }
  };

  const fetchMetricsData = async (adAccountIds?: string[], dateFrom?: string, dateTo?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('meta-fetch-metrics', {
        body: { adAccountIds, dateFrom, dateTo },
      });
      if (error) throw error;
      toast.success(`Métricas atualizadas: ${data.successCount} contas processadas`);
      return data;
    } catch (error: any) {
      console.error('Metrics fetch error:', error);
      toast.error('Erro ao buscar métricas: ' + error.message);
    }
  };

  const linkClientToAdAccount = async (clientId: string, adAccountId: string) => {
    const { error } = await supabase
      .from('client_meta_ad_accounts')
      .upsert({
        client_id: clientId,
        ad_account_id: adAccountId,
        active: true,
      }, {
        onConflict: 'client_id,ad_account_id',
      });

    if (error) {
      toast.error('Erro ao vincular conta');
      return { error };
    }

    await fetchClientLinks();

    // Backfill imediato dos últimos 90 dias em paralelo (assíncrono)
    // Pra conta não aparecer zerada na Central de Monitoramento
    const today = new Date();
    const dateTo = today.toISOString().split('T')[0];
    const past = new Date(today);
    past.setDate(past.getDate() - 90);
    const dateFrom = past.toISOString().split('T')[0];

    toast.info('Conta vinculada! Buscando métricas dos últimos 90 dias em segundo plano...');

    const body = { adAccountIds: [adAccountId], dateFrom, dateTo };
    Promise.allSettled([
      supabase.functions.invoke('meta-fetch-metrics', { body }),
      supabase.functions.invoke('meta-fetch-campaign-metrics', { body }),
      supabase.functions.invoke('meta-fetch-ad-metrics', { body: { ...body, batchSize: 1, batchOffset: 0 } }),
    ]).then((results) => {
      const ok = results.filter(r => r.status === 'fulfilled').length;
      if (ok > 0) {
        toast.success(`Sincronização concluída (${ok}/3 níveis). Abra a Central para ver os dados.`);
      } else {
        toast.error('Falha ao sincronizar métricas — o sync automático de 15min vai cobrir.');
      }
    });

    return { error: null };
  };

  const unlinkClientFromAdAccount = async (clientId: string, adAccountId: string) => {
    const { error } = await supabase
      .from('client_meta_ad_accounts')
      .update({ active: false })
      .eq('client_id', clientId)
      .eq('ad_account_id', adAccountId);
    
    if (error) {
      toast.error('Erro ao desvincular conta');
      return { error };
    }
    
    await fetchClientLinks();
    return { error: null };
  };

  const getClientAdAccounts = (clientId: string) => {
    const linkedIds = clientLinks
      .filter(l => l.client_id === clientId && l.active)
      .map(l => l.ad_account_id);
    return adAccounts.filter(a => linkedIds.includes(a.ad_account_id));
  };

  const getLatestSnapshot = (adAccountId: string) => {
    return snapshots.find(s => s.ad_account_id === adAccountId);
  };

  return {
    connection,
    adAccounts,
    snapshots,
    clientLinks,
    loading,
    startOAuth,
    syncAdAccounts,
    fetchFinanceData,
    fetchMetricsData,
    linkClientToAdAccount,
    unlinkClientFromAdAccount,
    getClientAdAccounts,
    getLatestSnapshot,
    refetch: fetchAll,
  };
}
