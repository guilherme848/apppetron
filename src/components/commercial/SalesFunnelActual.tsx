import { cn } from '@/lib/utils';
import { SalesFunnelKPI, formatNumber, formatPercent, formatCurrency, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { parseISO } from 'date-fns';
import { Users, Calendar, Video, Trophy, ArrowDown, DollarSign, Target, TrendingUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  kpis: SalesFunnelKPI[];
  selectedMonth?: number;
}

interface FunnelStage {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  icon: React.ReactNode;
  details: { label: string; value: string }[];
  conversionToNext: number | null;
  conversionLabel: string | null;
}

export function SalesFunnelActual({ kpis, selectedMonth }: Props) {
  const isMobile = useIsMobile();

  const getKpi = () => {
    if (selectedMonth !== undefined) {
      return kpis.find(k => parseISO(k.month).getMonth() === selectedMonth) || null;
    }
    return null;
  };

  const getYtdValues = () => {
    return kpis.reduce((acc, kpi) => ({
      investment: acc.investment + (kpi.investment_actual || 0),
      leads: acc.leads + (kpi.leads_actual || 0),
      appointments: acc.appointments + (kpi.appointments_actual || 0),
      meetings: acc.meetings + (kpi.meetings_held_actual || 0),
      sales: acc.sales + (kpi.sales_actual || 0),
      revenue: acc.revenue + (kpi.revenue_actual || 0),
    }), { investment: 0, leads: 0, appointments: 0, meetings: 0, sales: 0, revenue: 0 });
  };

  const kpi = getKpi();
  const isYtd = selectedMonth === undefined;

  // Build values either from single month KPI or YTD aggregation
  const investment = isYtd ? getYtdValues().investment : (kpi?.investment_actual || 0);
  const leads = isYtd ? getYtdValues().leads : (kpi?.leads_actual || 0);
  const appointments = isYtd ? getYtdValues().appointments : (kpi?.appointments_actual || 0);
  const meetings = isYtd ? getYtdValues().meetings : (kpi?.meetings_held_actual || 0);
  const sales = isYtd ? getYtdValues().sales : (kpi?.sales_actual || 0);
  const revenue = isYtd ? getYtdValues().revenue : (kpi?.revenue_actual || 0);

  const safeDiv = (a: number, b: number) => b === 0 ? null : a / b;

  const cpl = safeDiv(investment, leads);
  const rateScheduling = safeDiv(appointments, leads);
  const rateAttendance = safeDiv(meetings, appointments);
  const costPerAttendance = safeDiv(investment, meetings);
  const rateClose = safeDiv(sales, meetings);
  const cac = safeDiv(investment, sales);
  const avgTicket = safeDiv(revenue, sales);
  const roas = safeDiv(revenue, investment);
  const convLeadSale = safeDiv(sales, leads);

  const stages: FunnelStage[] = [
    {
      key: 'investment',
      label: 'Investimento',
      value: investment,
      formattedValue: formatCurrency(investment),
      icon: <DollarSign className="h-4 w-4" />,
      details: [],
      conversionToNext: null,
      conversionLabel: null,
    },
    {
      key: 'leads',
      label: 'Leads',
      value: leads,
      formattedValue: formatNumber(leads),
      icon: <Users className="h-4 w-4" />,
      details: [
        { label: 'CPL', value: formatCurrency(cpl) },
      ],
      conversionToNext: rateScheduling,
      conversionLabel: 'Tx Agendamento',
    },
    {
      key: 'appointments',
      label: 'Agendamentos',
      value: appointments,
      formattedValue: formatNumber(appointments),
      icon: <Calendar className="h-4 w-4" />,
      details: [],
      conversionToNext: rateAttendance,
      conversionLabel: 'Tx Comparecimento',
    },
    {
      key: 'meetings',
      label: 'Reuniões',
      value: meetings,
      formattedValue: formatNumber(meetings),
      icon: <Video className="h-4 w-4" />,
      details: [
        { label: 'Custo/Comp.', value: formatCurrency(costPerAttendance) },
      ],
      conversionToNext: rateClose,
      conversionLabel: 'Tx Conversão',
    },
    {
      key: 'sales',
      label: 'Vendas',
      value: sales,
      formattedValue: formatNumber(sales),
      icon: <Trophy className="h-4 w-4" />,
      details: [
        { label: 'CAC', value: formatCurrency(cac) },
        { label: 'Ticket Médio', value: formatCurrency(avgTicket) },
      ],
      conversionToNext: null,
      conversionLabel: null,
    },
    {
      key: 'revenue',
      label: 'Receita',
      value: revenue,
      formattedValue: formatCurrency(revenue),
      icon: <TrendingUp className="h-4 w-4" />,
      details: [
        { label: 'ROAS', value: formatRoas(roas) },
      ],
      conversionToNext: null,
      conversionLabel: null,
    },
  ];

  // For proportional width, use leads as the max reference (skip investment/revenue as they're monetary)
  const volumeStages = ['leads', 'appointments', 'meetings', 'sales'];
  const maxVolume = Math.max(leads, 1);

  // Calculate proportional width for each stage
  const getWidth = (stage: FunnelStage): number => {
    if (stage.key === 'investment' || stage.key === 'revenue') return 100; // Full width for bookend stages
    const proportion = Math.max(stage.value / maxVolume, 0.15); // min 15% so it's visible
    return proportion * 100;
  };

  const periodLabel = selectedMonth !== undefined
    ? MONTH_NAMES[selectedMonth]
    : 'Ano (YTD)';

  // Opacity levels for funnel stages
  const stageStyles: Record<string, string> = {
    investment: 'bg-muted text-muted-foreground border border-border',
    leads: 'bg-primary text-primary-foreground',
    appointments: 'bg-primary/85 text-primary-foreground',
    meetings: 'bg-primary/70 text-primary-foreground',
    sales: 'bg-primary/55 text-primary-foreground',
    revenue: 'bg-muted text-muted-foreground border border-border',
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">{periodLabel}</p>

      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, index) => {
          const width = getWidth(stage);
          const isFunnelStage = volumeStages.includes(stage.key);

          return (
            <div key={stage.key} className="w-full flex flex-col items-center">
              {/* Stage block */}
              <div
                className={cn(
                  "relative py-3 px-4 rounded-md transition-all",
                  stageStyles[stage.key],
                )}
                style={{
                  width: isMobile ? '100%' : `${width}%`,
                  minWidth: isMobile ? undefined : '220px',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {stage.icon}
                    <span className="text-sm font-medium truncate">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {stage.details.map(d => (
                      <span key={d.label} className="text-xs opacity-80 hidden sm:inline">
                        {d.label}: <span className="font-medium">{d.value}</span>
                      </span>
                    ))}
                    <span className="text-lg font-bold">{stage.formattedValue}</span>
                  </div>
                </div>
                {/* Mobile details */}
                {stage.details.length > 0 && (
                  <div className="flex gap-3 mt-1 sm:hidden">
                    {stage.details.map(d => (
                      <span key={d.label} className="text-xs opacity-80">
                        {d.label}: <span className="font-medium">{d.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversion arrow */}
              {stage.conversionToNext !== null && (
                <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                  <ArrowDown className="h-3 w-3" />
                  <span className="text-xs">
                    {stage.conversionLabel}: <span className="font-semibold text-foreground">{formatPercent(stage.conversionToNext)}</span>
                  </span>
                </div>
              )}

              {/* Separator between investment→leads and sales→revenue */}
              {(stage.key === 'investment' || stage.key === 'sales') && !stage.conversionToNext && index < stages.length - 1 && (
                <div className="py-1">
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall conversion */}
      {leads > 0 && sales > 0 && (
        <div className="text-center pt-3 border-t mt-4">
          <span className="text-xs text-muted-foreground">Conversão Lead → Venda: </span>
          <span className="text-sm font-semibold text-primary">
            {formatPercent(convLeadSale)}
          </span>
        </div>
      )}
    </div>
  );
}
