import { cn } from '@/lib/utils';
import { SalesFunnelKPI, formatNumber, formatPercent, formatCurrency, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { parseISO } from 'date-fns';
import { Users, Calendar, Video, Trophy, ChevronDown, DollarSign } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  kpis: SalesFunnelKPI[];
  selectedMonth?: number;
}

export function SalesFunnelActual({ kpis, selectedMonth }: Props) {
  const isMobile = useIsMobile();

  const getValues = () => {
    if (selectedMonth !== undefined) {
      const kpi = kpis.find(k => parseISO(k.month).getMonth() === selectedMonth);
      if (kpi) return {
        investment: kpi.investment_actual || 0,
        leads: kpi.leads_actual || 0,
        appointments: kpi.appointments_actual || 0,
        meetings: kpi.meetings_held_actual || 0,
        sales: kpi.sales_actual || 0,
        revenue: kpi.revenue_actual || 0,
      };
    }
    return kpis.reduce((acc, kpi) => ({
      investment: acc.investment + (kpi.investment_actual || 0),
      leads: acc.leads + (kpi.leads_actual || 0),
      appointments: acc.appointments + (kpi.appointments_actual || 0),
      meetings: acc.meetings + (kpi.meetings_held_actual || 0),
      sales: acc.sales + (kpi.sales_actual || 0),
      revenue: acc.revenue + (kpi.revenue_actual || 0),
    }), { investment: 0, leads: 0, appointments: 0, meetings: 0, sales: 0, revenue: 0 });
  };

  const v = getValues();
  const safeDiv = (a: number, b: number) => b === 0 ? null : a / b;

  const cpl = safeDiv(v.investment, v.leads);
  const rateScheduling = safeDiv(v.appointments, v.leads);
  const rateAttendance = safeDiv(v.meetings, v.appointments);
  const costPerAttendance = safeDiv(v.investment, v.meetings);
  const rateClose = safeDiv(v.sales, v.meetings);
  const cac = safeDiv(v.investment, v.sales);
  const avgTicket = safeDiv(v.revenue, v.sales);
  const roas = safeDiv(v.revenue, v.investment);
  const convLeadSale = safeDiv(v.sales, v.leads);

  const stages = [
    {
      label: 'Investimento',
      value: v.investment,
      formattedValue: formatCurrency(v.investment),
      icon: DollarSign,
      kpis: [] as { label: string; value: string }[],
      convRate: null as number | null,
      convLabel: '',
      isHeader: true,
    },
    {
      label: 'Leads',
      value: v.leads,
      formattedValue: formatNumber(v.leads),
      icon: Users,
      kpis: [{ label: 'CPL', value: formatCurrency(cpl) }],
      convRate: rateScheduling,
      convLabel: 'Tx Agendamento',
      isHeader: false,
    },
    {
      label: 'Reunião Agendada',
      value: v.appointments,
      formattedValue: formatNumber(v.appointments),
      icon: Calendar,
      kpis: [],
      convRate: rateAttendance,
      convLabel: 'Tx Comparecimento',
      isHeader: false,
    },
    {
      label: 'Comparecida',
      value: v.meetings,
      formattedValue: formatNumber(v.meetings),
      icon: Video,
      kpis: [{ label: 'Custo/Comp.', value: formatCurrency(costPerAttendance) }],
      convRate: rateClose,
      convLabel: 'Tx Conversão',
      isHeader: false,
    },
    {
      label: 'Vendas',
      value: v.sales,
      formattedValue: formatNumber(v.sales),
      icon: Trophy,
      kpis: [
        { label: 'CAC', value: formatCurrency(cac) },
        { label: 'Ticket Médio', value: formatCurrency(avgTicket) },
      ],
      convRate: null,
      convLabel: '',
      isHeader: false,
    },
  ];

  // Proportional: leads = 100%, others relative
  const maxVolume = Math.max(v.leads, 1);
  const widths = stages.map((s, i) => {
    if (s.isHeader) return 100;
    return Math.max(Math.round((s.value / maxVolume) * 100), 22);
  });

  const funnelColors = [
    '', // header – styled separately
    'from-primary to-primary/90',
    'from-primary/80 to-primary/70',
    'from-primary/65 to-primary/55',
    'from-primary/50 to-primary/40',
  ];

  const periodLabel = selectedMonth !== undefined ? MONTH_NAMES[selectedMonth] : 'Ano (YTD)';

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-5">{periodLabel}</p>

      <div className="flex flex-col items-center">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const w = widths[index];

          return (
            <div key={stage.label} className="w-full flex flex-col items-center">
              {/* Stage bar */}
              <div
                className={cn(
                  "relative flex items-center justify-between gap-3 rounded-lg transition-all",
                  stage.isHeader
                    ? "bg-card border border-border px-5 py-4"
                    : `bg-gradient-to-r ${funnelColors[index]} text-primary-foreground px-5 py-4`
                )}
                style={{
                  width: isMobile ? '100%' : `${w}%`,
                  minWidth: isMobile ? undefined : '280px',
                }}
              >
                {/* Left: icon + label */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                    stage.isHeader ? "bg-muted" : "bg-white/15"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium leading-tight", stage.isHeader && "text-foreground")}>
                      {stage.label}
                    </p>
                    {/* Inline KPIs below label */}
                    {stage.kpis.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5">
                        {stage.kpis.map(k => (
                          <span key={k.label} className={cn("text-xs", stage.isHeader ? "text-muted-foreground" : "text-white/70")}>
                            {k.label}: <span className="font-medium">{k.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: big number */}
                <span className={cn(
                  "text-xl font-bold flex-shrink-0 tabular-nums",
                  stage.isHeader && "text-foreground"
                )}>
                  {stage.formattedValue}
                </span>
              </div>

              {/* Conversion connector */}
              {stage.convRate !== null && (
                <div className="flex items-center gap-1.5 py-2 text-muted-foreground">
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {stage.convLabel}: <span className="text-foreground font-semibold">{formatPercent(stage.convRate)}</span>
                  </span>
                </div>
              )}

              {/* Arrow from investment to leads */}
              {stage.isHeader && (
                <div className="py-2">
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom summary */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
        {v.leads > 0 && v.sales > 0 && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Lead → Venda</p>
            <p className="text-lg font-bold text-primary">{formatPercent(convLeadSale)}</p>
          </div>
        )}
        {v.revenue > 0 && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-lg font-bold">{formatCurrency(v.revenue)}</p>
          </div>
        )}
        {roas !== null && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">ROAS</p>
            <p className="text-lg font-bold">{formatRoas(roas)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
