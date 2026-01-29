import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Filter, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CommandCenterFilters, PeriodFilter, ClientStatus, MetricMode } from '@/types/commandCenter';

interface Service {
  id: string;
  name: string;
}

interface Niche {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface CommandCenterGlobalFiltersProps {
  filters: CommandCenterFilters;
  onFiltersChange: (filters: CommandCenterFilters) => void;
  services: Service[];
  niches: Niche[];
  csMembers: TeamMember[];
  availableStates: string[];
  availableOrigins: string[];
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '180d', label: 'Últimos 180 dias' },
  { value: 'custom', label: 'Personalizado' },
];

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'at_risk', label: 'Em Risco' },
  { value: 'churned', label: 'Cancelados' },
];

export function CommandCenterGlobalFilters({
  filters,
  onFiltersChange,
  services,
  niches,
  csMembers,
  availableStates,
  availableOrigins,
}: CommandCenterGlobalFiltersProps) {
  const updateFilter = <K extends keyof CommandCenterFilters>(key: K, value: CommandCenterFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      period: '30d',
      csOwnerId: null,
      status: 'all',
      nicheId: null,
      serviceId: null,
      state: null,
      city: null,
      origin: null,
      churnReason: null,
      metricMode: 'clients',
    });
  };

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="p-4 space-y-3">
        {/* Row 1: Core filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filtros:</span>
          </div>

          {/* Period */}
          <Select value={filters.period} onValueChange={(v) => updateFilter('period', v as PeriodFilter)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom date range */}
          {filters.period === 'custom' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-[130px] justify-start text-left font-normal',
                      !filters.customStartDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.customStartDate ? format(filters.customStartDate, 'dd/MM/yyyy') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.customStartDate}
                    onSelect={(d) => updateFilter('customStartDate', d)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-[130px] justify-start text-left font-normal',
                      !filters.customEndDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.customEndDate ? format(filters.customEndDate, 'dd/MM/yyyy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.customEndDate}
                    onSelect={(d) => updateFilter('customEndDate', d)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="w-px h-6 bg-border" />

          {/* CS Owner */}
          <Select
            value={filters.csOwnerId || '_all'}
            onValueChange={(v) => updateFilter('csOwnerId', v === '_all' ? null : v)}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Gestor CS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos gestores</SelectItem>
              {csMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={filters.status} onValueChange={(v) => updateFilter('status', v as ClientStatus)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Service/Plan */}
          <Select
            value={filters.serviceId || '_all'}
            onValueChange={(v) => updateFilter('serviceId', v === '_all' ? null : v)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos planos</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Niche */}
          <Select
            value={filters.nicheId || '_all'}
            onValueChange={(v) => updateFilter('nicheId', v === '_all' ? null : v)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Nicho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos nichos</SelectItem>
              {niches.map((n) => (
                <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* State */}
          {availableStates.length > 0 && (
            <Select
              value={filters.state || '_all'}
              onValueChange={(v) => updateFilter('state', v === '_all' ? null : v)}
            >
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas UFs</SelectItem>
                {availableStates.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Origin */}
          {availableOrigins.length > 0 && (
            <Select
              value={filters.origin || '_all'}
              onValueChange={(v) => updateFilter('origin', v === '_all' ? null : v)}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas origens</SelectItem>
                {availableOrigins.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="w-px h-6 bg-border" />

          {/* Metric Mode Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="metric-mode" className="text-sm text-muted-foreground">
              Clientes
            </Label>
            <Switch
              id="metric-mode"
              checked={filters.metricMode === 'mrr'}
              onCheckedChange={(checked) => updateFilter('metricMode', checked ? 'mrr' : 'clients')}
            />
            <Label htmlFor="metric-mode" className="text-sm text-muted-foreground">
              MRR
            </Label>
          </div>

          {/* Reset */}
          <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto">
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
