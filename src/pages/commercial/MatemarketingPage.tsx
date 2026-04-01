import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Calculator, RotateCcw, ArrowUp, ArrowDown, Minus, Zap, Pencil, X, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

  switch (lastTrioEdit) {
    case 'investimento':
      leads = cpl > 0 ? roundInt(investimento / cpl) : 0;
      break;
    case 'cpl':
      leads = cpl > 0 ? roundInt(investimento / cpl) : 0;
      break;
    case 'leads':
      cpl = leads > 0 ? round2(investimento / leads) : 0;
      break;
  }

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
    return <span className="inline-flex items-center gap-0.5 text-[13px] font-mono text-muted-foreground"><Minus className="h-3 w-3" /> 0%</span>;
  }
  const isUp = diff > 0;
  const isGood = isCost ? !isUp : isUp;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[13px] font-mono font-medium', isGood ? 'text-success' : 'text-destructive')}>
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
  widthClass,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  isInteger?: boolean;
  editedByUser?: boolean;
  onReset?: () => void;
  widthClass?: string;
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
    <div className="group/input flex items-center gap-1 justify-end">
      <div
        className={cn(
          'flex items-center gap-1 h-9 rounded-lg border px-2.5 font-mono text-[13px] transition-all duration-150',
          widthClass || (prefix === 'R$' ? 'w-[130px]' : 'w-[90px]'),
          'bg-secondary/50 border-border',
          editedByUser && 'bg-primary/5 border-primary/30',
          isEditing && 'border-primary ring-[3px] ring-primary/10',
        )}
      >
        {prefix && <span className="text-muted-foreground text-[11px] shrink-0">{prefix}</span>}
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
        {suffix && <span className="text-muted-foreground text-[11px] shrink-0">{suffix}</span>}
        <Pencil className={cn(
          'h-3 w-3 shrink-0 ml-0.5 transition-colors',
          editedByUser ? 'text-primary fill-primary' : 'text-muted-foreground/40',
        )} />
      </div>
      {editedByUser && onReset ? (
        <button
          onClick={onReset}
          className="h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Resetar para valor real"
        >
          <X className="h-3 w-3" />
        </button>
      ) : (
        <div className="w-5 shrink-0" />
      )}
    </div>
  );
}

/* ─── Calculated field (read-only) ─── */
function CalcField({ value, flash }: { value: string; flash?: boolean }) {
  return (
    <div className="flex items-center justify-end pr-6">
      <span
        className={cn(
          'font-mono text-[13px] text-foreground transition-colors duration-[600ms]',
          flash && 'bg-primary/10 rounded px-1',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Funnel visual step ─── */
function FunnelStep({
  label,
  value,
  rate,
  rateLabel,
  rateGood,
  isLast,
  delay,
}: {
  label: string;
  value: string;
  rate?: string;
  rateLabel?: string;
  rateGood?: boolean | null;
  isLast?: boolean;
  delay: number;
}) {
  return (
    <>
      <div
        className="flex flex-col items-center gap-1.5 min-w-[100px] flex-1 animate-fade-in-up"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
      >
        <div className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-center transition-colors duration-300">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">{label}</p>
          <p className="text-xl font-extrabold font-mono text-foreground leading-tight">{value}</p>
        </div>
        {rate && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-mono px-1.5 py-0',
              rateGood === true && 'text-success border-success/30',
              rateGood === false && 'text-destructive border-destructive/30',
              rateGood === null && 'text-muted-foreground',
            )}
          >
            {rateLabel && <span className="mr-0.5 font-sans">{rateLabel}</span>}
            {rate}
          </Badge>
        )}
      </div>
      {!isLast && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-3" />
      )}
    </>
  );
}

/* ─── KPI card in the funnel summary ─── */
function SummaryKPI({
  label,
  value,
  sim,
  real,
  isCost,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sim: number;
  real: number;
  isCost?: boolean;
  accent?: boolean;
  delay: number;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 animate-fade-in-up',
        accent && 'border-l-[3px] border-l-primary pl-3',
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="text-[28px] font-extrabold font-mono leading-tight text-foreground">{value}</p>
      <VariationBadge sim={sim} real={real} isCost={isCost} />
    </div>
  );
}

