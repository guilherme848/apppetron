import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { BarChart3, Filter, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useContentDashboardData } from '@/hooks/useContentDashboardData';
import { BATCH_STATUS_OPTIONS, POST_STATUS_OPTIONS } from '@/types/contentProduction';
import { ROLE_LABELS } from '@/lib/dashboardColors';
import { ResumoTab } from '@/components/dashboard/content/ResumoTab';
import { ProdutividadeTab } from '@/components/dashboard/content/ProdutividadeTab';
import { AlteracoesTab } from '@/components/dashboard/content/AlteracoesTab';

export default function ContentDashboard() {
  const hookData = useContentDashboardData();
  const {
    loading,
    filters,
    updateFilter,
    accounts,
    teamMembers,
    monthRefs,
  } = hookData;

  const [filtersOpen, setFiltersOpen] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Dashboard de Produção
          </h1>
          <p className="text-muted-foreground">Métricas de produtividade e operação de conteúdo</p>
        </div>
      </div>

      {/* Global Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="py-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Globais
                </CardTitle>
                <Badge variant="secondary">{filtersOpen ? 'Ocultar' : 'Mostrar'}</Badge>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.from, 'yyyy-MM-dd')}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: parseISO(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.to, 'yyyy-MM-dd')}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: parseISO(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Mês do Planejamento</Label>
                  <Select value={filters.monthRef || 'all'} onValueChange={(v) => updateFilter('monthRef', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {monthRefs.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={filters.clientId || 'all'} onValueChange={(v) => updateFilter('clientId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cargo Responsável</Label>
                  <Select value={filters.roleKey || 'all'} onValueChange={(v) => updateFilter('roleKey', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Profissional</Label>
                  <Select value={filters.assigneeId || 'all'} onValueChange={(v) => updateFilter('assigneeId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Status do Planejamento</Label>
                  <Select value={filters.batchStatus || 'all'} onValueChange={(v) => updateFilter('batchStatus', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {BATCH_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Status do Post</Label>
                  <Select value={filters.postStatus || 'all'} onValueChange={(v) => updateFilter('postStatus', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {POST_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Opções</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Switch id="overdueOnly" checked={filters.overdueOnly} onCheckedChange={(v) => updateFilter('overdueOnly', v)} />
                      <Label htmlFor="overdueOnly" className="text-xs">Só vencidos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="unassignedOnly" checked={filters.unassignedOnly} onCheckedChange={(v) => updateFilter('unassignedOnly', v)} />
                      <Label htmlFor="unassignedOnly" className="text-xs">Sem responsável</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tabs */}
      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="resumo" className="data-[state=active]:bg-[#F97316] data-[state=active]:text-white">📊 Resumo</TabsTrigger>
          <TabsTrigger value="produtividade" className="data-[state=active]:bg-[#F97316] data-[state=active]:text-white">👥 Produtividade</TabsTrigger>
          <TabsTrigger value="alteracoes" className="data-[state=active]:bg-[#F97316] data-[state=active]:text-white">✏️ Alterações</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <ResumoTab data={hookData} />
        </TabsContent>
        <TabsContent value="produtividade">
          <ProdutividadeTab data={hookData} />
        </TabsContent>
        <TabsContent value="alteracoes">
          <AlteracoesTab data={hookData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
