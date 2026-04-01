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
type FieldKey =
  | 'investimento' | 'leads' | 'cpl'
  | 'mql' | 'txQualif'
  | 'agendamentos' | 'txAgend'
  | 'reunioes' | 'txCompar'
  | 'vendas' | 'txConv'
  | 'ticketMedio';

type FieldState = { value: number; editedByUser: boolean };
type SimFields = Record<FieldKey, FieldState>;

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

/* ─── Build initial sim fields from real data ─── */
function buildInitialFields(real: Record<FieldKey, number>): SimFields {
  const fields = {} as SimFields;
  for (const key of Object.keys(real) as FieldKey[]) {
    fields[key] = { value: real[key], editedByUser: false };
  }
  return fields;
}

/* ─── Recalculate respecting locks ─── */
function recalculate(fields: SimFields, changedField: FieldKey): SimFields {
  const f = { ...fields };
  // Helper to set a derived field only if not edited by user
  const setIfFree = (key: FieldKey, val: number) => {
    if (!f[key].editedByUser) {
      f[key] = { ...f[key], value: key === 'txQualif' || key === 'txAgend' || key === 'txCompar' || key === 'txConv' ? round1(val) : (key === 'investimento' || key === 'cpl' || key === 'ticketMedio' ? round2(val) : roundInt(val)) };
    }
  };

  const inv = f.investimento.value;
  const leads = f.leads.value;
  const cpl = f.cpl.value;
  const mql = f.mql.value;
  const txQ = f.txQualif.value;
  const agend = f.agendamentos.value;
  const txA = f.txAgend.value;
  const reun = f.reunioes.value;
  const txC = f.txCompar.value;
  const vendas = f.vendas.value;
  const txCv = f.txConv.value;

  switch (changedField) {
    case 'investimento':
      setIfFree('cpl', safe(inv, leads));
      break;

    case 'leads':
      setIfFree('cpl', safe(inv, leads));
      setIfFree('txQualif', pct(mql, leads));
      break;

    case 'cpl':
      if (!f.investimento.editedByUser) {
        setIfFree('investimento', cpl * leads);
      } else if (!f.leads.editedByUser) {
        setIfFree('leads', cpl > 0 ? roundInt(inv / cpl) : 0);
      }
      break;

    case 'mql':
      setIfFree('txQualif', pct(mql, leads));
      setIfFree('txAgend', pct(agend, mql));
      break;

    case 'txQualif':
      setIfFree('mql', roundInt(leads * txQ / 100));
      break;

    case 'agendamentos':
      setIfFree('txAgend', pct(agend, mql));
      setIfFree('txCompar', pct(reun, agend));
      break;

    case 'txAgend':
      setIfFree('agendamentos', roundInt(mql * txA / 100));
      break;

    case 'reunioes':
      setIfFree('txCompar', pct(reun, agend));
      setIfFree('txConv', pct(vendas, reun));
      break;

    case 'txCompar':
      setIfFree('reunioes', roundInt(agend * txC / 100));
      break;

    case 'vendas':
      setIfFree('txConv', pct(vendas, reun));
      break;

    case 'txConv':
      setIfFree('vendas', roundInt(reun * txCv / 100));
      break;

    case 'ticketMedio':
      // Only affects always-calculated fields below
      break;
  }

  return f;
}

