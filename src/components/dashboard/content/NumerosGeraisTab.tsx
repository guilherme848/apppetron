import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, subMonths, startOfMonth, endOfMonth, isBefore, isAfter, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import {
  CheckCircle, RefreshCw, TrendingUp,
  Clock, Users, AlertCircle, BarChart3,
  Radio, Palette, Eye, AlertTriangle,
} from 'lucide-react';
import { DC, tooltipStyle, ROLE_LABELS, PRODUCTION_ROLES } from '@/lib/dashboardColors';
import { ExtraRequestsMetrics } from '@/components/dashboard/ExtraRequestsMetrics';
import { cn } from '@/lib/utils';

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

/* ─── KPI Card — CS Visão Geral pattern ─── */
function KpiCard({
  label, value, subtitle, icon: Icon, danger, warning, accent, badge,
}: {
  label: string; value: string | number; subtitle: string;
  icon: React.ElementType; danger?: boolean; warning?: boolean; accent?: boolean;
  badge?: string;
}) {
  return (
    <Card className="transition-all duration-150 hover:border-border/80">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className={cn(
          "text-2xl font-bold font-mono",
          danger && "text-destructive",
          warning && "text-warning",
          accent && "text-primary",
          !danger && !warning && !accent && "text-foreground",
        )}>
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {badge && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function NumerosGeraisTab({ data }: NumerosGeraisTabProps) {
  const {
    metrics, productionAlerts, weeklyChartData, productivityByProfessional,
    posts: filteredPosts, enrichedPosts, changeRequests, metasMap, filters,
  } = data;

  const [profFilter, setProfFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  const today = startOfDay(new Date());

  // ═══ SECTION 1: LIVE FUNNEL (all posts, no month filter) ═══
  const liveCounts = useMemo(() => {
    const allPosts = enrichedPosts || [];
    const todo = allPosts.filter((p: any) => p.status === 'todo').length;
    const doing = allPosts.filter((p: any) => p.status === 'doing').length;
    const inReview = allPosts.filter((p: any) => p.status === 'review' || p.status === 'em_revisao').length;
    const overdue = allPosts.filter((p: any) => {
      if (p.status === 'done') return false;
      const dueDate = p.due_date ? parseISO(p.due_date) : p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
      return dueDate && isBefore(dueDate, today);
    }).length;
    const totalOpen = todo + doing + inReview;
    return { todo, doing, inReview, overdue, totalOpen };
  }, [enrichedPosts, today]);

  // ═══ SECTION 2: FUNNEL BY PROFESSIONAL (live) ═══
  const professionalFunnel = useMemo(() => {
    const allPosts = enrichedPosts || [];
    const { from, to } = filters.dateRange;
    const stats: Record<string, {
      id: string; name: string; role: string;
      todo: number; doing: number; inReview: number; overdue: number; concluded: number;
    }> = {};

    allPosts.forEach((p: any) => {
      if (!p.assignee_id || !p.responsible_role_key) return;
      if (!PRODUCTION_ROLES.includes(p.responsible_role_key)) return;
      const key = p.assignee_id;
      if (!stats[key]) {
        stats[key] = {
          id: p.assignee_id, name: p.assignee?.name || 'Desconhecido', role: p.responsible_role_key,
          todo: 0, doing: 0, inReview: 0, overdue: 0, concluded: 0,
        };
      }
      const s = stats[key];
      if (p.status === 'done') {
        const dateStr = p.data_conclusao || p.completed_at;
        if (dateStr) {
          const cd = parseISO(dateStr);
          if (!isBefore(cd, from) && !isAfter(cd, to)) s.concluded++;
        }
      } else {
        if (p.status === 'todo') s.todo++;
        else if (p.status === 'doing') s.doing++;
        else if (p.status === 'review' || p.status === 'em_revisao') s.inReview++;
        const dueDate = p.due_date ? parseISO(p.due_date) : p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
        if (dueDate && isBefore(dueDate, today)) s.overdue++;
      }
    });

    return Object.values(stats).sort((a, b) => (b.todo + b.doing + b.inReview) - (a.todo + a.doing + a.inReview));
  }, [enrichedPosts, filters.dateRange, today]);

  const funnelTotals = useMemo(() => {
    return professionalFunnel.reduce((acc, p) => ({
      todo: acc.todo + p.todo,
      doing: acc.doing + p.doing,
      inReview: acc.inReview + p.inReview,
      overdue: acc.overdue + p.overdue,
      concluded: acc.concluded + p.concluded,
      totalOpen: acc.totalOpen + p.todo + p.doing + p.inReview,
    }), { todo: 0, doing: 0, inReview: 0, overdue: 0, concluded: 0, totalOpen: 0 });
  }, [professionalFunnel]);

  // ═══ SECTION 3: MONTHLY DELIVERIES (filtered) ═══
  const monthlyMetrics = useMemo(() => {
    const completedPosts = filteredPosts.filter((p: any) => p.status === 'done');
    const postIdSet = new Set(filteredPosts.map((p: any) => p.id));
    const relevantCRs = changeRequests.filter((cr: any) => postIdSet.has(cr.post_id));
    const postsWithChanges = new Set(relevantCRs.map((cr: any) => cr.post_id)).size;
    const reworkRate = completedPosts.length > 0 ? Math.round((postsWithChanges / completedPosts.length) * 1000) / 10 : 0;
    const netDeliveries = completedPosts.length - postsWithChanges;

    const productionTimes = completedPosts
      .filter((p: any) => p.created_at && (p.data_conclusao || p.completed_at))
      .map((p: any) => {
        const start = parseISO(p.created_at);
        const end = p.data_conclusao ? parseISO(p.data_conclusao) : parseISO(p.completed_at);
        return Math.max(differenceInDays(end, start), 0);
      });
    const avgTime = productionTimes.length > 0
      ? Math.round((productionTimes.reduce((s: number, v: number) => s + v, 0) / productionTimes.length) * 10) / 10 : 0;

    return { completed: completedPosts.length, netDeliveries, reworkRate, avgTime, postsWithChanges };
  }, [filteredPosts, changeRequests]);

  // ═══ SECTION 5: LIVE ALERTS ═══
  const liveAlerts = useMemo(() => {
    const alerts: { id: string; name: string; role: string; description: string; severity: 'high' | 'medium'; color: string }[] = [];
    const allPosts = enrichedPosts || [];
    const profStats: Record<string, { name: string; role: string; overdue: number; inReview: number; todo: number; doing: number }> = {};

    allPosts.forEach((p: any) => {
      if (!p.assignee_id || !p.responsible_role_key || p.status === 'done') return;
      if (!PRODUCTION_ROLES.includes(p.responsible_role_key)) return;
      const key = p.assignee_id;
      if (!profStats[key]) profStats[key] = { name: p.assignee?.name || '?', role: p.responsible_role_key, overdue: 0, inReview: 0, todo: 0, doing: 0 };
      const s = profStats[key];
      if (p.status === 'todo') s.todo++;
      else if (p.status === 'doing') s.doing++;
      else if (p.status === 'review' || p.status === 'em_revisao') s.inReview++;
      const dueDate = p.due_date ? parseISO(p.due_date) : p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
      if (dueDate && isBefore(dueDate, today)) s.overdue++;
    });

    Object.entries(profStats).forEach(([id, s]) => {
      if (s.overdue > 3) {
        alerts.push({ id: `${id}-overdue`, name: s.name, role: s.role, description: `${s.overdue} conteúdos atrasados`, severity: 'high', color: 'bg-destructive' });
      }
      if (s.inReview > 5) {
        alerts.push({ id: `${id}-review`, name: s.name, role: s.role, description: `${s.inReview} em revisão — possível gargalo`, severity: 'medium', color: 'bg-yellow-500' });
      }
      if (s.todo > 10 && s.doing === 0) {
        alerts.push({ id: `${id}-idle`, name: s.name, role: s.role, description: `${s.todo} a fazer e nenhum em produção`, severity: 'medium', color: 'bg-yellow-500' });
      }
    });

    // Alert for posts without assignee (todo or doing)
    const postsWithoutAssignee = allPosts.filter((p: any) => 
      !p.assignee_id && (p.status === 'todo' || p.status === 'doing')
    ).length;
    if (postsWithoutAssignee > 0) {
      alerts.push({
        id: 'no-assignee',
        name: `${postsWithoutAssignee} post${postsWithoutAssignee > 1 ? 's' : ''}`,
        role: 'geral',
        description: 'sem responsável atribuído',
        severity: 'medium',
        color: 'bg-yellow-500',
      });
    }

    return alerts;
  }, [enrichedPosts, today]);

  // ═══ SECTION 6: REWORK DATA (filtered) ═══
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

  const daysColor = (d: number | null) => {
    if (d === null) return 'text-muted-foreground';
    if (d < 3) return 'text-destructive';
    if (d <= 7) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1: SITUAÇÃO ATUAL (LIVE) ═══ */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Situação Atual</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            AO VIVO
          </span>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard label="A Fazer" value={liveCounts.todo} subtitle="aguardando início" icon={Clock}
            badge={liveCounts.todo > 20 ? 'Acumulando' : undefined} />
          <KpiCard label="Em Produção" value={liveCounts.doing} subtitle="em processo" icon={Palette} accent />
          <KpiCard label="Em Revisão" value={liveCounts.inReview} subtitle="aguardando aprovação" icon={Eye}
            warning={liveCounts.inReview > 10} badge={liveCounts.inReview > 10 ? 'Gargalo' : undefined} />
          <KpiCard label="Atrasados" value={liveCounts.overdue} subtitle="passaram do prazo" icon={AlertTriangle}
            danger={liveCounts.overdue > 0} />
        </div>

        {/* Funnel bar */}
        {liveCounts.totalOpen > 0 && (
          <div className="space-y-1.5">
            <TooltipProvider>
              <div className="h-3 rounded-lg overflow-hidden flex bg-muted/50">
                {liveCounts.todo > 0 && (
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="h-full transition-all duration-300 bg-muted-foreground/30"
                        style={{ width: `${(liveCounts.todo / (liveCounts.totalOpen + liveCounts.overdue)) * 100}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{liveCounts.todo} a fazer ({Math.round((liveCounts.todo / (liveCounts.totalOpen + liveCounts.overdue)) * 100)}%)</TooltipContent>
                  </UITooltip>
                )}
                {liveCounts.doing > 0 && (
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="h-full transition-all duration-300 bg-primary"
                        style={{ width: `${(liveCounts.doing / (liveCounts.totalOpen + liveCounts.overdue)) * 100}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{liveCounts.doing} em produção ({Math.round((liveCounts.doing / (liveCounts.totalOpen + liveCounts.overdue)) * 100)}%)</TooltipContent>
                  </UITooltip>
                )}
                {liveCounts.inReview > 0 && (
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="h-full transition-all duration-300 bg-warning"
                        style={{ width: `${(liveCounts.inReview / (liveCounts.totalOpen + liveCounts.overdue)) * 100}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{liveCounts.inReview} em revisão ({Math.round((liveCounts.inReview / (liveCounts.totalOpen + liveCounts.overdue)) * 100)}%)</TooltipContent>
                  </UITooltip>
                )}
                {liveCounts.overdue > 0 && (
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="h-full transition-all duration-300 bg-destructive"
                        style={{ width: `${(liveCounts.overdue / (liveCounts.totalOpen + liveCounts.overdue)) * 100}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{liveCounts.overdue} atrasados ({Math.round((liveCounts.overdue / (liveCounts.totalOpen + liveCounts.overdue)) * 100)}%)</TooltipContent>
                  </UITooltip>
                )}
              </div>
            </TooltipProvider>
            <p className="text-[11px] font-mono text-muted-foreground">
              {liveCounts.totalOpen + liveCounts.overdue} conteúdos abertos no total
            </p>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2: POR PROFISSIONAL (LIVE + concluded filtered) ═══ */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '40ms' }}>
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Por Profissional</span>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px] uppercase font-semibold text-muted-foreground">Profissional</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold text-muted-foreground text-center">A Fazer</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold text-muted-foreground text-center">Em Produção</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold text-muted-foreground text-center">Em Revisão</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold text-muted-foreground text-center">Concluídos (mês)</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold text-muted-foreground text-center">Atrasados</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold text-muted-foreground text-center">Total Abertos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionalFunnel.map((p) => {
                    const totalOpen = p.todo + p.doing + p.inReview;
                    return (
                      <TableRow key={p.id} className="h-[52px] hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
                              {p.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-foreground text-sm">{p.name}</span>
                            <RoleChip role={p.role} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-mono text-sm text-muted-foreground", p.todo > 10 && p.doing === 0 && "font-bold")}>
                            {p.todo}
                          </span>
                          {p.todo > 10 && p.doing === 0 && (
                            <Badge variant="secondary" className="ml-1 text-[9px]">Parado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm text-primary">{p.doing}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-mono text-sm text-warning", p.inReview > 5 && "font-bold")}>
                            {p.inReview}
                          </span>
                          {p.inReview > 5 && (
                            <span className="ml-1 text-[9px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">Gargalo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm text-emerald-500">{p.concluded}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-mono text-sm", p.overdue > 0 ? "text-destructive font-bold" : "text-muted-foreground")}>
                            {p.overdue}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm font-bold text-foreground">{totalOpen}</TableCell>
                      </TableRow>
                    );
                  })}
                  {professionalFunnel.length > 0 && (
                    <TableRow className="bg-muted/50 border-t-2 border-border">
                      <TableCell className="font-semibold text-foreground text-sm">TOTAL</TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-foreground">{funnelTotals.todo}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-primary">{funnelTotals.doing}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-warning">{funnelTotals.inReview}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-emerald-500">{funnelTotals.concluded}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-destructive">{funnelTotals.overdue}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-foreground">{funnelTotals.totalOpen}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ SECTION 3: ENTREGAS DO MÊS (filtered) ═══ */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Entregas — Mês Selecionado</span>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Concluídos" value={monthlyMetrics.completed} subtitle="conteúdos entregues" icon={CheckCircle} accent />
          <KpiCard label="Entregas Líquidas" value={monthlyMetrics.netDeliveries} subtitle="entregas sem retrabalho" icon={TrendingUp} />
          <KpiCard label="Taxa de Retrabalho" value={`${monthlyMetrics.reworkRate}%`} subtitle="no período selecionado" icon={RefreshCw}
            danger={monthlyMetrics.reworkRate > 15} warning={monthlyMetrics.reworkRate > 10 && monthlyMetrics.reworkRate <= 15}
            badge={monthlyMetrics.reworkRate > 15 ? 'Alto' : undefined} />
          <KpiCard label="Tempo Médio" value={`${monthlyMetrics.avgTime}d`} subtitle="criação → aprovação" icon={Clock} />
        </div>
      </div>

      {/* ═══ SECTION 4: WEEKLY CHART (filtered) ═══ */}
      {productivityByProfessional.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: '120ms' }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Entregas por Semana</CardTitle>
              </div>
              <CardDescription>Produção semanal do time no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
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
        </div>
      )}

      {/* ═══ SECTION 5: LIVE ALERTS ═══ */}
      <div className="animate-fade-in" style={{ animationDelay: '160ms' }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Alertas de Hoje</CardTitle>
              {liveAlerts.length > 0 && (
                <span className="text-[11px] font-semibold rounded-xl px-2 py-0.5 bg-destructive/12 text-destructive">
                  {liveAlerts.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {liveAlerts.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground text-sm">
                <CheckCircle className="h-6 w-6 text-success mb-2" />
                Sem alertas no momento
              </div>
            ) : (
              <div className="space-y-3">
                {liveAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", alert.color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{alert.name}</p>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <RoleChip role={alert.role} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ SECTION 6: RETRABALHO (filtered) ═══ */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Retrabalho — Mês Selecionado</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Retrabalho por Profissional</CardTitle>
              </div>
              <CardDescription>Quantidade de retrabalhos por profissional</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byProfessional} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="completed" name="Concluídos" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="changes" name="Alterações" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Retrabalho por Mês (últimos 12)</CardTitle>
              </div>
              <CardDescription>Histórico de alterações solicitadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine y={avgMonthly} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Média: ${avgMonthly}`, position: 'right', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
                    <Bar dataKey="count" name="Alterações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed rework table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Detalhamento de Retrabalho</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={profFilter} onValueChange={setProfFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-lg bg-card border-border text-sm"><SelectValue placeholder="Profissional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueProfs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-lg bg-card border-border text-sm"><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueClients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[500px] overflow-auto">
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
                      <TableCell className="font-medium text-foreground">{row.assigneeName}</TableCell>
                      <TableCell><RoleChip role={row.roleKey} /></TableCell>
                      <TableCell className="text-muted-foreground">{row.clientName}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-foreground">{row.postTitle}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{row.completedAt ? format(parseISO(row.completedAt), 'dd/MM/yy') : '-'}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{format(parseISO(row.requested_at), 'dd/MM/yy')}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-semibold font-mono", daysColor(row.daysToReturn))}>
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
      </div>

      {/* ═══ SECTION 7: SOLICITAÇÕES EXTRAS (filtered) ═══ */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Solicitações Extras — Mês Selecionado</span>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ExtraRequestsMetrics />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
