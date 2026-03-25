import { useState, useEffect } from 'react';
import { Target, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSalesFunnel } from '@/hooks/useSalesFunnel';
import { useFunnelBenchmarks } from '@/hooks/useFunnelBenchmarks';
import { useFunnelMetaMetrics } from '@/hooks/useFunnelMetaMetrics';
import { useMetaAds } from '@/hooks/useMetaAds';
import { FunnelFiltersComponent } from '@/components/commercial/FunnelFilters';
import { FunnelTargetsTable } from '@/components/commercial/FunnelTargetsTable';
import { FunnelActualsTable } from '@/components/commercial/FunnelActualsTable';
import { FunnelDashboard } from '@/components/commercial/FunnelDashboard';
import { FunnelBenchmarksDialog } from '@/components/commercial/FunnelBenchmarksDialog';
import { FunnelAdAccountSelector } from '@/components/commercial/FunnelAdAccountSelector';

export default function SalesFunnelPage() {
  const {
    targets,
    actuals,
    kpis,
    clientMetrics,
    baseMetrics,
    loading,
    canEdit,
    filters,
    setFilters,
    saveTarget,
    saveActual,
  } = useSalesFunnel();

  const {
    benchmarks,
    canEdit: canEditBenchmarks,
    updateBenchmark,
    getValueLevel,
  } = useFunnelBenchmarks();

  const { adAccounts, loading: metaAccountsLoading } = useMetaAds();
  
  const STORAGE_KEY = 'funnel_selected_ad_accounts';
  
  // Selected ad account IDs for filtering - load from localStorage
  const [selectedAdAccountIds, setSelectedAdAccountIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  // Initialize with saved selection or default to "CA1 - PETRON PERFORMANCE" if available
  useEffect(() => {
    if (adAccounts.length > 0 && selectedAdAccountIds.length === 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedIds = JSON.parse(saved);
        // Validate that saved IDs still exist
        const validIds = savedIds.filter((id: string) => 
          adAccounts.some(a => a.ad_account_id === id)
        );
        if (validIds.length > 0) {
          setSelectedAdAccountIds(validIds);
          return;
        }
      }
      // Default to CA1 - PETRON PERFORMANCE if available
      const petronAccount = adAccounts.find(a => a.name.includes('PETRON'));
      if (petronAccount) {
        setSelectedAdAccountIds([petronAccount.ad_account_id]);
      } else {
        setSelectedAdAccountIds(adAccounts.map(a => a.ad_account_id));
      }
    }
  }, [adAccounts]);
  
  // Persist selection to localStorage
  const handleAdAccountChange = (ids: string[]) => {
    setSelectedAdAccountIds(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  const {
    metrics: metaMetrics,
    loading: metaLoading,
    lastSync: metaLastSync,
    refetch: refetchMeta,
  } = useFunnelMetaMetrics(filters.year, selectedAdAccountIds);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div>
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Funil Comercial
          </h1>
          <p className="text-muted-foreground">
            Acompanhamento de metas e resultados do comercial Petron
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <FunnelAdAccountSelector
            adAccounts={adAccounts}
            selectedIds={selectedAdAccountIds}
            onChange={handleAdAccountChange}
            loading={metaAccountsLoading}
          />
          <FunnelFiltersComponent filters={filters} onChange={setFilters} />
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="actuals">Realizado</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FunnelDashboard kpis={kpis} year={filters.year} />
        </TabsContent>

        <TabsContent value="actuals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  Realizado Mensal - {filters.year}
                  <Badge variant="outline" className="text-xs font-normal">
                    <Zap className="h-3 w-3 mr-1" />
                    Meta Ads
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Investimento e Leads sincronizados em tempo real das contas Meta Ads
                </p>
              </div>
              <FunnelBenchmarksDialog 
                benchmarks={benchmarks}
                canEdit={canEditBenchmarks}
                onUpdate={updateBenchmark}
              />
            </CardHeader>
            <CardContent>
              <FunnelActualsTable
                actuals={actuals}
                clientMetrics={clientMetrics}
                baseMetrics={baseMetrics}
                metaMetrics={metaMetrics}
                metaLastSync={metaLastSync}
                onRefreshMeta={refetchMeta}
                year={filters.year}
                canEdit={canEdit}
                onSave={saveActual}
                benchmarks={benchmarks}
                getValueLevel={getValueLevel}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
