import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Calculator, RotateCcw, ArrowUp, ArrowDown, Minus, Zap, Pencil } from 'lucide-react';
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
  cpl: number;
}

type EditableField = 'investimento' | 'leads' | 'cpl' | 'mql' | 'txQualif' | 'agendamentos' | 'txAgend' | 'reunioes' | 'txCompar' | 'vendas' | 'txConv' | 'ticketMedio';

/* ─── Helpers ─── */
const safe = (a: number, b: number) => (b === 0 ? 0 : a / b);
const pct = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100);
const clampPct = (v: number) => Math.max(0, Math.min(100, v));
const clampPos = (v: number) => Math.max(0, v);
const roundInt = (v: number) => Math.round(clampPos(v));
const round2 = (v: number) => Math.round(clampPos(v) * 100) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;

function fmtBRL(v: number) {
  if (!isFinite(v)) return '--';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
function fmtInt(v: number) {
  if (!isFinite(v)) return '--';
  return Math.round(v).toLocaleString('pt-BR');
}
function fmtPct(v: number) {
  if (!isFinite(v)) return '--';
  return `${v.toFixed(1)}%`;
}

function variationPct(sim: number, real: number) {
  if (real === 0) return sim === 0 ? 0 : 100;
  return ((sim - real) / Math.abs(real)) * 100;
}

function fmtVariation(diff: number) {
  if (Math.abs(diff) > 999) return diff > 0 ? '>999%' : '<-999%';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

/* ─── Variation indicator ─── */
function VariationBadge({ sim, real, isCost }: { sim: number; real: number; isCost?: boolean }) {
  const diff = variationPct(sim, real);
  if (Math.abs(diff) < 0.5) {
    return <span className="inline-flex items-center gap-0.5 text-[13px] text-muted-foreground"><Minus className="h-3 w-3" /> 0%</span>;
  }
  const isUp = diff > 0;
  const isGood = isCost ? !isUp : isUp;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[13px] font-medium', isGood ? 'text-success' : 'text-destructive')}>
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {fmtVariation(diff)}
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
  const [localText, setLocalText] = useState('');
  const [focused, setFocused] = useState(false);
  const committedRef = useRef(value);

  // Keep committed ref in sync with external value changes
  useEffect(() => {
    committedRef.current = value;
  }, [value]);

  const rawToDisplay = useCallback((v: number) => {
    if (isInteger) return fmtInt(v);
    if (prefix === 'R$') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (suffix === '%') return v.toFixed(1);
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [isInteger, prefix, suffix]);

  const rawToEdit = useCallback((v: number) => {
    if (isInteger) return Math.round(v).toString();
    if (suffix === '%') return v.toFixed(1);
    return v.toFixed(2);
  }, [isInteger, suffix]);

  const handleFocus = () => {
    setFocused(true);
    setLocalText(rawToEdit(committedRef.current));
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(localText.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed) && isFinite(parsed)) {
      const finalVal = isInteger ? roundInt(parsed) : round2(parsed);
      if (finalVal !== committedRef.current) {
        committedRef.current = finalVal;
        onChange(finalVal);
      }
    }
    // If invalid, just revert display - value stays the same
  };

  const displayValue = focused ? localText : rawToDisplay(value);

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
        className="w-full bg-transparent outline-none text-foreground font-mono text-right"
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => setLocalText(e.target.value)}
      />
      {suffix && <span className="text-muted-foreground text-xs shrink-0">{suffix}</span>}
      <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-1" />
    </div>
  );
}

