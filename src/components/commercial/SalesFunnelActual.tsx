import { cn } from '@/lib/utils';
import { SalesFunnelKPI, formatNumber, formatPercent, MONTH_NAMES } from '@/types/salesFunnel';
import { parseISO } from 'date-fns';
import { Users, Calendar, Video, Trophy, ArrowDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  kpis: SalesFunnelKPI[];
  selectedMonth?: number; // 0-11, if undefined use YTD
}

interface FunnelStage {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  conversionToNext: number | null;
  nextLabel: string | null;
}

export function SalesFunnelActual({ kpis, selectedMonth }: Props) {
  const isMobile = useIsMobile();

  // Calculate values based on selected month or YTD
  const getValues = () => {
    if (selectedMonth !== undefined) {
      // Find the specific month
      const monthKpi = kpis.find(k => {
        const monthIndex = parseISO(k.month).getMonth();
        return monthIndex === selectedMonth;
      });
      
      if (monthKpi) {
        return {
          leads: monthKpi.leads_actual || 0,
          appointments: monthKpi.appointments_actual || 0,
          meetings: monthKpi.meetings_held_actual || 0,
          sales: monthKpi.sales_actual || 0,
        };
      }
    }
    
    // YTD: sum all months
    return kpis.reduce((acc, kpi) => ({
      leads: acc.leads + (kpi.leads_actual || 0),
      appointments: acc.appointments + (kpi.appointments_actual || 0),
      meetings: acc.meetings + (kpi.meetings_held_actual || 0),
      sales: acc.sales + (kpi.sales_actual || 0),
    }), { leads: 0, appointments: 0, meetings: 0, sales: 0 });
  };

  const values = getValues();

  // Calculate conversion rates
  const safeDiv = (a: number, b: number): number | null => {
    if (b === 0) return null;
    return a / b;
  };

  const convLeadsToAppointments = safeDiv(values.appointments, values.leads);
  const convAppointmentsToMeetings = safeDiv(values.meetings, values.appointments);
  const convMeetingsToSales = safeDiv(values.sales, values.meetings);

  const stages: FunnelStage[] = [
    {
      key: 'leads',
      label: 'Leads',
      value: values.leads,
      icon: <Users className="h-5 w-5" />,
      conversionToNext: convLeadsToAppointments,
      nextLabel: 'Agendamentos',
    },
    {
      key: 'appointments',
      label: 'Agendamentos',
      value: values.appointments,
      icon: <Calendar className="h-5 w-5" />,
      conversionToNext: convAppointmentsToMeetings,
      nextLabel: 'Reuniões',
    },
    {
      key: 'meetings',
      label: 'Reuniões',
      value: values.meetings,
      icon: <Video className="h-5 w-5" />,
      conversionToNext: convMeetingsToSales,
      nextLabel: 'Vendas',
    },
    {
      key: 'sales',
      label: 'Vendas',
      value: values.sales,
      icon: <Trophy className="h-5 w-5" />,
      conversionToNext: null,
      nextLabel: null,
    },
  ];

  // Calculate max value for relative sizing
  const maxValue = Math.max(...stages.map(s => s.value), 1);

  const periodLabel = selectedMonth !== undefined 
    ? MONTH_NAMES[selectedMonth] 
    : 'Ano (YTD)';

  const formatConversion = (value: number | null): string => {
    if (value === null) return '—';
    return formatPercent(value);
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">{periodLabel}</p>
        {stages.map((stage, index) => (
          <div key={stage.key}>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {stage.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stage.label}</p>
                  <p className="text-2xl font-bold">{formatNumber(stage.value)}</p>
                </div>
              </div>
            </div>
            
            {stage.conversionToNext !== null && (
              <div className="flex items-center justify-center py-2 text-muted-foreground">
                <ArrowDown className="h-4 w-4 mr-2" />
                <span className="text-sm">
                  → {stage.nextLabel}: <span className="font-medium text-foreground">{formatConversion(stage.conversionToNext)}</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">{periodLabel}</p>
      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, index) => {
          // Calculate width based on value relative to max (funnel effect)
          const widthPercent = Math.max(30, (stage.value / maxValue) * 100);
          
          return (
            <div key={stage.key} className="w-full flex flex-col items-center">
              {/* Stage block */}
              <div 
                className={cn(
                  "relative py-4 px-6 rounded-lg transition-all",
                  "bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20",
                  "border border-primary/20",
                  "flex items-center justify-between gap-4"
                )}
                style={{ width: `${widthPercent}%`, minWidth: '280px' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    {stage.icon}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stage.label}</p>
                    <p className="text-2xl font-bold">{formatNumber(stage.value)}</p>
                  </div>
                </div>
              </div>
              
              {/* Conversion arrow */}
              {stage.conversionToNext !== null && (
                <div className="flex items-center gap-2 py-2 text-muted-foreground">
                  <ArrowDown className="h-4 w-4" />
                  <span className="text-sm">
                    → {stage.nextLabel}: <span className="font-semibold text-primary">{formatConversion(stage.conversionToNext)}</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
