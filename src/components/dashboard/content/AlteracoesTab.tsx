import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, subMonths, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, AlertCircle, Users, UserCheck } from 'lucide-react';
import { DC, tooltipStyle, ROLE_LABELS, PRODUCTION_ROLES } from '@/lib/dashboardColors';
import { ExtraRequestsMetrics } from '@/components/dashboard/ExtraRequestsMetrics';

interface AlteracoesTabProps {
  data: any;
}

const ROLE_COLORS: Record<string, string> = {
  designer: 'hsl(var(--info))',
  videomaker: 'hsl(var(--purple))',
  social: 'hsl(var(--success))',
};

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || 'hsl(var(--muted-foreground))';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border"
      style={{ backgroundColor: `${color}1f`, color, borderColor: `${color}40` }}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export function AlteracoesTab({ data }: AlteracoesTabProps) {
  const { posts: filteredPosts, changeRequests } = data;
  const [profFilter, setProfFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

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
  const reworkBadge = summaryMetrics.reworkRate <= 10 ? 'Bom' : summaryMetrics.reworkRate <= 25 ? 'Atenção' : 'Crítico';
  const reworkBadgeBg = summaryMetrics.reworkRate <= 10 ? 'bg-emerald-500' : summaryMetrics.reworkRate <= 25 ? 'bg-amber-500' : 'bg-red-500';

  const daysColor = (d: number | null) => {
    if (d === null) return 'text-muted-foreground';
    if (d < 3) return 'text-red-500';
    if (d <= 7) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border rounded-2xl border-l-[3px] border-l-blue-500 transition-all hover:border-primary/40">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total de Alterações</span>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-extrabold font-mono text-foreground">{summaryMetrics.totalAlteracoes}</p>
          </CardHeader>
        </Card>

        <Card className="border border-border rounded-2xl border-l-[3px] border-l-amber-500 transition-all hover:border-primary/40">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Taxa Média Retrabalho</span>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-extrabold font-mono ${reworkColor}`}>{summaryMetrics.reworkRate}%</p>
              <Badge className={`text-[10px] text-white ${reworkBadgeBg}`}>{reworkBadge}</Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="border border-border rounded-2xl border-l-[3px] border-l-red-500 transition-all hover:border-primary/40">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Maior Retrabalho</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            {summaryMetrics.topProf ? (
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-red-500">{summaryMetrics.topProf.name}</p>
                <Badge className="text-[10px] text-white bg-red-500">{summaryMetrics.topProf.count}</Badge>
              </div>
            ) : <p className="text-sm text-muted-foreground">-</p>}
          </CardHeader>
        </Card>

        <Card className="border border-border rounded-2xl border-l-[3px] border-l-primary transition-all hover:border-primary/40">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Mais Solicita Alteração</span>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            {summaryMetrics.topClient ? (
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-primary">{summaryMetrics.topClient.name}</p>
                <Badge className="text-[10px] text-white bg-primary">{summaryMetrics.topClient.count}</Badge>
              </div>
            ) : <p className="text-sm text-muted-foreground">-</p>}
          </CardHeader>
        </Card>
      </div>

      {/* ═══ CHARTS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border rounded-2xl">
          <CardHeader><CardTitle className="text-sm font-semibold text-foreground">Alterações por Profissional</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProfessional} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" name="Concluídos" fill="hsl(var(--border))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="changes" name="Alterações" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl">
          <CardHeader><CardTitle className="text-sm font-semibold text-foreground">Alterações por Mês (últimos 12)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={avgMonthly} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Limite: ${avgMonthly}`, position: 'right', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
                  <Bar dataKey="count" name="Alterações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                  <TableRow key={row.id} className="h-12 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-colors">
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
