import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, subMonths, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DC, tooltipStyle, ROLE_CHIP_COLORS, ROLE_LABELS, PRODUCTION_ROLES } from '@/lib/dashboardColors';
import { ExtraRequestsMetrics } from '@/components/dashboard/ExtraRequestsMetrics';

interface AlteracoesTabProps {
  data: any;
}

function RoleChip({ role }: { role: string }) {
  const bg = ROLE_CHIP_COLORS[role] || DC.dark;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: bg }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export function AlteracoesTab({ data }: AlteracoesTabProps) {
  const { posts: filteredPosts, changeRequests, teamMembers, filters } = data;
  const [profFilter, setProfFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Enrich change requests with post/professional info
  const enrichedCRs = useMemo(() => {
    const postMap = new Map(filteredPosts.map((p: any) => [p.id, p]));
    return changeRequests
      .map((cr: any) => {
        const post: any = postMap.get(cr.post_id);
        if (!post) return null;
        return {
          ...cr,
          post,
          assigneeName: post.assignee?.name || '-',
          assigneeId: post.assignee_id,
          roleKey: post.responsible_role_key || '',
          clientName: post.client?.name || '-',
          postTitle: post.title,
          completedAt: post.completed_at,
        };
      })
      .filter(Boolean) as any[];
  }, [changeRequests, filteredPosts]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalAlteracoes = enrichedCRs.length;

    // Rework rate: unique posts with changes / total completed
    const completedPosts = filteredPosts.filter((p: any) => p.status === 'done');
    const postsWithChanges = new Set(enrichedCRs.map((cr: any) => cr.post_id)).size;
    const reworkRate = completedPosts.length > 0 ? Math.round((postsWithChanges / completedPosts.length) * 100) : 0;

    // Professional with most rework
    const profCounts: Record<string, { name: string; role: string; count: number }> = {};
    enrichedCRs.forEach((cr: any) => {
      if (!cr.assigneeId) return;
      if (!profCounts[cr.assigneeId]) profCounts[cr.assigneeId] = { name: cr.assigneeName, role: cr.roleKey, count: 0 };
      profCounts[cr.assigneeId].count++;
    });
    const topProf = Object.values(profCounts).sort((a, b) => b.count - a.count)[0];

    // Client with most changes
    const clientCounts: Record<string, { name: string; count: number }> = {};
    enrichedCRs.forEach((cr: any) => {
      const cname = cr.clientName;
      if (!clientCounts[cname]) clientCounts[cname] = { name: cname, count: 0 };
      clientCounts[cname].count++;
    });
    const topClient = Object.values(clientCounts).sort((a, b) => b.count - a.count)[0];

    return { totalAlteracoes, reworkRate, topProf, topClient };
  }, [enrichedCRs, filteredPosts]);

  // By professional chart data
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

  // By month chart data (last 12)
  const byMonth = useMemo(() => {
    const months: { month: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const count = enrichedCRs.filter((cr: any) => {
        const rd = parseISO(cr.requested_at);
        return !isBefore(rd, ms) && !isAfter(rd, me);
      }).length;
      const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      months.push({ month: key, label: `${shortMonths[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, count });
    }
    return months;
  }, [enrichedCRs]);

  const avgMonthly = useMemo(() => {
    if (byMonth.length === 0) return 0;
    return Math.round(byMonth.reduce((s, m) => s + m.count, 0) / byMonth.length);
  }, [byMonth]);

  // Detailed table (filtered)
  const detailedTable = useMemo(() => {
    let rows = enrichedCRs.map((cr: any) => {
      const daysToReturn = cr.completedAt && cr.requested_at
        ? differenceInDays(parseISO(cr.requested_at), parseISO(cr.completedAt))
        : null;
      return { ...cr, daysToReturn };
    }).sort((a: any, b: any) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

    if (profFilter !== 'all') rows = rows.filter((r: any) => r.assigneeId === profFilter);
    if (clientFilter !== 'all') rows = rows.filter((r: any) => r.clientName === clientFilter);

    return rows;
  }, [enrichedCRs, profFilter, clientFilter]);

  // Unique professionals and clients for filters
  const uniqueProfs = useMemo(() => {
    const map = new Map<string, string>();
    enrichedCRs.forEach((cr: any) => {
      if (cr.assigneeId) map.set(cr.assigneeId, cr.assigneeName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [enrichedCRs]);

  const uniqueClients = useMemo(() => {
    return [...new Set(enrichedCRs.map((cr: any) => cr.clientName))].filter(Boolean).sort();
  }, [enrichedCRs]);

  const cardShadow = '0 1px 3px rgba(0,0,0,0.08)';
  const reworkColor = summaryMetrics.reworkRate <= 10 ? DC.teal : summaryMetrics.reworkRate <= 20 ? DC.orange : DC.red;

  const daysColor = (d: number | null) => {
    if (d === null) return DC.textSecondary;
    if (d < 3) return DC.red;
    if (d <= 7) return DC.orange;
    return DC.teal;
  };

  return (
    <div className="space-y-6">
      {/* ═══ CARDS DE RESUMO ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Total de Alterações</CardTitle>
            <p className="text-3xl font-bold" style={{ color: DC.dark }}>{summaryMetrics.totalAlteracoes}</p>
          </CardHeader>
        </Card>
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Taxa Média de Retrabalho</CardTitle>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold" style={{ color: reworkColor }}>{summaryMetrics.reworkRate}%</p>
              <Badge className="text-[10px] text-white" style={{ backgroundColor: reworkColor }}>
                {summaryMetrics.reworkRate <= 10 ? 'Bom' : summaryMetrics.reworkRate <= 20 ? 'Atenção' : 'Crítico'}
              </Badge>
            </div>
          </CardHeader>
        </Card>
        <Card style={{ boxShadow: cardShadow, borderRadius: 8, backgroundColor: DC.redBg }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Maior Retrabalho</CardTitle>
            {summaryMetrics.topProf ? (
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold" style={{ color: DC.red }}>{summaryMetrics.topProf.name}</p>
                <Badge className="text-[10px] text-white" style={{ backgroundColor: DC.red }}>{summaryMetrics.topProf.count}</Badge>
              </div>
            ) : <p className="text-sm" style={{ color: DC.textSecondary }}>-</p>}
          </CardHeader>
        </Card>
        <Card style={{ boxShadow: cardShadow, borderRadius: 8, backgroundColor: DC.orangeBg }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium" style={{ color: DC.textSecondary }}>Mais Solicita Alteração</CardTitle>
            {summaryMetrics.topClient ? (
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold" style={{ color: DC.orange }}>{summaryMetrics.topClient.name}</p>
                <Badge className="text-[10px] text-white" style={{ backgroundColor: DC.orange }}>{summaryMetrics.topClient.count}</Badge>
              </div>
            ) : <p className="text-sm" style={{ color: DC.textSecondary }}>-</p>}
          </CardHeader>
        </Card>
      </div>

      {/* ═══ GRÁFICOS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Professional */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader><CardTitle className="text-base">Alterações por Profissional</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProfessional} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: DC.textSecondary }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: DC.textSecondary }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" name="Concluídos" fill={DC.border} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="changes" name="Alterações" fill={DC.red} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Month */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader><CardTitle className="text-base">Alterações por Mês (últimos 12)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: DC.textSecondary }} />
                  <YAxis tick={{ fontSize: 10, fill: DC.textSecondary }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={avgMonthly} stroke={DC.orange} strokeDasharray="5 5" label={{ value: `Média: ${avgMonthly}`, position: 'right', fill: DC.orange, fontSize: 10 }} />
                  <Bar dataKey="count" name="Alterações" fill={DC.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ TABELA COMPLETA ═══ */}
      <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento de Retrabalho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={profFilter} onValueChange={setProfFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Profissional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueProfs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueClients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[500px] overflow-auto rounded-lg border" style={{ borderColor: DC.border }}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Post</TableHead>
                  <TableHead>Data Conclusão</TableHead>
                  <TableHead>Data Alteração</TableHead>
                  <TableHead className="text-right">Dias p/ Retorno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedTable.slice(0, 100).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.assigneeName}</TableCell>
                    <TableCell><RoleChip role={row.roleKey} /></TableCell>
                    <TableCell>{row.clientName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.postTitle}</TableCell>
                    <TableCell>{row.completedAt ? format(parseISO(row.completedAt), 'dd/MM/yy') : '-'}</TableCell>
                    <TableCell>{format(parseISO(row.requested_at), 'dd/MM/yy')}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold" style={{ color: daysColor(row.daysToReturn) }}>
                        {row.daysToReturn !== null ? `${row.daysToReturn}d` : '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {detailedTable.length > 100 && (
              <p className="text-center text-sm py-3" style={{ color: DC.textSecondary }}>
                Mostrando 100 de {detailedTable.length} registros
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ SOLICITAÇÕES EXTRAS ═══ */}
      <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
        <CardHeader><CardTitle className="text-base">Solicitações Extras</CardTitle></CardHeader>
        <CardContent>
          <ExtraRequestsMetrics />
        </CardContent>
      </Card>
    </div>
  );
}
