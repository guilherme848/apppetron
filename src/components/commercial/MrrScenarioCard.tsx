import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MonthlyActuals } from '@/hooks/usePlatformData';

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
  colorClass: string;
  config: ScenarioConfig;
  clientesIniciais: number;
  ticketMedio: number;
  onConfigChange: (c: ScenarioConfig) => void;
  monthlyActuals: MonthlyActuals[];
  lastSavedAt?: Date | null;
  isBP?: boolean;
  bpLocked?: number[] | null;
  onLockBP?: () => void;
}

const currentMonth = new Date().getMonth();

export function calcScenarioMonths(clientesIniciais: number, ticketMedio: number, config: ScenarioConfig, realJanClientes?: number, realJanMrr?: number): ScenarioMonth[] {
  const months: ScenarioMonth[] = [];
  // Always start from real January if available
  const janClientes = realJanClientes ?? clientesIniciais;
  const janMrr = realJanMrr ?? (janClientes * ticketMedio);
  let clientes = janClientes;
  for (let i = 0; i < 12; i++) {
    if (i > 0) {
      const prev = months[i - 1].clientes;
      clientes = Math.round(prev - (prev * config.churnPct / 100) + config.adicaoMensal);
    }
    months.push({ month: i, clientes, churnPct: config.churnPct, adicao: config.adicaoMensal, mrr: i === 0 ? janMrr : clientes * ticketMedio });
  }
  return months;
}

/** Calculate "Nova Previsão" — uses real data for past months, then projects from most recent real */
function calcNovaPrevisao(
  monthlyActuals: MonthlyActuals[],
  ticketMedio: number,
  config: ScenarioConfig
): { mrr: number; clientes: number }[] {
  const result: { mrr: number; clientes: number }[] = [];
  for (let i = 0; i < 12; i++) {
    if (i < currentMonth) {
      // Past: use real
      result.push({ mrr: monthlyActuals[i]?.mrrAtMonth ?? 0, clientes: monthlyActuals[i]?.activeClientsAtMonth ?? 0 });
    } else if (i === currentMonth) {
      // Current: use real
      result.push({ mrr: monthlyActuals[i]?.mrrAtMonth ?? 0, clientes: monthlyActuals[i]?.activeClientsAtMonth ?? 0 });
    } else {
      // Future: project from previous
      const prev = result[i - 1];
      const newClientes = Math.round(prev.clientes - (prev.clientes * config.churnPct / 100) + config.adicaoMensal);
      result.push({ mrr: newClientes * ticketMedio, clientes: newClientes });
    }
  }
  return result;
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

const bgColorsLight: Record<string, string> = {
  red: 'bg-red-50/60 dark:bg-red-950/20',
  yellow: 'bg-yellow-50/60 dark:bg-yellow-950/20',
  green: 'bg-green-50/60 dark:bg-green-950/20',
};

function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) return null;
  const positive = diff > 0;
  return (
    <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${positive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
      {positive ? '+' : ''}{fmt(diff)}
    </span>
  );
}

