import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParamState } from '@/hooks/usePersistedState';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart3, SlidersHorizontal, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useContentDashboardData } from '@/hooks/useContentDashboardData';
import { BATCH_STATUS_OPTIONS, POST_STATUS_OPTIONS } from '@/types/contentProduction';
import { ROLE_LABELS } from '@/lib/dashboardColors';
import { NumerosGeraisTab } from '@/components/dashboard/content/NumerosGeraisTab';
import { ProdutividadeTimeTab } from '@/components/dashboard/content/ProdutividadeTimeTab';
import { cn } from '@/lib/utils';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ContentDashboard() {
  const hookData = useContentDashboardData();
  const { loading, filters, updateFilter, accounts, teamMembers, monthRefs } = hookData;

  // Month selector state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [useCustomDates, setUseCustomDates] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Dashboard tab persisted in URL
  const [dashboardTab, setDashboardTab] = useSearchParamState('tab', 'numeros');

  // Sidebar filter panel
  const [panelOpen, setPanelOpen] = useState(false);

  // Sync month selector → monthRef filter
  useEffect(() => {
    if (!useCustomDates) {
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      // Find matching monthRef
      const match = monthRefs.find(m => m.startsWith(monthStr));
      if (match) {
        updateFilter('monthRef', match);
      } else {
        // Set as formatted label for display
        updateFilter('monthRef', monthStr);
      }
    }
  }, [selectedMonth, selectedYear, useCustomDates, monthRefs]);

  // Close month dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setMonthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (filters.clientId) count++;
    if (filters.roleKey) count++;
    if (filters.assigneeId) count++;
    if (filters.batchStatus) count++;
    if (filters.postStatus) count++;
    if (filters.overdueOnly) count++;
    if (filters.unassignedOnly) count++;
    if (useCustomDates) count++;
    return count;
  }, [filters, useCustomDates]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.clientId) {
      const acc = accounts.find(a => a.id === filters.clientId);
      chips.push({ key: 'clientId', label: `Cliente: ${acc?.name || '...'}` });
    }
    if (filters.roleKey) {
      chips.push({ key: 'roleKey', label: `Cargo: ${(ROLE_LABELS as any)[filters.roleKey] || filters.roleKey}` });
    }
    if (filters.assigneeId) {
      const mem = teamMembers.find(m => m.id === filters.assigneeId);
      chips.push({ key: 'assigneeId', label: `Profissional: ${mem?.name || '...'}` });
    }
    if (filters.batchStatus) {
      const opt = BATCH_STATUS_OPTIONS.find(s => s.value === filters.batchStatus);
      chips.push({ key: 'batchStatus', label: `Status Plan.: ${opt?.label || filters.batchStatus}` });
    }
    if (filters.postStatus) {
      const opt = POST_STATUS_OPTIONS.find(s => s.value === filters.postStatus);
      chips.push({ key: 'postStatus', label: `Status Post: ${opt?.label || filters.postStatus}` });
    }
    if (filters.overdueOnly) chips.push({ key: 'overdueOnly', label: 'Só vencidos' });
    if (filters.unassignedOnly) chips.push({ key: 'unassignedOnly', label: 'Sem responsável' });
    return chips;
  }, [filters, accounts, teamMembers]);

  const clearAdvancedFilters = () => {
    updateFilter('clientId', '');
    updateFilter('roleKey', '');
    updateFilter('assigneeId', '');
    updateFilter('batchStatus', '');
    updateFilter('postStatus', '');
    updateFilter('overdueOnly', false);
    updateFilter('unassignedOnly', false);
    setUseCustomDates(false);
  };

  const removeChip = (key: string) => {
    if (key === 'overdueOnly' || key === 'unassignedOnly') {
      updateFilter(key, false);
    } else {
      updateFilter(key as any, '');
    }
  };

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const todayStr = format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-5 page-enter animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header with month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="section-header">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <BarChart3 className="h-6 w-6 text-primary" />
            Dashboard de Produção
          </h1>
          <p className="text-sm text-muted-foreground">Criação · {todayStr}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="relative flex items-center gap-1" ref={monthDropdownRef}>
            <button
              onClick={goToPrevMonth}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setMonthDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              {monthLabel}
              {isCurrentMonth && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent-foreground">
                  Atual
                </span>
              )}
            </button>

            <button
              onClick={goToNextMonth}
              className="h-8 w-8 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Month Dropdown */}
            {monthDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-popover border border-border rounded-xl shadow-lg p-3 animate-in fade-in zoom-in-95 duration-150 w-[260px]">
                {/* Year navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setSelectedYear(y => y - 1)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[13px] font-semibold text-foreground">{selectedYear}</span>
                  <button
                    onClick={() => setSelectedYear(y => y + 1)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_NAMES.map((name, idx) => {
                    const isSelected = idx === selectedMonth;
                    const isCurrent = idx === now.getMonth() && selectedYear === now.getFullYear();
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedMonth(idx);
                          setMonthDropdownOpen(false);
                        }}
                        className={cn(
                          'px-2 py-2 rounded-md text-[13px] font-medium transition-all duration-150 relative',
                          isSelected
                            ? 'bg-primary/12 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        {name}
                        {isCurrent && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Filters button */}
          <button
            onClick={() => setPanelOpen(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all duration-150',
              advancedFilterCount > 0
                ? 'border-primary/40 text-foreground bg-primary/5'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground bg-muted/30'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {advancedFilterCount > 0 && (
              <span className="h-[18px] min-w-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {advancedFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-muted/30 rounded-lg px-4 py-2 animate-in fade-in duration-150">
          {activeChips.map(chip => (
            <span
              key={chip.key}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-md px-2.5 py-1"
            >
              {chip.label}
              <button
                onClick={() => removeChip(chip.key)}
                className="text-muted-foreground/60 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAdvancedFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={dashboardTab} onValueChange={setDashboardTab} className="space-y-5">
        <TabsList className="bg-muted/40 border border-border/50 p-1 rounded-xl w-full max-w-md">
          <TabsTrigger value="numeros" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium flex-1">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium flex-1">
            Produtividade do Time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="numeros" className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <NumerosGeraisTab data={hookData} />
        </TabsContent>
        <TabsContent value="produtividade" className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <ProdutividadeTimeTab data={hookData} />
        </TabsContent>
      </Tabs>

      {/* Filter Side Panel - overlay */}
      {panelOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setPanelOpen(false)} />
      )}

      {/* Filter Side Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[95vw] sm:w-[360px] bg-popover border-l border-border shadow-[-8px_0_24px_rgba(0,0,0,0.1)] flex flex-col transition-transform duration-250 ease-out',
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Filtros Avançados</h2>
          <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Custom date range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">Período Personalizado</Label>
              <Switch checked={useCustomDates} onCheckedChange={setUseCustomDates} />
            </div>
            {useCustomDates && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-[11px] text-destructive">O seletor de mês está sendo ignorado</p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data Início</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.from, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) updateFilter('dateRange', { ...filters.dateRange, from: parseISO(val) });
                    }}
                    className="h-[42px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data Fim</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.to, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) updateFilter('dateRange', { ...filters.dateRange, to: parseISO(val) });
                    }}
                    className="h-[42px]"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Cliente */}
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

          {/* Cargo */}
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

          {/* Profissional */}
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

          {/* Status Planejamento */}
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

          {/* Status Post */}
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

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground">Opções</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="overdueOnly" className="text-xs text-muted-foreground cursor-pointer">Só vencidos</Label>
              <Switch id="overdueOnly" checked={filters.overdueOnly} onCheckedChange={(v) => updateFilter('overdueOnly', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="unassignedOnly" className="text-xs text-muted-foreground cursor-pointer">Sem responsável</Label>
              <Switch id="unassignedOnly" checked={filters.unassignedOnly} onCheckedChange={(v) => updateFilter('unassignedOnly', v)} />
            </div>
          </div>
        </div>

        {/* Panel footer */}
        <div className="px-6 py-4 border-t border-border space-y-2">
          <Button
            onClick={() => setPanelOpen(false)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Aplicar Filtros
          </Button>
          {advancedFilterCount > 0 && (
            <button
              onClick={clearAdvancedFilters}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
