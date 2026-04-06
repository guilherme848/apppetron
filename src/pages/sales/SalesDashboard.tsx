import { useMemo, useState } from 'react';
import { useSearchParamState } from '@/hooks/usePersistedState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { DC, tooltipStyle } from '@/lib/dashboardColors';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, PieChart, Pie, LineChart, Line,
} from 'recharts';
import {
  AlertTriangle, TrendingUp, DollarSign, Calendar, CheckCircle,
  Users, Clock, X, Video, Phone,
} from 'lucide-react';
import {
  differenceInDays, format, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isWithinInterval, subWeeks, isBefore, isAfter,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodKey = 'week' | 'month' | '3months' | 'year';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: 'Esta semana',
  month: 'Este mês',
  '3months': 'Últimos 3 meses',
  year: 'Este ano',
};

function getPeriodRange(period: PeriodKey) {
  const now = new Date();
  switch (period) {
    case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
    case 'month': return { start: startOfMonth(now), end: now };
    case '3months': return { start: startOfMonth(subMonths(now, 2)), end: now };
    case 'year': return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function GaugeCircle({ value, size = 64 }: { value: number; size?: number }) {
  const color = value >= 70 ? DC.teal : value >= 50 ? DC.orange : DC.red;
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DC.border} strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center" fill={color} fontSize={14} fontWeight="bold">
        {value.toFixed(0)}%
      </text>
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, bgColor }: {
  icon: any; label: string; value: React.ReactNode; sub?: string; color: string; bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: bgColor }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs truncate text-muted-foreground">{label}</p>
            <p className="text-xl font-bold truncate text-foreground">{value}</p>
            {sub && <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SalesDashboard() {
  const {
    funnels, stages, deals, activities, contacts, loading,
    openDeals, totalPipelineValue,
    todayActivities, todayCompleted, overdueActivities,
    conversionRate, getStagesByFunnel,
  } = useSalesCrmData();

  const [period, setPeriod] = useSearchParamState('period', 'month');
  const [filterFunnels, setFilterFunnels] = useState<string[]>([]);
  const [filterResponsible, setFilterResponsible] = useState<string[]>([]);
  const [selectedChannelFunnelId, setSelectedChannelFunnelId] = useState<string>('');
  const [meetingPage, setMeetingPage] = useState(0);

  const range = getPeriodRange(period);
  const weekRange = getPeriodRange('week');

  // All unique responsibles
  const responsibles = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    deals.forEach(d => { if (d.responsible) map.set(d.responsible.id, d.responsible as any); });
    return Array.from(map.values());
  }, [deals]);

  // Filtered data
  const filteredDeals = useMemo(() => {
    let d = deals;
    if (filterFunnels.length) d = d.filter(x => filterFunnels.includes(x.funnel_id));
    if (filterResponsible.length) d = d.filter(x => x.responsible_id && filterResponsible.includes(x.responsible_id));
    return d;
  }, [deals, filterFunnels, filterResponsible]);

  const filteredActivities = useMemo(() => {
    let a = activities;
    if (filterFunnels.length) {
      const dealIds = new Set(filteredDeals.map(d => d.id));
      a = a.filter(x => x.deal_id && dealIds.has(x.deal_id));
    }
    if (filterResponsible.length) a = a.filter(x => x.responsible_id && filterResponsible.includes(x.responsible_id));
    return a;
  }, [activities, filterFunnels, filterResponsible, filteredDeals]);

  const filteredOpenDeals = filteredDeals.filter(d => d.status === 'open');

  // --- MEETINGS ---
  const meetingActivities = filteredActivities.filter(a => a.type === 'meeting');
  const periodMeetings = meetingActivities.filter(a => {
    if (!a.scheduled_at) return false;
    const d = new Date(a.scheduled_at);
    return isWithinInterval(d, range);
  });
  const weekMeetings = meetingActivities.filter(a => {
    if (!a.scheduled_at) return false;
    const d = new Date(a.scheduled_at);
    return isWithinInterval(d, weekRange);
  });

  const meetingsScheduled = periodMeetings.length;
  const meetingsCompleted = periodMeetings.filter(a => a.status === 'completed' && (a.result === 'answered' || a.result === 'Atendeu')).length;
  const meetingsNoShow = periodMeetings.filter(a => a.status === 'completed' && (a.result === 'not_answered' || a.result === 'Não Atendeu' || a.result === 'no_show')).length;
  const attendanceRate = meetingsScheduled > 0 ? (meetingsCompleted / meetingsScheduled) * 100 : 0;
  const meetingsFuture = periodMeetings.filter(a => a.status === 'pending' && a.scheduled_at && isAfter(new Date(a.scheduled_at), new Date())).length;

  // Reunião agendada stage deals
  const meetingStageDealCount = filteredOpenDeals.filter(d => {
    const stage = stages.find(s => s.id === d.stage_id);
    return stage?.name?.toLowerCase().includes('reunião');
  }).length;
  const totalMeetingsScheduledKpi = meetingStageDealCount + meetingsFuture;
  const weekMeetingsCount = weekMeetings.length;

  // Post-meeting conversion
  const stageHistory = useMemo(() => {
    // We approximate: deals that had a meeting completed and then changed stage
    const meetingDealIds = new Set(periodMeetings.filter(a => a.status === 'completed' && (a.result === 'answered' || a.result === 'Atendeu')).map(a => a.deal_id).filter(Boolean));
    // Deals that advanced stage after meeting (approximation: deals won or still open in later stage)
    const advanced = filteredDeals.filter(d => meetingDealIds.has(d.id) && (d.status === 'won' || d.status === 'open')).length;
    return meetingsCompleted > 0 ? (advanced / meetingsCompleted) * 100 : 0;
  }, [periodMeetings, filteredDeals, meetingsCompleted]);

  // --- CHANNEL METRICS ---
  const channelCards = useMemo(() => {
    return funnels.map(funnel => {
      const fDeals = filteredDeals.filter(d => d.funnel_id === funnel.id);
      const fOpen = fDeals.filter(d => d.status === 'open');
      const fClosed = fDeals.filter(d => d.status === 'won' && d.closed_at && isWithinInterval(new Date(d.closed_at), range));
      const fEntered = fDeals.filter(d => isWithinInterval(new Date(d.created_at), range));
      const convRate = fEntered.length > 0 ? (fClosed.length / fEntered.length) * 100 : 0;
      return {
        id: funnel.id,
        name: funnel.name,
        color: funnel.color,
        activeDeals: fOpen.length,
        pipelineValue: fOpen.reduce((s, d) => s + Number(d.value || 0), 0),
        closedCount: fClosed.length,
        closedValue: fClosed.reduce((s, d) => s + Number(d.value || 0), 0),
        conversionRate: convRate,
        enteredCount: fEntered.length,
      };
    });
  }, [funnels, filteredDeals, range]);

  // Funnel conversion per stage (selected funnel)
  const convFunnelId = selectedChannelFunnelId || funnels[0]?.id || '';
  const convStages = getStagesByFunnel(convFunnelId);
  const convData = useMemo(() => {
    const fDeals = filteredDeals.filter(d => d.funnel_id === convFunnelId);
    return convStages.map((stage, i) => {
      const stageDeals = fDeals.filter(d => d.stage_id === stage.id && d.status === 'open').length;
      const nextStage = convStages[i + 1];
      const nextDeals = nextStage ? fDeals.filter(d => d.stage_id === nextStage.id && d.status === 'open').length : 0;
      const advanceRate = stageDeals > 0 && nextStage ? ((nextDeals / stageDeals) * 100) : 0;
      // Average time: use updated_at as proxy for when deal entered current stage
      const stageDealsList = fDeals.filter(d => d.stage_id === stage.id && d.status === 'open');
      const avgDays = stageDealsList.length > 0
        ? stageDealsList.reduce((s, d) => s + differenceInDays(new Date(), new Date(d.updated_at || d.created_at)), 0) / stageDealsList.length
        : 0;
      return { name: stage.name, deals: stageDeals, advanceRate, avgDays: Math.round(avgDays), color: stage.color };
    });
  }, [filteredDeals, convFunnelId, convStages]);

  // Channel comparison chart (monthly)
  const channelCompareData = useMemo(() => {
    const months = Array.from({ length: period === 'year' ? 12 : period === '3months' ? 3 : 1 }, (_, i) => {
      const d = subMonths(new Date(), (period === 'year' ? 11 : period === '3months' ? 2 : 0) - i);
      return { date: d, label: format(d, 'MMM', { locale: ptBR }) };
    });
    return months.map(m => {
      const mStart = startOfMonth(m.date);
      const mEnd = endOfMonth(m.date);
      const row: any = { month: m.label };
      funnels.forEach(f => {
        const closed = filteredDeals.filter(d =>
          d.funnel_id === f.id && d.status === 'won' && d.closed_at &&
          isWithinInterval(new Date(d.closed_at), { start: mStart, end: mEnd })
        );
        row[f.name] = closed.length;
        row[`${f.name}_value`] = closed.reduce((s, d) => s + Number(d.value || 0), 0);
      });
      return row;
    });
  }, [filteredDeals, funnels, period]);

  // Meetings by week chart
  const meetingWeekData = useMemo(() => {
    const weeks = Array.from({ length: period === 'year' ? 12 : period === '3months' ? 12 : 4 }, (_, i) => {
      const wEnd = endOfWeek(subWeeks(new Date(), (period === 'year' ? 11 : period === '3months' ? 11 : 3) - i), { weekStartsOn: 1 });
      const wStart = startOfWeek(wEnd, { weekStartsOn: 1 });
      return { start: wStart, end: wEnd, label: format(wStart, 'dd/MM') };
    });
    return weeks.map(w => {
      const wMeetings = meetingActivities.filter(a => a.scheduled_at && isWithinInterval(new Date(a.scheduled_at), w));
      return {
        week: w.label,
        realizadas: wMeetings.filter(a => a.status === 'completed' && (a.result === 'answered' || a.result === 'Atendeu')).length,
        noShow: wMeetings.filter(a => a.status === 'completed' && (a.result === 'not_answered' || a.result === 'Não Atendeu' || a.result === 'no_show')).length,
        agendadas: wMeetings.filter(a => a.status === 'pending').length,
      };
    });
  }, [meetingActivities, period]);

  // Meeting table data
  const meetingTableData = useMemo(() => {
    return periodMeetings.map(a => {
      const deal = filteredDeals.find(d => d.id === a.deal_id);
      const contact = a.contact || deal?.contact;
      const funnel = deal ? funnels.find(f => f.id === deal.funnel_id) : null;
      let statusLabel = 'Agendada';
      let statusColor: string = DC.orange;
      if (a.status === 'completed') {
        if (a.result === 'answered' || a.result === 'Atendeu') { statusLabel = 'Realizada'; statusColor = DC.teal; }
        else if (a.result === 'not_answered' || a.result === 'Não Atendeu' || a.result === 'no_show') { statusLabel = 'No-show'; statusColor = DC.red; }
        else { statusLabel = 'Cancelada'; statusColor = 'hsl(var(--muted-foreground))'; }
      } else if (a.status === 'canceled') { statusLabel = 'Cancelada'; statusColor = 'hsl(var(--muted-foreground))'; }
      return {
        id: a.id,
        date: a.scheduled_at ? format(new Date(a.scheduled_at), 'dd/MM/yyyy HH:mm') : '—',
        contactName: contact?.name || '—',
        company: contact?.company || '—',
        funnelName: funnel?.name || '—',
        responsibleName: a.responsible?.name || '—',
        statusLabel, statusColor,
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [periodMeetings, filteredDeals, funnels]);

  // Meeting ranking by seller
  const meetingRanking = useMemo(() => {
    const map = new Map<string, { name: string; scheduled: number; completed: number; noShow: number }>();
    periodMeetings.forEach(a => {
      const name = a.responsible?.name || 'Sem responsável';
      const id = a.responsible_id || '_none';
      if (!map.has(id)) map.set(id, { name, scheduled: 0, completed: 0, noShow: 0 });
      const entry = map.get(id)!;
      entry.scheduled++;
      if (a.status === 'completed' && (a.result === 'answered' || a.result === 'Atendeu')) entry.completed++;
      if (a.status === 'completed' && (a.result === 'not_answered' || a.result === 'Não Atendeu' || a.result === 'no_show')) entry.noShow++;
    });
    return Array.from(map.values()).sort((a, b) => b.completed - a.completed);
  }, [periodMeetings]);

  // Pipeline quality: deals without activity in 5 days
  const now = new Date();
  const stalledDeals = useMemo(() => {
    return filteredOpenDeals.map(deal => {
      const dealActs = filteredActivities.filter(a => a.deal_id === deal.id);
      const lastAct = dealActs.sort((a, b) =>
        new Date(b.scheduled_at || b.created_at).getTime() - new Date(a.scheduled_at || a.created_at).getTime()
      )[0];
      const days = lastAct
        ? differenceInDays(now, new Date(lastAct.scheduled_at || lastAct.created_at))
        : differenceInDays(now, new Date(deal.created_at));
      const stage = stages.find(s => s.id === deal.stage_id);
      const funnel = funnels.find(f => f.id === deal.funnel_id);
      return { ...deal, daysSinceActivity: days, stageName: stage?.name, funnelName: funnel?.name };
    }).filter(d => d.daysSinceActivity >= 5).sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  }, [filteredOpenDeals, filteredActivities, stages, funnels, now]);

  // Average time per stage
  const stageTimeData = useMemo(() => {
    if (!convStages.length) return [];
    return convStages.map(stage => {
      const stageDeals = filteredDeals.filter(d => d.stage_id === stage.id && d.status === 'open');
      const avg = stageDeals.length > 0
        ? stageDeals.reduce((s, d) => s + differenceInDays(now, new Date(d.created_at)), 0) / stageDeals.length
        : 0;
      return { name: stage.name, avgDays: Math.round(avg) };
    });
  }, [convStages, filteredDeals, now]);

  // Loss rate per stage
  const lossPerStage = useMemo(() => {
    const lostDeals = filteredDeals.filter(d => d.status === 'lost');
    if (!lostDeals.length) return [];
    return convStages.map(stage => {
      const lost = lostDeals.filter(d => d.stage_id === stage.id).length;
      const pct = lostDeals.length > 0 ? (lost / lostDeals.length) * 100 : 0;
      return { name: stage.name, lost, pct };
    }).filter(s => s.lost > 0).sort((a, b) => b.pct - a.pct);
  }, [filteredDeals, convStages]);

  // Loss reasons pie
  const lossReasonData = useMemo(() => {
    const lostDeals = filteredDeals.filter(d => d.status === 'lost');
    const map = new Map<string, number>();
    lostDeals.forEach(d => {
      const reason = (d as any).loss_reason_id || 'Não informado';
      map.set(reason, (map.get(reason) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [filteredDeals]);

  const MEETING_PAGE_SIZE = 20;
  const pagedMeetings = meetingTableData.slice(meetingPage * MEETING_PAGE_SIZE, (meetingPage + 1) * MEETING_PAGE_SIZE);
  const totalMeetingPages = Math.ceil(meetingTableData.length / MEETING_PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Comercial</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-14" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const clearFilters = () => { setFilterFunnels([]); setFilterResponsible([]); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Comercial</h1>
      </div>

      {/* Global Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border bg-muted/30">
        <span className="text-sm font-medium" style={{ color: DC.textSecondary }}>Filtros:</span>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterFunnels[0] || '_all'} onValueChange={v => setFilterFunnels(v === '_all' ? [] : [v])}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="Canal/Funil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os funis</SelectItem>
            {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterResponsible[0] || '_all'} onValueChange={v => setFilterResponsible(v === '_all' ? [] : [v])}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {responsibles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {(filterFunnels.length > 0 || filterResponsible.length > 0) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
            <X className="h-3 w-3 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* ===== KPI CARDS (7) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard icon={TrendingUp} label="Negócios Ativos" value={filteredOpenDeals.length}
          color={DC.orange} bgColor={DC.orange20} />
        <KpiCard icon={DollarSign} label="Valor em Pipeline"
          value={fmt(filteredOpenDeals.reduce((s, d) => s + Number(d.value || 0), 0))}
          color={DC.teal} bgColor={DC.teal20} />
        <KpiCard icon={Video} label="Reuniões Agendadas" value={totalMeetingsScheduledKpi}
          sub={`${weekMeetingsCount} esta semana`} color={DC.orange} bgColor={DC.orange20} />
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardContent className="p-5 flex items-center gap-3">
            <GaugeCircle value={attendanceRate} size={56} />
            <div>
              <p className="text-xs" style={{ color: DC.textSecondary }}>Taxa Comparecimento</p>
              <p className="text-xl font-bold" style={{ color: DC.textPrimary }}>{attendanceRate.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
        <KpiCard icon={Calendar} label="Atividades Hoje"
          value={`${todayCompleted} / ${todayActivities.length}`}
          color={DC.orange} bgColor={DC.orange20} />
        <KpiCard icon={AlertTriangle} label="Atrasadas" value={overdueActivities.length}
          color={overdueActivities.length > 0 ? DC.red : DC.teal}
          bgColor={overdueActivities.length > 0 ? DC.redBg : DC.teal20} />
        <KpiCard icon={CheckCircle} label="Conversão do Mês" value={`${conversionRate.toFixed(1)}%`}
          color={DC.teal} bgColor={DC.teal20} />
      </div>

      {/* ===== CHANNEL METRICS ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: DC.textPrimary }}>Métricas por Canal</h2>
        </div>

        {/* Channel cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {channelCards.map(ch => (
            <Card key={ch.id}
              className="cursor-pointer transition-all hover:shadow-md"
              style={{
                borderRadius: 8, borderLeft: `4px solid ${ch.color}`,
                boxShadow: filterFunnels.includes(ch.id) ? `0 0 0 2px ${ch.color}` : '0 1px 3px rgba(0,0,0,0.08)',
              }}
              onClick={() => setFilterFunnels(prev => prev.includes(ch.id) ? [] : [ch.id])}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ch.color }} />
                  <span className="font-semibold text-sm" style={{ color: DC.textPrimary }}>{ch.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p style={{ color: DC.textSecondary }}>Deals ativos</p>
                    <p className="font-bold text-lg" style={{ color: DC.textPrimary }}>{ch.activeDeals}</p>
                  </div>
                  <div>
                    <p style={{ color: DC.textSecondary }}>Valor em pipeline</p>
                    <p className="font-bold text-lg" style={{ color: DC.textPrimary }}>{fmt(ch.pipelineValue)}</p>
                  </div>
                  <div>
                    <p style={{ color: DC.textSecondary }}>Fechados no período</p>
                    <p className="font-bold" style={{ color: DC.teal }}>{ch.closedCount}</p>
                  </div>
                  <div>
                    <p style={{ color: DC.textSecondary }}>Taxa conversão</p>
                    <p className="font-bold" style={{ color: DC.textPrimary }}>{ch.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Funnel conversion by stage */}
        <Card className="mb-6" style={{ borderRadius: 8 }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Funil de Conversão por Etapa</CardTitle>
            <Select value={convFunnelId} onValueChange={setSelectedChannelFunnelId}>
              <SelectTrigger className="w-[200px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {convData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-center">Deals</TableHead>
                    <TableHead className="text-center">Taxa Avanço</TableHead>
                    <TableHead className="text-center">Tempo Médio (dias)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {convData.map((row, i) => {
                    const isBottleneck = i > 0 && convData[i - 1].deals > 0 && row.deals / convData[i - 1].deals < 0.3;
                    return (
                      <TableRow key={row.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                            <span className="font-medium">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{row.deals}</TableCell>
                        <TableCell className="text-center">
                          {i < convData.length - 1 ? (
                            <span style={{ color: isBottleneck ? DC.red : DC.textPrimary }}>
                              {row.advanceRate.toFixed(0)}%
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center">{row.avgDays}d</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-6 text-sm" style={{ color: DC.textSecondary }}>Selecione um funil</p>
            )}
          </CardContent>
        </Card>

        {/* Channel comparison chart */}
        {channelCompareData.length > 0 && funnels.length > 0 && (
          <Card style={{ borderRadius: 8 }}>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Comparativo entre Canais</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={channelCompareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
                  <XAxis dataKey="month" tick={{ fill: DC.textSecondary, fontSize: 12 }} />
                  <YAxis tick={{ fill: DC.textSecondary, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {funnels.map(f => (
                    <Bar key={f.id} dataKey={f.name} fill={f.color} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== MEETINGS SECTION ===== */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: DC.textPrimary }}>Reuniões — Métricas Detalhadas</h2>

        {/* Meeting KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <KpiCard icon={Calendar} label="Agendadas no período" value={meetingsScheduled}
            sub={`${weekMeetingsCount} esta semana`} color={DC.orange} bgColor={DC.orange20} />
          <KpiCard icon={CheckCircle} label="Realizadas" value={meetingsCompleted}
            color={DC.teal} bgColor={DC.teal20} />
          <KpiCard icon={AlertTriangle} label="Não compareceu" value={meetingsNoShow}
            color={meetingsNoShow / Math.max(meetingsScheduled, 1) > 0.2 ? DC.red : DC.textPrimary}
            bgColor={meetingsNoShow / Math.max(meetingsScheduled, 1) > 0.2 ? DC.redBg : DC.teal20} />
          <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
            <CardContent className="p-5">
              <p className="text-xs" style={{ color: DC.textSecondary }}>Taxa Comparecimento</p>
              <Badge style={{
                backgroundColor: attendanceRate >= 70 ? DC.teal : attendanceRate >= 50 ? DC.orange : DC.red,
                color: 'hsl(var(--primary-foreground))', fontSize: 16, marginTop: 4,
              }}>
                {attendanceRate.toFixed(0)}%
              </Badge>
            </CardContent>
          </Card>
          <KpiCard icon={TrendingUp} label="Conv. Pós-Reunião" value={`${stageHistory.toFixed(0)}%`}
            color={DC.teal} bgColor={DC.teal20} />
        </div>

        {/* Meeting chart + ranking side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card style={{ borderRadius: 8 }}>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Reuniões por Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={meetingWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
                  <XAxis dataKey="week" tick={{ fill: DC.textSecondary, fontSize: 11 }} />
                  <YAxis tick={{ fill: DC.textSecondary, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="realizadas" name="Realizadas" stackId="a" fill={DC.teal} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="noShow" name="No-show" stackId="a" fill={DC.red} />
                  <Bar dataKey="agendadas" name="Agendadas" stackId="a" fill={DC.border} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card style={{ borderRadius: 8 }}>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Ranking por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Agend.</TableHead>
                    <TableHead className="text-center">Realiz.</TableHead>
                    <TableHead className="text-center">No-show</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetingRanking.map((r, i) => {
                    const rate = r.scheduled > 0 ? (r.completed / r.scheduled) * 100 : 0;
                    const maxCompleted = Math.max(...meetingRanking.map(x => x.completed), 1);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-center">{r.scheduled}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: DC.border }}>
                              <div className="h-2 rounded-full" style={{
                                width: `${(r.completed / maxCompleted) * 100}%`,
                                backgroundColor: DC.teal,
                              }} />
                            </div>
                            <span className="text-xs font-bold">{r.completed}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{r.noShow}</TableCell>
                        <TableCell className="text-center">
                          <Badge style={{
                            backgroundColor: rate >= 70 ? DC.teal : rate >= 50 ? DC.orange : DC.red,
                            color: 'hsl(var(--primary-foreground))', fontSize: 11,
                          }}>
                            {rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {meetingRanking.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-sm" style={{ color: DC.textSecondary }}>Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Meeting detail table */}
        <Card style={{ borderRadius: 8 }}>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Reuniões do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Funil</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedMeetings.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.date}</TableCell>
                      <TableCell className="font-medium">{m.contactName}</TableCell>
                      <TableCell>{m.company}</TableCell>
                      <TableCell>{m.funnelName}</TableCell>
                      <TableCell>{m.responsibleName}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: m.statusColor, color: 'hsl(var(--primary-foreground))' }}>{m.statusLabel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagedMeetings.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm" style={{ color: DC.textSecondary }}>Nenhuma reunião no período</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalMeetingPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button variant="outline" size="sm" disabled={meetingPage === 0} onClick={() => setMeetingPage(p => p - 1)}>Anterior</Button>
                <span className="text-sm" style={{ color: DC.textSecondary }}>{meetingPage + 1} / {totalMeetingPages}</span>
                <Button variant="outline" size="sm" disabled={meetingPage >= totalMeetingPages - 1} onClick={() => setMeetingPage(p => p + 1)}>Próximo</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== PIPELINE QUALITY ===== */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: DC.textPrimary }}>Indicadores de Qualidade do Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stalled deals */}
          <Card style={{ borderRadius: 8 }}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2" style={{ color: DC.textPrimary }}>
                <Clock className="h-4 w-4" style={{ color: DC.red }} />
                Deals sem atividade ({stalledDeals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stalledDeals.length > 0 ? (
                <div className="space-y-2">
                  {stalledDeals.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs" style={{ color: DC.textSecondary }}>{d.funnelName} › {d.stageName}</p>
                      </div>
                      <Badge style={{ backgroundColor: d.daysSinceActivity > 7 ? DC.red : DC.orange, color: 'hsl(var(--primary-foreground))' }}>
                        {d.daysSinceActivity}d parado
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: DC.textSecondary }}>Nenhum deal parado</p>
              )}
            </CardContent>
          </Card>

          {/* Avg time per stage */}
          <Card style={{ borderRadius: 8 }}>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Tempo Médio por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              {stageTimeData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-right">Tempo médio (dias)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stageTimeData.map(s => {
                      const avg = stageTimeData.reduce((sum, x) => sum + x.avgDays, 0) / stageTimeData.length;
                      return (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right">
                            <span style={{ color: s.avgDays > avg * 1.5 ? DC.red : DC.textPrimary, fontWeight: 600 }}>
                              {s.avgDays}d
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: DC.textSecondary }}>Sem dados</p>
              )}
            </CardContent>
          </Card>

          {/* Loss rate per stage */}
          <Card style={{ borderRadius: 8 }}>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Taxa de Perda por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              {lossPerStage.length > 0 ? (
                <div className="space-y-3">
                  {lossPerStage.map((s, i) => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium" style={{ color: i === 0 ? DC.red : DC.textPrimary }}>{s.name}</span>
                        <span className="font-bold" style={{ color: i === 0 ? DC.red : DC.textSecondary }}>{s.pct.toFixed(0)}% ({s.lost})</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: DC.border }}>
                        <div className="h-2 rounded-full" style={{ width: `${s.pct}%`, backgroundColor: i === 0 ? DC.red : DC.orange }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: DC.textSecondary }}>Nenhum deal perdido</p>
              )}
            </CardContent>
          </Card>

          {/* Loss reasons pie */}
          <Card style={{ borderRadius: 8 }}>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: DC.textPrimary }}>Motivos de Perda</CardTitle>
            </CardHeader>
            <CardContent>
              {lossReasonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={lossReasonData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                      outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {lossReasonData.map((_, i) => (
                        <Cell key={i} fill={[DC.red, DC.orange, DC.teal, DC.dark, 'hsl(var(--muted-foreground))', 'hsl(var(--muted-foreground))', 'hsl(var(--border))'][i % 7]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: DC.textSecondary }}>Nenhum dado</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
