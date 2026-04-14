import { useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Search, ChevronRight, Wallet } from 'lucide-react';
import { Sparkline } from '@/components/traffic/Sparkline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useMetaMonitoring,
  useMetaMonitoringCampaigns,
  PERIOD_OPTIONS,
  type Period,
  type ClientMonitoringRow,
  type CampaignMonitoringRow,
} from '@/hooks/useMetaMonitoring';

const DEFAULT_NICHE = 'Material de Construção';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

function DeltaBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  if (!isFinite(value) || Math.abs(value) < 0.5) {
    return <span className="inline-flex items-center gap-1 text-muted-foreground text-xs"><Minus className="h-3 w-3" />0%</span>;
  }
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', good ? 'text-green-600' : 'text-red-600')}>
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}{fmtPct(value)}
    </span>
  );
}

function HealthDot({ health }: { health: 'green' | 'yellow' | 'red' }) {
  const cls = health === 'green' ? 'bg-green-500' : health === 'yellow' ? 'bg-amber-500' : 'bg-red-500';
  return <span className={cn('h-2.5 w-2.5 rounded-full', cls)} />;
}

function RunwayBadge({ balance }: { balance: ClientMonitoringRow['balance'] }) {
  const days = balance.runway_days;
  if (days === null) return null;
  const level = days <= 7 ? 'critical' : days <= 14 ? 'warn' : 'ok';
  const cls =
    level === 'critical' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
    level === 'warn' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
    'bg-muted text-muted-foreground border-border';
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium', cls)}
      title={`Saldo ${balance.available_balance != null ? fmtBRL(balance.available_balance) : '—'} / gasto médio ${fmtBRL(balance.daily_spend_avg)}/dia`}
    >
      <Wallet className="h-3 w-3" />
      {days < 1 ? '<1d' : `${Math.round(days)}d`}
    </span>
  );
}

