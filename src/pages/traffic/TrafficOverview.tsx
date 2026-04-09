import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  Save,
  Filter,
  ChevronDown,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTrafficAnalytics } from '@/hooks/useTrafficAnalytics';
import { useCrm } from '@/contexts/CrmContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMetaAds } from '@/hooks/useMetaAds';
import { PERIOD_OPTIONS, OBJECTIVE_OPTIONS, HealthStatus, AlertSeverity } from '@/types/trafficAnalytics';
import { cn } from '@/lib/utils';

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '—';
  
  switch (unit) {
    case 'BRL':
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    case 'PERCENT':
      return `${value.toFixed(2)}%`;
    default:
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}

function getHealthBadgeVariant(status: HealthStatus) {
  switch (status) {
    case 'green':
      return 'default';
    case 'yellow':
      return 'secondary';
    case 'red':
      return 'destructive';
  }
}

function getHealthLabel(status: HealthStatus) {
  switch (status) {
    case 'green':
      return 'Saudável';
    case 'yellow':
      return 'Atenção';
    case 'red':
      return 'Crítico';
  }
}

function getSeverityBadgeVariant(severity: AlertSeverity) {
  switch (severity) {
    case 'info':
      return 'outline';
    case 'attention':
      return 'secondary';
    case 'critical':
      return 'destructive';
  }
}

