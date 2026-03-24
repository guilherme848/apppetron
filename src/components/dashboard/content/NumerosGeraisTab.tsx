import { useMemo } from 'react';
import { format, parseISO, differenceInDays, subMonths, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import {
  CheckCircle, RefreshCw, TrendingUp,
  Clock, Users, AlertCircle, BarChart3,
  CalendarDays, FileText, Palette, Hammer,
} from 'lucide-react';
import { DC, tooltipStyle, ROLE_LABELS, PRODUCTION_ROLES } from '@/lib/dashboardColors';
import { ExtraRequestsMetrics } from '@/components/dashboard/ExtraRequestsMetrics';
import { useState } from 'react';

interface NumerosGeraisTabProps {
  data: any;
}

const ROLE_COLORS: Record<string, string> = {
  designer: '#6366f1',
  videomaker: '#8b5cf6',
  social: '#10b981',
};

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || '#64748b';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border"
      style={{ backgroundColor: `${color}1f`, color, borderColor: `${color}40` }}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function KpiCard({ label, value, sublabel, icon: Icon, iconColor, badge }: {
  label: string; value: string | number; sublabel: string;
  icon: any; iconColor: string; badge?: { text: string; color: string } | null;
}) {
  return (
    <Card className="border border-border rounded-2xl transition-all duration-150 hover:border-muted-foreground/30">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${iconColor}1f` }}>
            <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[32px] font-extrabold font-mono leading-none text-foreground">{value}</p>
          {badge && <Badge className="text-[10px] text-white" style={{ backgroundColor: badge.color }}>{badge.text}</Badge>}
        </div>
        <p className="text-[13px] text-muted-foreground">{sublabel}</p>
      </CardHeader>
    </Card>
  );
}

function HeroCard({ label, value, sublabel, auxLine, icon: Icon, iconColor }: {
  label: string; value: string; sublabel: string; auxLine: string;
  icon: any; iconColor: string;
}) {
  return (
    <Card className="border border-border rounded-2xl bg-gradient-to-br from-card to-muted/20">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${iconColor}1f` }}>
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        </div>
        <p className="text-[32px] font-extrabold font-mono leading-none text-foreground">{value}</p>
        <p className="text-[13px] text-muted-foreground">{sublabel}</p>
        <p className="text-[12px] text-muted-foreground/70 font-mono">{auxLine}</p>
      </CardContent>
    </Card>
  );
}

