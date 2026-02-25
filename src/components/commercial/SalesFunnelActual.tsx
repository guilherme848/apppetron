import { cn } from '@/lib/utils';
import { SalesFunnelKPI, formatNumber, formatPercent, MONTH_NAMES } from '@/types/salesFunnel';
import { parseISO } from 'date-fns';
import { Users, Calendar, Video, Trophy, ArrowDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  kpis: SalesFunnelKPI[];
  selectedMonth?: number;
}

export function SalesFunnelActual({ kpis, selectedMonth }: Props) {
  const isMobile = useIsMobile();

  const getValues = () => {
    if (selectedMonth !== undefined) {
      const monthKpi = kpis.find(k => parseISO(k.month).getMonth() === selectedMonth);
      if (monthKpi) {
        return {
          leads: monthKpi.leads_actual || 0,
          appointments: monthKpi.appointments_actual || 0,
          meetings: monthKpi.meetings_held_actual || 0,
          sales: monthKpi.sales_actual || 0,
        };
      }
    }
    return kpis.reduce((acc, kpi) => ({
      leads: acc.leads + (kpi.leads_actual || 0),
      appointments: acc.appointments + (kpi.appointments_actual || 0),
      meetings: acc.meetings + (kpi.meetings_held_actual || 0),
      sales: acc.sales + (kpi.sales_actual || 0),
    }), { leads: 0, appointments: 0, meetings: 0, sales: 0 });
  };

  const values = getValues();
  const safeDiv = (a: number, b: number) => b === 0 ? null : a / b;

  const stages = [
    { key: 'leads', label: 'Leads', value: values.leads, icon: <Users className="h-4 w-4" />, conversion: safeDiv(values.appointments, values.leads), nextLabel: 'Agendamentos' },
    { key: 'appointments', label: 'Agendamentos', value: values.appointments, icon: <Calendar className="h-4 w-4" />, conversion: safeDiv(values.meetings, values.appointments), nextLabel: 'Reuniões' },
    { key: 'meetings', label: 'Reuniões', value: values.meetings, icon: <Video className="h-4 w-4" />, conversion: safeDiv(values.sales, values.meetings), nextLabel: 'Vendas' },
    { key: 'sales', label: 'Vendas', value: values.sales, icon: <Trophy className="h-4 w-4" />, conversion: null, nextLabel: null },
  ];

  // Width percentages for funnel shape (decreasing)
  const widths = [100, 72, 50, 32];
  // Opacity levels
  const opacities = ['bg-primary', 'bg-primary/80', 'bg-primary/60', 'bg-primary/40'];

  const periodLabel = selectedMonth !== undefined
    ? MONTH_NAMES[selectedMonth]
    : 'Ano (YTD)';

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-4">{periodLabel}</p>
      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, index) => (
          <div key={stage.key} className="w-full flex flex-col items-center">
            {/* Funnel trapezoid block */}
            <div
              className={cn(
                "relative py-3 px-5 rounded-md transition-all flex items-center justify-between",
                opacities[index],
                "text-primary-foreground"
              )}
              style={{
                width: `${widths[index]}%`,
                minWidth: isMobile ? '200px' : '260px',
                clipPath: index < stages.length - 1
                  ? `polygon(0% 0%, 100% 0%, ${100 - (widths[index] - widths[index + 1]) / 2 / widths[index] * 100}% 100%, ${(widths[index] - widths[index + 1]) / 2 / widths[index] * 100}% 100%)`
                  : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                {stage.icon}
                <span className="text-sm font-medium">{stage.label}</span>
              </div>
              <span className="text-lg font-bold">{formatNumber(stage.value)}</span>
            </div>

            {/* Conversion arrow between stages */}
            {stage.conversion !== null && (
              <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                <ArrowDown className="h-3 w-3" />
                <span className="text-xs">
                  {formatPercent(stage.conversion)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overall conversion */}
      {values.leads > 0 && (
        <div className="text-center pt-3">
          <span className="text-xs text-muted-foreground">Conversão Lead → Venda: </span>
          <span className="text-sm font-semibold text-primary">
            {formatPercent(safeDiv(values.sales, values.leads))}
          </span>
        </div>
      )}
    </div>
  );
}