/* ─── Section group label ─── */
function SectionLabel({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={4} className="px-5 pt-5 pb-1">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 bg-muted/60 px-3 py-1 rounded-md">
          {label}
        </span>
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
  const [flashCalc, setFlashCalc] = useState(0);

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

  const funnel = useMemo(() => runFunnel(editables, lastTrioEdit), [editables, lastTrioEdit]);

  const [showFlash, setShowFlash] = useState(false);
  useEffect(() => {
    if (flashCalc > 0) {
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [flashCalc]);

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

  const handleFieldReset = useCallback((key: EditableKey) => {
    setEditables(prev => ({ ...prev, [key]: realValues[key] }));
    setEditedSet(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setFlashCalc(c => c + 1);
  }, [realValues]);

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

  const inp = (key: EditableKey, opts: { prefix?: string; suffix?: string; isInteger?: boolean; widthClass?: string }) => (
    <NumInput
      value={funnel[key]}
      onChange={(v) => handleEdit(key, v)}
      prefix={opts.prefix}
      suffix={opts.suffix}
      isInteger={opts.isInteger}
      editedByUser={editedSet.has(key)}
      onReset={() => handleFieldReset(key)}
      widthClass={opts.widthClass}
    />
  );

  // Cost metrics — lower is better
  const costKeys = new Set(['Investimento', 'CPL', 'CPMQL', 'Custo por Comparecimento', 'CAC']);

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

  // Funnel visual data
  const funnelSteps = [
    { label: 'Leads', value: fmtInt(funnel.leads), rate: fmtPct(funnel.txQualif), rateLabel: 'Qualif.', rateGood: benchmarks.txQualif ? (funnel.txQualif >= benchmarks.txQualif ? true : false) : null },
    { label: 'MQL', value: fmtInt(funnel.mql), rate: fmtPct(funnel.txAgend), rateLabel: 'Agend.', rateGood: funnel.txAgend >= benchmarks.txAgend ? true : false },
    { label: 'Agendamentos', value: fmtInt(funnel.agendamentos), rate: fmtPct(funnel.txCompar), rateLabel: 'Comp.', rateGood: funnel.txCompar >= benchmarks.txCompar ? true : false },
    { label: 'Reuniões', value: fmtInt(funnel.reunioes), rate: fmtPct(funnel.txConv), rateLabel: 'Conv.', rateGood: funnel.txConv >= benchmarks.txConv ? true : false },
    { label: 'Vendas', value: fmtInt(funnel.vendas) },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Matemarketing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simule cenários no funil Inbound e planeje suas metas
        </p>
      </div>

      {/* Month selector */}
      <div
        className="flex flex-wrap items-center gap-3 animate-fade-in-up"
        style={{ animationDelay: '40ms', animationFillMode: 'both' }}
      >
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

      {/* ─── Funnel visual card ─── */}
      <Card
        className="border rounded-2xl overflow-hidden animate-fade-in-up"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <CardContent className="p-6">
          {/* Horizontal funnel steps */}
          <div className="flex items-start justify-between gap-2 flex-wrap md:flex-nowrap">
            {funnelSteps.map((step, i) => (
              <FunnelStep
                key={step.label}
                {...step}
                isLast={i === funnelSteps.length - 1}
                delay={120 + i * 40}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-5" />

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryKPI
              label="Investimento simulado"
              value={fmtBRL(funnel.investimento)}
              sim={funnel.investimento}
              real={realValues.investimento}
              isCost
              delay={320}
            />
            <SummaryKPI
              label="CAC simulado"
              value={fmtBRL(funnel.cac)}
              sim={funnel.cac}
              real={realDerived.cac}
              isCost
              delay={360}
            />
            <SummaryKPI
              label="Receita simulada"
              value={fmtBRL(funnel.receita)}
              sim={funnel.receita}
              real={realDerived.receita}
              accent
              delay={400}
            />
            <SummaryKPI
              label="ROI simulado"
              value={fmtPct(funnel.roi)}
              sim={funnel.roi}
              real={realDerived.roi}
              accent
              delay={440}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Simulation table ─── */}
      <Card
        className="border rounded-2xl overflow-hidden animate-fade-in-up"
        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
      >
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sticky left-0 bg-muted/50">
                    Métrica
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-[160px]">
                    Realizado
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-[200px]">
                    Simulado
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-[100px]">
                    Variação
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((row, idx) => {
                  const isCostLabel = costKeys.has(row.label);
                  const TrendIcon = isCostLabel ? TrendingDown : TrendingUp;
                  const showTrend = ['Investimento', 'CPL', 'CPMQL', 'Custo por Comparecimento', 'CAC', 'Leads', 'MQL', 'Vendas', 'Receita', 'ROI'].includes(row.label);

                  return (
                    <React.Fragment key={row.label}>
                      {row.sectionLabel && <SectionLabel label={row.sectionLabel} />}
                      <tr
                        className={cn(
                          'border-b border-border/50 last:border-0 transition-colors duration-150 h-[52px]',
                          row.highlight
                            ? 'bg-primary/[0.03] border-l-[3px] border-l-primary'
                            : 'hover:bg-gradient-to-r hover:from-primary/[0.03] hover:to-transparent',
                        )}
                      >
                        <td className="px-5 py-2 sticky left-0 bg-card">
                          <div className="flex items-center gap-1.5">
                            {showTrend && (
                              <TrendIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                            )}
                            <div>
                              <span className="font-semibold text-foreground text-[14px]">{row.label}</span>
                              {row.benchKey && (
                                <div><BenchLabel benchKey={row.benchKey} simValue={row.variationSim} /></div>
                              )}
                            </div>
                          </div>
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
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
