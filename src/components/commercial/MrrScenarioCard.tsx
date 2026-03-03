import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

export interface ScenarioConfig {
  churnPct: number;
  adicaoMensal: number;
}

export interface ScenarioMonth {
  month: number;
  clientes: number;
  churnPct: number;
  adicao: number;
  mrr: number;
}

interface MrrScenarioCardProps {
  label: string;
  emoji: string;
  colorClass: string; // e.g. 'red', 'yellow', 'green'
  config: ScenarioConfig;
  clientesIniciais: number;
  ticketMedio: number;
  onConfigChange: (c: ScenarioConfig) => void;
}

export function calcScenarioMonths(clientesIniciais: number, ticketMedio: number, config: ScenarioConfig): ScenarioMonth[] {
  const months: ScenarioMonth[] = [];
  let clientes = clientesIniciais;
  for (let i = 0; i < 12; i++) {
    if (i > 0) {
      const prev = months[i - 1].clientes;
      clientes = Math.round(prev - (prev * config.churnPct / 100) + config.adicaoMensal);
    }
    months.push({
      month: i,
      clientes,
      churnPct: config.churnPct,
      adicao: config.adicaoMensal,
      mrr: clientes * ticketMedio,
    });
  }
  return months;
}

const borderColors: Record<string, string> = {
  red: 'border-l-red-500',
  yellow: 'border-l-yellow-500',
  green: 'border-l-green-500',
};

const bgColors: Record<string, string> = {
  red: 'bg-red-50 dark:bg-red-950/30',
  yellow: 'bg-yellow-50 dark:bg-yellow-950/30',
  green: 'bg-green-50 dark:bg-green-950/30',
};

const textColors: Record<string, string> = {
  red: 'text-red-700 dark:text-red-400',
  yellow: 'text-yellow-700 dark:text-yellow-400',
  green: 'text-green-700 dark:text-green-400',
};

export default function MrrScenarioCard({ label, emoji, colorClass, config, clientesIniciais, ticketMedio, onConfigChange }: MrrScenarioCardProps) {
  const months = useMemo(() => calcScenarioMonths(clientesIniciais, ticketMedio, config), [clientesIniciais, ticketMedio, config]);

  const mrrJan = months[0].mrr;
  const mrrDez = months[11].mrr;
  const crescimentoR = mrrDez - mrrJan;
  const crescimentoPct = mrrJan > 0 ? Math.round((crescimentoR / mrrJan) * 100) : 0;
  const fatAnual = months.reduce((s, m) => s + m.mrr, 0);

  return (
    <Card className={`border-l-4 ${borderColors[colorClass]}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>{emoji}</span> {label}
        </CardTitle>
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Churn + Inad (%)</Label>
            <Input
              type="number"
              value={config.churnPct}
              onChange={e => onConfigChange({ ...config, churnPct: Number(e.target.value) || 0 })}
              className="w-20 h-8 text-sm"
              step={0.5}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Adição Mensal</Label>
            <Input
              type="number"
              value={config.adicaoMensal}
              onChange={e => onConfigChange({ ...config, adicaoMensal: Number(e.target.value) || 0 })}
              className="w-20 h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">MRR Jan</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(mrrJan)}</p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">MRR Dez</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(mrrDez)}</p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">Crescimento</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>
              {crescimentoR >= 0 ? '+' : ''}{fmt(crescimentoR)} ({crescimentoPct}%)
            </p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">Fat. Anual</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(fatAnual)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40"></TableHead>
                {MONTHS.map(m => <TableHead key={m} className="text-center text-xs px-2">{m}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs font-medium">Clientes ativos</TableCell>
                {months.map(m => <TableCell key={m.month} className="text-center text-xs px-2">{m.clientes}</TableCell>)}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Churn + Inad (%)</TableCell>
                {months.map(m => <TableCell key={m.month} className="text-center text-xs px-2">{m.churnPct}%</TableCell>)}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Adição do mês</TableCell>
                {months.map(m => <TableCell key={m.month} className="text-center text-xs px-2">{m.month === 0 ? '—' : m.adicao}</TableCell>)}
              </TableRow>
              <TableRow className={bgColors[colorClass]}>
                <TableCell className={`text-xs font-bold ${textColors[colorClass]}`}>Estimativa MRR</TableCell>
                {months.map(m => (
                  <TableCell key={m.month} className={`text-center text-xs font-bold px-2 ${textColors[colorClass]}`}>
                    {(m.mrr / 1000).toFixed(0)}k
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
