import { cn } from '@/lib/utils';
import { SalesFunnelKPI, formatNumber, formatPercent, MONTH_NAMES } from '@/types/salesFunnel';
import { parseISO } from 'date-fns';
import { Users, Calendar, Video, Trophy } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

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
  const conversionRate = values.leads > 0 ? (values.sales / values.leads) : 0;

  const periodLabel = selectedMonth !== undefined
    ? MONTH_NAMES[selectedMonth]
    : 'Ano (YTD)';

  const barData = [
    { name: 'Leads', value: values.leads, icon: Users },
    { name: 'Agendamentos', value: values.appointments, icon: Calendar },
    { name: 'Reuniões', value: values.meetings, icon: Video },
    { name: 'Vendas', value: values.sales, icon: Trophy },
  ];

  // Colors with decreasing opacity to create funnel effect
  const barColors = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.8)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary) / 0.4)',
  ];

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      {/* Bar chart funnel */}
      <div className="flex-1 w-full">
        <p className="text-sm text-muted-foreground mb-3">{periodLabel}</p>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
          <BarChart data={barData} layout="horizontal" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis className="text-xs" hide />
            <Tooltip
              formatter={(value: number) => [formatNumber(value), '']}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--background))',
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
              {barData.map((_, index) => (
                <Cell key={index} fill={barColors[index]} />
              ))}
              <LabelList dataKey="value" position="top" className="text-xs font-semibold fill-foreground" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion rate circle */}
      <div className="flex flex-col items-center justify-center gap-2 min-w-[160px]">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${conversionRate * 326.73} 326.73`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">
              {(conversionRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center font-medium">
          Lead-to-Sale<br />Conversion Rate
        </p>
      </div>
    </div>
  );
}
