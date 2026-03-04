import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

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

/* ─── tiny inline input ─── */
function InlineInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <Input
      type="number"
      value={value}
      onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      disabled={disabled}
      className="h-7 w-14 text-xs text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      min={0}
    />
  );
}

/* ─── sticky label cell ─── */
const stickyLabelCls = 'sticky left-0 z-10 bg-background text-xs font-medium whitespace-nowrap px-3 py-1.5 border-r';
const cellCls = 'text-center text-xs px-2 py-1.5 whitespace-nowrap';
const groupHeaderCls = 'sticky left-0 z-10 bg-muted/60 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 border-r';

export default function MonthDetailTab({ data, onDataChange, readOnly, bpAdicaoMensal = 0, ticketMedio = 0, year = new Date().getFullYear() }: MonthDetailTabProps) {
  const currentMonth = new Date().getMonth();
  const [channelPlans, setChannelPlans] = useState<Record<string, ChannelPlan>>(loadChannelPlans);
  const [planSavedAt, setPlanSavedAt] = useState<Date | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(CHANNEL_PLAN_KEY, JSON.stringify(channelPlans));
      setPlanSavedAt(new Date());
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [channelPlans]);

  const getPlan = (i: number): ChannelPlan => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    return channelPlans[key] || { inbound: 0, indicacao: 0, outbound: 0 };
  };

  const setPlanMonth = (i: number, partial: Partial<ChannelPlan>) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    setChannelPlans(prev => ({ ...prev, [key]: { ...getPlan(i), ...partial } }));
  };

  // Totals
  const totals = useMemo(() => {
    let bpTotal = 0, bpMrr = 0;
    let planTotal = 0, planMrr = 0;
    let realTotal = 0, realMrr = 0;
    for (let i = 0; i < 12; i++) {
      bpTotal += bpAdicaoMensal;
      bpMrr += bpAdicaoMensal * ticketMedio;
      const p = getPlan(i);
      const pt = p.inbound + p.indicacao + p.outbound;
      planTotal += pt;
      planMrr += pt * ticketMedio;
      const isPastOrCurrent = i <= currentMonth;
      if (isPastOrCurrent) {
        const d = data[i];
        realTotal += d.qtyInbound + d.qtyIndicacao + d.qtyProspeccao;
        realMrr += d.inbound + d.indicacao + d.prospeccao;
      }
    }
    return { bpTotal, bpMrr, planTotal, planMrr, realTotal, realMrr, gapContracts: realTotal - bpTotal, gapMrr: realMrr - bpMrr };
  }, [data, channelPlans, bpAdicaoMensal, ticketMedio, currentMonth]);

  const savedTimeStr = planSavedAt ? planSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  // Column background per month
  const colBg = (i: number) => {
    if (i < currentMonth) return 'bg-muted/30';
    if (i === currentMonth) return 'bg-orange-50/60 dark:bg-orange-950/10';
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-semibold text-foreground">Planejamento Anual de Aquisição por Canal</h3>
        {savedTimeStr && (
          <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
            Salvo automaticamente · {savedTimeStr}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {/* HEADER */}
                <thead className="sticky top-0 z-20 bg-background border-b">
                  <tr>
                    <th className={`${groupHeaderCls} min-w-[180px]`}></th>
                    {MONTHS.map((m, i) => (
                      <th key={m} className={`text-center text-xs px-2 py-2 min-w-[72px] ${colBg(i)} ${i === currentMonth ? 'border-t-2 border-t-orange-400' : ''}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          {i < currentMonth && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent><p>Mês encerrado — dados reais</p></TooltipContent>
                            </Tooltip>
                          )}
                          <span className="font-semibold">{m}</span>
                          {i === currentMonth && (
                            <Badge className="text-[8px] px-1 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-none leading-tight">Atual</Badge>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="text-center text-xs px-3 py-2 min-w-[80px] bg-muted/40 font-semibold">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {/* ═══ GROUP 1: BP ═══ */}
                  <tr className="bg-muted/40">
                    <td colSpan={14} className={groupHeaderCls}>📌 BP (Cenário Bom)</td>
                  </tr>
                  {/* BP Adições totais — read-only from meta */}
                  <GroupRow label="Adições totais" months={MONTHS.map(() => bpAdicaoMensal)} total={totals.bpTotal} colBg={colBg} currentMonth={currentMonth} bold />
                  {/* Channel split — editable: user defines how to reach the total */}
                  <EditableRow
                    label="Inbound"
                    getVal={i => getPlan(i).inbound}
                    setVal={(i, v) => setPlanMonth(i, { inbound: v })}
                    currentMonth={currentMonth}
                    colBg={colBg}
                    total={Array.from({ length: 12 }, (_, i) => getPlan(i).inbound).reduce((a, b) => a + b, 0)}
                  />
                  <EditableRow
                    label="Indicação"
                    getVal={i => getPlan(i).indicacao}
                    setVal={(i, v) => setPlanMonth(i, { indicacao: v })}
                    currentMonth={currentMonth}
                    colBg={colBg}
                    total={Array.from({ length: 12 }, (_, i) => getPlan(i).indicacao).reduce((a, b) => a + b, 0)}
                  />
                  <EditableRow
                    label="Outbound"
                    getVal={i => getPlan(i).outbound}
                    setVal={(i, v) => setPlanMonth(i, { outbound: v })}
                    currentMonth={currentMonth}
                    colBg={colBg}
                    total={Array.from({ length: 12 }, (_, i) => getPlan(i).outbound).reduce((a, b) => a + b, 0)}
                  />
                  {/* Validation row — sum vs BP */}
                  <tr>
                    <td className={`${stickyLabelCls} text-muted-foreground pl-6 text-[11px]`}>Soma canais</td>
                    {MONTHS.map((_, i) => {
                      const p = getPlan(i);
                      const sum = p.inbound + p.indicacao + p.outbound;
                      const diff = sum - bpAdicaoMensal;
                      return (
                        <td key={i} className={`${cellCls} ${colBg(i)} text-[11px] font-medium ${getDiffColor(diff)}`}>
                          {sum}{diff !== 0 && ` (${diff > 0 ? '+' : ''}${diff})`}
                        </td>
                      );
                    })}
                    <td className={`${cellCls} bg-muted/40 text-[11px] font-semibold ${getDiffColor(totals.planTotal - totals.bpTotal)}`}>
                      {totals.planTotal}
                    </td>
                  </tr>
                  <GroupRow label="MRR Gerado" months={MONTHS.map(() => bpAdicaoMensal * ticketMedio)} total={totals.bpMrr} colBg={colBg} currentMonth={currentMonth} isCurrency />

                  {/* ═══ GROUP 3: REALIZADO ═══ */}
                  <tr className="bg-orange-50/40 dark:bg-orange-950/10">
                    <td colSpan={14} className={`${groupHeaderCls} bg-orange-50/40 dark:bg-orange-950/10`}>✅ Realizado</td>
                  </tr>
                  <RealRow label="Inbound" data={data} field="qtyInbound" currentMonth={currentMonth} colBg={colBg} />
                  <RealRow label="Indicação" data={data} field="qtyIndicacao" currentMonth={currentMonth} colBg={colBg} />
                  <RealRow label="Outbound" data={data} field="qtyProspeccao" currentMonth={currentMonth} colBg={colBg} />
                  <RealRow label="Total contratos" data={data} field="totalQty" currentMonth={currentMonth} colBg={colBg} bold />
                  <RealMrrRow label="MRR Realizado" data={data} currentMonth={currentMonth} colBg={colBg} bold />

                  {/* ═══ GROUP 4: GAP vs BP ═══ */}
                  <tr className="bg-muted/20">
                    <td colSpan={14} className={`${groupHeaderCls} bg-muted/20`}>📊 Gap vs BP</td>
                  </tr>
                  <GapRow
                    label="Gap Adições"
                    data={data}
                    bpVal={bpAdicaoMensal}
                    currentMonth={currentMonth}
                    colBg={colBg}
                    totalReal={totals.realTotal}
                    totalBp={totals.bpTotal}
                  />
                  <GapMrrRow
                    label="Gap MRR"
                    data={data}
                    bpMrr={bpAdicaoMensal * ticketMedio}
                    currentMonth={currentMonth}
                    colBg={colBg}
                    totalRealMrr={totals.realMrr}
                    totalBpMrr={totals.bpMrr}
                  />
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Helper row components ─── */

function GroupRow({ label, months, total, colBg, currentMonth, isCurrency, bold, muted }: {
  label: string; months: number[]; total: number; colBg: (i: number) => string; currentMonth: number; isCurrency?: boolean; bold?: boolean; muted?: boolean;
}) {
  const format = (v: number) => isCurrency ? fmt(v) : String(v);
  return (
    <tr>
      <td className={`${stickyLabelCls} ${muted ? 'text-muted-foreground pl-6' : ''} ${bold ? 'font-semibold' : ''}`}>{label}</td>
      {months.map((v, i) => (
        <td key={i} className={`${cellCls} ${colBg(i)} ${bold ? 'font-semibold' : ''}`}>{format(v)}</td>
      ))}
      <td className={`${cellCls} bg-muted/40 ${bold ? 'font-bold' : 'font-semibold'}`}>{format(total)}</td>
    </tr>
  );
}

function EditableRow({ label, getVal, setVal, currentMonth, colBg, total }: {
  label: string; getVal: (i: number) => number; setVal: (i: number, v: number) => void; currentMonth: number; colBg: (i: number) => string; total: number;
}) {
  return (
    <tr>
      <td className={`${stickyLabelCls} text-muted-foreground pl-6`}>↳ {label}</td>
      {MONTHS.map((_, i) => {
        const isPast = i < currentMonth;
        return (
          <td key={i} className={`${cellCls} ${colBg(i)}`}>
            {isPast ? (
              <span className="text-muted-foreground">{getVal(i)}</span>
            ) : (
              <InlineInput value={getVal(i)} onChange={v => setVal(i, v)} />
            )}
          </td>
        );
      })}
      <td className={`${cellCls} bg-muted/40 font-semibold`}>{total}</td>
    </tr>
  );
}

function RealRow({ label, data, field, currentMonth, colBg, bold }: {
  label: string; data: MonthData[]; field: string; currentMonth: number; colBg: (i: number) => string; bold?: boolean;
}) {
  const getVal = (d: MonthData) => {
    if (field === 'totalQty') return d.qtyInbound + d.qtyIndicacao + d.qtyProspeccao;
    return (d as any)[field] as number;
  };
  const total = data.filter((_, i) => i <= currentMonth).reduce((s, d) => s + getVal(d), 0);
  return (
    <tr>
      <td className={`${stickyLabelCls} ${bold ? 'font-semibold' : 'text-muted-foreground pl-6'}`}>{bold ? label : `↳ ${label}`}</td>
      {data.map((d, i) => (
        <td key={i} className={`${cellCls} ${colBg(i)} ${bold ? 'font-semibold' : ''}`}>
          {i <= currentMonth ? getVal(d) : '—'}
        </td>
      ))}
      <td className={`${cellCls} bg-muted/40 ${bold ? 'font-bold' : 'font-semibold'}`}>{total}</td>
    </tr>
  );
}

function RealMrrRow({ label, data, currentMonth, colBg, bold }: {
  label: string; data: MonthData[]; currentMonth: number; colBg: (i: number) => string; bold?: boolean;
}) {
  const getVal = (d: MonthData) => d.inbound + d.indicacao + d.prospeccao;
  const total = data.filter((_, i) => i <= currentMonth).reduce((s, d) => s + getVal(d), 0);
  return (
    <tr>
      <td className={`${stickyLabelCls} ${bold ? 'font-semibold' : ''}`}>{label}</td>
      {data.map((d, i) => (
        <td key={i} className={`${cellCls} ${colBg(i)} ${bold ? 'font-semibold' : ''}`}>
          {i <= currentMonth ? fmt(getVal(d)) : '—'}
        </td>
      ))}
      <td className={`${cellCls} bg-muted/40 font-bold`}>{fmt(total)}</td>
    </tr>
  );
}

function GapRow({ label, data, bpVal, currentMonth, colBg, totalReal, totalBp }: {
  label: string; data: MonthData[]; bpVal: number; currentMonth: number; colBg: (i: number) => string; totalReal: number; totalBp: number;
}) {
  const gap = totalReal - totalBp;
  return (
    <tr>
      <td className={`${stickyLabelCls} font-semibold`}>{label}</td>
      {data.map((d, i) => {
        if (i > currentMonth) return <td key={i} className={`${cellCls} ${colBg(i)}`}>—</td>;
        const real = d.qtyInbound + d.qtyIndicacao + d.qtyProspeccao;
        const g = real - bpVal;
        return (
          <td key={i} className={`${cellCls} ${colBg(i)} font-semibold ${getDiffColor(g)}`}>
            {g >= 0 ? '+' : ''}{g}
          </td>
        );
      })}
      <td className={`${cellCls} bg-muted/40 font-bold ${getDiffColor(gap)}`}>{gap >= 0 ? '+' : ''}{gap}</td>
    </tr>
  );
}

function GapMrrRow({ label, data, bpMrr, currentMonth, colBg, totalRealMrr, totalBpMrr }: {
  label: string; data: MonthData[]; bpMrr: number; currentMonth: number; colBg: (i: number) => string; totalRealMrr: number; totalBpMrr: number;
}) {
  const gap = totalRealMrr - totalBpMrr;
  return (
    <tr>
      <td className={`${stickyLabelCls} font-semibold`}>{label}</td>
      {data.map((d, i) => {
        if (i > currentMonth) return <td key={i} className={`${cellCls} ${colBg(i)}`}>—</td>;
        const real = d.inbound + d.indicacao + d.prospeccao;
        const g = real - bpMrr;
        return (
          <td key={i} className={`${cellCls} ${colBg(i)} font-semibold ${getDiffColor(g)}`}>
            {g >= 0 ? '+' : ''}{fmt(g)}
          </td>
        );
      })}
      <td className={`${cellCls} bg-muted/40 font-bold ${getDiffColor(gap)}`}>{gap >= 0 ? '+' : ''}{fmt(gap)}</td>
    </tr>
  );
}
