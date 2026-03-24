import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { BarChart3, Filter, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useContentDashboardData } from '@/hooks/useContentDashboardData';
import { BATCH_STATUS_OPTIONS, POST_STATUS_OPTIONS } from '@/types/contentProduction';
import { ROLE_LABELS } from '@/lib/dashboardColors';
import { ResumoTab } from '@/components/dashboard/content/ResumoTab';
import { ProdutividadeTab } from '@/components/dashboard/content/ProdutividadeTab';
import { AlteracoesTab } from '@/components/dashboard/content/AlteracoesTab';

export default function ContentDashboard() {
  const hookData = useContentDashboardData();
  const { loading, filters, updateFilter, accounts, teamMembers, monthRefs } = hookData;
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.monthRef) count++;
    if (filters.clientId) count++;
    if (filters.roleKey) count++;
    if (filters.assigneeId) count++;
    if (filters.batchStatus) count++;
    if (filters.postStatus) count++;
    if (filters.overdueOnly) count++;
    if (filters.unassignedOnly) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    updateFilter('monthRef', '');
    updateFilter('clientId', '');
    updateFilter('roleKey', '');
    updateFilter('assigneeId', '');
    updateFilter('batchStatus', '');
    updateFilter('postStatus', '');
    updateFilter('overdueOnly', false);
    updateFilter('unassignedOnly', false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <BarChart3 className="h-6 w-6 text-primary" />
            Dashboard de Produção
          </h1>
          <p className="text-sm text-muted-foreground">Métricas de produtividade e operação de conteúdo</p>
        </div>
      </div>

      {/* Global Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card className="border border-border rounded-2xl">
          <CardHeader className="py-3 px-5">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  Filtros Globais
                  {activeFilterCount > 0 && !filtersOpen && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 min-w-4">
                      {activeFilterCount}
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                  {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 transition-transform duration-200" /> : <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />}
                </span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent className="transition-all duration-250 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <CardContent className="pt-0 px-5 pb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Data Início</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.from, 'yyyy-MM-dd')}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: parseISO(e.target.value) })}
                    className="h-[42px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Data Fim</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.to, 'yyyy-MM-dd')}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: parseISO(e.target.value) })}
                    className="h-[42px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Mês do Planejamento</Label>
                  <Select value={filters.monthRef || 'all'} onValueChange={(v) => updateFilter('monthRef', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {monthRefs.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Cliente</Label>
                  <Select value={filters.clientId || 'all'} onValueChange={(v) => updateFilter('clientId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Cargo Responsável</Label>
                  <Select value={filters.roleKey || 'all'} onValueChange={(v) => updateFilter('roleKey', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Profissional</Label>
                  <Select value={filters.assigneeId || 'all'} onValueChange={(v) => updateFilter('assigneeId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Status Planejamento</Label>
                  <Select value={filters.batchStatus || 'all'} onValueChange={(v) => updateFilter('batchStatus', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {BATCH_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Status do Post</Label>
                  <Select value={filters.postStatus || 'all'} onValueChange={(v) => updateFilter('postStatus', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {POST_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Opções</Label>
                  <div className="flex flex-col gap-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <Switch id="overdueOnly" checked={filters.overdueOnly} onCheckedChange={(v) => updateFilter('overdueOnly', v)} />
                      <Label htmlFor="overdueOnly" className="text-xs text-muted-foreground cursor-pointer">Só vencidos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="unassignedOnly" checked={filters.unassignedOnly} onCheckedChange={(v) => updateFilter('unassignedOnly', v)} />
                      <Label htmlFor="unassignedOnly" className="text-xs text-muted-foreground cursor-pointer">Sem responsável</Label>
                    </div>
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground gap-1">
                      <X className="h-3 w-3" /> Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tabs */}
      <Tabs defaultValue="resumo" className="space-y-5">
        <TabsList className="bg-muted/50 border border-border/50 p-1 rounded-xl w-full max-w-lg">
          <TabsTrigger value="resumo" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium flex-1">
            📊 Resumo
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium flex-1">
            👥 Produtividade
          </TabsTrigger>
          <TabsTrigger value="alteracoes" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium flex-1">
            ✏️ Alterações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <ResumoTab data={hookData} />
        </TabsContent>
        <TabsContent value="produtividade" className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <ProdutividadeTab data={hookData} />
        </TabsContent>
        <TabsContent value="alteracoes" className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <AlteracoesTab data={hookData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