export function NumerosGeraisTab({ data }: NumerosGeraisTabProps) {
  const {
    metrics, productionAlerts, weeklyChartData, productivityByProfessional,
    posts: filteredPosts, changeRequests, metasMap,
  } = data;

  const [profFilter, setProfFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Enriched change requests for retrabalho section
  const enrichedCRs = useMemo(() => {
    const postMap = new Map(filteredPosts.map((p: any) => [p.id, p]));
    return changeRequests
      .map((cr: any) => {
        const post: any = postMap.get(cr.post_id);
        if (!post) return null;
        return {
          ...cr, post, assigneeName: post.assignee?.name || '-',
          assigneeId: post.assignee_id, roleKey: post.responsible_role_key || '',
          clientName: post.client?.name || '-', postTitle: post.title,
          completedAt: post.data_conclusao || post.completed_at,
        };
      })
      .filter(Boolean) as any[];
  }, [changeRequests, filteredPosts]);

  const summaryMetrics = useMemo(() => {
    const totalAlteracoes = enrichedCRs.length;
    const completedPosts = filteredPosts.filter((p: any) => p.status === 'done');
    const postsWithChanges = new Set(enrichedCRs.map((cr: any) => cr.post_id)).size;
    const reworkRate = completedPosts.length > 0 ? Math.round((postsWithChanges / completedPosts.length) * 100) : 0;
    const profCounts: Record<string, { name: string; role: string; count: number }> = {};
    enrichedCRs.forEach((cr: any) => {
      if (!cr.assigneeId) return;
      if (!profCounts[cr.assigneeId]) profCounts[cr.assigneeId] = { name: cr.assigneeName, role: cr.roleKey, count: 0 };
      profCounts[cr.assigneeId].count++;
    });
    const topProf = Object.values(profCounts).sort((a, b) => b.count - a.count)[0];
    const clientCounts: Record<string, { name: string; count: number }> = {};
    enrichedCRs.forEach((cr: any) => {
      const cname = cr.clientName;
      if (!clientCounts[cname]) clientCounts[cname] = { name: cname, count: 0 };
      clientCounts[cname].count++;
    });
    const topClient = Object.values(clientCounts).sort((a, b) => b.count - a.count)[0];
    return { totalAlteracoes, reworkRate, topProf, topClient };
  }, [enrichedCRs, filteredPosts]);

  const byProfessional = useMemo(() => {
    const stats: Record<string, { name: string; role: string; completed: number; changes: number }> = {};
    filteredPosts.forEach((p: any) => {
      if (!p.assignee_id || p.status !== 'done') return;
      if (!PRODUCTION_ROLES.includes(p.responsible_role_key as any)) return;
      const key = p.assignee_id;
      if (!stats[key]) stats[key] = { name: p.assignee?.name || '?', role: p.responsible_role_key, completed: 0, changes: 0 };
      stats[key].completed++;
    });
    enrichedCRs.forEach((cr: any) => {
      if (cr.assigneeId && stats[cr.assigneeId]) stats[cr.assigneeId].changes++;
    });
    return Object.values(stats)
      .map(s => ({ ...s, rate: s.completed > 0 ? Math.round((s.changes / s.completed) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);
  }, [filteredPosts, enrichedCRs]);

  const byMonth = useMemo(() => {
    const months: { month: string; label: string; count: number }[] = [];
    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const count = enrichedCRs.filter((cr: any) => {
        const rd = parseISO(cr.requested_at);
        return !isBefore(rd, ms) && !isAfter(rd, me);
      }).length;
      months.push({ month: format(d, 'yyyy-MM'), label: `${shortMonths[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, count });
    }
    return months;
  }, [enrichedCRs]);

  const avgMonthly = useMemo(() => byMonth.length > 0 ? Math.round(byMonth.reduce((s, m) => s + m.count, 0) / byMonth.length) : 0, [byMonth]);

  const detailedTable = useMemo(() => {
    let rows = enrichedCRs.map((cr: any) => {
      const daysToReturn = cr.completedAt && cr.requested_at ? differenceInDays(parseISO(cr.requested_at), parseISO(cr.completedAt)) : null;
      return { ...cr, daysToReturn };
    }).sort((a: any, b: any) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    if (profFilter !== 'all') rows = rows.filter((r: any) => r.assigneeId === profFilter);
    if (clientFilter !== 'all') rows = rows.filter((r: any) => r.clientName === clientFilter);
    return rows;
  }, [enrichedCRs, profFilter, clientFilter]);

  const uniqueProfs = useMemo(() => {
    const map = new Map<string, string>();
    enrichedCRs.forEach((cr: any) => { if (cr.assigneeId) map.set(cr.assigneeId, cr.assigneeName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [enrichedCRs]);

  const uniqueClients = useMemo(() => [...new Set(enrichedCRs.map((cr: any) => cr.clientName))].filter(Boolean).sort(), [enrichedCRs]);

  const reworkColor = summaryMetrics.reworkRate <= 10 ? 'text-emerald-500' : summaryMetrics.reworkRate <= 20 ? 'text-amber-500' : 'text-red-500';

  const daysColor = (d: number | null) => {
    if (d === null) return 'text-muted-foreground';
    if (d < 3) return 'text-red-500';
    if (d <= 7) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const occupancyColor = metrics.occupancyPct <= 80 ? '#10b981' : metrics.occupancyPct <= 90 ? '#f59e0b' : '#ef4444';

  // Weekly meta for chart
  const weeklyMeta = useMemo(() => {
    if (productivityByProfessional.length === 0) return 0;
    const avgMeta = productivityByProfessional.reduce((sum: number, s: any) => sum + (s.meta || 0), 0) / productivityByProfessional.length;
    return Math.round(avgMeta * 5);
  }, [productivityByProfessional]);

  return (
    <div className="space-y-6">
      {/* ═══ KPI CARDS — 3×2 GRID ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Total de Entregas"
          value={metrics.completedInPeriod}
          sublabel="conteúdos concluídos no período"
          icon={CheckCircle}
          iconColor="#10b981"
        />
        <KpiCard
          label="Em Andamento"
          value={metrics.inProgress + (metrics.openPosts - metrics.inProgress - metrics.overduePosts)}
          sublabel={`${metrics.inProgress} em produção · ${metrics.openPosts - metrics.inProgress - metrics.overduePosts} planejados`}
          icon={Layers}
          iconColor="#6366f1"
        />
        <KpiCard
          label="Atrasados"
          value={metrics.overduePosts}
          sublabel="requerem atenção imediata"
          icon={AlertTriangle}
          iconColor="#ef4444"
        />
        <KpiCard
          label="Taxa de Retrabalho"
          value={`${metrics.reworkRate}%`}
          sublabel="no período selecionado"
          icon={RefreshCw}
          iconColor="#f59e0b"
          badge={metrics.reworkRate > 10 ? { text: metrics.reworkRate > 25 ? 'Crítico' : 'Atenção', color: metrics.reworkRate > 25 ? '#ef4444' : '#f59e0b' } : null}
        />
        <KpiCard
          label="Retrabalhos no Período"
          value={metrics.reworkCount}
          sublabel="posts com solicitações de alteração"
          icon={RotateCcw}
          iconColor="#ef4444"
        />
        <KpiCard
          label="Entregas Líquidas"
          value={metrics.netDeliveries}
          sublabel="entregas sem retrabalho no período"
          icon={TrendingUp}
          iconColor="#F97316"
        />
      </div>

      {/* ═══ HERO CARDS — 2 em linha ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HeroCard
          label="Tempo Médio de Produção"
          value={`${metrics.avgProductionTime} dias`}
          sublabel="entre criação e aprovação do conteúdo"
          auxLine={`Mais rápido: ${metrics.minProductionTime} dia(s) · Mais lento: ${metrics.maxProductionTime} dias`}
          icon={Clock}
          iconColor="#f59e0b"
        />
        <HeroCard
          label="Capacidade da Equipe"
          value={`${metrics.occupancyPct}%`}
          sublabel="de ocupação média da equipe"
          auxLine={`Capacidade total: ${metrics.totalCapacity}/mês · Comprometido: ${metrics.committed} · Disponível: ${metrics.available}`}
          icon={Users}
          iconColor="#6366f1"
        />
      </div>

      {/* ═══ WEEKLY CHART ═══ */}
      {productivityByProfessional.length > 0 && (
        <Card className="border border-border rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold text-foreground">Entregas por Semana</CardTitle>
            </div>
            <p className="text-[13px] text-muted-foreground">Produção semanal do time no período selecionado</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {weeklyMeta > 0 && (
                    <ReferenceLine
                      y={weeklyMeta}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="5 5"
                      strokeOpacity={0.6}
                      label={{ value: 'Meta semanal', position: 'right', fill: 'hsl(var(--primary))', fontSize: 10 }}
                    />
                  )}
                  {productivityByProfessional.slice(0, 8).map((s: any, i: number) => {
                    const colors = ['#6366f1', '#10b981', '#8b5cf6', '#F97316', '#f43f5e', '#94a3b8', '#06b6d4', '#eab308'];
                    return (
                      <Bar key={`${s.id}-${s.role}`} dataKey={`${s.name}_${s.role}`} name={s.name} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ ALERTS ═══ */}
      <Card className="border border-border rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold text-foreground">Alertas de Hoje</CardTitle>
              {productionAlerts.length > 0 && (
                <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-4 min-w-4">
                  {productionAlerts.length}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {productionAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" /> Sem alertas no momento
            </p>
          ) : (
            <div className="space-y-3">
              {productionAlerts.slice(0, 8).map((alert: any) => (
                <div key={alert.id} className="flex items-center gap-3 py-1.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${alert.severity === 'high' ? 'bg-destructive' : 'bg-amber-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{alert.name}</p>
                    <p className="text-[13px] text-muted-foreground">{alert.description}</p>
                  </div>
                  <RoleChip role={alert.role} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ RETRABALHO — 2 CHARTS SIDE BY SIDE ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Retrabalho por Profissional</CardTitle>
            <p className="text-[13px] text-muted-foreground">Quantidade de retrabalhos por profissional</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProfessional} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" name="Concluídos" fill="hsl(var(--border))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="changes" name="Alterações" fill="#F97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Retrabalho por Mês (últimos 12)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={avgMonthly} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Limite: ${avgMonthly}`, position: 'right', fill: '#ef4444', fontSize: 10 }} />
                  <Bar dataKey="count" name="Alterações" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ DETAILED TABLE ═══ */}
      <Card className="border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Detalhamento de Retrabalho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={profFilter} onValueChange={setProfFilter}>
              <SelectTrigger className="w-[180px] h-[42px]"><SelectValue placeholder="Profissional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueProfs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px] h-[42px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueClients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[500px] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="text-[11px] uppercase font-semibold">Profissional</TableHead>
                  <TableHead className="text-[11px] uppercase font-semibold">Cargo</TableHead>
                  <TableHead className="text-[11px] uppercase font-semibold">Cliente</TableHead>
                  <TableHead className="text-[11px] uppercase font-semibold">Post</TableHead>
                  <TableHead className="text-[11px] uppercase font-semibold">Data Conclusão</TableHead>
                  <TableHead className="text-[11px] uppercase font-semibold">Data Alteração</TableHead>
                  <TableHead className="text-right text-[11px] uppercase font-semibold">Dias p/ Retorno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedTable.slice(0, 100).map((row: any) => (
                  <TableRow key={row.id} className="h-[52px] hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-colors">
                    <TableCell className="font-semibold text-foreground">{row.assigneeName}</TableCell>
                    <TableCell><RoleChip role={row.roleKey} /></TableCell>
                    <TableCell className="text-muted-foreground">{row.clientName}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-foreground">{row.postTitle}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{row.completedAt ? format(parseISO(row.completedAt), 'dd/MM/yy') : '-'}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{format(parseISO(row.requested_at), 'dd/MM/yy')}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold font-mono ${daysColor(row.daysToReturn)}`}>
                        {row.daysToReturn !== null ? `${row.daysToReturn}d` : '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {detailedTable.length > 100 && (
              <p className="text-center text-xs py-3 text-muted-foreground">
                Mostrando 100 de {detailedTable.length} registros
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ EXTRA REQUESTS ═══ */}
      <Card className="border border-border rounded-2xl">
        <CardHeader><CardTitle className="text-sm font-semibold text-foreground">Solicitações Extras</CardTitle></CardHeader>
        <CardContent>
          <ExtraRequestsMetrics />
        </CardContent>
      </Card>
    </div>
  );
}
