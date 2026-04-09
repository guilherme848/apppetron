import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Users, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrafficOptimization, PLATFORM_OPTIONS, TASK_TYPE_OPTIONS } from '@/hooks/useTrafficOptimizations';

const TRAFFIC_MANAGER_ROLE_ID = '29521693-8a2e-46fe-81a5-8b78059ad879';

const TASK_TYPE_MAP: Record<string, { label: string; color: string }> = {
  checkin: { label: 'Leve', color: 'bg-success/10 text-success' },
  media: { label: 'Média', color: 'bg-warning/10 text-warning' },
  alta: { label: 'Alta', color: 'bg-destructive/10 text-destructive' },
};

interface Props {
  optimizations: TrafficOptimization[];
  accounts: { id: string; name: string; niche?: string | null; traffic_member_id?: string | null }[];
  teamMembers: { id: string; name: string; role_id?: string | null; active?: boolean }[];
}

export function OptimizationByClientTab({ optimizations, accounts, teamMembers }: Props) {
  const [selectedClient, setSelectedClient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterManager, setFilterManager] = useState('all');
  const [filterNiche, setFilterNiche] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState('all');

  const getMemberName = (id: string | null) => (id ? teamMembers.find((m) => m.id === id)?.name || '—' : '—');
  const getPlatformLabel = (v: string) => PLATFORM_OPTIONS.find((p) => p.value === v)?.label || v;

  const trafficManagers = useMemo(
    () => teamMembers.filter((m) => m.role_id === TRAFFIC_MANAGER_ROLE_ID && m.active !== false),
    [teamMembers],
  );

  const niches = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => { if (a.niche) set.add(a.niche); });
    return Array.from(set).sort();
  }, [accounts]);

  // Filtered accounts list for the grid
  const visibleAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterManager !== 'all' && a.traffic_member_id !== filterManager) return false;
      if (filterNiche !== 'all' && a.niche !== filterNiche) return false;
      return true;
    });
  }, [accounts, searchQuery, filterManager, filterNiche]);

  // Optimizations for selected client
  const filtered = useMemo(() => {
    if (!selectedClient) return [];
    return optimizations.filter((o) => {
      if (o.client_id !== selectedClient) return false;
      if (filterType !== 'all' && o.task_type !== filterType) return false;
      if (filterDateFrom && o.optimization_date < filterDateFrom) return false;
      if (filterDateTo && o.optimization_date > filterDateTo) return false;
      return true;
    });
  }, [optimizations, selectedClient, filterType, filterDateFrom, filterDateTo]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const totalMinutes = filtered.reduce((sum, o) => sum + o.tempo_gasto_minutos, 0);
    const byType = { checkin: 0, media: 0, alta: 0 };
    filtered.forEach((o) => {
      if (o.task_type in byType) byType[o.task_type as keyof typeof byType]++;
    });
    return { total, totalMinutes, totalHours: (totalMinutes / 60).toFixed(1), byType };
  }, [filtered]);

  // Per-client optimization count for the grid cards
  const clientOptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    optimizations.forEach((o) => { map[o.client_id] = (map[o.client_id] || 0) + 1; });
    return map;
  }, [optimizations]);

  const selectedClientName = accounts.find((a) => a.id === selectedClient)?.name;

  return (
    <div className="space-y-5">
      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] max-w-[320px]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buscar cliente</span>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-9 pl-8 rounded-lg"
              placeholder="Pesquisar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> Gestor
          </span>
          <Select value={filterManager} onValueChange={setFilterManager}>
            <SelectTrigger className="h-9 w-[180px] rounded-lg mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os gestores</SelectItem>
              {trafficManagers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Tag className="h-3 w-3" /> Nicho
          </span>
          <Select value={filterNiche} onValueChange={setFilterNiche}>
            <SelectTrigger className="h-9 w-[180px] rounded-lg mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os nichos</SelectItem>
              {niches.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Client grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {visibleAccounts.map((a) => {
          const isSelected = selectedClient === a.id;
          const count = clientOptCounts[a.id] || 0;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedClient(a.id)}
              className={`text-left p-3 rounded-xl border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]
                ${isSelected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:border-foreground/15 hover:bg-secondary/50'
                }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F4762D, #2B5B6C)' }}
                >
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">{a.name}</p>
                  {a.niche && <p className="text-[10px] text-muted-foreground truncate">{a.niche}</p>}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">{count} otimizações</p>
            </button>
          );
        })}
        {visibleAccounts.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-6">
            Nenhum cliente encontrado com os filtros aplicados.
          </p>
        )}
      </div>

      {/* Detail section for selected client */}
      {selectedClient && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{selectedClientName}</h3>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <span className="text-[10px] text-muted-foreground">Tipo</span>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 w-[120px] text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {TASK_TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">De</span>
                <Input type="date" className="h-8 w-[130px] text-xs rounded-lg" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Até</span>
                <Input type="date" className="h-8 w-[130px] text-xs rounded-lg" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="border border-border rounded-xl">
              <CardContent className="pt-3 pb-2.5 text-center">
                <p className="text-xl font-extrabold font-mono">{summary.total}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="border border-border rounded-xl">
              <CardContent className="pt-3 pb-2.5 text-center">
                <p className="text-xl font-extrabold font-mono">{summary.totalHours}h</p>
                <p className="text-[11px] text-muted-foreground">Tempo investido</p>
              </CardContent>
            </Card>
            <Card className="border border-border rounded-xl">
              <CardContent className="pt-3 pb-2.5 text-center">
                <p className="text-xl font-extrabold font-mono text-success">{summary.byType.checkin}</p>
                <p className="text-[11px] text-muted-foreground">Leve</p>
              </CardContent>
            </Card>
            <Card className="border border-border rounded-xl">
              <CardContent className="pt-3 pb-2.5 text-center">
                <p className="text-xl font-extrabold font-mono text-warning">{summary.byType.media}</p>
                <p className="text-[11px] text-muted-foreground">Média</p>
              </CardContent>
            </Card>
            <Card className="border border-border rounded-xl">
              <CardContent className="pt-3 pb-2.5 text-center">
                <p className="text-xl font-extrabold font-mono text-destructive">{summary.byType.alta}</p>
                <p className="text-[11px] text-muted-foreground">Alta</p>
              </CardContent>
            </Card>
          </div>

          {/* History table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-[11px] font-semibold uppercase">Data</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase">Plataforma</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase">Tipo</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase">Descrição</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-right">Tempo</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase">Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((opt) => {
                    const typeInfo = TASK_TYPE_MAP[opt.task_type] || { label: opt.task_type, color: '' };
                    return (
                      <TableRow key={opt.id} className="hover:bg-secondary/30">
                        <TableCell className="whitespace-nowrap font-mono text-[13px]">
                          {format(new Date(opt.optimization_date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-[13px]">{getPlatformLabel(opt.platform)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${typeInfo.color}`}>{typeInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-[13px]">{opt.description || '—'}</TableCell>
                        <TableCell className="text-right font-mono text-[13px]">{opt.tempo_gasto_minutos} min</TableCell>
                        <TableCell className="text-[13px]">{getMemberName(opt.member_id)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
