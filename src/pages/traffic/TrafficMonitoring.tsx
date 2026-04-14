import { useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Search, ChevronRight, Wallet, LayoutGrid, Table as TableIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { Sparkline } from '@/components/traffic/Sparkline';
import { AlertsFeed } from '@/components/traffic/AlertsFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useMetaMonitoring,
  useCampaignMonitoringPrefetch,
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

function SortHead({ label, active, dir, onClick, align = 'right' }: {
  label: string; active: boolean; dir: SortDir; onClick: () => void; align?: 'left' | 'right';
}) {
  return (
    <TableHead className={align === 'right' ? 'text-right' : ''}>
      <button
        type="button"
        onClick={onClick}
        className={cn('inline-flex items-center gap-1 hover:text-primary transition', active && 'text-primary font-semibold')}
      >
        {label}
        {active && (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );
}

function ClientsTable({
  rows, sortKey, sortDir, onSort, onClick,
}: {
  rows: ClientMonitoringRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onClick: (row: ClientMonitoringRow) => void;
}) {
  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHead label="Cliente" align="left" active={sortKey === 'client'} dir={sortDir} onClick={() => onSort('client')} />
            <SortHead label="Custo/conv" active={sortKey === 'cost_per_conversation'} dir={sortDir} onClick={() => onSort('cost_per_conversation')} />
            <SortHead label="Conversas" active={sortKey === 'conversations'} dir={sortDir} onClick={() => onSort('conversations')} />
            <SortHead label="Conv. clique→msg" active={sortKey === 'conversion_rate'} dir={sortDir} onClick={() => onSort('conversion_rate')} />
            <SortHead label="Investido" active={sortKey === 'spend'} dir={sortDir} onClick={() => onSort('spend')} />
            <SortHead label="CTR Único" active={sortKey === 'unique_ctr'} dir={sortDir} onClick={() => onSort('unique_ctr')} />
            <SortHead label="CPM" active={sortKey === 'cpm'} dir={sortDir} onClick={() => onSort('cpm')} />
            <SortHead label="Alcance" active={sortKey === 'reach'} dir={sortDir} onClick={() => onSort('reach')} />
            <SortHead label="Impressões" active={sortKey === 'impressions'} dir={sortDir} onClick={() => onSort('impressions')} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.client_id + r.ad_account_id}
              className={cn(
                'cursor-pointer hover:bg-muted/50',
                r.health === 'red' && 'bg-red-500/5',
                r.health === 'yellow' && 'bg-amber-500/5',
              )}
              onClick={() => onClick(r)}
            >
              <TableCell>
                <div className="flex items-center gap-2 min-w-0">
                  <HealthDot health={r.health} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.client_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.ad_account_name || r.ad_account_id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-semibold">{r.current.whatsapp_conversations > 0 ? fmtBRL(r.current.cost_per_conversation) : '—'}</div>
                <DeltaBadge value={r.delta.cost_per_conversation} invert />
              </TableCell>
              <TableCell className="text-right">
                <div className="font-semibold">{fmtInt(r.current.whatsapp_conversations)}</div>
                <DeltaBadge value={r.delta.conversations} />
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium">{fmtPct(r.current.conversion_rate)}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium">{fmtBRL(r.current.spend)}</div>
                <DeltaBadge value={r.delta.spend} />
              </TableCell>
              <TableCell className="text-right text-sm">{fmtPct(r.current.unique_ctr)}</TableCell>
              <TableCell className="text-right text-sm">{fmtBRL(r.current.cpm)}</TableCell>
              <TableCell className="text-right text-sm">{fmtInt(r.current.reach)}</TableCell>
              <TableCell className="text-right text-sm">{fmtInt(r.current.impressions)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ClientCard({ row, onClick, onBudgetSaved }: { row: ClientMonitoringRow; onClick: () => void; onBudgetSaved: () => void }) {
  const [budgetOpen, setBudgetOpen] = useState(false);
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

        {row.pacing?.monthly_budget != null ? (
          <div onClick={(e) => { e.stopPropagation(); setBudgetOpen(true); }} className="cursor-pointer">
            <PacingBar pacing={row.pacing} />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setBudgetOpen(true); }}
            className="w-full text-[10px] text-muted-foreground hover:text-primary pt-1 border-t text-left"
          >
            + Definir verba mensal
          </button>
        )}

        {(row.current.leads > 0 || row.current.frequency > 0) && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
            {row.current.leads > 0 && (
              <span>{fmtInt(row.current.leads)} leads · CPL {fmtBRL(row.current.cpl)}</span>
            )}
            {row.current.frequency > 0 && (
              <FrequencyBadge freq={row.current.frequency} />
            )}
          </div>
        )}
      </CardContent>
      <BudgetDialog row={row} open={budgetOpen} onOpenChange={setBudgetOpen} onSaved={onBudgetSaved} />
    </Card>
  );
}

