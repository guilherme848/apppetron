import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pencil, TrendingUp, Target, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Legend, Cell } from 'recharts';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface MonthData {
  month: number;
  target: number;
  inbound: number;
  indicacao: number;
  prospeccao: number;
  targetInbound: number;
  targetIndicacao: number;
  targetProspeccao: number;
}

function getInitialData(): MonthData[] {
  const currentMonth = new Date().getMonth(); // 0-indexed
  return Array.from({ length: 12 }, (_, i) => {
    const isPast = i <= currentMonth;
    const baseTarget = 80000 + Math.floor(Math.random() * 40000);
    return {
      month: i,
      target: baseTarget,
      targetInbound: Math.round(baseTarget * 0.4),
      targetIndicacao: Math.round(baseTarget * 0.3),
      targetProspeccao: Math.round(baseTarget * 0.3),
      inbound: isPast ? Math.round((baseTarget * 0.4) * (0.7 + Math.random() * 0.6)) : 0,
      indicacao: isPast ? Math.round((baseTarget * 0.3) * (0.5 + Math.random() * 0.8)) : 0,
      prospeccao: isPast ? Math.round((baseTarget * 0.3) * (0.6 + Math.random() * 0.7)) : 0,
    };
  });
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
  const [data, setData] = useState<MonthData[]>(getInitialData);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [inlineEditing, setInlineEditing] = useState<{ month: number; field: string } | null>(null);
  const [inlineValue, setInlineValue] = useState('');

  // Modal state
  const [modalMonth, setModalMonth] = useState<number | 'all'>('all');
  const [modalTarget, setModalTarget] = useState('');
  const [modalInbound, setModalInbound] = useState('');
  const [modalIndicacao, setModalIndicacao] = useState('');
  const [modalProspeccao, setModalProspeccao] = useState('');

  const currentMonth = new Date().getMonth();

  // Computed values
  const metaAnual = useMemo(() => data.reduce((s, d) => s + d.target, 0), [data]);
  const realizadoTotal = useMemo(() => data.reduce((s, d) => s + d.inbound + d.indicacao + d.prospeccao, 0), [data]);

  const projecaoCalc = useMemo(() => {
    const mesesComDados = data.filter((_, i) => i <= currentMonth);
    if (mesesComDados.length === 0) return 0;
    const total = mesesComDados.reduce((s, d) => s + d.inbound + d.indicacao + d.prospeccao, 0);
    const media = total / mesesComDados.length;
    return Math.round(media * 12);
  }, [data, currentMonth]);

  const atingimento = pct(realizadoTotal, metaAnual);

  // Chart data
  const chartData = useMemo(() => data.map((d, i) => {
    const realizado = d.inbound + d.indicacao + d.prospeccao;
    // Projection: moving average of last 3 months with data
    const pastMonths = data.slice(Math.max(0, i - 2), i + 1).filter((_, idx) => (Math.max(0, i - 2) + idx) <= currentMonth);
    const proj = pastMonths.length > 0 ? Math.round(pastMonths.reduce((s, m) => s + m.inbound + m.indicacao + m.prospeccao, 0) / pastMonths.length) : null;
    return {
      name: MONTHS[i],
      meta: d.target,
      realizado: i <= currentMonth ? realizado : null,
      projecao: proj,
    };
  }), [data, currentMonth]);

  const chartConfig = {
    meta: { label: 'Meta', color: 'hsl(201 30% 21%)' },
    realizado: { label: 'Realizado', color: 'hsl(21 90% 57%)' },
    projecao: { label: 'Projeção', color: 'hsl(0 0% 60%)' },
  };

  // Channel breakdown
  const channelData = useMemo(() => {
    const channels = ['inbound', 'indicacao', 'prospeccao'] as const;
    const labels = { inbound: 'Inbound', indicacao: 'Indicação', prospeccao: 'Prospecção Ativa' };
    const targetKeys = { inbound: 'targetInbound', indicacao: 'targetIndicacao', prospeccao: 'targetProspeccao' } as const;
    return channels.map(ch => {
      const metaAno = data.reduce((s, d) => s + d[targetKeys[ch]], 0);
      const realizadoAno = data.reduce((s, d) => s + d[ch], 0);
      const contribuicao = realizadoTotal > 0 ? Math.round((realizadoAno / realizadoTotal) * 100) : 0;
      const monthlyData = data.map((d, i) => ({
        name: MONTHS[i],
        value: i <= currentMonth ? d[ch] : 0,
      }));
      return { key: ch, label: labels[ch], metaAno, realizadoAno, contribuicao, monthlyData };
    });
  }, [data, realizadoTotal, currentMonth]);

  // Inline editing
  const startInlineEdit = (month: number, field: string, currentValue: number) => {
    if (month > currentMonth && ['inbound', 'indicacao', 'prospeccao'].includes(field)) return;
    setInlineEditing({ month, field });
    setInlineValue(String(currentValue));
  };

  const commitInlineEdit = () => {
    if (!inlineEditing) return;
    const val = parseInt(inlineValue) || 0;
    setData(prev => prev.map((d, i) => {
      if (i !== inlineEditing.month) return d;
      return { ...d, [inlineEditing.field]: val };
    }));
    setInlineEditing(null);
  };

  // Modal
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

    setData(prev => prev.map((d, i) => {
      if (modalMonth !== 'all' && i !== modalMonth) return d;
      return { ...d, target: t, targetInbound: ib, targetIndicacao: ind, targetProspeccao: pr };
    }));
    setEditModalOpen(false);
  };

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

      {/* Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Meta (R$)</TableHead>
                <TableHead className="text-right">Inbound (R$)</TableHead>
                <TableHead className="text-right">Indicação (R$)</TableHead>
                <TableHead className="text-right">Prospecção Ativa (R$)</TableHead>
                <TableHead className="text-right">Total Realizado (R$)</TableHead>
                <TableHead className="text-right">Diferença (R$)</TableHead>
                <TableHead className="text-center">% Atingido</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d, i) => {
                const total = d.inbound + d.indicacao + d.prospeccao;
                const diff = total - d.target;
                const ating = pct(total, d.target);
                const isFuture = i > currentMonth;

                const renderCell = (field: string, value: number) => {
                  if (inlineEditing?.month === i && inlineEditing?.field === field) {
                    return (
                      <Input
                        type="number"
                        value={inlineValue}
                        onChange={e => setInlineValue(e.target.value)}
                        onBlur={commitInlineEdit}
                        onKeyDown={e => e.key === 'Enter' && commitInlineEdit()}
                        className="w-28 h-8 text-right text-sm"
                        autoFocus
                      />
                    );
                  }

                  if (isFuture && ['inbound', 'indicacao', 'prospeccao'].includes(field)) {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground cursor-not-allowed">—</span>
                        </TooltipTrigger>
                        <TooltipContent>Mês ainda não encerrado</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => startInlineEdit(i, field, value)}
                    >
                      {fmt(value)}
                    </span>
                  );
                };

                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{MONTH_NAMES[i]}</TableCell>
                    <TableCell className="text-right">{renderCell('target', d.target)}</TableCell>
                    <TableCell className="text-right">{renderCell('inbound', d.inbound)}</TableCell>
                    <TableCell className="text-right">{renderCell('indicacao', d.indicacao)}</TableCell>
                    <TableCell className="text-right">{renderCell('prospeccao', d.prospeccao)}</TableCell>
                    <TableCell className="text-right font-medium">{isFuture ? '—' : fmt(total)}</TableCell>
                    <TableCell className={`text-right font-medium ${getDiffColor(diff)}`}>
                      {isFuture ? '—' : (diff > 0 ? '+' : '') + fmt(diff)}
                    </TableCell>
                    <TableCell className="text-center">{isFuture ? '—' : getAtingimentoBadge(ating)}</TableCell>
                    <TableCell>
                      {!isFuture && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startInlineEdit(i, 'inbound', d.inbound)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{fmt(metaAnual)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.reduce((s, d) => s + d.inbound, 0))}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.reduce((s, d) => s + d.indicacao, 0))}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.reduce((s, d) => s + d.prospeccao, 0))}</TableCell>
                <TableCell className="text-right font-bold">{fmt(realizadoTotal)}</TableCell>
                <TableCell className={`text-right font-bold ${getDiffColor(realizadoTotal - metaAnual)}`}>
                  {(realizadoTotal - metaAnual > 0 ? '+' : '') + fmt(realizadoTotal - metaAnual)}
                </TableCell>
                <TableCell className="text-center">{getAtingimentoBadge(atingimento)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
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

      {/* Edit Modal */}
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
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
