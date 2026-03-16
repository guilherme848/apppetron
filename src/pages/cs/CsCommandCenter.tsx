import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, Rocket, AlertTriangle, Star, TrendingDown, DollarSign,
  RotateCcw, ChevronRight, Clock, Calendar, Activity, UserMinus,
  Info, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { useCsOverview, CsAlert, ChurnDimensionItem, CohortRow } from '@/hooks/useCsOverview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Helpers ───
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

const sectionTitleClass = "text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

const planColorMap: Record<string, string> = {
  Start: 'hsl(var(--muted-foreground))',
  Performance: 'hsl(var(--info))',
  Escala: 'hsl(var(--primary))',
  Growth: 'hsl(258, 90%, 66%)',
};

// ─── Section separator ───
function SectionSeparator() {
  return (
    <hr
      className="border-none h-px my-6"
      style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border)), transparent)' }}
    />
  );
}

// ─── Shimmer placeholder ───
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

// ─── KPI Card ───
function KpiCard({
  label, value, subtitle, icon: Icon, color, critical, mono = true, onClick, badge,
}: {
  label: string; value: string | number; subtitle: string;
  icon: React.ElementType; color: string; critical?: boolean;
  mono?: boolean; onClick?: () => void; badge?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl p-5 border border-border bg-card transition-all duration-150",
        "hover:translate-x-0.5",
        onClick && "cursor-pointer",
        critical && "shadow-[0_0_24px_var(--kpi-glow)]",
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color,
        // @ts-ignore
        '--kpi-glow': critical ? `${color}15` : 'transparent',
      } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className={cn("text-[32px] font-extrabold leading-none", mono && "font-mono")} style={{ color: critical ? color : undefined }}>
        {value}
      </div>
      <p className="text-[12px] text-muted-foreground mt-1.5">{subtitle}</p>
      {badge && (
        <span className="absolute top-4 right-12 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{badge}</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function CsCommandCenter() {
  const navigate = useNavigate();
  const healthRef = useRef<HTMLDivElement>(null);
  const {
    loading, selectedMonth, setSelectedMonth, monthOptions, isCurrentMonth,
    selectedMonthLabel, kpiData, alerts, healthDist, churnByNiche, churnByPlan, cohortData,
  } = useCsOverview();

  const todayLabel = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // ─── HEADER ───
  const header = (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">Customer Success · {todayLabel}</p>
      </div>
      {/* Month filter */}
      <div className="flex items-center gap-2">
        {!isCurrentMonth && (
          <button
            onClick={() => setSelectedMonth(startOfMonth(new Date()))}
            className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Mês atual
          </button>
        )}
        <Select
          value={selectedMonth.toISOString()}
          onValueChange={(v) => setSelectedMonth(new Date(v))}
        >
          <SelectTrigger className="w-[200px] h-10 rounded-lg bg-card border-border text-sm focus:ring-primary/10 focus:ring-offset-0 focus:border-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ─── KPIs ───
  const kpis = (
    <section className="animate-fade-in" style={{ animationDelay: '0ms' }}>
      <h2 className={cn(sectionTitleClass, 'mb-4')}>KPIs Executivos</h2>
      {loading ? <SectionSkeleton rows={2} /> : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Clientes Ativos" value={kpiData.activeClients} subtitle="clientes em carteira"
            icon={Users} color="hsl(var(--info))" />
          <KpiCard
            label="Em Onboarding" value={kpiData.onboardingClients}
            subtitle={kpiData.onboardingDelayed > 0
              ? `${kpiData.onboardingOnTime} no prazo · ${kpiData.onboardingDelayed} atrasados`
              : `${kpiData.onboardingOnTime} no prazo`}
            icon={Rocket} color="hsl(var(--primary))"
          />
          <KpiCard label="Em Risco" value={kpiData.atRiskClients} subtitle="requerem atenção imediata"
            icon={AlertTriangle} color="hsl(var(--destructive))" critical={kpiData.atRiskClients > 0}
            onClick={() => healthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          <KpiCard label="NPS Médio" value="—" subtitle="NPS disponível em breve"
            icon={Star} color="hsl(var(--success))" mono={false} badge="Em breve" />
          <KpiCard label="Churn no Período" value={kpiData.churnCount} subtitle={selectedMonthLabel}
            icon={TrendingDown} color="hsl(var(--destructive))" critical={kpiData.churnCount > 0} />
          <KpiCard
            label="Receita em Risco" value={formatCurrency(kpiData.revenueAtRisk)}
            subtitle="soma dos contratos em risco"
            icon={DollarSign} color="hsl(var(--warning))"
          />
        </div>
      )}
    </section>
  );

  // ─── ALERTS ───
  const alertSection = (
    <section className="animate-fade-in" style={{ animationDelay: '40ms' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className={sectionTitleClass}>Alertas do Dia</h2>
          {alerts.length > 0 && (
            <span className="text-[11px] font-semibold rounded-xl px-2 py-0.5"
              style={{ background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }}>
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <button className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Ver todos <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {loading ? <SectionSkeleton rows={2} /> : alerts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center"
          style={{ background: 'radial-gradient(ellipse at center, hsl(var(--success) / 0.04), transparent)' }}>
          <ShieldCheck className="h-12 w-12 mx-auto text-success mb-3 opacity-60" />
          <p className="font-semibold text-foreground">Tudo em ordem por hoje</p>
          <p className="text-sm text-muted-foreground mt-1">Nenhum alerta ativo no momento.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 divide-y divide-border">
          {alerts.map(a => (
            <AlertRow key={a.id} alert={a} onResolve={() => navigate(`/cs/client/${a.clientId}`)} />
          ))}
        </div>
      )}
    </section>
  );

  // ─── HEALTH ───
  const healthSection = (
    <section ref={healthRef} className="animate-fade-in scroll-mt-32" style={{ animationDelay: '80ms' }}>
      <h2 className={cn(sectionTitleClass, 'mb-4')}>Distribuição de Health</h2>
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl p-3 mb-4"
        style={{ background: 'hsl(var(--info) / 0.08)', border: '1px solid hsl(var(--info) / 0.2)' }}>
        <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--info))' }} />
        <p className="text-[13px] text-muted-foreground">
          A classificação de health será definida pelo NPS e pelas Reuniões de Acompanhamento.
          Por enquanto, exibindo dados do Checkup do Cliente.
        </p>
      </div>
      {loading ? <SectionSkeleton rows={2} /> : <HealthCard data={healthDist} onClientClick={(id) => navigate(`/crm/${id}`)} />}
    </section>
  );

  // ─── CHURN ───
  const churnSection = (
    <section className="animate-fade-in" style={{ animationDelay: '120ms' }}>
      <h2 className={cn(sectionTitleClass, 'mb-4')}>Churn por Dimensões</h2>
      {loading ? <SectionSkeleton rows={2} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChurnCard title="Churn por Nicho" data={churnByNiche} monthLabel={selectedMonthLabel} />
          <ChurnPlanCard title="Churn por Plano" data={churnByPlan} monthLabel={selectedMonthLabel} />
        </div>
      )}
    </section>
  );

  // ─── COHORTS ───
  const cohortsSection = (
    <section className="animate-fade-in" style={{ animationDelay: '160ms' }}>
      <h2 className={cn(sectionTitleClass, 'mb-4')}>Retenção por Coorte</h2>
      {loading ? <SectionSkeleton rows={4} /> : <CohortTable data={cohortData} />}
    </section>
  );

  return (
    <div className="space-y-0 pb-12">
      {header}
      <div className="mt-6" />
      {kpis}
      <SectionSeparator />
      {alertSection}
      <SectionSeparator />
      {healthSection}
      <SectionSeparator />
      {churnSection}
      <SectionSeparator />
      {cohortsSection}
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

function AlertRow({ alert, onResolve }: { alert: CsAlert; onResolve: () => void }) {
  const iconMap: Record<CsAlert['type'], React.ElementType> = {
    onboarding_delayed: Clock,
    meeting_overdue: Calendar,
    traffic_no_checkin: Activity,
    recent_churn: UserMinus,
  };
  const colorMap: Record<CsAlert['type'], string> = {
    onboarding_delayed: 'hsl(var(--destructive))',
    meeting_overdue: 'hsl(var(--warning))',
    traffic_no_checkin: 'hsl(var(--warning))',
    recent_churn: 'hsl(var(--destructive))',
  };
  const Icon = iconMap[alert.type];
  const color = colorMap[alert.type];

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{alert.clientName}</p>
        <p className="text-xs text-muted-foreground">{alert.details}</p>
      </div>
      <Button variant="outline" size="sm" className="text-xs h-7 px-3 rounded-md shrink-0" onClick={onResolve}>
        Resolver
      </Button>
    </div>
  );
}

function HealthCard({ data, onClientClick }: { data: any; onClientClick: (id: string) => void }) {
  const total = data.healthy + data.attention + data.critical + data.unclassified;
  const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

  const segments = [
    { label: 'Saudável', value: data.healthy, color: 'hsl(var(--success))', pct: pct(data.healthy) },
    { label: 'Atenção', value: data.attention, color: 'hsl(var(--warning))', pct: pct(data.attention) },
    { label: 'Crítico', value: data.critical, color: 'hsl(var(--destructive))', pct: pct(data.critical) },
    { label: 'Sem classificação', value: data.unclassified, color: 'hsl(var(--muted-foreground))', pct: pct(data.unclassified) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* Bar */}
      <div className="h-2.5 rounded-md overflow-hidden flex mb-5">
        {segments.map((s, i) => (
          <div key={i} className="transition-all duration-600 ease-out" style={{ width: `${s.pct}%`, background: s.color }} />
        ))}
      </div>
      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: s.color }} />
            <div>
              <p className="text-[13px] text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-extrabold font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[12px] text-muted-foreground">{s.pct}%</p>
            </div>
          </div>
        ))}
      </div>
      {/* Critical highlight */}
      {data.criticalClients.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground mb-2">Críticos em destaque</p>
          {data.criticalClients.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.25)' }}>
                  Perfil D
                </span>
              </div>
              <div className="flex items-center gap-3">
                {c.csOwner && <span className="text-xs text-muted-foreground">{c.csOwner}</span>}
                <button onClick={() => onClientClick(c.id)}
                  className="text-[12px] font-medium text-primary hover:underline">
                  Ver cliente
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.critical === 0 && (
        <p className="text-sm text-center py-2" style={{ color: 'hsl(var(--success))' }}>Nenhum cliente crítico</p>
      )}
    </div>
  );
}

