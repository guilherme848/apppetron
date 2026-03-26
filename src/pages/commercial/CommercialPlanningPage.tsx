import { useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pencil, TrendingUp, Target, DollarSign, BarChart2,
  AlertTriangle, RefreshCw, Pin, AlertCircle, Calendar,
  Calculator, CheckCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import MrrBaseConfig from '@/components/commercial/MrrBaseConfig';
import MrrScenarioCard, { type ScenarioConfig, calcScenarioMonths } from '@/components/commercial/MrrScenarioCard';
import MrrScenariosChart from '@/components/commercial/MrrScenariosChart';
import MonthDetailTab, { type MonthData } from '@/components/commercial/MonthDetailTab';
import { usePlatformData } from '@/hooks/usePlatformData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const SCENARIO_STORAGE_KEY = 'commercial-planning-scenarios';
const BP_LOCKED_KEY = 'commercial-bp-locked';

interface ScenarioStorage {
  cenarioInicial: ScenarioConfig;
  cenarioBom: ScenarioConfig;
  cenarioOtimo: ScenarioConfig;
}

const defaultScenarios: ScenarioStorage = {
  cenarioInicial: { churnPct: 10, adicaoMensal: 5 },
  cenarioBom: { churnPct: 11, adicaoMensal: 10 },
  cenarioOtimo: { churnPct: 12, adicaoMensal: 9 },
};

function loadScenarios(): ScenarioStorage {
  try {
    const saved = localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (saved) return { ...defaultScenarios, ...JSON.parse(saved) };
  } catch {}
  return defaultScenarios;
}

function loadBpLocked(): number[] | null {
  try {
    const saved = localStorage.getItem(BP_LOCKED_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
const fmtShort = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 100_000) return `${v < 0 ? '-' : ''}R$ ${(abs / 1_000).toFixed(0)}k`;
  return fmt(v);
};
const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

function getProgressColor(p: number) {
  if (p >= 100) return 'bg-emerald-500';
  if (p >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

function getProgressTextColor(p: number) {
  if (p >= 100) return 'text-emerald-500';
  if (p >= 70) return 'text-amber-500';
  return 'text-red-500';
}

function getDiffColor(v: number) {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-red-600 dark:text-red-400';
  return 'text-foreground';
}

/** Calculate Nova Previsão for each month */
function calcNovaPrevisao(
  monthlyActuals: { mrrAtMonth: number; activeClientsAtMonth: number }[],
  ticketMedio: number,
  config: ScenarioConfig,
  currentMonth: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < 12; i++) {
    if (i <= currentMonth) {
      result.push(monthlyActuals[i]?.mrrAtMonth ?? 0);
    } else {
      const prevClientes = i === currentMonth + 1
        ? (monthlyActuals[currentMonth]?.activeClientsAtMonth ?? 0)
        : Math.round((result[i - 1] / ticketMedio));
      const newClientes = Math.round(prevClientes - (prevClientes * config.churnPct / 100) + config.adicaoMensal);
      result.push(newClientes * ticketMedio);
    }
  }
  return result;
}

/* ── KPI Card component ───────────────────────────────────── */
function KpiCard({
  label,
  value,
  fullValue,
  sub,
  icon: Icon,
  iconColor,
  borderColor,
  valueColor,
  children,
  delay = 0,
  loading,
}: {
  label: string;
  value: string;
  fullValue?: string;
  sub?: string;
  icon: any;
  iconColor?: string;
  borderColor?: string;
  valueColor?: string;
  children?: React.ReactNode;
  delay?: number;
  loading?: boolean;
}) {
  const valueContent = (
    <p className={cn(
      'mt-2 text-2xl font-extrabold leading-none tracking-tight font-mono truncate',
      valueColor || 'text-foreground'
    )}>
      {value}
    </p>
  );

  return (
    <div
      className="relative rounded-2xl border border-border bg-card p-5 transition-all duration-150 hover:border-foreground/20 animate-fade-in overflow-hidden"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
        borderLeftWidth: borderColor ? '3px' : undefined,
        borderLeftColor: borderColor,
      }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconColor ? `${iconColor}1F` : 'hsl(var(--muted) / 0.5)' }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: iconColor || 'hsl(var(--muted-foreground))' }} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-32 mt-2" />
      ) : fullValue ? (
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>{valueContent}</TooltipTrigger>
            <TooltipContent><p className="font-mono text-sm">{fullValue}</p></TooltipContent>
          </UITooltip>
        </TooltipProvider>
      ) : valueContent}
      {sub && <p className="mt-1.5 text-[13px] text-muted-foreground">{sub}</p>}
      {children}
    </div>
  );
}

