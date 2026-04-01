import { useState, useCallback, useEffect, useMemo } from 'react';
import { Calculator, RotateCcw, ArrowUp, ArrowDown, Minus, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSalesFunnel } from '@/hooks/useSalesFunnel';
import { useFunnelMetaMetrics } from '@/hooks/useFunnelMetaMetrics';
import { useMetaAds } from '@/hooks/useMetaAds';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
interface SimState {
  investimento: number;
  leads: number;
  mql: number;
  agendamentos: number;
  reunioes: number;
  vendas: number;
  ticketMedio: number;
}

interface RealState extends SimState {}

/* ─── Helpers ─── */
const safe = (a: number, b: number) => (b === 0 ? 0 : a / b);
const pct = (a: number, b: number) => safe(a, b) * 100;

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
function fmtInt(v: number) {
  return Math.round(v).toLocaleString('pt-BR');
}
function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

function variationPct(sim: number, real: number) {
  if (real === 0) return sim === 0 ? 0 : 100;
  return ((sim - real) / Math.abs(real)) * 100;
}

/* ─── Variation indicator ─── */
function VariationBadge({ sim, real, isCost }: { sim: number; real: number; isCost?: boolean }) {
  const diff = variationPct(sim, real);
  if (Math.abs(diff) < 0.5) {
    return <span className="inline-flex items-center gap-0.5 text-[13px] text-muted-foreground"><Minus className="h-3 w-3" /> 0%</span>;
  }
  const isUp = diff > 0;
  // For costs, down is good; for volume/revenue, up is good
  const isGood = isCost ? !isUp : isUp;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[13px] font-medium', isGood ? 'text-success' : 'text-destructive')}>
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(diff).toFixed(1)}%
    </span>
  );
}

/* ─── Editable numeric input ─── */
function NumInput({
  value,
  onChange,
  prefix,
  suffix,
  isInteger,
  wasEdited,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  isInteger?: boolean;
  wasEdited?: boolean;
}) {
  const [local, setLocal] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setLocal(isInteger ? Math.round(value).toString() : value.toFixed(2));
    }
  }, [value, focused, isInteger]);

  return (
    <div
      className={cn(
        'flex items-center gap-1 h-[42px] rounded-lg border px-3 font-mono text-sm transition-all duration-150',
        'bg-surface border-border',
        wasEdited && 'bg-primary/5',
        focused && 'border-primary ring-[3px] ring-primary/10',
      )}
    >
      {prefix && <span className="text-muted-foreground text-xs shrink-0">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        className="w-full bg-transparent outline-none text-foreground font-mono"
        value={focused ? local : (isInteger ? fmtInt(value) : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const parsed = parseFloat(local.replace(/\./g, '').replace(',', '.'));
          if (!isNaN(parsed)) onChange(parsed);
        }}
        onChange={(e) => setLocal(e.target.value)}
      />
      {suffix && <span className="text-muted-foreground text-xs shrink-0">{suffix}</span>}
    </div>
  );
}

