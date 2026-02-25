import { cn } from '@/lib/utils';
import { SalesFunnelKPI, formatNumber, formatPercent, formatCurrency, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { parseISO } from 'date-fns';
import { Users, Calendar, Video, Trophy, DollarSign } from 'lucide-react';
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

  // Calculate proportional widths: investment = 100%, leads relative to investment visual, others relative to leads
  const maxVolume = Math.max(v.leads, 1);
  const widthPercents = stages.map((s, i) => {
    if (s.isHeader) return 100; // Investimento = full width
    if (i === 1) return 85; // Leads always starts narrower than Investimento
    // Remaining stages proportional to leads, scaled within the 85% cap
    return Math.max(Math.round((s.value / maxVolume) * 85), 18);
  });

  const funnelOpacities = [1, 1, 0.85, 0.7, 0.55];

  const periodLabel = selectedMonth !== undefined ? MONTH_NAMES[selectedMonth] : 'Ano (YTD)';

  const STAGE_H = 64;
  const CONNECTOR_H = 36;

  // Build trapezoid SVG between two stages
  const buildTrapezoid = (topW: number, bottomW: number, height: number) => {
    const topLeft = (100 - topW) / 2;
    const topRight = topLeft + topW;
    const bottomLeft = (100 - bottomW) / 2;
    const bottomRight = bottomLeft + bottomW;
    return `M ${topLeft} 0 L ${topRight} 0 L ${bottomRight} ${height} L ${bottomLeft} ${height} Z`;
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-5">{periodLabel}</p>

      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const w = widthPercents[index];
          const nextW = index < stages.length - 1 ? widthPercents[index + 1] : w;

          return (
            <div key={stage.label} className="w-full flex flex-col items-center">
              {/* Stage bar */}
              <div
                className="relative mx-auto"
                style={{
                  width: isMobile ? '100%' : `${w}%`,
                  minWidth: isMobile ? undefined : '260px',
                  transition: 'width 0.4s ease',
                }}
              >
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-5",
                    stage.isHeader
                      ? "bg-card border border-border"
                      : "text-primary-foreground"
                  )}
                  style={{
                    height: `${STAGE_H}px`,
                    ...(!stage.isHeader ? {
                      background: `hsl(var(--primary) / ${funnelOpacities[index]})`,
                    } : {}),
                  }}
                >
                  {/* Left: icon + label + kpis */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      stage.isHeader ? "bg-muted" : "bg-white/20"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold leading-tight", stage.isHeader && "text-foreground")}>
                        {stage.label}
                      </p>
                      {stage.kpis.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {stage.kpis.map(k => (
                            <span key={k.label} className={cn("text-[11px]", stage.isHeader ? "text-muted-foreground" : "text-white/70")}>
                              {k.label}: <span className="font-semibold">{k.value}</span>
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
              </div>

              {/* Trapezoidal connector with conversion rate */}
              {index < stages.length - 1 && (
                <div
                  className="relative w-full"
                  style={{
                    height: `${CONNECTOR_H}px`,
                  }}
                >
                  {/* SVG trapezoid */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox={`0 0 100 ${CONNECTOR_H}`}
                    preserveAspectRatio="none"
                  >
                    <path
                      d={buildTrapezoid(
                        isMobile ? 100 : Math.max(w, 20),
                        isMobile ? 100 : Math.max(nextW, 20),
                        CONNECTOR_H
                      )}
                      fill={stage.isHeader
                        ? 'hsl(var(--primary) / 0.15)'
                        : `hsl(var(--primary) / ${(funnelOpacities[index] + (funnelOpacities[index + 1] ?? funnelOpacities[index])) / 2 * 0.4})`
                      }
                    />
                  </svg>

                  {/* Conversion label centered */}
                  {stage.convRate !== null && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <span className="text-xs font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        {stage.convLabel}: <span className="text-foreground font-bold">{formatPercent(stage.convRate)}</span>
                      </span>
                    </div>
                  )}
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