export default function CommercialPlanningPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { loading, error, lastFetched, activeClients, totalMrr, avgTicket, monthlyActuals, refetch } = usePlatformData(year);

  const [scenarios, setScenarios] = useState<ScenarioStorage>(loadScenarios);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [bpLocked, setBpLocked] = useState<number[] | null>(loadBpLocked);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarios));
      setLastSavedAt(new Date());
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [scenarios]);

  const TARGET_STORAGE_KEY = `commercial-targets-${year}`;
  const [targets, setTargets] = useState<{ target: number; targetInbound: number; targetIndicacao: number; targetProspeccao: number }[]>(() => {
    try {
      const saved = localStorage.getItem(TARGET_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return Array.from({ length: 12 }, () => ({
      target: 100000,
      targetInbound: 40000,
      targetIndicacao: 30000,
      targetProspeccao: 30000,
    }));
  });

  useEffect(() => {
    localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(targets));
  }, [targets]);

  const currentMonth = new Date().getMonth();

  const data: MonthData[] = useMemo(() => {
    return monthlyActuals.map((ma, i) => ({
      month: i,
      target: targets[i]?.target || 0,
      targetInbound: targets[i]?.targetInbound || 0,
      targetIndicacao: targets[i]?.targetIndicacao || 0,
      targetProspeccao: targets[i]?.targetProspeccao || 0,
      inbound: ma.inboundValue,
      indicacao: ma.indicacaoValue,
      prospeccao: ma.prospeccaoValue,
      qtyInbound: ma.inboundQty,
      qtyIndicacao: ma.indicacaoQty,
      qtyProspeccao: ma.prospeccaoQty,
      churnQty: ma.churnQty,
      mrrAtMonth: ma.mrrAtMonth,
      activeClientsAtMonth: ma.activeClientsAtMonth,
    }));
  }, [monthlyActuals, targets]);

  const bpMonthly: number[] = useMemo(() => {
    if (bpLocked) return bpLocked;
    const janClientes = monthlyActuals[0]?.activeClientsAtMonth ?? activeClients;
    const janMrr = monthlyActuals[0]?.mrrAtMonth ?? 0;
    const months = calcScenarioMonths(activeClients, avgTicket, scenarios.cenarioBom, janClientes, janMrr);
    return months.map(m => m.mrr);
  }, [bpLocked, monthlyActuals, activeClients, avgTicket, scenarios.cenarioBom]);

  const novaPrevisao = useMemo(() =>
    calcNovaPrevisao(monthlyActuals, avgTicket, scenarios.cenarioBom, currentMonth),
    [monthlyActuals, avgTicket, scenarios.cenarioBom, currentMonth]
  );

  const handleLockBP = () => {
    const janClientes = monthlyActuals[0]?.activeClientsAtMonth ?? activeClients;
    const janMrr = monthlyActuals[0]?.mrrAtMonth ?? 0;
    const months = calcScenarioMonths(activeClients, avgTicket, scenarios.cenarioBom, janClientes, janMrr);
    const locked = months.map(m => m.mrr);
    setBpLocked(locked);
    localStorage.setItem(BP_LOCKED_KEY, JSON.stringify(locked));
    toast.success('BP definido! Esses valores serão usados como referência anual.');
  };

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalMonth, setModalMonth] = useState<number | 'all'>('all');
  const [modalTarget, setModalTarget] = useState('');
  const [modalInbound, setModalInbound] = useState('');
  const [modalIndicacao, setModalIndicacao] = useState('');
  const [modalProspeccao, setModalProspeccao] = useState('');

  // ---- KPIs ----
  const bpAnual = useMemo(() => bpMonthly.reduce((s, v) => s + v, 0), [bpMonthly]);
  const realizadoTotal = useMemo(() => data.filter((_, i) => i <= currentMonth).reduce((s, d) => s + d.mrrAtMonth, 0), [data, currentMonth]);
  const bpProporcional = useMemo(() => bpMonthly.filter((_, i) => i <= currentMonth).reduce((s, v) => s + v, 0), [bpMonthly, currentMonth]);
  const gapAcumulado = realizadoTotal - bpProporcional;
  const projecaoFechamento = useMemo(() => {
    const futuro = novaPrevisao.filter((_, i) => i > currentMonth).reduce((s, v) => s + v, 0);
    return realizadoTotal + futuro;
  }, [novaPrevisao, realizadoTotal, currentMonth]);
  const gapFechamento = projecaoFechamento - bpAnual;
  const pctFechamento = pct(projecaoFechamento, bpAnual);

  const remainingMonths = 11 - currentMonth;
  const contratosNecessarios = useMemo(() => {
    if (gapFechamento >= 0 || remainingMonths <= 0 || avgTicket <= 0) return 0;
    return Math.ceil(Math.abs(gapFechamento) / avgTicket / remainingMonths);
  }, [gapFechamento, remainingMonths, avgTicket]);

  // ---- Chart data ----
  const chartData = useMemo(() => MONTHS.map((name, i) => ({
    name,
    bp: bpMonthly[i] || 0,
    realizado: i <= currentMonth ? (data[i]?.mrrAtMonth ?? 0) : null,
    novaPrevisao: i > currentMonth ? novaPrevisao[i] : null,
    isCurrent: i === currentMonth,
  })), [bpMonthly, data, novaPrevisao, currentMonth]);

  const chartConfig = {
    bp: { label: 'BP Original', color: 'hsl(var(--primary))' },
    realizado: { label: 'Realizado', color: 'hsl(var(--destructive))' },
    novaPrevisao: { label: 'Nova Previsão', color: 'hsl(var(--info))' },
  };

  const channelData = useMemo(() => {
    const channels = ['inbound', 'indicacao', 'prospeccao'] as const;
    const labels = { inbound: 'Inbound', indicacao: 'Indicação', prospeccao: 'Prospecção Ativa' };
    const targetKeys = { inbound: 'targetInbound', indicacao: 'targetIndicacao', prospeccao: 'targetProspeccao' } as const;
    return channels.map(ch => {
      const metaAno = targets.reduce((s, t) => s + t[targetKeys[ch]], 0);
      const realizadoAno = data.reduce((s, d) => s + d[ch], 0);
      const contribuicao = realizadoTotal > 0 ? Math.round((realizadoAno / realizadoTotal) * 100) : 0;
      const progressPct = metaAno > 0 ? Math.round((realizadoAno / metaAno) * 100) : 0;
      const monthlyData = data.map((d, i) => ({ name: MONTHS[i], value: i <= currentMonth ? d[ch] : 0, isCurrent: i === currentMonth }));
      return { key: ch, label: labels[ch], metaAno, realizadoAno, contribuicao, progressPct, monthlyData };
    });
  }, [data, targets, realizadoTotal, currentMonth]);

  const openEditModal = () => {
    setModalMonth('all');
    setModalTarget('100000');
    setModalInbound('40000');
    setModalIndicacao('30000');
    setModalProspeccao('30000');
    setEditModalOpen(true);
  };

  const modalSum = (parseInt(modalInbound) || 0) + (parseInt(modalIndicacao) || 0) + (parseInt(modalProspeccao) || 0);
  const modalTargetNum = parseInt(modalTarget) || 0;
  const modalValid = modalSum === modalTargetNum && modalTargetNum > 0;

  const saveModal = () => {
    if (!modalValid) return;
    const t = parseInt(modalTarget) || 0;
    const ib = parseInt(modalInbound) || 0;
    const ind = parseInt(modalIndicacao) || 0;
    const pr = parseInt(modalProspeccao) || 0;
    setTargets(prev => prev.map((item, i) => {
      if (modalMonth !== 'all' && i !== modalMonth) return item;
      return { target: t, targetInbound: ib, targetIndicacao: ind, targetProspeccao: pr };
    }));
    setEditModalOpen(false);
  };

  const tableGapAnual = gapFechamento;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Erro ao carregar dados: {error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planejamento Comercial</h1>
          <p className="text-sm text-muted-foreground">Acompanhe metas, projeções e performance por canal</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28 rounded-lg bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={openEditModal}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_hsl(var(--primary)/0.19)]"
          >
            <Pencil className="h-4 w-4 mr-1.5" /> Editar Metas
          </Button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <Tabs defaultValue="planning" className="w-full">
        <TabsList className="w-full sm:w-auto bg-muted/50 border border-border/50 rounded-[10px] p-1 h-auto gap-0.5">
          {[
            { value: 'planning', label: 'Planejamento Comercial' },
            { value: 'scenarios', label: 'Análise de Cenários' },
            { value: 'monthly', label: 'Mês a Mês' },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg px-4 h-9 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border hover:text-foreground transition-all duration-150"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ══ Tab 1 — Planejamento Comercial ══════════════════ */}
        <TabsContent value="planning" className="space-y-6 mt-6">
          {/* ── Section 1: Top KPI Cards (3 cols) ──────── */}
          <MrrBaseConfig
            ticketMedio={avgTicket}
            clientesAtuais={activeClients}
            mrrAtual={totalMrr}
            loading={loading}
            lastFetched={lastFetched}
            onRefresh={refetch}
          />

          {/* ── Section 2: Alert Banner ────────────────── */}
          {gapFechamento < 0 && (
            <div
              className="flex items-start gap-3 rounded-xl border px-5 py-4 animate-fade-in"
              style={{ backgroundColor: 'hsl(45 93% 47% / 0.06)', borderColor: 'hsl(45 93% 47% / 0.20)' }}
            >
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Com o ritmo atual, você fechará o ano {fmt(Math.abs(gapFechamento))} abaixo do BP.
                </p>
                {contratosNecessarios > 0 && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    É necessário adicionar ~{contratosNecessarios} novos contratos/mês nos próximos {remainingMonths} meses para bater a meta.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Section 3: Cards Hero (2 cols) ─────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* BP Anual */}
            <div
              className="rounded-2xl border border-border bg-card p-6 transition-all duration-150 hover:border-foreground/20 animate-fade-in"
              style={{ animationDelay: '80ms', animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">BP ANUAL</p>
                    {bpLocked && (
                      <Badge className="text-[10px] bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-0 rounded px-1.5 py-0">
                        Congelado
                      </Badge>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-9 w-40 mt-2" />
                  ) : (
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <p className="mt-2 text-[32px] font-extrabold leading-none tracking-tight text-foreground font-mono truncate">
                            {fmtShort(bpAnual)}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent><p className="font-mono text-sm">{fmt(bpAnual)}</p></TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  )}
                  <p className="mt-1.5 text-[13px] text-muted-foreground">meta anual de receita definida</p>
                </div>
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#6366f11F' }}
                >
                  <Target className="h-5 w-5" style={{ color: 'hsl(var(--info))' }} />
                </div>
              </div>
            </div>

            {/* Realizado até Agora */}
            <div
              className="rounded-2xl border border-border bg-card p-6 transition-all duration-150 hover:border-foreground/20 animate-fade-in"
              style={{ animationDelay: '120ms', animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">REALIZADO ATÉ AGORA</p>
                  {loading ? (
                    <Skeleton className="h-9 w-40 mt-2" />
                  ) : (
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <p className="mt-2 text-[32px] font-extrabold leading-none tracking-tight text-foreground font-mono truncate">
                            {fmtShort(realizadoTotal)}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent><p className="font-mono text-sm">{fmt(realizadoTotal)}</p></TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  )}
                  <p className="mt-1.5 text-[13px] text-muted-foreground">vs BP proporcional ao mês</p>
                  <p className="mt-1 text-[12px] font-mono text-muted-foreground/70">
                    {bpAnual > 0 ? `${pct(realizadoTotal, bpAnual)}% do BP anual` : '—'}
                  </p>
                </div>
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#10b9811F' }}
                >
                  <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: KPI Cards Line 2 (3 cols) ───── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="GAP ACUMULADO"
              value={`${gapAcumulado >= 0 ? '+' : ''}${fmtShort(gapAcumulado)}`}
              fullValue={`${gapAcumulado >= 0 ? '+' : ''}${fmt(gapAcumulado)}`}
              valueColor={getDiffColor(gapAcumulado)}
              sub="diferença entre realizado e BP proporcional"
              icon={gapAcumulado >= 0 ? ArrowUpRight : ArrowDownRight}
              iconColor={gapAcumulado >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              borderColor={gapAcumulado >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              delay={160}
              loading={loading}
            />

            <KpiCard
              label="PROJEÇÃO DE FECHAMENTO"
              value={fmtShort(projecaoFechamento)}
              fullValue={fmt(projecaoFechamento)}
              sub="estimativa de receita no fechamento do ano"
              icon={Calculator}
              iconColor="hsl(var(--primary))"
              borderColor="hsl(var(--primary))"
              delay={200}
              loading={loading}
            />

            <KpiCard
              label="GAP DE FECHAMENTO"
              value={`${gapFechamento >= 0 ? '+' : ''}${fmtShort(gapFechamento)}`}
              fullValue={`${gapFechamento >= 0 ? '+' : ''}${fmt(gapFechamento)}`}
              valueColor={getDiffColor(gapFechamento)}
              icon={gapFechamento >= 0 ? CheckCircle : AlertTriangle}
              iconColor={gapFechamento >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              borderColor={gapFechamento >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              delay={240}
              loading={loading}
            >
              <div className="mt-2">
                <div className="h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getProgressColor(pctFechamento))}
                    style={{ width: `${Math.min(pctFechamento, 100)}%` }}
                  />
                </div>
                <p className={cn('text-[11px] mt-1 font-medium font-mono', getProgressTextColor(pctFechamento))}>
                  {pctFechamento}% do BP
                </p>
              </div>
            </KpiCard>
          </div>

          {/* ── Section 5: Chart ────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: '280ms', animationFillMode: 'both' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">BP x Realizado x Nova Previsão</h3>
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5 ml-6">Comparativo mensal do planejamento vs execução</p>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { label: 'BP Original', color: 'hsl(var(--primary))' },
                  { label: 'Realizado', color: 'hsl(var(--destructive))' },
                  { label: 'Nova Previsão', color: 'hsl(var(--info))' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <ChartTooltip
                  content={<ChartTooltipContent
                    formatter={(value, name) => {
                      const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                      return <span className="font-mono">{label}: {fmt(Number(value))}</span>;
                    }}
                  />}
                />
                <Bar dataKey="bp" name="BP Original" fill="hsl(var(--primary))" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={20} animationDuration={400} />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={20} animationDuration={400} />
                <Bar dataKey="novaPrevisao" name="Nova Previsão" fill="hsl(var(--info))" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={20} animationDuration={400} />
              </ComposedChart>
            </ChartContainer>
          </div>

          {/* ── Section 6: Table ────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: '320ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Detalhamento Mensal</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32 sticky top-0 bg-muted/50">Mês</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right sticky top-0 bg-muted/50">BP (R$)</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right sticky top-0 bg-muted/50">Realizado (R$)</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right sticky top-0 bg-muted/50">Gap BP (R$)</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right sticky top-0 bg-muted/50">Nova Previsão (R$)</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right sticky top-0 bg-muted/50">Gap Anual (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MONTHS.map((m, i) => {
                    const bp = bpMonthly[i] || 0;
                    const isPastOrCurrent = i <= currentMonth;
                    const real = isPastOrCurrent ? (data[i]?.mrrAtMonth ?? 0) : null;
                    const gapBp = real !== null ? real - bp : null;
                    const np = isPastOrCurrent ? (data[i]?.mrrAtMonth ?? 0) : novaPrevisao[i];
                    return (
                      <TableRow
                        key={m}
                        className={cn(
                          'h-12 border-border/50 transition-all duration-150',
                          'hover:bg-gradient-to-r hover:from-[#F9731608] hover:to-transparent',
                        )}
                      >
                        <TableCell className="text-[13px] font-semibold text-foreground">
                          {m}
                          {i === currentMonth && (
                            <Badge className="ml-2 text-[9px] font-semibold bg-primary/12 text-primary border-0 rounded px-1.5 py-0">
                              Atual
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[13px] font-mono text-muted-foreground">{fmt(bp)}</TableCell>
                        <TableCell className="text-right text-[13px] font-mono">
                          {real !== null ? <span className="text-foreground">{fmt(real)}</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className={cn('text-right text-[13px] font-mono font-medium', gapBp !== null ? getDiffColor(gapBp) : '')}>
                          {gapBp !== null ? `${gapBp >= 0 ? '+' : ''}${fmt(gapBp)}` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right text-[13px] font-mono font-medium',
                          !isPastOrCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'
                        )}>
                          {fmt(np)}
                        </TableCell>
                        <TableCell className={cn('text-right text-[13px] font-mono font-medium', getDiffColor(tableGapAnual))}>
                          {i === 11 ? `${tableGapAnual >= 0 ? '+' : ''}${fmt(tableGapAnual)}` : ''}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold border-t-2 border-border bg-muted/30">
                    <TableCell className="text-[13px] font-bold">Total</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[13px]">{fmt(bpAnual)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[13px]">{fmt(realizadoTotal)}</TableCell>
                    <TableCell className={cn('text-right font-mono font-bold text-[13px]', getDiffColor(gapAcumulado))}>
                      {gapAcumulado >= 0 ? '+' : ''}{fmt(gapAcumulado)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-[13px] text-indigo-600 dark:text-indigo-400">{fmt(projecaoFechamento)}</TableCell>
                    <TableCell className={cn('text-right font-mono font-extrabold text-[13px]', getDiffColor(gapFechamento))}>
                      {gapFechamento >= 0 ? '+' : ''}{fmt(gapFechamento)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          {/* ── Section 7: Channel Breakdown ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {channelData.map((ch, ci) => {
              const channelColors: Record<string, string> = { inbound: 'hsl(var(--info))', indicacao: 'hsl(var(--success))', prospeccao: 'hsl(var(--primary))' };
              const borderCol = channelColors[ch.key] || 'hsl(var(--primary))';
              return (
                <div
                  key={ch.key}
                  className="rounded-2xl border border-border bg-card p-5 animate-fade-in transition-all duration-150 hover:border-foreground/20"
                  style={{ animationDelay: `${360 + ci * 40}ms`, animationFillMode: 'both', borderLeftWidth: '3px', borderLeftColor: borderCol }}
                >
                  <h4 className="text-sm font-semibold text-foreground">{ch.label}</h4>
                  <p className="text-[12px] text-muted-foreground mb-4">Meta anual · Realizado · Contribuição</p>

                  <div className="flex items-center gap-0 mb-4">
                    {[
                      { label: 'META ANUAL', value: fmt(ch.metaAno), color: 'text-foreground' },
                      { label: 'REALIZADO', value: fmt(ch.realizadoAno), color: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'CONTRIBUIÇÃO', value: `${ch.contribuicao}%`, color: 'text-primary' },
                    ].map((metric, mi) => (
                      <div key={metric.label} className={cn('flex-1 px-3', mi > 0 && 'border-l border-border/50')}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                        <p className={cn('text-sm font-bold font-mono mt-0.5', metric.color)}>{metric.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini bar chart */}
                  <div className="h-[50px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ch.monthlyData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                        <Tooltip
                          cursor={false}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [fmt(value), '']}
                          labelFormatter={(label) => label}
                        />
                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                          {ch.monthlyData.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={entry.isCurrent ? borderCol : `${borderCol}50`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ══ Tab 2 — Análise de Cenários ═════════════════════ */}
        <TabsContent value="scenarios" className="space-y-6 mt-6">
          <MrrScenarioCard
            label="Cenário Inicial" colorClass="red"
            config={scenarios.cenarioInicial} clientesIniciais={activeClients} ticketMedio={avgTicket}
            onConfigChange={c => setScenarios(prev => ({ ...prev, cenarioInicial: c }))}
            monthlyActuals={monthlyActuals} lastSavedAt={lastSavedAt}
          />
          <MrrScenarioCard
            label="BP · Cenário Bom" colorClass="yellow"
            config={scenarios.cenarioBom} clientesIniciais={activeClients} ticketMedio={avgTicket}
            onConfigChange={c => setScenarios(prev => ({ ...prev, cenarioBom: c }))}
            monthlyActuals={monthlyActuals} lastSavedAt={lastSavedAt}
            isBP bpLocked={bpLocked} onLockBP={handleLockBP}
          />
          <MrrScenarioCard
            label="Cenário Ótimo" colorClass="green"
            config={scenarios.cenarioOtimo} clientesIniciais={activeClients} ticketMedio={avgTicket}
            onConfigChange={c => setScenarios(prev => ({ ...prev, cenarioOtimo: c }))}
            monthlyActuals={monthlyActuals} lastSavedAt={lastSavedAt}
          />
          <MrrScenariosChart
            clientesIniciais={activeClients} ticketMedio={avgTicket}
            inicial={scenarios.cenarioInicial} bom={scenarios.cenarioBom} otimo={scenarios.cenarioOtimo}
            monthlyActuals={monthlyActuals}
          />
        </TabsContent>

        {/* ══ Tab 3 — Mês a Mês ══════════════════════════════ */}
        <TabsContent value="monthly" className="mt-6">
          <MonthDetailTab data={data} onDataChange={() => {}} readOnly bpAdicaoMensal={scenarios.cenarioBom.adicaoMensal} ticketMedio={avgTicket} year={year} />
        </TabsContent>
      </Tabs>

      {/* ── Edit Modal ────────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Metas</DialogTitle>
            <DialogDescription>Defina as metas de faturamento por canal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={String(modalMonth)} onValueChange={v => setModalMonth(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Total do Mês (R$)</Label>
              <Input type="number" value={modalTarget} onChange={e => setModalTarget(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Inbound (R$)</Label>
              <Input type="number" value={modalInbound} onChange={e => setModalInbound(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Indicação (R$)</Label>
              <Input type="number" value={modalIndicacao} onChange={e => setModalIndicacao(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Prospecção Ativa (R$)</Label>
              <Input type="number" value={modalProspeccao} onChange={e => setModalProspeccao(e.target.value)} />
            </div>
            {!modalValid && modalTargetNum > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Soma dos canais ({fmt(modalSum)}) diferente da meta total ({fmt(modalTargetNum)})
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={saveModal}
              disabled={!modalValid}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              Salvar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
