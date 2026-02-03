import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Plus, HelpCircle } from 'lucide-react';
import { SalesFunnelActual, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { FunnelActualModal } from './FunnelActualModal';
import { parseISO, setMonth, setYear } from 'date-fns';
import { ClientMetricsByMonth, BaseMetrics } from '@/hooks/useSalesFunnel';
import { FunnelBenchmark } from '@/hooks/useFunnelBenchmarks';

interface Props {
  actuals: SalesFunnelActual[];
  clientMetrics: ClientMetricsByMonth[];
  baseMetrics: BaseMetrics;
  year: number;
  canEdit: boolean;
  onSave: (month: Date, data: Partial<SalesFunnelActual>) => Promise<boolean>;
  benchmarks: FunnelBenchmark[];
  getValueLevel: (metricKey: string, value: number | null) => 'bad' | 'regular' | 'good' | null;
}

// Define metrics rows configuration - rates after their source data
// Metrics marked as 'fromClients' are derived from accounts table
interface MetricConfig {
  key: string;
  label: string;
  format: (v: number | null) => string;
  computed?: boolean;
  fromClients?: boolean;
  hasBenchmark?: boolean;
  benchmarkKey?: string;
  hasTooltip?: boolean;
}

const METRICS_CONFIG: MetricConfig[] = [
  { key: 'investment_actual', label: 'Investimento', format: formatCurrency },
  { key: 'leads_actual', label: 'Leads', format: formatNumber },
  { key: 'cpl_actual', label: 'CPL', format: formatCurrency, computed: true },
  { key: 'appointments_actual', label: 'Agendamentos', format: formatNumber },
  { key: 'rate_scheduling_actual', label: 'Tx Agend.', format: formatPercent, computed: true, hasBenchmark: true, benchmarkKey: 'rate_scheduling' },
  { key: 'meetings_held_actual', label: 'Reuniões', format: formatNumber },
  { key: 'rate_attendance_actual', label: 'Tx Comp.', format: formatPercent, computed: true, hasBenchmark: true, benchmarkKey: 'rate_attendance' },
  { key: 'cost_per_attendance_actual', label: 'Custo/Comp.', format: formatCurrency, computed: true },
  { key: 'sales_actual', label: 'Vendas', format: formatNumber, fromClients: true },
  { key: 'rate_close_actual', label: 'Tx Conv.', format: formatPercent, computed: true, hasBenchmark: true, benchmarkKey: 'rate_close' },
  { key: 'cost_per_sale_actual', label: 'CAC', format: formatCurrency, computed: true },
  { key: 'avg_ticket_actual', label: 'Ticket Médio', format: formatCurrency, fromClients: true },
  { key: 'revenue_actual', label: 'Receita', format: formatCurrency, fromClients: true },
  { key: 'roas_actual', label: 'ROAS', format: formatRoas, computed: true, hasBenchmark: true, benchmarkKey: 'roas' },
  { key: 'roas_expected', label: 'ROAS (Exp.)', format: formatRoas, computed: true, hasTooltip: true },
];

// Short month names for column headers
const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function FunnelActualsTable({ actuals, clientMetrics, baseMetrics, year, canEdit, onSave, benchmarks, getValueLevel }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [selectedActual, setSelectedActual] = useState<SalesFunnelActual | undefined>();

  const handleEdit = (monthIndex: number) => {
    const monthDate = setMonth(setYear(new Date(), year), monthIndex);
    const existingActual = actuals.find(a => {
      const aMonth = parseISO(a.month);
      return aMonth.getMonth() === monthIndex && aMonth.getFullYear() === year;
    });
    
    setSelectedMonth(monthDate);
    setSelectedActual(existingActual);
    setModalOpen(true);
  };

  const getActualForMonth = (monthIndex: number): SalesFunnelActual | undefined => {
    return actuals.find(a => {
      const aMonth = parseISO(a.month);
      return aMonth.getMonth() === monthIndex && aMonth.getFullYear() === year;
    });
  };

  const getClientMetricsForMonth = (monthIndex: number): ClientMetricsByMonth | undefined => {
    return clientMetrics.find(m => m.month === monthIndex);
  };

  // Get value considering client metrics for sales, ticket, revenue
  const getComputedValue = (actual: SalesFunnelActual | undefined, clientData: ClientMetricsByMonth | undefined, key: string): number | null => {
    // For client-derived metrics, use client data
    const salesCount = clientData?.sales_count || 0;
    const totalRevenue = clientData?.total_revenue || 0;
    const avgTicket = clientData?.avg_ticket || 0;
    const investment = actual?.investment_actual || null;
    const meetingsHeld = actual?.meetings_held_actual || null;
    
    switch (key) {
      case 'sales_actual':
        return salesCount > 0 ? salesCount : null;
      case 'avg_ticket_actual':
        return avgTicket > 0 ? avgTicket : null;
      case 'revenue_actual':
        return totalRevenue > 0 ? totalRevenue : null;
      case 'cpl_actual':
        return actual?.investment_actual && actual?.leads_actual
          ? actual.investment_actual / actual.leads_actual
          : null;
      case 'rate_scheduling_actual':
        return actual?.leads_actual && actual?.appointments_actual
          ? actual.appointments_actual / actual.leads_actual
          : null;
      case 'rate_attendance_actual':
        return actual?.appointments_actual && actual?.meetings_held_actual
          ? actual.meetings_held_actual / actual.appointments_actual
          : null;
      case 'cost_per_attendance_actual':
        return investment && meetingsHeld
          ? investment / meetingsHeld
          : null;
      case 'rate_close_actual':
        return meetingsHeld && salesCount
          ? salesCount / meetingsHeld
          : null;
      case 'cost_per_sale_actual':
        return investment && salesCount
          ? investment / salesCount
          : null;
      case 'roas_actual':
        return totalRevenue && investment
          ? totalRevenue / investment
          : null;
      case 'roas_expected':
        // ROAS Expectativa = (LT médio * Ticket médio) / CAC
        // LTV = avgLtMonths * avgTicket, CAC = investment / salesCount
        if (baseMetrics.avgLtMonths > 0 && avgTicket > 0 && investment && salesCount > 0) {
          const ltv = baseMetrics.avgLtMonths * avgTicket;
          const cac = investment / salesCount;
          return ltv / cac;
        }
        return null;
      default:
        return actual ? actual[key as keyof SalesFunnelActual] as number | null : null;
    }
  };

  // Mobile card view
  const MobileView = () => (
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 12 }, (_, i) => {
        const actual = getActualForMonth(i);
        const clientData = getClientMetricsForMonth(i);
        return (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{MONTH_NAMES[i]}</CardTitle>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(i)}>
                    {actual ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {actual || (clientData && clientData.sales_count > 0) ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Investimento:</span>
                    <span className="ml-1 font-medium">{formatCurrency(actual?.investment_actual ?? null)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leads:</span>
                    <span className="ml-1 font-medium">{formatNumber(actual?.leads_actual ?? null)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPL:</span>
                    <span className="ml-1 font-medium">{formatCurrency(getComputedValue(actual, clientData, 'cpl_actual'))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendas:</span>
                    <span className="ml-1 font-medium">{formatNumber(clientData?.sales_count ?? null)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receita:</span>
                    <span className="ml-1 font-medium">{formatCurrency(clientData?.total_revenue ?? null)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROAS:</span>
                    <span className="ml-1 font-medium">{formatRoas(getComputedValue(actual, clientData, 'roas_actual'))}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum dado registrado</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Desktop table view - inverted: metrics as rows, months as columns
  const DesktopView = () => (
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background min-w-[120px]">Métrica</TableHead>
            {SHORT_MONTHS.map((month, i) => (
              <TableHead key={i} className="text-center min-w-[80px]">
                <div className="flex flex-col items-center gap-1">
                  <span>{month}</span>
                  {canEdit && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => handleEdit(i)}
                    >
                      {getActualForMonth(i) ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {METRICS_CONFIG.map((metric) => {
            const benchmark = metric.benchmarkKey 
              ? benchmarks.find(b => b.metric_key === metric.benchmarkKey)
              : undefined;
            
            return (
              <TableRow key={metric.key}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span>{metric.label}</span>
                      {metric.hasTooltip && metric.key === 'roas_expected' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium">ROAS Expectativa (LTV-based)</p>
                              <p className="mt-1 text-xs">
                                Fórmula: LTV / CAC
                              </p>
                              <p className="text-xs text-muted-foreground">
                                LTV = LT médio × Ticket médio do mês
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                LT médio atual: {baseMetrics.avgLtMonths.toFixed(1).replace('.', ',')} meses
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Base: {baseMetrics.activeClientsCount} clientes ativos
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {metric.hasBenchmark && benchmark && (
                      <span className="text-xs text-muted-foreground">
                        Bench: {benchmark.is_percentage 
                          ? formatPercent(benchmark.good_threshold)
                          : formatRoas(benchmark.good_threshold)}
                      </span>
                    )}
                  </div>
                </TableCell>
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const actual = getActualForMonth(monthIndex);
                  const clientData = getClientMetricsForMonth(monthIndex);
                  const value = (metric.computed || metric.fromClients)
                    ? getComputedValue(actual, clientData, metric.key)
                    : (actual ? actual[metric.key as keyof SalesFunnelActual] as number | null : null);
                  
                  // Determine color based on benchmark comparison using levels
                  let valueColor = '';
                  if (metric.hasBenchmark && value !== null) {
                    const level = getValueLevel(metric.key, value);
                    if (level === 'good') {
                      valueColor = 'text-green-600 dark:text-green-400';
                    } else if (level === 'regular') {
                      valueColor = 'text-amber-600 dark:text-amber-400';
                    } else if (level === 'bad') {
                      valueColor = 'text-red-600 dark:text-red-400';
                    }
                  }
                  
                  return (
                    <TableCell key={monthIndex} className={`text-center ${valueColor}`}>
                      {metric.format(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <MobileView />
      <DesktopView />
      
      {selectedMonth && (
        <FunnelActualModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          month={selectedMonth}
          actual={selectedActual}
          onSave={onSave}
        />
      )}
    </>
  );
}
