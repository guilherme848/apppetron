import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, HelpCircle, Zap, RefreshCw } from 'lucide-react';
import { SalesFunnelActual, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { FunnelActualModal } from './FunnelActualModal';
import { parseISO, setMonth, setYear, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientMetricsByMonth, BaseMetrics } from '@/hooks/useSalesFunnel';
import { FunnelBenchmark } from '@/hooks/useFunnelBenchmarks';
import { FunnelMetaMetrics } from '@/hooks/useFunnelMetaMetrics';

interface Props {
  actuals: SalesFunnelActual[];
  clientMetrics: ClientMetricsByMonth[];
  baseMetrics: BaseMetrics;
  metaMetrics: FunnelMetaMetrics[];
  metaLastSync: Date | null;
  onRefreshMeta?: () => void;
  year: number;
  canEdit: boolean;
  onSave: (month: Date, data: Partial<SalesFunnelActual>) => Promise<boolean>;
  benchmarks: FunnelBenchmark[];
  getValueLevel: (metricKey: string, value: number | null) => 'bad' | 'regular' | 'good' | null;
}

// Define metrics rows configuration - rates after their source data
// Metrics marked as 'fromClients' are derived from accounts table
// Metrics marked as 'fromMeta' come from Meta Ads API in real-time
interface MetricConfig {
  key: string;
  label: string;
  format: (v: number | null) => string;
  computed?: boolean;
  fromClients?: boolean;
  fromMeta?: boolean;
  hasBenchmark?: boolean;
  benchmarkKey?: string;
  hasTooltip?: boolean;
}

const METRICS_CONFIG: MetricConfig[] = [
  { key: 'investment_actual', label: 'Investimento', format: formatCurrency, fromMeta: true },
  { key: 'leads_actual', label: 'Leads', format: formatNumber, fromMeta: true },
  { key: 'cpl_actual', label: 'CPL', format: formatCurrency, computed: true },
  { key: 'mql_actual', label: 'MQL', format: formatNumber },
  { key: 'cpmql_actual', label: 'CPMQL', format: formatCurrency, computed: true },
  { key: 'rate_qualification_actual', label: 'Tx Qualif.', format: formatPercent, computed: true, hasBenchmark: true, benchmarkKey: 'rate_qualification' },
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

export function FunnelActualsTable({ 
  actuals, 
  clientMetrics, 
  baseMetrics, 
  metaMetrics,
  metaLastSync,
  onRefreshMeta,
  year, 
  canEdit, 
  onSave, 
  benchmarks, 
  getValueLevel 
}: Props) {
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

  const getMetaMetricsForMonth = (monthIndex: number): FunnelMetaMetrics | undefined => {
    const monthDate = new Date(year, monthIndex, 1);
    const monthKey = monthDate.toISOString().split('T')[0].slice(0, 7) + '-01';
    return metaMetrics.find(m => m.month === monthKey);
  };

  // Get value considering client metrics, Meta metrics, and manual data
  const getComputedValue = (
    actual: SalesFunnelActual | undefined, 
    clientData: ClientMetricsByMonth | undefined, 
    metaData: FunnelMetaMetrics | undefined,
    key: string
  ): number | null => {
    // For client-derived metrics, use client data
    const salesCount = clientData?.sales_count || 0;
    const totalRevenue = clientData?.total_revenue || 0;
    const avgTicket = clientData?.avg_ticket || 0;
    
    // For Meta-derived metrics, use Meta data (priority over manual)
    const investment = metaData?.investment && metaData.investment > 0 
      ? metaData.investment 
      : actual?.investment_actual || null;
    const leads = metaData?.leads && metaData.leads > 0 
      ? metaData.leads 
      : actual?.leads_actual || null;
    
    const meetingsHeld = actual?.meetings_held_actual || null;
    
    switch (key) {
      case 'investment_actual':
        return investment;
      case 'leads_actual':
        return leads;
      case 'mql_actual':
        return actual?.mql_actual ?? null;
      case 'sales_actual':
        return salesCount > 0 ? salesCount : null;
      case 'avg_ticket_actual':
        return avgTicket > 0 ? avgTicket : null;
      case 'revenue_actual':
        return totalRevenue > 0 ? totalRevenue : null;
      case 'cpl_actual':
        return investment && leads && leads !== 0
          ? investment / leads
          : null;
      case 'cpmql_actual': {
        const mql = actual?.mql_actual ?? null;
        return investment && mql && mql > 0
          ? investment / mql
          : null;
      }
      case 'rate_qualification_actual': {
        const mql2 = actual?.mql_actual ?? null;
        return leads && leads !== 0 && mql2 && mql2 > 0
          ? mql2 / leads
          : null;
      }
      case 'rate_scheduling_actual': {
        const appointments = actual?.appointments_actual || null;
        const mqlForScheduling = actual?.mql_actual ?? null;
        // Use MQL as base if available, otherwise use leads
        const base = mqlForScheduling && mqlForScheduling > 0 ? mqlForScheduling : leads;
        return base && base !== 0 && appointments
          ? appointments / base
          : null;
      }
      case 'rate_attendance_actual':
        return actual?.appointments_actual && actual.appointments_actual !== 0 && actual?.meetings_held_actual
          ? actual.meetings_held_actual / actual.appointments_actual
          : null;
      case 'cost_per_attendance_actual':
        return investment && meetingsHeld && meetingsHeld !== 0
          ? investment / meetingsHeld
          : null;
      case 'rate_close_actual':
        return meetingsHeld && meetingsHeld !== 0 && salesCount
          ? salesCount / meetingsHeld
          : null;
      case 'cost_per_sale_actual':
        return investment && salesCount && salesCount !== 0
          ? investment / salesCount
          : null;
      case 'roas_actual':
        return totalRevenue && investment && investment !== 0
          ? totalRevenue / investment
          : null;
      case 'roas_expected':
        if (baseMetrics.avgLtMonths > 0 && avgTicket > 0 && investment && salesCount > 0) {
          const ltv = baseMetrics.avgLtMonths * avgTicket;
          const cac = investment / salesCount;
          return cac !== 0 ? ltv / cac : null;
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
        const metaData = getMetaMetricsForMonth(i);
        const investment = getComputedValue(actual, clientData, metaData, 'investment_actual');
        const leads = getComputedValue(actual, clientData, metaData, 'leads_actual');
        
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
              {actual || (clientData && clientData.sales_count > 0) || (metaData && metaData.investment > 0) ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Investimento:</span>
                    <span className="ml-1 font-medium">{formatCurrency(investment)}</span>
                    {metaData?.investment && metaData.investment > 0 && (
                      <Zap className="h-3 w-3 inline-block ml-1 text-primary" />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leads:</span>
                    <span className="ml-1 font-medium">{formatNumber(leads)}</span>
                    {metaData?.leads && metaData.leads > 0 && (
                      <Zap className="h-3 w-3 inline-block ml-1 text-primary" />
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPL:</span>
                    <span className="ml-1 font-medium">{formatCurrency(getComputedValue(actual, clientData, metaData, 'cpl_actual'))}</span>
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
                    <span className="ml-1 font-medium">{formatRoas(getComputedValue(actual, clientData, metaData, 'roas_actual'))}</span>
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
                  const metaData = getMetaMetricsForMonth(monthIndex);
                  
                  const value = (metric.computed || metric.fromClients || metric.fromMeta)
                    ? getComputedValue(actual, clientData, metaData, metric.key)
                    : (actual ? actual[metric.key as keyof SalesFunnelActual] as number | null : null);
                  
                  // Check if this value comes from Meta (real-time)
                  const isFromMeta = metric.fromMeta && metaData && (
                    (metric.key === 'investment_actual' && metaData.investment > 0) ||
                    (metric.key === 'leads_actual' && metaData.leads > 0)
                  );
                  
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
                      <div className="flex items-center justify-center gap-1">
                        {metric.format(value)}
                        {isFromMeta && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Zap className="h-3 w-3 text-primary" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Dados em tempo real do Meta Ads</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
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
      {/* Meta sync status */}
      {metaLastSync && (
        <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>
              Dados Meta atualizados {formatDistanceToNow(metaLastSync, { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          {onRefreshMeta && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs"
              onClick={onRefreshMeta}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
          )}
        </div>
      )}

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