function ChurnCard({ title, data, monthLabel }: { title: string; data: ChurnDimensionItem[]; monthLabel: string }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        <p className="text-muted-foreground text-center py-8 text-sm">Sem churn registrado em {monthLabel}</p>
      </div>
    );
  }

  const chartData = data.slice(0, 8).map(d => ({
    name: d.name.length > 18 ? d.name.substring(0, 18) + '…' : d.name,
    value: d.churnCount,
    rate: d.churnRate,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="h-[180px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`${v} clientes`]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--destructive))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Nicho</TableHead><TableHead className="text-right">Taxa</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 5).map(d => (
            <TableRow key={d.name}>
              <TableCell className="font-medium text-sm">{d.name}</TableCell>
              <TableCell className="text-right text-sm font-mono">{d.churnRate.toFixed(1)}%</TableCell>
              <TableCell className="text-right text-sm font-mono">{d.churnCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ChurnPlanCard({ title, data, monthLabel }: { title: string; data: ChurnDimensionItem[]; monthLabel: string }) {
  const hasChurn = data.some(d => d.churnCount > 0);

  if (!hasChurn) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        <p className="text-muted-foreground text-center py-8 text-sm">Sem churn registrado em {monthLabel}</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.name,
    value: d.churnCount,
    rate: d.churnRate,
    color: planColorMap[d.name] || 'hsl(var(--muted-foreground))',
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="h-[180px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`${v} clientes`]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Plano</TableHead><TableHead className="text-right">Taxa</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {data.map(d => (
            <TableRow key={d.name}>
              <TableCell className="font-medium text-sm">{d.name}</TableCell>
              <TableCell className="text-right text-sm font-mono">{d.churnRate.toFixed(1)}%</TableCell>
              <TableCell className="text-right text-sm font-mono">{d.churnCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CohortTable({ data }: { data: CohortRow[] }) {
  const months = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];

  const getCellStyle = (val: number | null): React.CSSProperties => {
    if (val === null) return {};
    if (val >= 90) return { background: 'hsl(var(--success) / 0.2)', color: 'hsl(var(--success))' };
    if (val >= 70) return { background: 'hsl(var(--info) / 0.2)', color: 'hsl(var(--info))' };
    if (val >= 50) return { background: 'hsl(var(--warning) / 0.2)', color: 'hsl(var(--warning))' };
    if (val >= 30) return { background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' };
    return { background: 'hsl(var(--destructive) / 0.25)', color: 'hsl(var(--destructive))', fontWeight: 600 };
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[12px] text-muted-foreground mb-4">
        Cada linha representa clientes que entraram no mesmo mês. Os valores mostram a % que permaneceu ativa mês a mês.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 text-[11px] font-semibold uppercase text-muted-foreground sticky left-0 bg-card">Coorte</th>
              <th className="text-center p-2 text-[11px] font-semibold uppercase text-muted-foreground">N</th>
              {months.map(m => (
                <th key={m} className="text-center p-2 text-[11px] font-semibold uppercase text-muted-foreground">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.label} className="border-b border-border last:border-0" style={{ height: 44 }}>
                <td className="p-2 text-[13px] font-semibold sticky left-0 bg-card">{row.label}</td>
                <td className="text-center p-2 text-[13px] font-mono text-muted-foreground">{row.totalClients || '—'}</td>
                {row.months.map((val, i) => (
                  <td key={i} className="p-1 text-center">
                    {val !== null ? (
                      <span className="inline-block rounded px-2 py-1 text-xs font-mono" style={getCellStyle(val)}>
                        {val}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
