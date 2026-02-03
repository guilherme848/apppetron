import { Loader2, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesFunnel } from '@/hooks/useSalesFunnel';
import { useFunnelBenchmarks } from '@/hooks/useFunnelBenchmarks';
import { FunnelFiltersComponent } from '@/components/commercial/FunnelFilters';
import { FunnelTargetsTable } from '@/components/commercial/FunnelTargetsTable';
import { FunnelActualsTable } from '@/components/commercial/FunnelActualsTable';
import { FunnelDashboard } from '@/components/commercial/FunnelDashboard';
import { FunnelBenchmarksDialog } from '@/components/commercial/FunnelBenchmarksDialog';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <FunnelFiltersComponent filters={filters} onChange={setFilters} />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="targets">Metas</TabsTrigger>
          <TabsTrigger value="actuals">Realizado</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FunnelDashboard kpis={kpis} year={filters.year} />
        </TabsContent>

        <TabsContent value="targets">
          <Card>
            <CardHeader>
              <CardTitle>Metas Mensais - {filters.year}</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelTargetsTable
                targets={targets}
                year={filters.year}
                canEdit={canEdit}
                onSave={saveTarget}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actuals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Realizado Mensal - {filters.year}</CardTitle>
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