/* ─── Always-calculated derived metrics ─── */
function calcDerived(f: SimFields) {
  const inv = f.investimento.value;
  const mql = f.mql.value;
  const reun = f.reunioes.value;
  const vendas = f.vendas.value;
  const ticket = f.ticketMedio.value;
  const cpmql = round2(safe(inv, mql));
  const custoCompar = round2(safe(inv, reun));
  const cac = round2(safe(inv, vendas));
  const receita = round2(vendas * ticket);
  const roi = round1(safe(receita - inv, inv) * 100);
  return { cpmql, custoCompar, cac, receita, roi };
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
  flashKey,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  isInteger?: boolean;
  editedByUser?: boolean;
  onReset?: () => void;
  flashKey?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);

  // Flash animation when value is recalculated (flashKey changes)
  useEffect(() => {
    if (flashKey && flashKey > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [flashKey]);

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
          flash && !editedByUser && 'animate-pulse bg-primary/10',
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

  // Build real data as flat values
  const realValues = useMemo((): Record<FieldKey, number> => {
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

  // Sim state with editedByUser tracking per field
  const [fields, setFields] = useState<SimFields>(() => buildInitialFields(realValues));
  // Flash counter per field for recalc animation
  const [flashCounters, setFlashCounters] = useState<Partial<Record<FieldKey, number>>>({});

  // Reset when real data changes (month change)
  useEffect(() => {
    setFields(buildInitialFields(realValues));
    setFlashCounters({});
  }, [realValues]);

  // Handle user editing a field
  const handleEdit = useCallback((fieldKey: FieldKey, newValue: number) => {
    setFields(prev => {
      const updated = { ...prev };
      updated[fieldKey] = { value: newValue, editedByUser: true };
      const recalced = recalculate(updated, fieldKey);

      // Track which fields were recalculated
      const changedKeys: FieldKey[] = [];
      for (const k of Object.keys(recalced) as FieldKey[]) {
        if (k !== fieldKey && recalced[k].value !== prev[k].value) {
          changedKeys.push(k);
        }
      }
      if (changedKeys.length > 0) {
        setFlashCounters(fc => {
          const next = { ...fc };
          for (const k of changedKeys) {
            next[k] = (next[k] || 0) + 1;
          }
          return next;
        });
      }

      return recalced;
    });
  }, []);

  // Handle individual field reset
  const handleFieldReset = useCallback((fieldKey: FieldKey) => {
    setFields(prev => {
      const updated = { ...prev };
      updated[fieldKey] = { value: realValues[fieldKey], editedByUser: false };
      const recalced = recalculate(updated, fieldKey);
      return recalced;
    });
  }, [realValues]);

  // Full reset
  const resetToReal = useCallback(() => {
    setFields(buildInitialFields(realValues));
    setFlashCounters({});
  }, [realValues]);

  // Derived always-calculated values
  const derived = useMemo(() => calcDerived(fields), [fields]);

  // Real derived
  const realCpl = safe(realValues.investimento, realValues.leads);
  const realCpmql = safe(realValues.investimento, realValues.mql);
  const realCustoCompar = safe(realValues.investimento, realValues.reunioes);
  const realCac = safe(realValues.investimento, realValues.vendas);
  const realReceita = realValues.vendas * realValues.ticketMedio;
  const realRoi = safe(realReceita - realValues.investimento, realValues.investimento) * 100;

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

  // Helper to build NumInput for a field
  const inp = (key: FieldKey, opts: { prefix?: string; suffix?: string; isInteger?: boolean }) => (
    <NumInput
      value={fields[key].value}
      onChange={(v) => handleEdit(key, v)}
      prefix={opts.prefix}
      suffix={opts.suffix}
      isInteger={opts.isInteger}
      editedByUser={fields[key].editedByUser}
      onReset={() => handleFieldReset(key)}
      flashKey={flashCounters[key] || 0}
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

  const f = fields;
  const metrics: MetricRow[] = [
    // AQUISIÇÃO
    {
      sectionLabel: 'AQUISIÇÃO',
      label: 'Investimento',
      realValue: fmtBRL(realValues.investimento),
      simContent: inp('investimento', { prefix: 'R$' }),
      variationSim: f.investimento.value, variationReal: realValues.investimento, isCost: true,
    },
    {
      label: 'CPL',
      realValue: fmtBRL(realCpl),
      simContent: inp('cpl', { prefix: 'R$' }),
      variationSim: f.cpl.value, variationReal: realCpl, isCost: true,
    },
    {
      label: 'Leads',
      realValue: fmtInt(realValues.leads),
      simContent: inp('leads', { isInteger: true }),
      variationSim: f.leads.value, variationReal: realValues.leads,
    },
    // QUALIFICAÇÃO
    {
      sectionLabel: 'QUALIFICAÇÃO',
      label: 'MQL',
      realValue: fmtInt(realValues.mql),
      simContent: inp('mql', { isInteger: true }),
      variationSim: f.mql.value, variationReal: realValues.mql,
    },
    {
      label: 'Tx Qualificação',
      realValue: fmtPct(realValues.txQualif),
      simContent: inp('txQualif', { suffix: '%' }),
      variationSim: f.txQualif.value, variationReal: realValues.txQualif,
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
      realValue: fmtInt(realValues.agendamentos),
      simContent: inp('agendamentos', { isInteger: true }),
      variationSim: f.agendamentos.value, variationReal: realValues.agendamentos,
    },
    {
      label: 'Tx Agendamento',
      benchKey: 'txAgend',
      realValue: fmtPct(realValues.txAgend),
      simContent: inp('txAgend', { suffix: '%' }),
      variationSim: f.txAgend.value, variationReal: realValues.txAgend,
    },
    // REUNIÃO
    {
      sectionLabel: 'REUNIÃO',
      label: 'Reuniões',
      realValue: fmtInt(realValues.reunioes),
      simContent: inp('reunioes', { isInteger: true }),
      variationSim: f.reunioes.value, variationReal: realValues.reunioes,
    },
    {
      label: 'Tx Comparecimento',
      benchKey: 'txCompar',
      realValue: fmtPct(realValues.txCompar),
      simContent: inp('txCompar', { suffix: '%' }),
      variationSim: f.txCompar.value, variationReal: realValues.txCompar,
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
      realValue: fmtInt(realValues.vendas),
      simContent: inp('vendas', { isInteger: true }),
      variationSim: f.vendas.value, variationReal: realValues.vendas,
    },
    {
      label: 'Tx Conversão',
      benchKey: 'txConv',
      realValue: fmtPct(realValues.txConv),
      simContent: inp('txConv', { suffix: '%' }),
      variationSim: f.txConv.value, variationReal: realValues.txConv,
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
      realValue: fmtBRL(realValues.ticketMedio),
      simContent: inp('ticketMedio', { prefix: 'R$' }),
      variationSim: f.ticketMedio.value, variationReal: realValues.ticketMedio,
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
    { label: 'Vendas projetadas', value: fmtInt(f.vendas.value), sim: f.vendas.value, real: realValues.vendas },
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