/* ─── Calculated field (read-only) ─── */
function CalcField({ value, prefix, suffix }: { value: string; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-1 h-[42px] px-3 font-mono text-sm text-foreground justify-end">
      {prefix && <span className="text-muted-foreground text-xs">{prefix}</span>}
      <span>{value}</span>
      {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
    </div>
  );
}

/* ─── Section separator ─── */
function SectionLabel({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={4} className="px-5 pt-4 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">{label}</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </td>
    </tr>
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

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(filters.year, i, 1);
      return { value: i, label: format(d, 'MMMM yyyy', { locale: ptBR }) };
    });
  }, [filters.year]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Build real data
  const realData = useMemo((): SimState => {
    const monthStr = format(startOfMonth(new Date(filters.year, selectedMonth, 1)), 'yyyy-MM-dd');
    const actual = actuals.find((a) => a.month === monthStr);
    const cm = clientMetrics.find((m) => m.month === selectedMonth);
    const meta = metaMetrics.find((m) => m.month === monthStr);

    const investimento = (meta?.investment || 0) > 0 ? meta!.investment : (actual?.investment_actual ?? 0);
    const leads = (meta?.leads || 0) > 0 ? meta!.leads : (actual?.leads_actual ?? 0);

    return {
      investimento,
      leads,
      cpl: safe(investimento, leads),
      mql: actual?.mql_actual ?? 0,
      agendamentos: actual?.appointments_actual ?? 0,
      reunioes: actual?.meetings_held_actual ?? 0,
      vendas: cm?.sales_count ?? actual?.sales_actual ?? 0,
      ticketMedio: cm ? (cm.sales_count > 0 ? cm.total_revenue / cm.sales_count : 0) : actual?.avg_ticket_actual ?? 0,
    };
  }, [actuals, clientMetrics, metaMetrics, selectedMonth, filters.year]);

  // Sim state + tracking which fields user edited
  const [sim, setSim] = useState<SimState>({ ...realData });
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  // Track last edited for each bidirectional pair
  const [lastEdited, setLastEdited] = useState<Record<string, EditableField>>({});

  // Reset sim when real data changes
  useEffect(() => {
    setSim({ ...realData });
    setEditedFields(new Set());
    setLastEdited({});
  }, [realData]);

  // Recalculate derived values whenever sim changes
  const derived = useMemo(() => {
    const s = { ...sim };

    // Pair: CPL <-> Investimento/Leads
    // CPL is always derived unless user edited it
    if (lastEdited['cpl_pair'] === 'cpl') {
      // When user edits CPL, recalculate Leads keeping Investimento fixed
      s.leads = s.cpl > 0 ? roundInt(s.investimento / s.cpl) : 0;
    } else {
      s.cpl = round2(safe(s.investimento, s.leads));
    }

    // Pair: MQL <-> Tx Qualificacao
    const txQualif = lastEdited['qualif_pair'] === 'txQualif'
      ? clampPct(pct(s.mql, s.leads)) // mql was set from tx
      : round1(clampPct(pct(s.mql, s.leads)));

    // Pair: Agendamentos <-> Tx Agendamento
    const txAgend = round1(clampPct(pct(s.agendamentos, s.mql)));

    // Pair: Reunioes <-> Tx Comparecimento
    const txCompar = round1(clampPct(pct(s.reunioes, s.agendamentos)));

    // Pair: Vendas <-> Tx Conversao
    const txConv = round1(clampPct(pct(s.vendas, s.reunioes)));

    const cpmql = round2(safe(s.investimento, s.mql));
    const custoCompar = round2(safe(s.investimento, s.reunioes));
    const cac = round2(safe(s.investimento, s.vendas));
    const receita = round2(s.vendas * s.ticketMedio);
    const roi = round1(safe(receita - s.investimento, s.investimento) * 100);

    return { ...s, txQualif, txAgend, txCompar, txConv, cpmql, custoCompar, cac, receita, roi };
  }, [sim, lastEdited]);

  const updateField = useCallback((field: keyof SimState, value: number, pairKey?: string, editKey?: EditableField) => {
    setSim(prev => ({ ...prev, [field]: value }));
    setEditedFields(prev => new Set(prev).add(field));
    if (pairKey && editKey) {
      setLastEdited(prev => ({ ...prev, [pairKey]: editKey }));
    }
  }, []);

  // Bidirectional rate handlers
  const handleTxQualif = useCallback((v: number) => {
    const clamped = clampPct(v);
    const newMql = roundInt((clamped / 100) * sim.leads);
    setSim(p => ({ ...p, mql: newMql }));
    setEditedFields(p => new Set(p).add('mql'));
    setLastEdited(p => ({ ...p, qualif_pair: 'txQualif' }));
  }, [sim.leads]);

  const handleTxAgend = useCallback((v: number) => {
    const clamped = clampPct(v);
    const newAgend = roundInt((clamped / 100) * sim.mql);
    setSim(p => ({ ...p, agendamentos: newAgend }));
    setEditedFields(p => new Set(p).add('agendamentos'));
    setLastEdited(p => ({ ...p, agend_pair: 'txAgend' }));
  }, [sim.mql]);

  const handleTxCompar = useCallback((v: number) => {
    const clamped = clampPct(v);
    const newReun = roundInt((clamped / 100) * sim.agendamentos);
    setSim(p => ({ ...p, reunioes: newReun }));
    setEditedFields(p => new Set(p).add('reunioes'));
    setLastEdited(p => ({ ...p, compar_pair: 'txCompar' }));
  }, [sim.agendamentos]);

  const handleTxConv = useCallback((v: number) => {
    const clamped = clampPct(v);
    const newVendas = roundInt((clamped / 100) * sim.reunioes);
    setSim(p => ({ ...p, vendas: newVendas }));
    setEditedFields(p => new Set(p).add('vendas'));
    setLastEdited(p => ({ ...p, conv_pair: 'txConv' }));
  }, [sim.reunioes]);

  const handleCpl = useCallback((v: number) => {
    const cpl = round2(v);
    const newLeads = cpl > 0 ? roundInt(sim.investimento / cpl) : 0;
    setSim(p => ({ ...p, cpl, leads: newLeads }));
    setEditedFields(p => new Set(p).add('cpl').add('leads'));
    setLastEdited(p => ({ ...p, cpl_pair: 'cpl' }));
  }, []);

  const resetToReal = () => {
    setSim({ ...realData });
    setEditedFields(new Set());
    setLastEdited({});
  };

  // Real derived
  const realCpl = safe(realData.investimento, realData.leads);
  const realCpmql = safe(realData.investimento, realData.mql);
  const realCustoCompar = safe(realData.investimento, realData.reunioes);
  const realCac = safe(realData.investimento, realData.vendas);
  const realReceita = realData.vendas * realData.ticketMedio;
  const realRoi = safe(realReceita - realData.investimento, realData.investimento) * 100;

  const isLoading = funnelLoading || metaLoading;

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
    highlight?: boolean;
    sectionLabel?: string;
  };

  const metrics: MetricRow[] = [
    // AQUISIÇÃO
    {
      sectionLabel: 'AQUISIÇÃO',
      label: 'Investimento',
      realValue: fmtBRL(realData.investimento),
      simContent: <NumInput value={sim.investimento} onChange={(v) => updateField('investimento', v, 'cpl_pair', 'investimento')} prefix="R$" wasEdited={editedFields.has('investimento')} />,
      variationSim: derived.investimento, variationReal: realData.investimento, isCost: true,
    },
    {
      label: 'CPL',
      realValue: fmtBRL(realCpl),
      simContent: <NumInput value={derived.cpl} onChange={handleCpl} prefix="R$" wasEdited={editedFields.has('cpl')} />,
      variationSim: derived.cpl, variationReal: realCpl, isCost: true,
    },
    {
      label: 'Leads',
      realValue: fmtInt(realData.leads),
      simContent: <NumInput value={sim.leads} onChange={(v) => updateField('leads', v, 'cpl_pair', 'leads')} isInteger wasEdited={editedFields.has('leads')} />,
      variationSim: sim.leads, variationReal: realData.leads,
    },
    // QUALIFICAÇÃO
    {
      sectionLabel: 'QUALIFICAÇÃO',
      label: 'MQL',
      realValue: fmtInt(realData.mql),
      simContent: <NumInput value={sim.mql} onChange={(v) => updateField('mql', roundInt(v), 'qualif_pair', 'mql')} isInteger wasEdited={editedFields.has('mql')} />,
      variationSim: sim.mql, variationReal: realData.mql,
    },
    {
      label: 'Tx Qualificação',
      realValue: fmtPct(pct(realData.mql, realData.leads)),
      simContent: <NumInput value={derived.txQualif} onChange={handleTxQualif} suffix="%" wasEdited={editedFields.has('mql')} />,
      variationSim: derived.txQualif, variationReal: pct(realData.mql, realData.leads),
    },
    {
      label: 'CPMQL',
      realValue: fmtBRL(realCpmql),
      simContent: <CalcField value={fmtBRL(derived.cpmql)} />,
      variationSim: derived.cpmql, variationReal: realCpmql, isCost: true,
    },
    // AGENDAMENTO
    {
      sectionLabel: 'AGENDAMENTO',
      label: 'Agendamentos',
      realValue: fmtInt(realData.agendamentos),
      simContent: <NumInput value={sim.agendamentos} onChange={(v) => updateField('agendamentos', roundInt(v), 'agend_pair', 'agendamentos')} isInteger wasEdited={editedFields.has('agendamentos')} />,
      variationSim: sim.agendamentos, variationReal: realData.agendamentos,
    },
    {
      label: 'Tx Agendamento',
      benchKey: 'txAgend',
      realValue: fmtPct(pct(realData.agendamentos, realData.mql)),
      simContent: <NumInput value={derived.txAgend} onChange={handleTxAgend} suffix="%" wasEdited={editedFields.has('agendamentos')} />,
      variationSim: derived.txAgend, variationReal: pct(realData.agendamentos, realData.mql),
    },
    // REUNIÃO
    {
      sectionLabel: 'REUNIÃO',
      label: 'Reuniões',
      realValue: fmtInt(realData.reunioes),
      simContent: <NumInput value={sim.reunioes} onChange={(v) => updateField('reunioes', roundInt(v), 'compar_pair', 'reunioes')} isInteger wasEdited={editedFields.has('reunioes')} />,
      variationSim: sim.reunioes, variationReal: realData.reunioes,
    },
    {
      label: 'Tx Comparecimento',
      benchKey: 'txCompar',
      realValue: fmtPct(pct(realData.reunioes, realData.agendamentos)),
      simContent: <NumInput value={derived.txCompar} onChange={handleTxCompar} suffix="%" wasEdited={editedFields.has('reunioes')} />,
      variationSim: derived.txCompar, variationReal: pct(realData.reunioes, realData.agendamentos),
    },
    {
      label: 'Custo por Comparecimento',
      realValue: fmtBRL(realCustoCompar),
      simContent: <CalcField value={fmtBRL(derived.custoCompar)} />,
      variationSim: derived.custoCompar, variationReal: realCustoCompar, isCost: true,
    },
    // CONVERSÃO
    {
      sectionLabel: 'CONVERSÃO',
      label: 'Vendas',
      realValue: fmtInt(realData.vendas),
      simContent: <NumInput value={sim.vendas} onChange={(v) => updateField('vendas', roundInt(v), 'conv_pair', 'vendas')} isInteger wasEdited={editedFields.has('vendas')} />,
      variationSim: sim.vendas, variationReal: realData.vendas,
    },
    {
      label: 'Tx Conversão',
      benchKey: 'txConv',
      realValue: fmtPct(pct(realData.vendas, realData.reunioes)),
      simContent: <NumInput value={derived.txConv} onChange={handleTxConv} suffix="%" wasEdited={editedFields.has('vendas')} />,
      variationSim: derived.txConv, variationReal: pct(realData.vendas, realData.reunioes),
    },
    // RESULTADO
    {
      sectionLabel: 'RESULTADO',
      label: 'CAC',
      realValue: fmtBRL(realCac),
      simContent: <CalcField value={fmtBRL(derived.cac)} />,
      variationSim: derived.cac, variationReal: realCac, isCost: true,
    },
    {
      label: 'Ticket Médio',
      realValue: fmtBRL(realData.ticketMedio),
      simContent: <NumInput value={sim.ticketMedio} onChange={(v) => updateField('ticketMedio', v)} prefix="R$" wasEdited={editedFields.has('ticketMedio')} />,
      variationSim: sim.ticketMedio, variationReal: realData.ticketMedio,
    },
    {
      label: 'Receita',
      realValue: fmtBRL(realReceita),
      simContent: <CalcField value={fmtBRL(derived.receita)} />,
      variationSim: derived.receita, variationReal: realReceita,
      highlight: true,
    },
    {
      label: 'ROI',
      realValue: fmtPct(realRoi),
      simContent: <CalcField value={fmtPct(derived.roi)} />,
      variationSim: derived.roi, variationReal: realRoi,
      highlight: true,
    },
  ];

  const summaryKpis = [
    { label: 'Vendas projetadas', value: fmtInt(sim.vendas), sim: sim.vendas, real: realData.vendas },
    { label: 'CAC projetado', value: fmtBRL(derived.cac), sim: derived.cac, real: realCac, isCost: true },
    { label: 'Receita projetada', value: fmtBRL(derived.receita), sim: derived.receita, real: realReceita },
    { label: 'ROI projetado', value: fmtPct(derived.roi), sim: derived.roi, real: realRoi },
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
                  <>
                    {row.sectionLabel && <SectionLabel key={`section-${row.sectionLabel}`} label={row.sectionLabel} />}
                    <tr
                      key={row.label}
                      className={cn(
                        'border-b last:border-0 hover:bg-muted/30 transition-colors',
                        row.highlight && 'bg-primary/[0.03]',
                      )}
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
                      <td className="px-5 py-2 text-right font-mono text-[13px] text-muted-foreground">
                        {row.realValue}
                      </td>
                      <td className="px-5 py-2">
                        {row.simContent}
                      </td>
                      <td className="px-5 py-2 text-right">
                        <VariationBadge sim={row.variationSim} real={row.variationReal} isCost={row.isCost} />
                      </td>
                    </tr>
                  </>
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