/* ─── Calculated field (read-only) ─── */
function CalcField({ value, prefix, suffix }: { value: string; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-1 h-[42px] px-3 font-mono text-sm text-foreground">
      {prefix && <span className="text-muted-foreground text-xs">{prefix}</span>}
      <span>{value}</span>
      {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
    </div>
  );
}

/* ─── Main Page ─── */
export default function MatemarketingPage() {
  const { actuals, clientMetrics, loading: funnelLoading, filters } = useSalesFunnel('inbound');
  const { adAccounts } = useMetaAds();

  const STORAGE_KEY = 'funnel_selected_ad_accounts';
  const [selectedAdAccountIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const { metrics: metaMetrics, loading: metaLoading } = useFunnelMetaMetrics(filters.year, selectedAdAccountIds);

  // Build month options for the current year
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(filters.year, i, 1);
      return { value: i, label: format(d, 'MMMM yyyy', { locale: ptBR }) };
    });
  }, [filters.year]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Build real data from actuals + metaMetrics + clientMetrics
  const realData = useMemo((): RealState => {
    const monthStr = format(startOfMonth(new Date(filters.year, selectedMonth, 1)), 'yyyy-MM-dd');
    const actual = actuals.find((a) => a.month === monthStr);
    const cm = clientMetrics.find((m) => m.month === selectedMonth);
    const meta = metaMetrics.find((m) => m.month === monthStr);

    return {
      investimento: meta?.investment ?? actual?.investment_actual ?? 0,
      leads: meta?.leads ?? actual?.leads_actual ?? 0,
      mql: actual?.mql_actual ?? 0,
      agendamentos: actual?.appointments_actual ?? 0,
      reunioes: actual?.meetings_held_actual ?? 0,
      vendas: cm?.sales_count ?? actual?.sales_actual ?? 0,
      ticketMedio: cm ? (cm.sales_count > 0 ? cm.total_revenue / cm.sales_count : 0) : actual?.avg_ticket_actual ?? 0,
    };
  }, [actuals, clientMetrics, metaMetrics, selectedMonth, filters.year]);

  // Sim state
  const [sim, setSim] = useState<SimState>({ ...realData });
  const [editedFields, setEditedFields] = useState<Set<keyof SimState>>(new Set());

  // Reset sim when real data or month changes
  useEffect(() => {
    setSim({ ...realData });
    setEditedFields(new Set());
  }, [realData]);

  const updateSim = useCallback((field: keyof SimState, value: number) => {
    setSim((prev) => ({ ...prev, [field]: value }));
    setEditedFields((prev) => new Set(prev).add(field));
  }, []);

  const resetToReal = () => {
    setSim({ ...realData });
    setEditedFields(new Set());
  };

  // Derived calculated values
  const cpl = safe(sim.investimento, sim.leads);
  const txQualif = pct(sim.mql, sim.leads);
  const cpmql = safe(sim.investimento, sim.mql);
  const txAgend = pct(sim.agendamentos, sim.mql);
  const txCompar = pct(sim.reunioes, sim.agendamentos);
  const custoCompar = safe(sim.investimento, sim.reunioes);
  const txConv = pct(sim.vendas, sim.reunioes);
  const cac = safe(sim.investimento, sim.vendas);
  const receita = sim.vendas * sim.ticketMedio;
  const roi = safe(receita - sim.investimento, sim.investimento) * 100;

  // Real derived
  const realCpl = safe(realData.investimento, realData.leads);
  const realCpmql = safe(realData.investimento, realData.mql);
  const realCustoCompar = safe(realData.investimento, realData.reunioes);
  const realCac = safe(realData.investimento, realData.vendas);
  const realReceita = realData.vendas * realData.ticketMedio;
  const realRoi = safe(realReceita - realData.investimento, realData.investimento) * 100;

  // Bidirectional rate handlers
  const handleTxQualif = (v: number) => {
    const newMql = Math.round((v / 100) * sim.leads);
    setSim((p) => ({ ...p, mql: newMql }));
    setEditedFields((p) => new Set(p).add('mql'));
  };
  const handleTxAgend = (v: number) => {
    const newAgend = Math.round((v / 100) * sim.mql);
    setSim((p) => ({ ...p, agendamentos: newAgend }));
    setEditedFields((p) => new Set(p).add('agendamentos'));
  };
  const handleTxCompar = (v: number) => {
    const newReun = Math.round((v / 100) * sim.agendamentos);
    setSim((p) => ({ ...p, reunioes: newReun }));
    setEditedFields((p) => new Set(p).add('reunioes'));
  };
  const handleTxConv = (v: number) => {
    const newVendas = Math.round((v / 100) * sim.reunioes);
    setSim((p) => ({ ...p, vendas: newVendas }));
    setEditedFields((p) => new Set(p).add('vendas'));
  };

  const isLoading = funnelLoading || metaLoading;

  // Benchmarks
  const benchmarks: Record<string, number> = {
    txAgend: 40,
    txCompar: 80,
    txConv: 30,
  };

  function BenchLabel({ benchKey, simValue }: { benchKey: string; simValue: number }) {
    const bench = benchmarks[benchKey];
    if (!bench) return null;
    const isBelow = simValue < bench;
    return (
      <span className={cn('text-[11px]', isBelow ? 'text-destructive' : 'text-success')}>
        Bench: {bench}%
      </span>
    );
  }

  type MetricRow = {
    label: string;
    benchKey?: string;
    realValue: string;
    simContent: React.ReactNode;
    variationSim: number;
    variationReal: number;
    isCost?: boolean;
  };

  const metrics: MetricRow[] = [
    {
      label: 'Investimento',
      realValue: fmtBRL(realData.investimento),
      simContent: <NumInput value={sim.investimento} onChange={(v) => updateSim('investimento', v)} prefix="R$" wasEdited={editedFields.has('investimento')} />,
      variationSim: sim.investimento, variationReal: realData.investimento, isCost: true,
    },
    {
      label: 'Leads',
      realValue: fmtInt(realData.leads),
      simContent: <NumInput value={sim.leads} onChange={(v) => updateSim('leads', v)} isInteger wasEdited={editedFields.has('leads')} />,
      variationSim: sim.leads, variationReal: realData.leads,
    },
    {
      label: 'CPL',
      realValue: fmtBRL(realCpl),
      simContent: <CalcField value={fmtBRL(cpl)} />,
      variationSim: cpl, variationReal: realCpl, isCost: true,
    },
    {
      label: 'MQL',
      realValue: fmtInt(realData.mql),
      simContent: <NumInput value={sim.mql} onChange={(v) => updateSim('mql', v)} isInteger wasEdited={editedFields.has('mql')} />,
      variationSim: sim.mql, variationReal: realData.mql,
    },
    {
      label: 'Tx Qualificação',
      realValue: fmtPct(pct(realData.mql, realData.leads)),
      simContent: <NumInput value={txQualif} onChange={handleTxQualif} suffix="%" wasEdited={editedFields.has('mql')} />,
      variationSim: txQualif, variationReal: pct(realData.mql, realData.leads),
    },
    {
      label: 'CPMQL',
      realValue: fmtBRL(realCpmql),
      simContent: <CalcField value={fmtBRL(cpmql)} />,
      variationSim: cpmql, variationReal: realCpmql, isCost: true,
    },
    {
      label: 'Agendamentos',
      realValue: fmtInt(realData.agendamentos),
      simContent: <NumInput value={sim.agendamentos} onChange={(v) => updateSim('agendamentos', v)} isInteger wasEdited={editedFields.has('agendamentos')} />,
      variationSim: sim.agendamentos, variationReal: realData.agendamentos,
    },
    {
      label: 'Tx Agendamento',
      benchKey: 'txAgend',
      realValue: fmtPct(pct(realData.agendamentos, realData.mql)),
      simContent: <NumInput value={txAgend} onChange={handleTxAgend} suffix="%" wasEdited={editedFields.has('agendamentos')} />,
      variationSim: txAgend, variationReal: pct(realData.agendamentos, realData.mql),
    },
    {
      label: 'Reuniões',
      realValue: fmtInt(realData.reunioes),
      simContent: <NumInput value={sim.reunioes} onChange={(v) => updateSim('reunioes', v)} isInteger wasEdited={editedFields.has('reunioes')} />,
      variationSim: sim.reunioes, variationReal: realData.reunioes,
    },
    {
      label: 'Tx Comparecimento',
      benchKey: 'txCompar',
      realValue: fmtPct(pct(realData.reunioes, realData.agendamentos)),
      simContent: <NumInput value={txCompar} onChange={handleTxCompar} suffix="%" wasEdited={editedFields.has('reunioes')} />,
      variationSim: txCompar, variationReal: pct(realData.reunioes, realData.agendamentos),
    },
    {
      label: 'Custo por Comparecimento',
      realValue: fmtBRL(realCustoCompar),
      simContent: <CalcField value={fmtBRL(custoCompar)} />,
      variationSim: custoCompar, variationReal: realCustoCompar, isCost: true,
    },
    {
      label: 'Vendas',
      realValue: fmtInt(realData.vendas),
      simContent: <NumInput value={sim.vendas} onChange={(v) => updateSim('vendas', v)} isInteger wasEdited={editedFields.has('vendas')} />,
      variationSim: sim.vendas, variationReal: realData.vendas,
    },
    {
      label: 'Tx Conversão',
      benchKey: 'txConv',
      realValue: fmtPct(pct(realData.vendas, realData.reunioes)),
      simContent: <NumInput value={txConv} onChange={handleTxConv} suffix="%" wasEdited={editedFields.has('vendas')} />,
      variationSim: txConv, variationReal: pct(realData.vendas, realData.reunioes),
    },
    {
      label: 'CAC',
      realValue: fmtBRL(realCac),
      simContent: <CalcField value={fmtBRL(cac)} />,
      variationSim: cac, variationReal: realCac, isCost: true,
    },
    {
      label: 'Ticket Médio',
      realValue: fmtBRL(realData.ticketMedio),
      simContent: <NumInput value={sim.ticketMedio} onChange={(v) => updateSim('ticketMedio', v)} prefix="R$" wasEdited={editedFields.has('ticketMedio')} />,
      variationSim: sim.ticketMedio, variationReal: realData.ticketMedio,
    },
    {
      label: 'Receita',
      realValue: fmtBRL(realReceita),
      simContent: <CalcField value={fmtBRL(receita)} />,
      variationSim: receita, variationReal: realReceita,
    },
    {
      label: 'ROI',
      realValue: fmtPct(realRoi),
      simContent: <CalcField value={fmtPct(roi)} />,
      variationSim: roi, variationReal: realRoi,
    },
  ];

  // Summary KPIs
  const summaryKpis = [
    { label: 'Vendas projetadas', value: fmtInt(sim.vendas), sim: sim.vendas, real: realData.vendas },
    { label: 'CAC projetado', value: fmtBRL(cac), sim: cac, real: realCac, isCost: true },
    { label: 'Receita projetada', value: fmtBRL(receita), sim: receita, real: realReceita },
    { label: 'ROI projetado', value: fmtPct(roi), sim: roi, real: realRoi },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Skeleton className="h-12 w-72" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Matemarketing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simule cenários no funil Inbound e planeje suas metas
        </p>
      </div>

      {/* Month selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((mo) => (
              <SelectItem key={mo.value} value={mo.value.toString()}>
                {mo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={resetToReal} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Resetar para dados reais
        </Button>

        <Badge variant="outline" className="text-xs font-normal">
          <Zap className="h-3 w-3 mr-1" />
          Meta Ads
        </Badge>
      </div>

      {/* Simulator table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sticky top-0 bg-muted/50">
                    Métrica
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sticky top-0 bg-muted/50 w-[180px]">
                    Realizado
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sticky top-0 bg-muted/50 w-[220px]">
                    Simulado
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sticky top-0 bg-muted/50 w-[100px]">
                    Variação
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((row, idx) => (
                  <tr
                    key={row.label}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    style={{
                      animationName: 'fadeInUp',
                      animationDuration: '280ms',
                      animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                      animationDelay: `${idx * 25}ms`,
                      animationFillMode: 'both',
                    }}
                  >
                    <td className="px-5 py-2">
                      <div className="font-semibold text-foreground">{row.label}</div>
                      {row.benchKey && <BenchLabel benchKey={row.benchKey} simValue={row.variationSim} />}
                    </td>
                    <td className="px-5 py-2 text-right font-mono text-muted-foreground">
                      {row.realValue}
                    </td>
                    <td className="px-5 py-2">
                      {row.simContent}
                    </td>
                    <td className="px-5 py-2 text-right">
                      <VariationBadge sim={row.variationSim} real={row.variationReal} isCost={row.isCost} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <Card className="border-l-[3px] border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resumo da Simulação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryKpis.map((kpi) => (
              <div key={kpi.label} className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="text-[32px] font-extrabold font-mono leading-tight text-foreground">
                  {kpi.value}
                </p>
                <VariationBadge sim={kpi.sim} real={kpi.real} isCost={kpi.isCost} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