export default function MrrScenarioCard({ label, emoji, colorClass, config, clientesIniciais, ticketMedio, onConfigChange, monthlyActuals, lastSavedAt, isBP, bpLocked, onLockBP }: MrrScenarioCardProps) {
  const realJanClientes = monthlyActuals[0]?.activeClientsAtMonth ?? clientesIniciais;
  const realJanMrr = monthlyActuals[0]?.mrrAtMonth ?? 0;
  const estimativa = useMemo(() => calcScenarioMonths(clientesIniciais, ticketMedio, config, realJanClientes, realJanMrr), [clientesIniciais, ticketMedio, config, realJanClientes, realJanMrr]);
  const novaPrevisao = useMemo(() => calcNovaPrevisao(monthlyActuals, ticketMedio, config), [monthlyActuals, ticketMedio, config]);

  // Summary card values
  const mrrJanReal = currentMonth >= 0 ? (monthlyActuals[0]?.mrrAtMonth ?? 0) : estimativa[0].mrr;
  const mrrAtual = monthlyActuals[currentMonth]?.mrrAtMonth ?? 0;
  const mrrDezPrevisao = novaPrevisao[11]?.mrr ?? 0;

  const crescimentoRealR = mrrAtual - mrrJanReal;
  const crescimentoRealPct = mrrJanReal > 0 ? Math.round((crescimentoRealR / mrrJanReal) * 100) : 0;

  const crescimentoProjR = mrrDezPrevisao - mrrAtual;
  const crescimentoProjPct = mrrAtual > 0 ? Math.round((crescimentoProjR / mrrAtual) * 100) : 0;

  const fatAcumuladoReal = monthlyActuals.filter((_, i) => i <= currentMonth).reduce((s, m) => s + m.mrrAtMonth, 0);
  const fatProjetadoRestante = novaPrevisao.filter((_, i) => i > currentMonth).reduce((s, m) => s + m.mrr, 0);
  const fatAnualTotal = fatAcumuladoReal + fatProjetadoRestante;

  const savedTimeStr = lastSavedAt ? lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <Card className={`border-l-4 ${borderColors[colorClass]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span>{emoji}</span> {label}
            {isBP && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none text-[10px] gap-1">
                <Pin className="h-3 w-3" /> BP Oficial
              </Badge>
            )}
          </CardTitle>
          {savedTimeStr && (
            <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              Salvo automaticamente · {savedTimeStr}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Churn + Inad (%)</Label>
            <Input type="number" value={config.churnPct} onChange={e => onConfigChange({ ...config, churnPct: Number(e.target.value) || 0 })} className="w-20 h-8 text-sm" step={0.5} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Adição Mensal</Label>
            <Input type="number" value={config.adicaoMensal} onChange={e => onConfigChange({ ...config, adicaoMensal: Number(e.target.value) || 0 })} className="w-20 h-8 text-sm" />
          </div>
        </div>
        {isBP && !bpLocked && onLockBP && (
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={onLockBP} className="text-xs">
              <Pin className="h-3 w-3 mr-1" /> Definir como BP do Ano
            </Button>
          </div>
        )}
        {isBP && bpLocked && (
          <p className="text-[11px] text-muted-foreground pt-1">🔒 BP congelado — os valores de referência não mudam ao alterar os inputs.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards — updated */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">MRR Jan (Real)</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(mrrJanReal)}</p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">MRR Atual</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(mrrAtual)}</p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">MRR Dez (Previsão)</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(mrrDezPrevisao)}</p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">Cresc. Real</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>
              {crescimentoRealR >= 0 ? '+' : ''}{fmt(crescimentoRealR)} ({crescimentoRealPct}%)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">Cresc. Projetado</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>
              {crescimentoProjR >= 0 ? '+' : ''}{fmt(crescimentoProjR)} ({crescimentoProjPct}%)
            </p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">Fat. Acum. Real</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(fatAcumuladoReal)}</p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">Fat. Proj. Restante</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(fatProjetadoRestante)}</p>
          </div>
          <div className={`rounded-md p-3 ${bgColors[colorClass]}`}>
            <p className="text-xs text-muted-foreground">Fat. Anual Total</p>
            <p className={`text-sm font-bold ${textColors[colorClass]}`}>{fmt(fatAnualTotal)}</p>
          </div>
        </div>

        {/* Table with 3 rows */}
        <TooltipProvider>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36"></TableHead>
                  {MONTHS.map((m, i) => (
                    <TableHead key={m} className={`text-center text-xs px-2 ${i === currentMonth ? 'border-b-2 border-orange-400' : ''}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        {i < currentMonth && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent><p>Mês encerrado — dados reais</p></TooltipContent>
                          </Tooltip>
                        )}
                        <span>{m}</span>
                        {i === currentMonth && (
                          <Badge className="text-[9px] px-1 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-none">Atual</Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Row 1 — Estimativa */}
                <TableRow className={bgColorsLight[colorClass]}>
                  <TableCell className={`text-xs font-medium ${textColors[colorClass]}`}>Estimativa MRR</TableCell>
                  {estimativa.map((m, i) => (
                    <TableCell key={i} className={`text-center text-xs px-2 ${i < currentMonth ? 'bg-muted/30' : ''} ${i === currentMonth ? 'bg-orange-50 dark:bg-orange-950/20' : ''} ${textColors[colorClass]}`}>
                      {(m.mrr / 1000).toFixed(0)}k
                    </TableCell>
                  ))}
                </TableRow>
                {/* Row 2 — Realizado */}
                <TableRow className={`border-l-2 ${borderColors[colorClass]}`}>
                  <TableCell className="text-xs font-medium">Realizado MRR</TableCell>
                  {MONTHS.map((_, i) => {
                    const isPastOrCurrent = i <= currentMonth;
                    const realMrr = isPastOrCurrent ? (monthlyActuals[i]?.mrrAtMonth ?? 0) : 0;
                    const estMrr = estimativa[i]?.mrr ?? 0;
                    const diff = realMrr - estMrr;
                    return (
                      <TableCell key={i} className={`text-center text-xs px-2 ${i < currentMonth ? 'bg-muted/30' : ''} ${i === currentMonth ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                        {isPastOrCurrent ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-semibold">{(realMrr / 1000).toFixed(0)}k</span>
                            <DiffBadge diff={diff} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {/* Row 3 — Nova Previsão */}
                <TableRow className="bg-blue-50/40 dark:bg-blue-950/10">
                  <TableCell className="text-xs font-medium text-blue-700 dark:text-blue-400">Nova Previsão</TableCell>
                  {novaPrevisao.map((m, i) => {
                    const isPast = i < currentMonth;
                    return (
                      <TableCell key={i} className={`text-center text-xs px-2 font-semibold text-blue-700 dark:text-blue-400 ${isPast ? 'bg-muted/30' : ''} ${i === currentMonth ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                        {i <= currentMonth ? (
                          // Past/current: same as realizado
                          (m.mrr / 1000).toFixed(0) + 'k'
                        ) : (
                          (m.mrr / 1000).toFixed(0) + 'k'
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {/* Clientes row */}
                <TableRow>
                  <TableCell className="text-xs font-medium">Clientes ativos</TableCell>
                  {MONTHS.map((_, i) => {
                    const isPastOrCurrent = i <= currentMonth;
                    const real = isPastOrCurrent ? (monthlyActuals[i]?.activeClientsAtMonth ?? 0) : null;
                    const est = estimativa[i]?.clientes ?? 0;
                    return (
                      <TableCell key={i} className={`text-center text-xs px-2 ${i < currentMonth ? 'bg-muted/30' : ''} ${i === currentMonth ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                        {isPastOrCurrent ? (
                          <span className="font-semibold">{real}</span>
                        ) : (
                          <span className="text-muted-foreground">{est}</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
