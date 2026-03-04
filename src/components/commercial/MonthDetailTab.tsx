import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Plus, Lock } from 'lucide-react';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

const CHANNEL_PLAN_KEY = 'commercial-channel-plan';

interface ChannelPlan {
  inbound: number;
  indicacao: number;
  outbound: number;
}

function loadChannelPlans(): Record<string, ChannelPlan> {
  try {
    const saved = localStorage.getItem(CHANNEL_PLAN_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function getDiffColor(v: number) {
  if (v > 0) return 'text-green-600 dark:text-green-400';
  if (v < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

export interface MonthData {
  month: number;
  target: number;
  inbound: number;
  indicacao: number;
  prospeccao: number;
  targetInbound: number;
  targetIndicacao: number;
  targetProspeccao: number;
  qtyInbound: number;
  qtyIndicacao: number;
  qtyProspeccao: number;
  churnQty: number;
  mrrAtMonth: number;
  activeClientsAtMonth: number;
}

interface MonthDetailTabProps {
  data: MonthData[];
  onDataChange: (data: MonthData[]) => void;
  readOnly?: boolean;
  bpAdicaoMensal?: number;
  ticketMedio?: number;
  year?: number;
}

export default function MonthDetailTab({ data, onDataChange, readOnly, bpAdicaoMensal = 0, ticketMedio = 0, year = new Date().getFullYear() }: MonthDetailTabProps) {
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [channelPlans, setChannelPlans] = useState<Record<string, ChannelPlan>>(loadChannelPlans);
  const [planSavedAt, setPlanSavedAt] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save channel plans
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(CHANNEL_PLAN_KEY, JSON.stringify(channelPlans));
      setPlanSavedAt(new Date());
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [channelPlans]);

  const monthKey = `${year}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const plan = channelPlans[monthKey] || { inbound: 0, indicacao: 0, outbound: 0 };

  const setPlan = (partial: Partial<ChannelPlan>) => {
    setChannelPlans(prev => ({
      ...prev,
      [monthKey]: { ...plan, ...partial },
    }));
  };

  // Modal state
  const [mQtyInbound, setMQtyInbound] = useState('0');
  const [mValInbound, setMValInbound] = useState('0');
  const [mQtyIndicacao, setMQtyIndicacao] = useState('0');
  const [mValIndicacao, setMValIndicacao] = useState('0');
  const [mQtyProspeccao, setMQtyProspeccao] = useState('0');
  const [mValProspeccao, setMValProspeccao] = useState('0');
  const [mChurnQty, setMChurnQty] = useState('0');

  const d = data[selectedMonth];
  const isFuture = selectedMonth > currentMonth;
  const isPast = selectedMonth < currentMonth;

  const totalRealizado = d.inbound + d.indicacao + d.prospeccao;
  const mrrLiquido = useMemo(() => {
    return (parseInt(mValInbound) || 0) + (parseInt(mValIndicacao) || 0) + (parseInt(mValProspeccao) || 0);
  }, [mValInbound, mValIndicacao, mValProspeccao]);

  // BP values for this month
  const bpContracts = bpAdicaoMensal;
  const bpMrr = bpContracts * ticketMedio;
  // Split BP evenly across 3 channels as default reference (1/3 each)
  const bpPerChannel = Math.round(bpContracts / 3);
  const bpPerChannelMrr = bpPerChannel * ticketMedio;

  // Planned totals
  const plannedTotal = plan.inbound + plan.indicacao + plan.outbound;
  const plannedMrr = plannedTotal * ticketMedio;
  const planDiff = plannedTotal - bpContracts;

  // Realized qty
  const realQtyInbound = d.qtyInbound;
  const realQtyIndicacao = d.qtyIndicacao;
  const realQtyOutbound = d.qtyProspeccao;
  const realQtyTotal = realQtyInbound + realQtyIndicacao + realQtyOutbound;

  const openLaunchModal = () => {
    setMQtyInbound(String(d.qtyInbound));
    setMValInbound(String(d.inbound));
    setMQtyIndicacao(String(d.qtyIndicacao));
    setMValIndicacao(String(d.indicacao));
    setMQtyProspeccao(String(d.qtyProspeccao));
    setMValProspeccao(String(d.prospeccao));
    setMChurnQty(String(d.churnQty));
    setLaunchModalOpen(true);
  };

  const saveLaunch = () => {
    const updated = data.map((item, i) => {
      if (i !== selectedMonth) return item;
      return {
        ...item,
        inbound: parseInt(mValInbound) || 0,
        indicacao: parseInt(mValIndicacao) || 0,
        prospeccao: parseInt(mValProspeccao) || 0,
        qtyInbound: parseInt(mQtyInbound) || 0,
        qtyIndicacao: parseInt(mQtyIndicacao) || 0,
        qtyProspeccao: parseInt(mQtyProspeccao) || 0,
        churnQty: parseInt(mChurnQty) || 0,
      };
    });
    onDataChange(updated);
    setLaunchModalOpen(false);
  };

  // Chart data: BP / Planejado / Realizado stacked by channel
  const stackedChartData = useMemo(() => [
    {
      group: 'BP',
      inbound: bpPerChannelMrr,
      indicacao: bpPerChannelMrr,
      outbound: (bpContracts - bpPerChannel * 2) * ticketMedio,
    },
    {
      group: 'Planejado',
      inbound: plan.inbound * ticketMedio,
      indicacao: plan.indicacao * ticketMedio,
      outbound: plan.outbound * ticketMedio,
    },
    {
      group: 'Realizado',
      inbound: !isFuture ? d.inbound : 0,
      indicacao: !isFuture ? d.indicacao : 0,
      outbound: !isFuture ? d.prospeccao : 0,
    },
  ], [bpPerChannelMrr, bpContracts, bpPerChannel, ticketMedio, plan, d, isFuture]);

  const stackedChartConfig = {
    inbound: { label: 'Inbound', color: 'hsl(21 90% 57%)' },
    indicacao: { label: 'Indicação', color: 'hsl(213 94% 55%)' },
    outbound: { label: 'Outbound', color: 'hsl(271 81% 56%)' },
  };

  const savedTimeStr = planSavedAt ? planSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isFuture && !readOnly && (
          <Button onClick={openLaunchModal} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> Lançar Realizado
          </Button>
        )}
        {savedTimeStr && (
          <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded ml-auto">
            Salvo automaticamente · {savedTimeStr}
          </span>
        )}
      </div>

      {/* 1. HEADER — BP CONTEXT */}
      <Card className="border-l-4 border-l-amber-400">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Meta BP do mês — {MONTH_NAMES[selectedMonth]}</p>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold">{bpContracts} contratos</span>
                <span className="text-sm text-muted-foreground">→ {fmt(bpMrr)} em MRR</span>
              </div>
            </div>
            <div>
              {isPast ? (
                <Badge className="bg-muted text-muted-foreground border-none gap-1">
                  <Lock className="h-3 w-3" /> Encerrado · Ver realizado
                </Badge>
              ) : selectedMonth === currentMonth ? (
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-none">
                  Mês atual · Em andamento
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-none">
                  Futuro · Planejamento em aberto
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. COMO VOU CHEGAR LÁ — Channel planning cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Como vou chegar lá?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { key: 'inbound' as const, label: 'Inbound', color: 'border-l-orange-400' },
            { key: 'indicacao' as const, label: 'Indicação', color: 'border-l-blue-500' },
            { key: 'outbound' as const, label: 'Outbound', color: 'border-l-purple-500' },
          ]).map(ch => {
            const qty = plan[ch.key];
            const mrrExpected = qty * ticketMedio;
            const pctTotal = plannedTotal > 0 ? Math.round((qty / plannedTotal) * 100) : 0;
            return (
              <Card key={ch.key} className={`border-l-4 ${ch.color}`}>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm font-semibold">{ch.label}</p>
                  <div>
                    <Label className="text-xs text-muted-foreground">Meta de contratos</Label>
                    <Input
                      type="number"
                      value={qty}
                      onChange={e => setPlan({ [ch.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="h-9 mt-1"
                      disabled={isPast}
                      min={0}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>MRR esperado</span>
                    <span className="font-medium text-foreground">{fmt(mrrExpected)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>% do total</span>
                    <span className="font-medium text-foreground">{pctTotal}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Validation badge */}
        <div className="mt-3">
          {planDiff < 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
              ⚠️ Planejamento {Math.abs(planDiff)} contratos abaixo do BP
            </div>
          )}
          {planDiff === 0 && plannedTotal > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              ✅ Planejamento alinhado ao BP
            </div>
          )}
          {planDiff > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
              🚀 Planejamento {planDiff} contratos acima do BP
            </div>
          )}
        </div>
      </div>

      {/* 3. COMPARISON TABLE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Planejado x BP x Realizado — {MONTH_NAMES[selectedMonth]}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">BP (contratos)</TableHead>
                <TableHead className="text-right">BP (R$)</TableHead>
                <TableHead className="text-right">Planejado (contratos)</TableHead>
                <TableHead className="text-right">Planejado (R$)</TableHead>
                <TableHead className="text-right">Realizado (contratos)</TableHead>
                <TableHead className="text-right">Realizado (R$)</TableHead>
                <TableHead className="text-right">Gap vs BP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {([
                { label: 'Inbound', planKey: 'inbound' as const, realQty: realQtyInbound, realVal: d.inbound, bpQty: bpPerChannel, bpVal: bpPerChannelMrr },
                { label: 'Indicação', planKey: 'indicacao' as const, realQty: realQtyIndicacao, realVal: d.indicacao, bpQty: bpPerChannel, bpVal: bpPerChannelMrr },
                { label: 'Outbound', planKey: 'outbound' as const, realQty: realQtyOutbound, realVal: d.prospeccao, bpQty: bpContracts - bpPerChannel * 2, bpVal: (bpContracts - bpPerChannel * 2) * ticketMedio },
              ]).map(row => {
                const planQty = plan[row.planKey];
                const planVal = planQty * ticketMedio;
                const gap = isFuture ? planVal - row.bpVal : row.realVal - row.bpVal;
                return (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium text-sm">{row.label}</TableCell>
                    <TableCell className="text-right text-sm">{row.bpQty}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(row.bpVal)}</TableCell>
                    <TableCell className="text-right text-sm">{planQty}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(planVal)}</TableCell>
                    <TableCell className="text-right text-sm">{!isFuture ? row.realQty : '—'}</TableCell>
                    <TableCell className="text-right text-sm">{!isFuture ? fmt(row.realVal) : '—'}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${getDiffColor(gap)}`}>
                      {isFuture ? '—' : `${gap >= 0 ? '+' : ''}${fmt(gap)}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{bpContracts}</TableCell>
                <TableCell className="text-right">{fmt(bpMrr)}</TableCell>
                <TableCell className="text-right">{plannedTotal}</TableCell>
                <TableCell className="text-right">{fmt(plannedMrr)}</TableCell>
                <TableCell className="text-right">{!isFuture ? realQtyTotal : '—'}</TableCell>
                <TableCell className="text-right">{!isFuture ? fmt(totalRealizado) : '—'}</TableCell>
                <TableCell className={`text-right ${getDiffColor(!isFuture ? totalRealizado - bpMrr : plannedMrr - bpMrr)}`}>
                  {isFuture ? '—' : `${totalRealizado - bpMrr >= 0 ? '+' : ''}${fmt(totalRealizado - bpMrr)}`}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* 4. STACKED BAR CHART */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">BP x Planejado x Realizado — por canal</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={stackedChartConfig} className="h-[280px] w-full">
            <BarChart data={stackedChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="group" className="text-xs" />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
              <ChartTooltip
                content={<ChartTooltipContent
                  formatter={(value, name) => {
                    const label = stackedChartConfig[name as keyof typeof stackedChartConfig]?.label || name;
                    return <span>{label}: {fmt(Number(value))}</span>;
                  }}
                />}
              />
              <Legend />
              <Bar dataKey="inbound" name="Inbound" stackId="a" fill="hsl(21 90% 57%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="indicacao" name="Indicação" stackId="a" fill="hsl(213 94% 55%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outbound" name="Outbound" stackId="a" fill="hsl(271 81% 56%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Realizado Panel */}
      {!isFuture && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Realizado — {MONTH_NAMES[selectedMonth]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm font-medium border-b pb-2">
              <span>MRR no Mês</span>
              <span>{fmt(d.mrrAtMonth)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Clientes ativos</span>
              <span className="font-medium">{d.activeClientsAtMonth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Novos contratos</span>
              <span className="font-medium">{realQtyTotal}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Churn do mês</span>
              <span className="text-destructive">{d.churnQty} clientes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Launch Modal */}
      <Dialog open={launchModalOpen} onOpenChange={setLaunchModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lançar Realizado — {MONTH_NAMES[selectedMonth]}</DialogTitle>
            <DialogDescription>Informe os novos contratos e churn do mês</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contratos Inbound (qtd)</Label>
                <Input type="number" value={mQtyInbound} onChange={e => setMQtyInbound(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Valor Inbound (R$)</Label>
                <Input type="number" value={mValInbound} onChange={e => setMValInbound(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contratos Indicação (qtd)</Label>
                <Input type="number" value={mQtyIndicacao} onChange={e => setMQtyIndicacao(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Valor Indicação (R$)</Label>
                <Input type="number" value={mValIndicacao} onChange={e => setMValIndicacao(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contratos Prospecção (qtd)</Label>
                <Input type="number" value={mQtyProspeccao} onChange={e => setMQtyProspeccao(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Valor Prospecção (R$)</Label>
                <Input type="number" value={mValProspeccao} onChange={e => setMValProspeccao(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Churn do mês (clientes perdidos)</Label>
                <Input type="number" value={mChurnQty} onChange={e => setMChurnQty(e.target.value)} />
              </div>
              <div className="flex items-end">
                <div className="rounded-md bg-muted p-3 w-full">
                  <p className="text-xs text-muted-foreground">MRR Líquido</p>
                  <p className="text-lg font-bold">{fmt(mrrLiquido)}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLaunchModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveLaunch} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