export default function TrafficOverview() {
  const { isAdmin } = useAuth();
  const { accounts } = useCrm();
  const { members } = useTeamMembers();
  const { niches } = useSettings();
  const { fetchMetricsData, connection } = useMetaAds();
  const {
    activeMetrics,
    currentLayout,
    performanceRows,
    healthSummary,
    topRisks,
    topPerformers,
    aggregateTotals,
    filters,
    setFilters,
    loading,
    saveView,
    savedViews,
    loadView,
    refetch,
  } = useTrafficAnalytics();

  const [showFilters, setShowFilters] = useState(true);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchClient, setSearchClient] = useState('');
  const [savingView, setSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [fetchingMetrics, setFetchingMetrics] = useState(false);

  // Get traffic managers
  const trafficManagers = members.filter(m => m.active);

  // Filter and sort rows
  const filteredRows = performanceRows.filter(row => {
    if (searchClient && !row.clientName.toLowerCase().includes(searchClient.toLowerCase())) {
      return false;
    }
    return true;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: number | string | null = null;
    let bVal: number | string | null = null;

    if (sortColumn === 'client') {
      aVal = a.clientName;
      bVal = b.clientName;
    } else if (sortColumn === 'score') {
      aVal = a.score;
      bVal = b.score;
    } else {
      aVal = a.metrics[sortColumn] ?? null;
      bVal = b.metrics[sortColumn] ?? null;
    }

    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;
    setSavingView(true);
    await saveView(newViewName.trim());
    setNewViewName('');
    setSavingView(false);
  };

  const handleFetchMetrics = async () => {
    if (!connection) {
      return;
    }
    setFetchingMetrics(true);
    await fetchMetricsData();
    await refetch();
    setFetchingMetrics(false);
  };

  // Get visible columns from layout
  const visibleColumns = currentLayout?.columns?.sort((a, b) => a.order - b.order) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 mt-2" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Multi-Contas</h1>
          <p className="text-sm text-muted-foreground">
            Análise de performance de {performanceRows.length} contas de anúncio
          </p>
        </div>
        <div className="flex gap-2">
          {connection && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleFetchMetrics}
              disabled={fetchingMetrics}
            >
              {fetchingMetrics ? (
                <Skeleton className="h-4 w-16 rounded" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              Buscar Métricas
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            // Export performance data as CSV
            const headers = ['Cliente', 'Score', 'Status'];
            const csvRows = [headers.join(',')];
            performanceRows.forEach(r => {
              csvRows.push([`"${r.accountName}"`, r.score ?? '', r.healthStatus].join(','));
            });
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `traffic-overview-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Período</label>
                <Select 
                  value={filters.period} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, period: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div>
                  <label className="text-xs text-muted-foreground">Gestor</label>
                  <Select 
                    value={filters.managerId} 
                    onValueChange={(v) => setFilters(prev => ({ ...prev, managerId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {trafficManagers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Objetivo</label>
                <Select 
                  value={filters.objective} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, objective: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {OBJECTIVE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Nicho</label>
                <Select 
                  value={filters.nicheId} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, nicheId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="_none_">Sem nicho</SelectItem>
                    {niches.map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select 
                  value={filters.status} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Buscar Cliente</label>
                <Input 
                  placeholder="Nome do cliente..." 
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {savedViews.map(view => (
            <Button 
              key={view.id} 
              variant="outline" 
              size="sm"
              onClick={() => loadView(view)}
            >
              {view.name}
            </Button>
          ))}
        </div>
      )}

      {/* Save View */}
      <div className="flex gap-2">
        <Input 
          placeholder="Nome da visão..." 
          value={newViewName}
          onChange={(e) => setNewViewName(e.target.value)}
          className="max-w-xs"
        />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSaveView}
          disabled={savingView || !newViewName.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Visão
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {currentLayout?.cards?.map(card => {
          const metric = activeMetrics.find(m => m.slug === card.slug);
          const value = aggregateTotals[card.slug];
          
          return (
            <Card key={card.slug}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetricValue(value, metric?.unit || 'NUMBER')}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Health Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cn("border-l-4", "border-l-success")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Contas Saudáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{healthSummary.green}</div>
            <p className="text-xs text-muted-foreground">{healthSummary.greenPct}% do total</p>
          </CardContent>
        </Card>

        <Card className={cn("border-l-4", "border-l-warning")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Contas em Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{healthSummary.yellow}</div>
            <p className="text-xs text-muted-foreground">{healthSummary.yellowPct}% do total</p>
          </CardContent>
        </Card>

        <Card className={cn("border-l-4", "border-l-destructive")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Contas Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{healthSummary.red}</div>
            <p className="text-xs text-muted-foreground">{healthSummary.redPct}% do total</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Top 10 em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topRisks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma conta em risco</p>
            ) : (
              <div className="space-y-2">
                {topRisks.map((row, idx) => (
                  <div key={row.adAccountId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-6">{idx + 1}.</span>
                      <Link 
                        to={`/traffic/accounts/${row.adAccountId}`}
                        className="text-sm hover:underline"
                      >
                        {row.clientName}
                      </Link>
                    </div>
                    <Badge variant={getHealthBadgeVariant(row.healthStatus)}>
                      {row.score ?? '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Top 10 Melhores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-2">
                {topPerformers.map((row, idx) => (
                  <div key={row.adAccountId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-6">{idx + 1}.</span>
                      <Link 
                        to={`/traffic/accounts/${row.adAccountId}`}
                        className="text-sm hover:underline"
                      >
                        {row.clientName}
                      </Link>
                    </div>
                    <Badge variant={getHealthBadgeVariant(row.healthStatus)}>
                      {row.score ?? '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todas as Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 sticky left-0 bg-background z-10"
                    onClick={() => handleSort('client')}
                  >
                    Cliente
                  </TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-center"
                    onClick={() => handleSort('score')}
                  >
                    Score
                  </TableHead>
                  {visibleColumns.map(col => {
                    const metric = activeMetrics.find(m => m.slug === col.slug);
                    return (
                      <TableHead 
                        key={col.slug}
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleSort(col.slug)}
                      >
                        {metric?.name || col.slug}
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-center">Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7 + visibleColumns.length} className="text-center text-muted-foreground">
                      Nenhuma conta encontrada com os filtros selecionados
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map(row => (
                    <TableRow 
                      key={row.adAccountId}
                      className={cn(
                        row.healthStatus === 'red' && 'bg-destructive/5',
                        row.healthStatus === 'yellow' && 'bg-warning/5'
                      )}
                    >
                      <TableCell className="font-medium sticky left-0 bg-inherit">
                        <Link 
                          to={`/crm/${row.clientId}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          {row.clientName}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/traffic/accounts/${row.adAccountId}`}
                          className="hover:underline text-muted-foreground"
                        >
                          {row.adAccountName}
                        </Link>
                      </TableCell>
                      <TableCell>{row.managerName || '—'}</TableCell>
                      <TableCell>{row.nicheName || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getHealthBadgeVariant(row.healthStatus)}>
                          {row.score ?? '—'}
                        </Badge>
                      </TableCell>
                      {visibleColumns.map(col => {
                        const metric = activeMetrics.find(m => m.slug === col.slug);
                        const value = row.metrics[col.slug];
                        return (
                          <TableCell key={col.slug} className="text-right font-mono">
                            {formatMetricValue(value, metric?.unit || 'NUMBER')}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {row.alerts.length > 0 ? (
                          <div className="flex gap-1 flex-wrap justify-center">
                            {row.alerts.slice(0, 2).map((alert, idx) => (
                              <Badge 
                                key={idx} 
                                variant={getSeverityBadgeVariant(alert.severity)}
                                className="text-xs"
                              >
                                {alert.message}
                              </Badge>
                            ))}
                            {row.alerts.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{row.alerts.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
