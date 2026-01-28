import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PeriodFilter, StatusFilter } from '@/hooks/useExecutiveDashboard';

interface Service {
  id: string;
  name: string;
}

interface Niche {
  id: string;
  name: string;
}

interface DashboardFiltersProps {
  periodFilter: PeriodFilter;
  onPeriodChange: (value: PeriodFilter) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomStartChange: (date: Date | undefined) => void;
  onCustomEndChange: (date: Date | undefined) => void;
  serviceFilter: string | null;
  onServiceChange: (value: string | null) => void;
  nicheFilter: string | null;
  onNicheChange: (value: string | null) => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  services: Service[];
  niches: Niche[];
}

export function DashboardFilters({
  periodFilter,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomStartChange,
  onCustomEndChange,
  serviceFilter,
  onServiceChange,
  nicheFilter,
  onNicheChange,
  statusFilter,
  onStatusChange,
  services,
  niches,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filtros:</span>
      </div>

      {/* Period Filter */}
      <Select value={periodFilter} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Mês atual</SelectItem>
          <SelectItem value="last3">Últimos 3 meses</SelectItem>
          <SelectItem value="last6">Últimos 6 meses</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      {periodFilter === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'w-[130px] justify-start text-left font-normal',
                  !customStartDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={onCustomStartChange}
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
                  !customEndDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={onCustomEndChange}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="w-px h-6 bg-border" />

      {/* Service Filter */}
      <Select
        value={serviceFilter || '_all'}
        onValueChange={(v) => onServiceChange(v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Plano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos os planos</SelectItem>
          {services.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Niche Filter */}
      <Select
        value={nicheFilter || '_all'}
        onValueChange={(v) => onNicheChange(v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Nicho" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos os nichos</SelectItem>
          {niches.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              {n.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="churned">Cancelados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
