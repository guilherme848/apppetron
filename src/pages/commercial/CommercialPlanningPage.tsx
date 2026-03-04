import { useState, useMemo, useEffect } from 'react';
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
import { Pencil, TrendingUp, Target, DollarSign, BarChart3, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Legend } from 'recharts';
import MrrBaseConfig from '@/components/commercial/MrrBaseConfig';
import MrrScenarioCard, { type ScenarioConfig } from '@/components/commercial/MrrScenarioCard';
import MrrScenariosChart from '@/components/commercial/MrrScenariosChart';
import MonthDetailTab, { type MonthData } from '@/components/commercial/MonthDetailTab';
import { usePlatformData } from '@/hooks/usePlatformData';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const SCENARIO_STORAGE_KEY = 'commercial-planning-scenarios';

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

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

function getAtingimentoColor(p: number) {
  if (p >= 100) return 'text-green-600 dark:text-green-400';
  if (p >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getAtingimentoBadge(p: number) {
  if (p >= 100) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{p}%</Badge>;
  if (p >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{p}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{p}%</Badge>;
}

function getProgressColor(p: number) {
  if (p >= 100) return '[&>div]:bg-green-500';
  if (p >= 70) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-red-500';
}

function getDiffColor(v: number) {
  if (v > 0) return 'text-green-600 dark:text-green-400';
  if (v < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

export default function CommercialPlanningPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { loading, error, lastFetched, activeClients, totalMrr, avgTicket, monthlyActuals, refetch } = usePlatformData(year);

  const [scenarios, setScenarios] = useState<ScenarioStorage>(loadScenarios);

  useEffect(() => {
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarios));
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

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalMonth, setModalMonth] = useState<number | 'all'>('all');
  const [modalTarget, setModalTarget] = useState('');
  const [modalInbound, setModalInbound] = useState('');
  const [modalIndicacao, setModalIndicacao] = useState('');
  const [modalProspeccao, setModalProspeccao] = useState('');

  const currentMonth = new Date().getMonth();

  const metaAnual = useMemo(() => targets.reduce((s, t) => s + t.target, 0), [targets]);
  // Realizado = soma acumulada do MRR de cada mês (faturamento total no ano)
  const realizadoTotal = useMemo(() => {
    return data
      .filter((_, i) => i <= currentMonth)
      .reduce((s, d) => s + d.mrrAtMonth, 0);
  }, [data, currentMonth]);

  const projecaoCalc = useMemo(() => {
    const pastData = data.filter((_, i) => i <= currentMonth);
    if (pastData.length === 0) return 0;
    const acumulado = pastData.reduce((s, d) => s + d.mrrAtMonth, 0);
    const mediaMensal = acumulado / pastData.length;
    return Math.round(mediaMensal * 12);
  }, [data, currentMonth]);

  const atingimento = pct(realizadoTotal, metaAnual);

  // Chart: meta acumulada vs realizado acumulado
  const chartData = useMemo(() => {
    let acumMeta = 0;
    let acumReal = 0;
    return data.map((d, i) => {
      acumMeta += d.target;
      acumReal += d.mrrAtMonth;
      return {
        name: MONTHS[i],
        meta: acumMeta,
        realizado: i <= currentMonth ? acumReal : null,
        projecao: null,
      };
    });
  }, [data, currentMonth]);

  const chartConfig = {
    meta: { label: 'Meta', color: 'hsl(201 30% 21%)' },
    realizado: { label: 'Realizado', color: 'hsl(21 90% 57%)' },
    projecao: { label: 'Projeção', color: 'hsl(0 0% 60%)' },
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
          {/* MRR Base Config — read-only from database */}
          <MrrBaseConfig
            ticketMedio={avgTicket}
            clientesAtuais={activeClients}
            mrrAtual={totalMrr}
            loading={loading}
            lastFetched={lastFetched}
            onRefresh={refetch}
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Meta Anual</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(metaAnual)}</div>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Projeção de Fechamento</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(projecaoCalc)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">% de Atingimento</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getAtingimentoColor(atingimento)}`}>{atingimento}%</div>
                <Progress value={Math.min(atingimento, 100)} className={`mt-2 ${getProgressColor(atingimento)}`} />
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meta x Realizado</CardTitle>
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
                  <Bar dataKey="meta" name="Meta" fill="hsl(201 30% 21%)" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="realizado" name="Realizado" fill="hsl(21 90% 57%)" radius={[4, 4, 0, 0]} barSize={28} />
                  <Line type="monotone" dataKey="projecao" name="Projeção" stroke="hsl(0 0% 60%)" strokeDasharray="5 5" strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ChartContainer>
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
          />
          <MrrScenarioCard
            label="Cenário Bom" emoji="🟡" colorClass="yellow"
            config={scenarios.cenarioBom} clientesIniciais={activeClients} ticketMedio={avgTicket}
            onConfigChange={c => setScenarios(prev => ({ ...prev, cenarioBom: c }))}
          />
          <MrrScenarioCard
            label="Cenário Ótimo" emoji="🟢" colorClass="green"
            config={scenarios.cenarioOtimo} clientesIniciais={activeClients} ticketMedio={avgTicket}
            onConfigChange={c => setScenarios(prev => ({ ...prev, cenarioOtimo: c }))}
          />
          <MrrScenariosChart
            clientesIniciais={activeClients} ticketMedio={avgTicket}
            inicial={scenarios.cenarioInicial} bom={scenarios.cenarioBom} otimo={scenarios.cenarioOtimo}
          />
        </TabsContent>

        {/* Tab 3 — Mês a Mês */}
        <TabsContent value="monthly" className="mt-6">
          <MonthDetailTab data={data} onDataChange={() => {}} readOnly />
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