function ClientCard({ row, onClick }: { row: ClientMonitoringRow; onClick: () => void }) {
  const conversationsSeries = row.sparkline.map(p => p.conversations);
  const totalSparkConvs = conversationsSeries.reduce((a, b) => a + b, 0);
  const sparkColor = row.health === 'red' ? '#dc2626' : row.health === 'yellow' ? '#d97706' : '#16a34a';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
        row.health === 'red' && 'border-red-500/50',
        row.health === 'yellow' && 'border-amber-500/50',
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <HealthDot health={row.health} />
            <CardTitle className="text-sm font-semibold truncate">{row.client_name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <RunwayBadge balance={row.balance} />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">{row.ad_account_name || row.ad_account_id}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Conversas</p>
            <p className="font-semibold text-sm">{fmtInt(row.current.whatsapp_conversations)}</p>
            <DeltaBadge value={row.delta.conversations} />
          </div>
          <div>
            <p className="text-muted-foreground">Custo/conv</p>
            <p className="font-semibold text-sm">{row.current.whatsapp_conversations > 0 ? fmtBRL(row.current.cost_per_conversation) : '—'}</p>
            <DeltaBadge value={row.delta.cost_per_conversation} invert />
          </div>
          <div>
            <p className="text-muted-foreground">Gasto</p>
            <p className="font-semibold text-sm">{fmtBRL(row.current.spend)}</p>
            <DeltaBadge value={row.delta.spend} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t">
          <div className="text-[10px] text-muted-foreground leading-tight">
            <p>14d conversas</p>
            <p className="text-foreground font-medium">{fmtInt(totalSparkConvs)}</p>
          </div>
          <Sparkline values={conversationsSeries} width={90} height={24} color={sparkColor} fillColor={sparkColor} />
        </div>

        {row.current.leads > 0 && (
          <p className="text-[10px] text-muted-foreground pt-1 border-t">
            {fmtInt(row.current.leads)} leads · CPL {fmtBRL(row.current.cpl)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignDrawer({ client, period, onClose }: { client: ClientMonitoringRow | null; period: Period; onClose: () => void }) {
  const { rows, loading } = useMetaMonitoringCampaigns(client?.ad_account_id || null, period);

  if (!client) return null;
  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HealthDot health={client.health} />
            {client.client_name}
            <Badge variant="outline" className="ml-2">{client.ad_account_name || client.ad_account_id}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma campanha encontrada no Meta.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Conversas</TableHead>
                  <TableHead className="text-right">Custo/conv</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <CampaignRow key={c.campaign_id} c={c} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CampaignRow({ c }: { c: CampaignMonitoringRow }) {
  return (
    <TableRow className={cn(c.effective_status !== 'ACTIVE' && 'opacity-60')}>
      <TableCell className="max-w-xs">
        <div className="flex items-center gap-2">
          <HealthDot health={c.health} />
          <span className="truncate font-medium text-sm">{c.campaign_name}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="font-medium">{fmtInt(c.current.whatsapp_conversations)}</div>
        <DeltaBadge value={c.delta.conversations} />
      </TableCell>
      <TableCell className="text-right">
        <div className="font-medium">{c.current.whatsapp_conversations > 0 ? fmtBRL(c.current.cost_per_conversation) : '—'}</div>
        <DeltaBadge value={c.delta.cost_per_conversation} invert />
      </TableCell>
      <TableCell className="text-right">
        <div className="font-medium">{fmtBRL(c.current.spend)}</div>
        <DeltaBadge value={c.delta.spend} />
      </TableCell>
      <TableCell className="text-right text-sm">
        {fmtInt(c.current.leads)}
        {c.current.leads > 0 && <div className="text-xs text-muted-foreground">{fmtBRL(c.current.cpl)} CPL</div>}
      </TableCell>
      <TableCell className="text-right text-sm">{fmtPct(c.current.ctr)}</TableCell>
      <TableCell>
        <Badge variant={c.effective_status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
          {c.effective_status || '—'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export default function TrafficMonitoring() {
  const [period, setPeriod] = useState<Period>('7d');
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [nicheFilter, setNicheFilter] = useState<string>(DEFAULT_NICHE);
  const [selected, setSelected] = useState<ClientMonitoringRow | null>(null);

  const { rows, loading, error, lastRefresh, refresh } = useMetaMonitoring(period);

  const availableNiches = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.niche) set.add(r.niche); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (nicheFilter !== 'all') {
      r = r.filter(x => x.niche === nicheFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => x.client_name.toLowerCase().includes(q) || (x.ad_account_name || '').toLowerCase().includes(q));
    }
    if (healthFilter !== 'all') {
      r = r.filter(x => x.health === healthFilter);
    }
    // sort: critical first, then by spend desc
    return [...r].sort((a, b) => {
      const hOrder = { red: 0, yellow: 1, green: 2 };
      const h = hOrder[a.health] - hOrder[b.health];
      if (h !== 0) return h;
      return b.current.spend - a.current.spend;
    });
  }, [rows, search, healthFilter]);

  const totals = useMemo(() => {
    const base = nicheFilter === 'all' ? rows : rows.filter(r => r.niche === nicheFilter);
    const t = base.reduce((acc, r) => {
      acc.spend += r.current.spend;
      acc.conversations += r.current.whatsapp_conversations;
      acc.leads += r.current.leads;
      acc.red += r.health === 'red' ? 1 : 0;
      acc.yellow += r.health === 'yellow' ? 1 : 0;
      acc.total += 1;
      if (r.balance.runway_days !== null) {
        if (r.balance.runway_days <= 7) acc.runwayCritical += 1;
        else if (r.balance.runway_days <= 14) acc.runwayLow += 1;
      }
      return acc;
    }, { spend: 0, conversations: 0, leads: 0, red: 0, yellow: 0, total: 0, runwayCritical: 0, runwayLow: 0 });
    return {
      ...t,
      cost_per_conversation: t.conversations > 0 ? t.spend / t.conversations : 0,
    };
  }, [rows, nicheFilter]);

  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || '';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Monitoramento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão em tempo real das campanhas Meta de todos os clientes MatCon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refresh} disabled={loading} title="Atualizar agora">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Conversas WhatsApp</p>
            <p className="text-xl font-bold">{fmtInt(totals.conversations)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo/conversa</p>
            <p className="text-xl font-bold">{totals.conversations > 0 ? fmtBRL(totals.cost_per_conversation) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gasto ({periodLabel})</p>
            <p className="text-xl font-bold">{fmtBRL(totals.spend)}</p>
          </CardContent>
        </Card>
        <Card className={cn(totals.runwayCritical > 0 && 'border-red-500/50')}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" />Saldo crítico
            </p>
            <p className={cn('text-xl font-bold', totals.runwayCritical > 0 && 'text-red-600')}>
              {totals.runwayCritical}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totals.runwayCritical > 0 ? 'conta(s) com runway ≤7d' : 'Nenhuma conta em risco'}
              {totals.runwayLow > 0 && ` · +${totals.runwayLow} c/ ≤14d`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />Críticos
            </p>
            <p className="text-xl font-bold text-red-600">{totals.red}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />Saudáveis
            </p>
            <p className="text-xl font-bold text-green-600">{totals.total - totals.red - totals.yellow}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou conta..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={nicheFilter} onValueChange={setNicheFilter}>
          <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Nicho" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os nichos</SelectItem>
            {availableNiches.map(n => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v as any)}>
          <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="red">Críticos</SelectItem>
            <SelectItem value="yellow">Atenção</SelectItem>
            <SelectItem value="green">Saudáveis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lastRefresh && (
        <p className="text-xs text-muted-foreground">
          Atualizado {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ptBR })}. Dados sincronizados do Meta a cada 15 minutos.
        </p>
      )}

      {error && (
        <Card className="border-red-500/50">
          <CardContent className="p-4 text-sm text-red-600">Erro: {error}</CardContent>
        </Card>
      )}

      {/* Grid */}
      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum cliente encontrado com os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((row) => (
            <ClientCard key={row.client_id + row.ad_account_id} row={row} onClick={() => setSelected(row)} />
          ))}
        </div>
      )}

      <CampaignDrawer client={selected} period={period} onClose={() => setSelected(null)} />
    </div>
  );
}
