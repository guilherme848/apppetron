import { useState, useMemo } from 'react';
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
import { Plus } from 'lucide-react';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

function getAtingimentoBadge(p: number) {
  if (p >= 100) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{p}%</Badge>;
  if (p >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{p}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{p}%</Badge>;
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
}

export default function MonthDetailTab({ data, onDataChange, readOnly }: MonthDetailTabProps) {
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);

  // Modal state
  const [mQtyInbound, setMQtyInbound] = useState('0');
  const [mValInbound, setMValInbound] = useState('0');
  const [mQtyIndicacao, setMQtyIndicacao] = useState('0');
  const [mValIndicacao, setMValIndicacao] = useState('0');
  const [mQtyProspeccao, setMQtyProspeccao] = useState('0');
  const [mValProspeccao, setMValProspeccao] = useState('0');
  const [mChurnQty, setMChurnQty] = useState('0');

  const d = data[selectedMonth];

  const totalRealizado = d.inbound + d.indicacao + d.prospeccao;
  const mrrLiquido = useMemo(() => {
    const inV = parseInt(mValInbound) || 0;
    const indV = parseInt(mValIndicacao) || 0;
    const prV = parseInt(mValProspeccao) || 0;
    return inV + indV + prV;
  }, [mValInbound, mValIndicacao, mValProspeccao]);

  const isFuture = selectedMonth > currentMonth;

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

  // Chart data for the selected month
  const monthChartData = useMemo(() => [
    { canal: 'Inbound', meta: d.targetInbound, realizado: d.inbound },
    { canal: 'Indicação', meta: d.targetIndicacao, realizado: d.indicacao },
    { canal: 'Prospecção', meta: d.targetProspeccao, realizado: d.prospeccao },
  ], [d]);

  const chartConfig = {
    meta: { label: 'Meta', color: 'hsl(201 30% 21%)' },
    realizado: { label: 'Realizado', color: 'hsl(21 90% 57%)' },
  };

  // Channels for meta panel
  const channels = [
    { label: 'Inbound', target: d.targetInbound, realized: d.inbound },
    { label: 'Indicação', target: d.targetIndicacao, realized: d.indicacao },
    { label: 'Prospecção Ativa', target: d.targetProspeccao, realized: d.prospeccao },
  ];

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-4">
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
        {isFuture && (
          <span className="text-sm text-muted-foreground">Mês futuro — somente metas visíveis</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meta Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Metas por Canal — {MONTH_NAMES[selectedMonth]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm font-medium border-b pb-2">
              <span>Meta Total</span>
              <span>{fmt(d.target)}</span>
            </div>
            {channels.map(ch => (
              <div key={ch.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{ch.label}</span>
                <span>{fmt(ch.target)} <span className="text-xs text-muted-foreground">({pct(ch.target, d.target)}%)</span></span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Realizado Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Realizado — {MONTH_NAMES[selectedMonth]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isFuture ? (
              <p className="text-sm text-muted-foreground">Dados disponíveis após o encerramento do mês.</p>
            ) : (
              <>
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
                  <span className="font-medium">{d.qtyInbound + d.qtyIndicacao + d.qtyProspeccao}</span>
                </div>
                {channels.map(ch => (
                  <div key={ch.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground pl-3">↳ {ch.label}</span>
                    <span>{fmt(ch.realized)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Churn do mês</span>
                  <span className="text-destructive">{d.churnQty} clientes</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meta x Realizado — {MONTH_NAMES[selectedMonth]}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Meta (R$)</TableHead>
                <TableHead className="text-right">Realizado (R$)</TableHead>
                <TableHead className="text-right">Diferença (R$)</TableHead>
                <TableHead className="text-center">% Atingido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map(ch => {
                const diff = ch.realized - ch.target;
                const ating = pct(ch.realized, ch.target);
                return (
                  <TableRow key={ch.label}>
                    <TableCell className="font-medium">{ch.label}</TableCell>
                    <TableCell className="text-right">{fmt(ch.target)}</TableCell>
                    <TableCell className="text-right">{isFuture ? '—' : fmt(ch.realized)}</TableCell>
                    <TableCell className={`text-right ${getDiffColor(diff)}`}>
                      {isFuture ? '—' : (diff > 0 ? '+' : '') + fmt(diff)}
                    </TableCell>
                    <TableCell className="text-center">{isFuture ? '—' : getAtingimentoBadge(ating)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{fmt(d.target)}</TableCell>
                <TableCell className="text-right font-bold">{isFuture ? '—' : fmt(totalRealizado)}</TableCell>
                <TableCell className={`text-right font-bold ${getDiffColor(totalRealizado - d.target)}`}>
                  {isFuture ? '—' : (totalRealizado - d.target > 0 ? '+' : '') + fmt(totalRealizado - d.target)}
                </TableCell>
                <TableCell className="text-center">{isFuture ? '—' : getAtingimentoBadge(pct(totalRealizado, d.target))}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Mini Chart */}
      {!isFuture && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Meta x Realizado por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={monthChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="canal" className="text-xs" />
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
                <Bar dataKey="meta" name="Meta" fill="hsl(201 30% 21%)" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(21 90% 57%)" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ChartContainer>
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
