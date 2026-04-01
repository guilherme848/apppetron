import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Calculator, RotateCcw, ArrowUp, ArrowDown, Minus, Zap, Pencil, X } from 'lucide-react';
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
type EditableKey =
  | 'investimento' | 'cpl' | 'leads'
  | 'txQualif' | 'txAgend' | 'txCompar' | 'txConv'
  | 'ticketMedio';

type TrioKey = 'investimento' | 'cpl' | 'leads';

interface FunnelResult {
  investimento: number;
  cpl: number;
  leads: number;
  mql: number;
  txQualif: number;
  cpmql: number;
  agendamentos: number;
  txAgend: number;
  reunioes: number;
  txCompar: number;
  custoCompar: number;
  vendas: number;
  txConv: number;
  cac: number;
  ticketMedio: number;
  receita: number;
  roi: number;
}

/* ─── Helpers ─── */
const safe = (a: number, b: number) => (b === 0 ? 0 : a / b);
const pct = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100);
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

/* ─── Top-down funnel calculation ─── */
function runFunnel(
  edits: Record<EditableKey, number>,
  lastTrioEdit: TrioKey,
): FunnelResult {
  let { investimento, cpl, leads, txQualif, txAgend, txCompar, txConv, ticketMedio } = edits;

  // Resolve the trio based on which was last edited
  switch (lastTrioEdit) {
    case 'investimento':
      // Inv changed → Leads = Inv / CPL, CPL stays
      leads = cpl > 0 ? roundInt(investimento / cpl) : 0;
      break;
    case 'cpl':
      // CPL changed → Leads = Inv / CPL, Inv stays
      leads = cpl > 0 ? roundInt(investimento / cpl) : 0;
      break;
    case 'leads':
      // Leads changed → CPL = Inv / Leads, Inv stays
      cpl = leads > 0 ? round2(investimento / leads) : 0;
      break;
  }

  // Cascade top-down
  const mql = roundInt(leads * txQualif / 100);
  const cpmql = round2(safe(investimento, mql));
  const agendamentos = roundInt(mql * txAgend / 100);
  const reunioes = roundInt(agendamentos * txCompar / 100);
  const custoCompar = round2(safe(investimento, reunioes));
  const vendas = roundInt(reunioes * txConv / 100);
  const cac = round2(safe(investimento, vendas));
  const receita = round2(vendas * ticketMedio);
  const roi = round1(safe(receita - investimento, investimento) * 100);

  return { investimento, cpl, leads, mql, txQualif, cpmql, agendamentos, txAgend, reunioes, txCompar, custoCompar, vendas, txConv, cac, ticketMedio, receita, roi };
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
  editedByUser,
  onReset,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  isInteger?: boolean;
  editedByUser?: boolean;
  onReset?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formatForDisplay = (v: number): string => {
    if (isInteger) return fmtInt(v);
    if (prefix === 'R$') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (suffix === '%') return v.toFixed(1);
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toRawString = (v: number): string => {
    if (isInteger) return Math.round(v).toString();
    if (suffix === '%') return v.toFixed(1);
    return v.toFixed(2);
  };

  const parseInput = (text: string): number | null => {
    const cleaned = text.replace(/[^\d.,-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) || !isFinite(n) ? null : n;
  };

  const handleFocus = () => {
    setIsEditing(true);
    setEditText(toRawString(value));
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setEditText(raw);
    const parsed = parseInput(raw);
    if (parsed !== null) {
      const final = isInteger ? roundInt(parsed) : (suffix === '%' ? round1(parsed) : round2(parsed));
      onChange(final);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'flex items-center gap-1 h-[42px] rounded-lg border px-3 font-mono text-sm transition-all duration-150 flex-1',
          'bg-surface border-border',
          editedByUser && 'bg-primary/5 border-primary/30',
          isEditing && 'border-primary ring-[3px] ring-primary/10',
        )}
      >
        {prefix && <span className="text-muted-foreground text-xs shrink-0">{prefix}</span>}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="w-full bg-transparent outline-none text-foreground font-mono text-right"
          value={isEditing ? editText : formatForDisplay(value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {suffix && <span className="text-muted-foreground text-xs shrink-0">{suffix}</span>}
        {editedByUser ? (
          <Pencil className="h-3 w-3 text-primary shrink-0 ml-1 fill-primary" />
        ) : (
          <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-1" />
        )}
      </div>
      {editedByUser && onReset && (
        <button
          onClick={onReset}
          className="h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Resetar para valor real"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ─── Calculated field (read-only, no border, no pencil) ─── */
function CalcField({ value, flash }: { value: string; flash?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-end h-[42px] px-3 font-mono text-sm text-foreground transition-colors duration-600',
        flash && 'bg-primary/10',
      )}
    >
      <span>{value}</span>
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

  // Build real data from DB/Meta
  const realValues = useMemo(() => {
    const monthStr = format(startOfMonth(new Date(filters.year, selectedMonth, 1)), 'yyyy-MM-dd');
    const actual = actuals.find((a) => a.month === monthStr);
    const cm = clientMetrics.find((m) => m.month === selectedMonth);
    const meta = metaMetrics.find((m) => m.month === monthStr);

    const investimento = (meta?.investment || 0) > 0 ? meta!.investment : (actual?.investment_actual ?? 0);
    const leads = (meta?.leads || 0) > 0 ? meta!.leads : (actual?.leads_actual ?? 0);
    const mql = actual?.mql_actual ?? 0;
    const agendamentos = actual?.appointments_actual ?? 0;
    const reunioes = actual?.meetings_held_actual ?? 0;
    const vendas = cm?.sales_count ?? actual?.sales_actual ?? 0;
    const ticketMedio = cm ? (cm.sales_count > 0 ? cm.total_revenue / cm.sales_count : 0) : actual?.avg_ticket_actual ?? 0;

    return {
      investimento,
      leads,
      cpl: round2(safe(investimento, leads)),
      mql,
      txQualif: round1(pct(mql, leads)),
      agendamentos,
      txAgend: round1(pct(agendamentos, mql)),
      reunioes,
      txCompar: round1(pct(reunioes, agendamentos)),
      vendas,
      txConv: round1(pct(vendas, reunioes)),
      ticketMedio,
    };
  }, [actuals, clientMetrics, metaMetrics, selectedMonth, filters.year]);

  // Real derived values for the "Realizado" column
  const realDerived = useMemo(() => {
    const { investimento, mql, reunioes, vendas, ticketMedio } = realValues;
    return {
      cpmql: round2(safe(investimento, mql)),
      custoCompar: round2(safe(investimento, reunioes)),
      cac: round2(safe(investimento, vendas)),
      receita: round2(vendas * ticketMedio),
      roi: round1(safe(vendas * ticketMedio - investimento, investimento) * 100),
    };
  }, [realValues]);

  // ─── Editable state ───
  const [editables, setEditables] = useState<Record<EditableKey, number>>(() => ({
    investimento: realValues.investimento,
    cpl: realValues.cpl,
    leads: realValues.leads,
    txQualif: realValues.txQualif,
    txAgend: realValues.txAgend,
    txCompar: realValues.txCompar,
    txConv: realValues.txConv,
    ticketMedio: realValues.ticketMedio,
  }));
  const [editedSet, setEditedSet] = useState<Set<EditableKey>>(new Set());
  const [lastTrioEdit, setLastTrioEdit] = useState<TrioKey>('investimento');
  const [flashCalc, setFlashCalc] = useState(0); // bump to trigger flash on calculated fields

  // Reset when month/data changes
  useEffect(() => {
    setEditables({
      investimento: realValues.investimento,
      cpl: realValues.cpl,
      leads: realValues.leads,
      txQualif: realValues.txQualif,
      txAgend: realValues.txAgend,
      txCompar: realValues.txCompar,
      txConv: realValues.txConv,
      ticketMedio: realValues.ticketMedio,
    });
    setEditedSet(new Set());
    setLastTrioEdit('investimento');
    setFlashCalc(0);
  }, [realValues]);

  // Compute funnel
  const funnel = useMemo(() => runFunnel(editables, lastTrioEdit), [editables, lastTrioEdit]);

  // Flash management for calculated fields
  const [showFlash, setShowFlash] = useState(false);
  useEffect(() => {
    if (flashCalc > 0) {
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [flashCalc]);

  // Handle user editing a field
  const handleEdit = useCallback((key: EditableKey, value: number) => {
    setEditables(prev => ({ ...prev, [key]: value }));
    setEditedSet(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    if (key === 'investimento' || key === 'cpl' || key === 'leads') {
      setLastTrioEdit(key as TrioKey);
    }
    setFlashCalc(c => c + 1);
  }, []);

  // Reset individual field
  const handleFieldReset = useCallback((key: EditableKey) => {
    setEditables(prev => ({ ...prev, [key]: realValues[key] }));
    setEditedSet(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setFlashCalc(c => c + 1);
  }, [realValues]);

  // Full reset
  const resetToReal = useCallback(() => {
    setEditables({
      investimento: realValues.investimento,
      cpl: realValues.cpl,
      leads: realValues.leads,
      txQualif: realValues.txQualif,
      txAgend: realValues.txAgend,
      txCompar: realValues.txCompar,
      txConv: realValues.txConv,
      ticketMedio: realValues.ticketMedio,
    });
    setEditedSet(new Set());
    setLastTrioEdit('investimento');
    setFlashCalc(0);
  }, [realValues]);

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

  // Helper to build NumInput for an editable field
  const inp = (key: EditableKey, opts: { prefix?: string; suffix?: string; isInteger?: boolean }) => (
    <NumInput
      value={funnel[key]}
      onChange={(v) => handleEdit(key, v)}
      prefix={opts.prefix}
      suffix={opts.suffix}
      isInteger={opts.isInteger}
      editedByUser={editedSet.has(key)}
      onReset={() => handleFieldReset(key)}
    />
  );

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
      realValue: fmtBRL(realValues.investimento),
      simContent: inp('investimento', { prefix: 'R$' }),
      variationSim: funnel.investimento, variationReal: realValues.investimento, isCost: true,
    },
    {
      label: 'CPL',
      realValue: fmtBRL(realValues.cpl),
      simContent: inp('cpl', { prefix: 'R$' }),
      variationSim: funnel.cpl, variationReal: realValues.cpl, isCost: true,
    },
    {
      label: 'Leads',
      realValue: fmtInt(realValues.leads),
      simContent: inp('leads', { isInteger: true }),
      variationSim: funnel.leads, variationReal: realValues.leads,
    },
    // QUALIFICAÇÃO
    {
      sectionLabel: 'QUALIFICAÇÃO',
      label: 'Tx Qualificação',
      realValue: fmtPct(realValues.txQualif),
      simContent: inp('txQualif', { suffix: '%' }),
      variationSim: funnel.txQualif, variationReal: realValues.txQualif,
    },
    {
      label: 'MQL',
      realValue: fmtInt(realValues.mql),
      simContent: <CalcField value={fmtInt(funnel.mql)} flash={showFlash} />,
      variationSim: funnel.mql, variationReal: realValues.mql,
    },
    {
      label: 'CPMQL',
      realValue: fmtBRL(realDerived.cpmql),
      simContent: <CalcField value={fmtBRL(funnel.cpmql)} flash={showFlash} />,
      variationSim: funnel.cpmql, variationReal: realDerived.cpmql, isCost: true,
    },
    // AGENDAMENTO
    {
      sectionLabel: 'AGENDAMENTO',
      label: 'Tx Agendamento',
      benchKey: 'txAgend',
      realValue: fmtPct(realValues.txAgend),
      simContent: inp('txAgend', { suffix: '%' }),
      variationSim: funnel.txAgend, variationReal: realValues.txAgend,
    },
    {
      label: 'Agendamentos',
      realValue: fmtInt(realValues.agendamentos),
      simContent: <CalcField value={fmtInt(funnel.agendamentos)} flash={showFlash} />,
      variationSim: funnel.agendamentos, variationReal: realValues.agendamentos,
    },
    // REUNIÃO
    {
      sectionLabel: 'REUNIÃO',
      label: 'Tx Comparecimento',
      benchKey: 'txCompar',
      realValue: fmtPct(realValues.txCompar),
      simContent: inp('txCompar', { suffix: '%' }),
      variationSim: funnel.txCompar, variationReal: realValues.txCompar,
    },
    {
      label: 'Reuniões',
      realValue: fmtInt(realValues.reunioes),
      simContent: <CalcField value={fmtInt(funnel.reunioes)} flash={showFlash} />,
      variationSim: funnel.reunioes, variationReal: realValues.reunioes,
    },
    {
      label: 'Custo por Comparecimento',
      realValue: fmtBRL(realDerived.custoCompar),
      simContent: <CalcField value={fmtBRL(funnel.custoCompar)} flash={showFlash} />,
      variationSim: funnel.custoCompar, variationReal: realDerived.custoCompar, isCost: true,
    },
    // CONVERSÃO
    {
      sectionLabel: 'CONVERSÃO',
      label: 'Tx Conversão',
      benchKey: 'txConv',
      realValue: fmtPct(realValues.txConv),
      simContent: inp('txConv', { suffix: '%' }),
      variationSim: funnel.txConv, variationReal: realValues.txConv,
    },
    {
      label: 'Vendas',
      realValue: fmtInt(realValues.vendas),
      simContent: <CalcField value={fmtInt(funnel.vendas)} flash={showFlash} />,
      variationSim: funnel.vendas, variationReal: realValues.vendas,
    },
    // RESULTADO
    {
      sectionLabel: 'RESULTADO',
      label: 'CAC',
      realValue: fmtBRL(realDerived.cac),
      simContent: <CalcField value={fmtBRL(funnel.cac)} flash={showFlash} />,
      variationSim: funnel.cac, variationReal: realDerived.cac, isCost: true,
    },
    {
      label: 'Ticket Médio',
      realValue: fmtBRL(realValues.ticketMedio),
      simContent: inp('ticketMedio', { prefix: 'R$' }),
      variationSim: funnel.ticketMedio, variationReal: realValues.ticketMedio,
    },
    {
      label: 'Receita',
      realValue: fmtBRL(realDerived.receita),
      simContent: <CalcField value={fmtBRL(funnel.receita)} flash={showFlash} />,
      variationSim: funnel.receita, variationReal: realDerived.receita,
      highlight: true,
    },
    {
      label: 'ROI',
      realValue: fmtPct(realDerived.roi),
      simContent: <CalcField value={fmtPct(funnel.roi)} flash={showFlash} />,
      variationSim: funnel.roi, variationReal: realDerived.roi,
      highlight: true,
    },
  ];

  const summaryKpis = [
    { label: 'Vendas projetadas', value: fmtInt(funnel.vendas), sim: funnel.vendas, real: realValues.vendas },
    { label: 'CAC projetado', value: fmtBRL(funnel.cac), sim: funnel.cac, real: realDerived.cac, isCost: true },
    { label: 'Receita projetada', value: fmtBRL(funnel.receita), sim: funnel.receita, real: realDerived.receita },
    { label: 'ROI projetado', value: fmtPct(funnel.roi), sim: funnel.roi, real: realDerived.roi },
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
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sticky top-0 bg-muted/50 w-[240px]">
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
