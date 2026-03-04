import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, TrendingUp, Target, DollarSign, BarChart3, AlertTriangle, RefreshCw, Pin } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Legend, Cell } from 'recharts';
import MrrBaseConfig from '@/components/commercial/MrrBaseConfig';
import MrrScenarioCard, { type ScenarioConfig, calcScenarioMonths } from '@/components/commercial/MrrScenarioCard';
import MrrScenariosChart from '@/components/commercial/MrrScenariosChart';
import MonthDetailTab, { type MonthData } from '@/components/commercial/MonthDetailTab';
import { usePlatformData } from '@/hooks/usePlatformData';
import { toast } from 'sonner';

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
const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

function getProgressColor(p: number) {
  if (p >= 100) return '[&>div]:bg-green-500';
  if (p >= 90) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-red-500';
}

function getDiffColor(v: number) {
  if (v > 0) return 'text-green-600 dark:text-green-400';
  if (v < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
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

  // Targets still from localStorage (user-defined)
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

  // Build MonthData from platform + targets
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

  // BP: use locked values or compute from Cenário Bom
  const bpMonthly: number[] = useMemo(() => {
    if (bpLocked) return bpLocked;
    const janClientes = monthlyActuals[0]?.activeClientsAtMonth ?? activeClients;
    const janMrr = monthlyActuals[0]?.mrrAtMonth ?? 0;
    const months = calcScenarioMonths(activeClients, avgTicket, scenarios.cenarioBom, janClientes, janMrr);
    return months.map(m => m.mrr);
  }, [bpLocked, monthlyActuals, activeClients, avgTicket, scenarios.cenarioBom]);

  // Nova Previsão from Cenário Bom config
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

  // Alert: contracts needed
  const remainingMonths = 11 - currentMonth;
  const contratosNecessarios = useMemo(() => {
    if (gapFechamento >= 0 || remainingMonths <= 0 || avgTicket <= 0) return 0;
    return Math.ceil(Math.abs(gapFechamento) / avgTicket / remainingMonths);
  }, [gapFechamento, remainingMonths, avgTicket]);

  // ---- Chart data: BP / Realizado / Nova Previsão ----
  const chartData = useMemo(() => MONTHS.map((name, i) => ({
    name,
    bp: bpMonthly[i] || 0,
    realizado: i <= currentMonth ? (data[i]?.mrrAtMonth ?? 0) : null,
    novaPrevisao: i > currentMonth ? novaPrevisao[i] : null,
  })), [bpMonthly, data, novaPrevisao, currentMonth]);

  const chartConfig = {
    bp: { label: 'BP Original', color: 'hsl(220 14% 40%)' },
    realizado: { label: 'Realizado', color: 'hsl(21 90% 57%)' },
    novaPrevisao: { label: 'Nova Previsão', color: 'hsl(213 94% 55%)' },
  };

  const channelData = useMemo(() => {
    const channels = ['inbound', 'indicacao', 'prospeccao'] as const;
    const labels = { inbound: 'Inbound', indicacao: 'Indicação', prospeccao: 'Prospecção Ativa' };
    const targetKeys = { inbound: 'targetInbound', indicacao: 'targetIndicacao', prospeccao: 'targetProspeccao' } as const;
    return channels.map(ch => {
      const metaAno = targets.reduce((s, t) => s + t[targetKeys[ch]], 0);
      const realizadoAno = data.reduce((s, d) => s + d[ch], 0);
      const contribuicao = realizadoTotal > 0 ? Math.round((realizadoAno / realizadoTotal) * 100) : 0;
      const monthlyData = data.map((d, i) => ({ name: MONTHS[i], value: i <= currentMonth ? d[ch] : 0 }));
      return { key: ch, label: labels[ch], metaAno, realizadoAno, contribuicao, monthlyData };
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

  // ---- Table rows ----
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
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planejamento Comercial</h1>
          <p className="text-sm text-muted-foreground">Acompanhe metas, projeções e performance por canal</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openEditModal} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Pencil className="h-4 w-4 mr-1" /> Editar Metas
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="planning" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="planning">Planejamento Comercial</TabsTrigger>
          <TabsTrigger value="scenarios">Análise de Cenários</TabsTrigger>
          <TabsTrigger value="monthly">Mês a Mês</TabsTrigger>
        </TabsList>

        {/* Tab 1 — Planejamento Comercial */}
        <TabsContent value="planning" className="space-y-6 mt-6">
          {/* MRR Base Config */}
          <MrrBaseConfig
            ticketMedio={avgTicket}
            clientesAtuais={activeClients}
            mrrAtual={totalMrr}
            loading={loading}
            lastFetched={lastFetched}
            onRefresh={refetch}
          />

          {/* Alert banner */}
          {gapFechamento < 0 && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                  ⚠️ Com o ritmo atual, você fechará o ano {fmt(Math.abs(gapFechamento))} abaixo do BP.
                </p>
                {contratosNecessarios > 0 && (
                  <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                    É necessário adicionar ~{contratosNecessarios} novos contratos/mês nos próximos {remainingMonths} meses para bater a meta.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* KPI Cards — 5 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">BP Anual</CardTitle>
                <Pin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(bpAnual)}</div>
                {bpLocked && <p className="text-[10px] text-muted-foreground">Congelado</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Realizado Até Agora</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(realizadoTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gap Acumulado</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getDiffColor(gapAcumulado)}`}>
                  {gapAcumulado >= 0 ? '+' : ''}{fmt(gapAcumulado)}
                </div>
                <p className="text-[10px] text-muted-foreground">vs BP proporcional até {MONTHS[currentMonth]}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Projeção de Fechamento</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(projecaoFechamento)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gap de Fechamento</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getDiffColor(gapFechamento)}`}>
                  {gapFechamento >= 0 ? '+' : ''}{fmt(gapFechamento)}
                </div>
                <Progress value={Math.min(pctFechamento, 120)} className={`mt-2 ${getProgressColor(pctFechamento)}`} />
                <p className="text-[10px] text-muted-foreground mt-1">{pctFechamento}% do BP</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart — BP / Realizado / Nova Previsão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">BP x Realizado x Nova Previsão</CardTitle>
              <p className="text-xs text-muted-foreground">■ BP Original &nbsp; ■ Realizado &nbsp; ■ Nova Previsão</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <ChartTooltip
                    content={<ChartTooltipContent
                      formatter={(value, name) => {
                        const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                        return <span>{label}: {fmt(Number(value))}</span>;
                      }}
                    />}
                  />
                  <Legend />
                  <Bar dataKey="bp" name="BP Original" fill="hsl(220 14% 40%)" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="realizado" name="Realizado" fill="hsl(21 90% 57%)" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="novaPrevisao" name="Nova Previsão" fill="hsl(213 94% 55%)" radius={[4, 4, 0, 0]} barSize={22} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Table — BP / Realizado / Gap / Nova Previsão / Gap Anual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhamento Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Mês</TableHead>
                      <TableHead className="text-right">BP (R$)</TableHead>
                      <TableHead className="text-right">Realizado (R$)</TableHead>
                      <TableHead className="text-right">Gap BP (R$)</TableHead>
                      <TableHead className="text-right">Nova Previsão (R$)</TableHead>
                      <TableHead className="text-right">Gap Anual (R$)</TableHead>
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
                        <TableRow key={m} className={i === currentMonth ? 'bg-orange-50/50 dark:bg-orange-950/10' : i < currentMonth ? 'bg-muted/20' : ''}>
                          <TableCell className="font-medium text-sm">
                            {m}
                            {i === currentMonth && <Badge className="ml-2 text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-none">Atual</Badge>}
                          </TableCell>
                          <TableCell className="text-right text-sm">{fmt(bp)}</TableCell>
                          <TableCell className="text-right text-sm">{real !== null ? fmt(real) : '—'}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${gapBp !== null ? getDiffColor(gapBp) : ''}`}>
                            {gapBp !== null ? `${gapBp >= 0 ? '+' : ''}${fmt(gapBp)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium text-blue-700 dark:text-blue-400">{fmt(np)}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${getDiffColor(tableGapAnual)}`}>
                            {i === 11 ? `${tableGapAnual >= 0 ? '+' : ''}${fmt(tableGapAnual)}` : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{fmt(bpAnual)}</TableCell>
                      <TableCell className="text-right">{fmt(realizadoTotal)}</TableCell>
                      <TableCell className={`text-right ${getDiffColor(gapAcumulado)}`}>
                        {gapAcumulado >= 0 ? '+' : ''}{fmt(gapAcumulado)}
                      </TableCell>
                      <TableCell className="text-right text-blue-700 dark:text-blue-400">{fmt(projecaoFechamento)}</TableCell>
                      <TableCell className={`text-right ${getDiffColor(gapFechamento)}`}>
                        {gapFechamento >= 0 ? '+' : ''}{fmt(gapFechamento)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Channel Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {channelData.map(ch => (
              <Card key={ch.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{ch.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta anual</span>
                    <span className="font-medium">{fmt(ch.metaAno)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Realizado</span>
                    <span className="font-medium">{fmt(ch.realizadoAno)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contribuição</span>
                    <span className="font-medium">{ch.contribuicao}%</span>
                  </div>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ch.monthlyData} layout="vertical" margin={{ left: 30, right: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={30} />
                        <Bar dataKey="value" fill="hsl(21 90% 57%)" radius={[0, 4, 4, 0]} barSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2 — Análise de Cenários */}
        <TabsContent value="scenarios" className="space-y-6 mt-6">
          <MrrScenarioCard
            label="Cenário Inicial" emoji="🔴" colorClass="red"
            config={scenarios.cenarioInicial} clientesIniciais={activeClients} ticketMedio={avgTicket}
            onConfigChange={c => setScenarios(prev => ({ ...prev, cenarioInicial: c }))}
            monthlyActuals={monthlyActuals} lastSavedAt={lastSavedAt}
          />
          <MrrScenarioCard
            label="BP · Cenário Bom" emoji="🟡" colorClass="yellow"
            config={scenarios.cenarioBom} clientesIniciais={activeClients} ticketMedio={avgTicket}
            onConfigChange={c => setScenarios(prev => ({ ...prev, cenarioBom: c }))}
            monthlyActuals={monthlyActuals} lastSavedAt={lastSavedAt}
            isBP bpLocked={bpLocked} onLockBP={handleLockBP}
          />
          <MrrScenarioCard
            label="Cenário Ótimo" emoji="🟢" colorClass="green"
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

        {/* Tab 3 — Mês a Mês */}
        <TabsContent value="monthly" className="mt-6">
          <MonthDetailTab data={data} onDataChange={() => {}} readOnly bpAdicaoMensal={scenarios.cenarioBom.adicaoMensal} ticketMedio={avgTicket} year={year} />
        </TabsContent>
      </Tabs>

      {/* Edit Modal (global targets) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Metas</DialogTitle>
            <DialogDescription>Defina as metas de faturamento por canal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Mês</Label>
              <Select value={String(modalMonth)} onValueChange={v => setModalMonth(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta Total do Mês (R$)</Label>
              <Input type="number" value={modalTarget} onChange={e => setModalTarget(e.target.value)} />
            </div>
            <div>
              <Label>Meta Inbound (R$)</Label>
              <Input type="number" value={modalInbound} onChange={e => setModalInbound(e.target.value)} />
            </div>
            <div>
              <Label>Meta Indicação (R$)</Label>
              <Input type="number" value={modalIndicacao} onChange={e => setModalIndicacao(e.target.value)} />
            </div>
            <div>
              <Label>Meta Prospecção Ativa (R$)</Label>
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
            <Button onClick={saveModal} disabled={!modalValid} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Salvar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
