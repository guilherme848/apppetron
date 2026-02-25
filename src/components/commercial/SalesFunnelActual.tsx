import { cn } from '@/lib/utils';
import { SalesFunnelKPI, formatNumber, formatPercent, formatCurrency, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { parseISO } from 'date-fns';
import { Users, Calendar, Video, Trophy, ArrowDown, DollarSign } from 'lucide-react';
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
      if (kpi) {
        return {
          investment: kpi.investment_actual || 0,
          leads: kpi.leads_actual || 0,
          appointments: kpi.appointments_actual || 0,
          meetings: kpi.meetings_held_actual || 0,
          sales: kpi.sales_actual || 0,
          revenue: kpi.revenue_actual || 0,
        };
      }
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

  // Funnel stages: Investimento > Leads > Reunião Agendada > Comparecida > Vendas
  const stages = [
    {
      label: 'Investimento',
      value: v.investment,
      formattedValue: formatCurrency(v.investment),
      icon: <DollarSign className="h-4 w-4" />,
      details: [],
      convRate: null as number | null,
      convLabel: null as string | null,
    },
    {
      label: 'Leads',
      value: v.leads,
      formattedValue: formatNumber(v.leads),
      icon: <Users className="h-4 w-4" />,
      details: [{ label: 'CPL', value: formatCurrency(cpl) }],
      convRate: rateScheduling,
      convLabel: 'Tx Agendamento',
    },
    {
      label: 'Reunião Agendada',
      value: v.appointments,
      formattedValue: formatNumber(v.appointments),
      icon: <Calendar className="h-4 w-4" />,
      details: [],
      convRate: rateAttendance,
      convLabel: 'Tx Comparecimento',
    },
    {
      label: 'Comparecida',
      value: v.meetings,
      formattedValue: formatNumber(v.meetings),
      icon: <Video className="h-4 w-4" />,
      details: [{ label: 'Custo/Comp.', value: formatCurrency(costPerAttendance) }],
      convRate: rateClose,
      convLabel: 'Tx Conversão',
    },
    {
      label: 'Vendas',
      value: v.sales,
      formattedValue: formatNumber(v.sales),
      icon: <Trophy className="h-4 w-4" />,
      details: [
        { label: 'CAC', value: formatCurrency(cac) },
        { label: 'Ticket Médio', value: formatCurrency(avgTicket) },
        { label: 'Receita', value: formatCurrency(v.revenue) },
        { label: 'ROAS', value: formatRoas(roas) },
      ],
      convRate: null,
      convLabel: null,
    },
  ];

  // Proportional widths based on volume (leads = 100%)
  const maxVolume = Math.max(v.leads, 1);
  const getWidth = (stage: typeof stages[number], index: number): number => {
    if (index === 0) return 100; // Investimento always full
    const proportion = Math.max(stage.value / maxVolume, 0.18);
    return proportion * 100;
  };

  const opacities = ['bg-muted text-muted-foreground border border-border', 'bg-primary text-primary-foreground', 'bg-primary/80 text-primary-foreground', 'bg-primary/60 text-primary-foreground', 'bg-primary/40 text-primary-foreground'];

  const periodLabel = selectedMonth !== undefined ? MONTH_NAMES[selectedMonth] : 'Ano (YTD)';

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">{periodLabel}</p>
      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, index) => (
          <div key={stage.label} className="w-full flex flex-col items-center">
            <div
              className={cn("relative py-3 px-4 rounded-md transition-all", opacities[index])}
              style={{ width: isMobile ? '100%' : `${getWidth(stage, index)}%`, minWidth: isMobile ? undefined : '220px' }}
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
              {stage.details.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-1 sm:hidden">
                  {stage.details.map(d => (
                    <span key={d.label} className="text-xs opacity-80">
                      {d.label}: <span className="font-medium">{d.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {stage.convRate !== null && (
              <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                <ArrowDown className="h-3 w-3" />
                <span className="text-xs">
                  {stage.convLabel}: <span className="font-semibold text-foreground">{formatPercent(stage.convRate)}</span>
                </span>
              </div>
            )}

            {index === 0 && (
              <div className="py-1"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
            )}
          </div>
        ))}
      </div>

      {v.leads > 0 && v.sales > 0 && (
        <div className="text-center pt-3 border-t mt-4">
          <span className="text-xs text-muted-foreground">Conversão Lead → Venda: </span>
          <span className="text-sm font-semibold text-primary">{formatPercent(convLeadSale)}</span>
        </div>
      )}
    </div>
  );
}
