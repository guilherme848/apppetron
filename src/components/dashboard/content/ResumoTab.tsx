import { useMemo, useState } from 'react';
import { format, parseISO, isBefore, isToday, addDays, startOfDay, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, CheckCircle2, Calendar, ExternalLink, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, Line, ComposedChart,
} from 'recharts';
import { DC, tooltipStyle } from '@/lib/dashboardColors';
import { BATCH_STATUS_OPTIONS } from '@/types/contentProduction';
import { CreativeRequestsMetrics } from '@/components/dashboard/CreativeRequestsMetrics';

interface ResumoTabProps {
  data: any;
}

/* ────── Gauge SVG ────── */
function GaugeChart({ value }: { value: number }) {
  const color = value >= 80 ? DC.teal : value >= 60 ? DC.orange : DC.red;
  const radius = 60;
  const stroke = 12;
  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={100} viewBox="0 0 160 100">
        <path
          d={`M ${80 - radius} 90 A ${radius} ${radius} 0 0 1 ${80 + radius} 90`}
          fill="none"
          stroke={DC.border}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${80 - radius} 90 A ${radius} ${radius} 0 0 1 ${80 + radius} 90`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
        <text x="80" y="82" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold">
          {value}%
        </text>
      </svg>
    </div>
  );
}

export function ResumoTab({ data }: ResumoTabProps) {
  const {
    posts: filteredPosts,
    batches,
    metrics,
    completedByDay,
    batchesByStage,
    batchProgress,
    filters,
  } = data;

  const [batchSearch, setBatchSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  // Extra metrics
  const dueToday = useMemo(() => filteredPosts.filter((p: any) => {
    if (p.status === 'done') return false;
    const d = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
    return d && isToday(d);
  }).length, [filteredPosts]);

  const dueTomorrow = useMemo(() => filteredPosts.filter((p: any) => {
    if (p.status === 'done') return false;
    const d = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
    return d && format(d, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd');
  }).length, [filteredPosts, tomorrow]);

  const unassignedCount = useMemo(() => filteredPosts.filter((p: any) => p.status !== 'done' && !p.assignee_id).length, [filteredPosts]);

  // Overdue trend: compare posts that became overdue recently
  const recentOverdue = useMemo(() => {
    const weekAgo = subDays(today, 7);
    return filteredPosts.filter((p: any) => {
      if (p.status === 'done') return false;
      const d = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
      return d && isBefore(d, today) && !isBefore(d, weekAgo);
    }).length;
  }, [filteredPosts, today]);

  // Completed by day with 7-day moving average
  const chartData = useMemo(() => {
    return completedByDay.map((d: any, i: number, arr: any[]) => {
      const windowStart = Math.max(0, i - 6);
      const window = arr.slice(windowStart, i + 1);
      const avg = window.reduce((s: number, v: any) => s + v.count, 0) / window.length;
      return { ...d, avg: Math.round(avg * 10) / 10 };
    });
  }, [completedByDay]);

  // Status distribution for donut
  const statusDistribution = useMemo(() => {
    const counts = { todo: 0, doing: 0, done: 0, overdue: 0 };
    filteredPosts.forEach((p: any) => {
      if (p.status === 'done') { counts.done++; return; }
      const d = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
      if (d && isBefore(d, today)) { counts.overdue++; return; }
      if (p.status === 'doing') counts.doing++;
      else counts.todo++;
    });
    return [
      { name: 'A Fazer', value: counts.todo, color: DC.dark },
      { name: 'Fazendo', value: counts.doing, color: DC.orange },
      { name: 'Feito', value: counts.done, color: DC.teal },
      { name: 'Atrasado', value: counts.overdue, color: DC.red },
    ].filter(d => d.value > 0);
  }, [filteredPosts, today]);

  const totalActivePosts = useMemo(() => filteredPosts.length, [filteredPosts]);

  // Pipeline posts per stage with overdue breakdown
  const pipelinePostsByStage = useMemo(() => {
    return BATCH_STATUS_OPTIONS.map(s => {
      const stageBatches = batches.filter((b: any) => !b.archived && b.status === s.value);
      const batchIds = new Set(stageBatches.map((b: any) => b.id));
      const stagePosts = filteredPosts.filter((p: any) => batchIds.has(p.batch_id));
      const overduePosts = stagePosts.filter((p: any) => {
        if (p.status === 'done') return false;
        const d = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
        return d && isBefore(d, today);
      });
      return {
        stage: s.label,
        total: stagePosts.length,
        overdue: overduePosts.length,
      };
    });
  }, [batches, filteredPosts, today]);

  // Pipeline funnel max for proportional sizing
  const pipelineMax = useMemo(() => {
    const counts = BATCH_STATUS_OPTIONS.map(s => batches.filter((b: any) => !b.archived && b.status === s.value).length);
    return Math.max(...counts, 1);
  }, [batches]);

  // Batch progress filtering
  const filteredBatchProgress = useMemo(() => {
    let list = batchProgress;
    if (riskFilter !== 'all') list = list.filter((b: any) => b.risk === riskFilter);
    if (batchSearch) list = list.filter((b: any) => b.clientName.toLowerCase().includes(batchSearch.toLowerCase()));
    return list;
  }, [batchProgress, riskFilter, batchSearch]);

  // Batch summary cards
  const batchSummary = useMemo(() => {
    const highRisk = batchProgress.filter((b: any) => b.risk === 'high').length;
    const dueIn7 = batchProgress.filter((b: any) => {
      if (!b.planningDueDate) return false;
      const d = parseISO(b.planningDueDate);
      return !isBefore(d, today) && isBefore(d, addDays(today, 7));
    }).length;
    const doneThisMonth = batchProgress.filter((b: any) => b.progress === 100).length;
    return { total: batchProgress.length, highRisk, dueIn7, doneThisMonth };
  }, [batchProgress, today]);

  const cardShadow = '0 1px 3px rgba(0,0,0,0.08)';

  return (
    <div className="space-y-6">
      {/* ═══ LINHA 1 — CARDS CRÍTICOS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Atrasados */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: DC.red }} />
              <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Atrasados</CardTitle>
            </div>
            <p className="text-3xl font-bold" style={{ color: DC.red }}>{metrics.overduePosts}</p>
            <p className="text-xs" style={{ color: DC.textSecondary }}>
              {recentOverdue > 0 ? `+${recentOverdue} esta semana` : 'Sem novos esta semana'}
            </p>
          </CardHeader>
        </Card>

        {/* Em Aberto */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: DC.dark }} />
              <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Em Aberto</CardTitle>
            </div>
            <p className="text-3xl font-bold" style={{ color: DC.dark }}>{metrics.openPosts}</p>
            <p className="text-xs" style={{ color: DC.textSecondary }}>
              {dueToday} vencem hoje · {dueTomorrow} vencem amanhã
            </p>
          </CardHeader>
        </Card>

        {/* % No Prazo */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader className="pb-0 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" style={{ color: DC.teal }} />
              <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>% No Prazo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <GaugeChart value={metrics.onTimeRate} />
          </CardContent>
        </Card>

        {/* Concluídos no Período */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" style={{ color: DC.teal }} />
              <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Concluídos no Período</CardTitle>
            </div>
            <p className="text-3xl font-bold" style={{ color: DC.teal }}>{metrics.completedInPeriod}</p>
            <p className="text-xs" style={{ color: DC.textSecondary }}>Total do período filtrado</p>
          </CardHeader>
        </Card>
      </div>

      {/* ═══ LINHA 2 — CARDS SECUNDÁRIOS ═══ */}
      <div className="grid grid-cols-3 gap-4">
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Planejamentos Ativos</CardTitle>
            <p className="text-2xl font-bold" style={{ color: DC.dark }}>{metrics.activeBatches}</p>
          </CardHeader>
        </Card>
        <Card style={{ boxShadow: cardShadow, borderRadius: 8, backgroundColor: metrics.overdueBatches > 0 ? DC.redBg : undefined }}>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Planejamentos Atrasados</CardTitle>
              {metrics.overdueBatches > 0 && <Badge className="text-white text-[10px] px-1.5 py-0" style={{ backgroundColor: DC.red }}>{metrics.overdueBatches}</Badge>}
            </div>
            <p className="text-2xl font-bold" style={{ color: metrics.overdueBatches > 0 ? DC.red : DC.dark }}>{metrics.overdueBatches}</p>
          </CardHeader>
        </Card>
        <Card style={{ boxShadow: cardShadow, borderRadius: 8, backgroundColor: unassignedCount > 0 ? DC.orangeBg : undefined }}>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Posts sem Responsável</CardTitle>
              {unassignedCount > 0 && <Badge className="text-white text-[10px] px-1.5 py-0" style={{ backgroundColor: DC.orange }}>{unassignedCount}</Badge>}
            </div>
            <p className="text-2xl font-bold" style={{ color: unassignedCount > 0 ? DC.orange : DC.dark }}>{unassignedCount}</p>
          </CardHeader>
        </Card>
      </div>

      {/* ═══ LINHA 3 — GRÁFICOS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ritmo de Conclusão */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader><CardTitle className="text-base">Ritmo de Conclusão</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: DC.textSecondary }} />
                  <YAxis tick={{ fontSize: 10, fill: DC.textSecondary }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <defs>
                    <linearGradient id="areaOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={DC.orange} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={DC.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="count" stroke={DC.orange} fill="url(#areaOrange)" name="Concluídos" />
                  <Line type="monotone" dataKey="avg" stroke={DC.orange} strokeDasharray="5 5" strokeWidth={2} dot={false} name="Média 7d" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Status (donut) */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusDistribution.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {/* Center text */}
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill={DC.textPrimary} fontSize={22} fontWeight="bold">
                    {totalActivePosts}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ PIPELINE ═══ */}
      <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
        <CardHeader><CardTitle className="text-base">Pipeline — Planejamentos por Etapa</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {/* Funnel */}
          <div className="flex gap-1 items-end h-16">
            {BATCH_STATUS_OPTIONS.map((s, i) => {
              const count = batches.filter((b: any) => !b.archived && b.status === s.value).length;
              const widthPct = Math.max((count / pipelineMax) * 100, 8);
              const overdue = pipelinePostsByStage[i]?.overdue > 0;
              const lerp = i / (BATCH_STATUS_OPTIONS.length - 1);
              const bg = i === BATCH_STATUS_OPTIONS.length - 1 ? DC.teal : `rgba(15,118,110,${0.15 + lerp * 0.85})`;
              return (
                <div
                  key={s.value}
                  className="flex flex-col items-center justify-end flex-1 rounded-md transition-all"
                  style={{
                    height: `${widthPct}%`,
                    minHeight: 28,
                    backgroundColor: bg,
                    border: overdue ? `2px solid ${DC.red}` : 'none',
                  }}
                  title={`${s.label}: ${count} planejamentos`}
                >
                  <span className="text-[10px] font-bold text-white truncate px-1">{count}</span>
                  <span className="text-[8px] text-white/80 truncate px-1">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Posts per stage bar chart */}
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelinePostsByStage}>
                <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: DC.textSecondary }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: DC.textSecondary }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" name="Total posts" fill={DC.orange} radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="overdue" name="Atrasados" fill={DC.red} radius={[4, 4, 0, 0]} stackId="b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ═══ TABELA DE PLANEJAMENTOS ═══ */}
      <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Planejamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Ativos', value: batchSummary.total, color: DC.dark },
              { label: 'Em Risco Alto', value: batchSummary.highRisk, color: DC.red },
              { label: 'Vencem em 7 dias', value: batchSummary.dueIn7, color: DC.orange },
              { label: 'Concluídos no mês', value: batchSummary.doneThisMonth, color: DC.teal },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border p-3 text-center" style={{ borderColor: DC.border }}>
                <p className="text-xs" style={{ color: DC.textSecondary }}>{c.label}</p>
                <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: DC.textSecondary }} />
              <Input placeholder="Buscar cliente..." value={batchSearch} onChange={e => setBatchSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os riscos</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="max-h-[500px] overflow-auto rounded-lg border" style={{ borderColor: DC.border }}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Dias Rest.</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Feitos/Total</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatchProgress.map((b: any) => {
                  const daysLeft = b.planningDueDate ? Math.ceil((parseISO(b.planningDueDate).getTime() - today.getTime()) / 86400000) : null;
                  const daysColor = daysLeft === null ? DC.textSecondary : daysLeft < 0 ? DC.red : daysLeft <= 3 ? DC.orange : DC.textSecondary;
                  const progressColor = b.progress >= 70 ? DC.teal : b.progress >= 40 ? DC.orange : DC.red;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.clientName}</TableCell>
                      <TableCell>{b.monthRef}</TableCell>
                      <TableCell><Badge variant="outline">{b.statusLabel}</Badge></TableCell>
                      <TableCell>{b.planningDueDate ? format(parseISO(b.planningDueDate), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm" style={{ color: daysColor }}>
                          {daysLeft !== null ? (daysLeft < 0 ? `${daysLeft}d` : `${daysLeft}d`) : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: DC.border }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${b.progress}%`, backgroundColor: progressColor }} />
                          </div>
                          <span className="text-xs w-8" style={{ color: DC.textSecondary }}>{b.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{b.done}/{b.total}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-white text-[10px]"
                          style={{ backgroundColor: b.risk === 'high' ? DC.red : b.risk === 'medium' ? DC.orange : DC.teal }}
                        >
                          {b.risk === 'high' ? 'Alto' : b.risk === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/content/production/${b.id}`}><ExternalLink className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ═══ CRIATIVOS ═══ */}
      <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
        <CardHeader><CardTitle className="text-base">Criativos</CardTitle></CardHeader>
        <CardContent>
          <CreativeRequestsMetrics />
        </CardContent>
      </Card>
    </div>
  );
}