function FrequencyBadge({ freq }: { freq: number }) {
  const level = freq >= 5 ? 'red' : freq >= 3.5 ? 'yellow' : 'ok';
  const cls =
    level === 'red' ? 'text-red-600' :
    level === 'yellow' ? 'text-amber-600' :
    'text-muted-foreground';
  return (
    <span className={cn('text-[10px] font-medium', cls)} title="Frequência média dos últimos dias. >3.5 = fadiga iniciando; >5 = criativos saturados">
      Freq {freq.toFixed(1)}
    </span>
  );
}

function BudgetDialog({ row, open, onOpenChange, onSaved }: {
  row: ClientMonitoringRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<string>(row.pacing?.monthly_budget?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const num = value.trim() === '' ? null : Number(value.replace(',', '.'));
    if (num !== null && (!isFinite(num) || num < 0)) {
      toast.error('Valor inválido');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('accounts')
      .update({ ad_monthly_budget: num })
      .eq('id', row.client_id);
    setSaving(false);
    if (error) {
      toast.error(`Erro: ${error.message}`);
      return;
    }
    toast.success('Orçamento atualizado');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verba mensal — {row.client_name}</DialogTitle>
          <DialogDescription>
            Total mensal contratado com o cliente para investir em anúncios (R$). Deixe vazio pra limpar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="number"
            placeholder="Ex: 5000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PacingBar({ pacing }: { pacing: NonNullable<ClientMonitoringRow['pacing']> }) {
  if (!pacing.monthly_budget) return null;
  const pct = pacing.monthly_budget > 0 ? (pacing.month_spend / pacing.monthly_budget) * 100 : 0;
  const projPct = pacing.monthly_budget > 0 ? (pacing.projection / pacing.monthly_budget) * 100 : 0;
  const barColor =
    pacing.status === 'over' ? 'bg-red-500' :
    pacing.status === 'under' ? 'bg-amber-500' :
    'bg-green-500';
  return (
    <div className="pt-1 border-t space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Verba mensal</span>
        <span className={cn(
          pacing.status === 'over' && 'text-red-600',
          pacing.status === 'under' && 'text-amber-600',
          pacing.status === 'on_track' && 'text-green-600',
        )}>
          {fmtBRL(pacing.month_spend)}/{fmtBRL(pacing.monthly_budget)} · proj. {fmtBRL(pacing.projection)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded overflow-hidden bg-muted relative">
        <div className={cn('h-full', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
        {projPct > 100 && (
          <div className="absolute top-0 h-full border-l border-red-700" style={{ left: `${Math.min(100, (projPct / projPct) * 100)}%` }} title="Projeção acima da meta" />
        )}
      </div>
    </div>
  );
}

function FunnelStat({ label, curr, baseline, delta, fmt, betterWhenLower }: {
  label: string; curr: number; baseline: number; delta: number; fmt: 'brl' | 'pct'; betterWhenLower: boolean;
}) {
  const display = fmt === 'brl' ? fmtBRL(curr) : fmtPct(curr);
  const baseDisplay = fmt === 'brl' ? fmtBRL(baseline) : fmtPct(baseline);
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{display}</p>
      <p className="text-[10px] text-muted-foreground">base {baseDisplay}</p>
      <DeltaBadge value={delta} invert={betterWhenLower} />
    </div>
  );
}

function diagnoseFunnel(f: NonNullable<ClientMonitoringRow['funnel']>): string {
  const issues: string[] = [];
  if (f.delta_cpm > 20) issues.push(`CPM +${f.delta_cpm.toFixed(0)}% (leilão mais caro)`);
  if (f.delta_ctr < -15) issues.push(`CTR ${f.delta_ctr.toFixed(0)}% (criativo cansando)`);
  if (f.delta_conv_rate < -15) issues.push(`taxa de conversa ${f.delta_conv_rate.toFixed(0)}% (qualificação caindo)`);
  if (issues.length === 0) return 'Funil saudável vs média dos últimos 14 dias.';
  const action =
    f.delta_ctr < -15 ? ' → ação: trocar criativo.' :
    f.delta_cpm > 20 ? ' → ação: testar outra audiência/horário.' :
    f.delta_conv_rate < -15 ? ' → ação: revisar headline/landing.' : '';
  return `Problema: ${issues.join(', ')}.${action}`;
}

function CampaignDrawer({
  client, rows, loading, onClose,
}: {
  client: ClientMonitoringRow | null;
  rows: CampaignMonitoringRow[];
  loading: boolean;
  onClose: () => void;
}) {
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

        {client.funnel && (
          <div className="px-6 pb-3 border-b">
            <p className="text-xs text-muted-foreground mb-2">Diagnóstico do funil (vs média 14 dias):</p>
            <div className="grid grid-cols-3 gap-3">
              <FunnelStat label="CPM" curr={client.funnel.curr_cpm} baseline={client.funnel.baseline_cpm} delta={client.funnel.delta_cpm} fmt="brl" betterWhenLower />
              <FunnelStat label="CTR" curr={client.funnel.curr_ctr} baseline={client.funnel.baseline_ctr} delta={client.funnel.delta_ctr} fmt="pct" betterWhenLower={false} />
              <FunnelStat label="Conversa/clique" curr={client.funnel.curr_conv_rate} baseline={client.funnel.baseline_conv_rate} delta={client.funnel.delta_conv_rate} fmt="pct" betterWhenLower={false} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {diagnoseFunnel(client.funnel)}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading && rows.length === 0 ? (
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
                  <TableHead className="text-right">Freq</TableHead>
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
      <TableCell className="text-right text-sm">
        {c.current.frequency > 0 ? <FrequencyBadge freq={c.current.frequency} /> : '—'}
      </TableCell>
      <TableCell>
        <Badge variant={c.effective_status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
          {c.effective_status || '—'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

type SortKey = 'client' | 'health' | 'cost_per_conversation' | 'conversations' | 'conversion_rate' | 'spend' | 'unique_ctr' | 'cpm' | 'reach' | 'impressions';
type SortDir = 'asc' | 'desc';

export default function TrafficMonitoring() {
  const [period, setPeriod] = useState<Period>('7d');
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [nicheFilter, setNicheFilter] = useState<string>(DEFAULT_NICHE);
  const [selected, setSelected] = useState<ClientMonitoringRow | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('health');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { rows, loading, error, lastRefresh, refresh } = useMetaMonitoring(period);
  const { byAccount: campaignsByAccount, loading: campaignsLoading } = useCampaignMonitoringPrefetch(period);

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
    // grid: health primeiro, depois spend desc; tabela: usa sortKey/sortDir
    if (viewMode === 'grid') {
      return [...r].sort((a, b) => {
        const hOrder = { red: 0, yellow: 1, green: 2 };
        const h = hOrder[a.health] - hOrder[b.health];
        if (h !== 0) return h;
        return b.current.spend - a.current.spend;
      });
    }
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...r].sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      switch (sortKey) {
        case 'client': va = a.client_name; vb = b.client_name; break;
        case 'health': va = { red: 0, yellow: 1, green: 2 }[a.health]; vb = { red: 0, yellow: 1, green: 2 }[b.health]; break;
        case 'cost_per_conversation': va = a.current.cost_per_conversation; vb = b.current.cost_per_conversation; break;
        case 'conversations': va = a.current.whatsapp_conversations; vb = b.current.whatsapp_conversations; break;
        case 'conversion_rate': va = a.current.conversion_rate; vb = b.current.conversion_rate; break;
        case 'spend': va = a.current.spend; vb = b.current.spend; break;
        case 'unique_ctr': va = a.current.unique_ctr; vb = b.current.unique_ctr; break;
        case 'cpm': va = a.current.cpm; vb = b.current.cpm; break;
        case 'reach': va = a.current.reach; vb = b.current.reach; break;
        case 'impressions': va = a.current.impressions; vb = b.current.impressions; break;
      }
      if (typeof va === 'string') return va.localeCompare(vb as string) * mult;
      return ((va as number) - (vb as number)) * mult;
    });
  }, [rows, search, healthFilter, viewMode, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'client' ? 'asc' : 'desc'); }
  };

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
          <div className="inline-flex rounded-md border bg-muted/20">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm"
              className="rounded-r-none border-r" onClick={() => setViewMode('grid')}
              title="Visualização em cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm"
              className="rounded-l-none" onClick={() => setViewMode('table')}
              title="Visualização em tabela"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={refresh} disabled={loading} title="Atualizar agora">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Feed de alertas */}
      <AlertsFeed />

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
      ) : viewMode === 'table' ? (
        <ClientsTable
          rows={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onClick={setSelected}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((row) => (
            <ClientCard key={row.client_id + row.ad_account_id} row={row} onClick={() => setSelected(row)} onBudgetSaved={refresh} />
          ))}
        </div>
      )}

      <CampaignDrawer
        client={selected}
        rows={selected ? (campaignsByAccount.get(selected.ad_account_id) || []) : []}
        loading={campaignsLoading}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
