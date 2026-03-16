import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, Rocket, AlertTriangle, Star, TrendingDown, DollarSign,
  RotateCcw, ChevronRight, Clock, Calendar, Activity, UserMinus,
  ShieldCheck, AlertCircle, Grid3X3, Percent, BarChart2, TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { useCsOverview, CsAlert, ChurnDimensionItem, CohortRow, FinancialMetrics, ChurnHistoryItem } from '@/hooks/useCsOverview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line, CartesianGrid,
} from 'recharts';
import { tooltipStyle } from '@/lib/dashboardColors';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

const planColorMap: Record<string, string> = {
  Start: 'hsl(var(--muted-foreground))',
  Performance: 'hsl(var(--info))',
  Escala: 'hsl(var(--primary))',
  Growth: 'hsl(258, 90%, 66%)',
};

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

// ─── KPI Card (Dashboard style) ───
function KpiCard({
  label, value, subtitle, icon: Icon, danger, warning, accent, onClick, badge,
}: {
  label: string; value: string | number; subtitle: string;
  icon: React.ElementType; danger?: boolean; warning?: boolean; accent?: boolean;
  onClick?: () => void; badge?: string;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-all duration-150 hover:border-border/80",
        onClick && "cursor-pointer",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className={cn(
          "text-2xl font-bold font-mono",
          danger && "text-destructive",
          warning && "text-warning",
          accent && "text-primary",
          !danger && !warning && !accent && "text-foreground",
        )}>
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {badge && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
export default function CsCommandCenter() {
  const navigate = useNavigate();
  const healthRef = useRef<HTMLDivElement>(null);
  const {
    loading, selectedMonth, setSelectedMonth, monthOptions, isCurrentMonth,
    selectedMonthLabel, kpiData, alerts, healthDist, churnByNiche, churnByPlan, cohortData,
    financialMetrics,
  } = useCsOverview();

  const todayLabel = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Customer Success · {todayLabel}</p>
        </div>
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
            <SelectTrigger className="w-[200px] h-10 rounded-lg bg-card border-border text-sm">
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

      {/* KPIs */}
      {loading ? <SectionSkeleton rows={2} /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Clientes Ativos" value={kpiData.activeClients} subtitle="clientes em carteira"
            icon={Users} />
          <KpiCard
            label="Em Onboarding" value={kpiData.onboardingClients}
            subtitle={kpiData.onboardingDelayed > 0
              ? `${kpiData.onboardingOnTime} no prazo · ${kpiData.onboardingDelayed} atrasados`
              : `${kpiData.onboardingOnTime} no prazo`}
            icon={Rocket} accent={kpiData.onboardingClients > 0}
          />
          <KpiCard label="Em Risco" value={kpiData.atRiskClients} subtitle="requerem atenção imediata"
            icon={AlertTriangle} danger={kpiData.atRiskClients > 0}
            onClick={() => healthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
          <KpiCard label="NPS Médio" value="—" subtitle="disponível em breve"
            icon={Star} badge="Em breve" />
          <KpiCard label="Churn no Período" value={kpiData.churnCount} subtitle={selectedMonthLabel}
            icon={TrendingDown} danger={kpiData.churnCount > 0} />
          <KpiCard
            label="Receita em Risco" value={formatCurrency(kpiData.revenueAtRisk)}
            subtitle="soma dos contratos em risco"
            icon={DollarSign} warning={kpiData.revenueAtRisk > 0}
          />
        </div>
      )}

      {/* FINANCIAL METRICS — LT, LTV, CHURN */}
      {loading ? <SectionSkeleton rows={3} /> : <FinancialSection metrics={financialMetrics} monthLabel={selectedMonthLabel} />}

      {/* ALERTS */}
      {loading ? <SectionSkeleton rows={2} /> : <AlertsCard alerts={alerts} navigate={navigate} />}

      {/* HEALTH */}
      <div ref={healthRef} className="scroll-mt-32">
        {loading ? <SectionSkeleton rows={3} /> : <HealthCard data={healthDist} onClientClick={(id) => navigate(`/crm/${id}`)} />}
      </div>

      {/* CHURN */}
      {loading ? <SectionSkeleton rows={2} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChurnNicheCard data={churnByNiche} monthLabel={selectedMonthLabel} />
          <ChurnPlanCard data={churnByPlan} monthLabel={selectedMonthLabel} />
        </div>
      )}

      {/* COHORTS */}
      {loading ? <SectionSkeleton rows={4} /> : <CohortCard data={cohortData} />}
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

const formatCurrencyFull = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

function FinancialSection({ metrics, monthLabel }: { metrics: FinancialMetrics; monthLabel: string }) {
  const churnRateColor = metrics.churnRate > 5 ? 'text-destructive' : metrics.churnRate > 2 ? 'text-warning' : 'text-success';

  const churnedNames = metrics.churnedClientNames.length <= 3
    ? metrics.churnedClientNames.join(' · ')
    : `${metrics.churnedClientNames.slice(0, 3).join(' · ')} e mais ${metrics.churnedClientNames.length - 3}`;

  return (
    <>
      {/* Row 1: LT & LTV */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all duration-150 hover:border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">LT Médio da Base</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono">{metrics.avgLT.toFixed(1)} meses</div>
            <p className="text-xs text-muted-foreground mt-1.5">tempo médio de permanência dos clientes ativos</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-2">
              Cliente mais antigo: {metrics.maxLT} meses · Cliente mais recente: {metrics.minLT} meses
            </p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-150 hover:border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">LTV Médio</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-primary">{formatCurrencyFull(metrics.avgLTV)}</div>
            <p className="text-xs text-muted-foreground mt-1.5">receita total acumulada média por cliente ativo</p>
            {metrics.maxLTV.name && (
              <p className="text-[11px] text-muted-foreground font-mono mt-2 truncate">
                Maior LTV: {formatCurrencyFull(metrics.maxLTV.value)} ({metrics.maxLTV.name})
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Churn metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all duration-150 hover:border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Churn Rate</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Percent className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className={cn("text-2xl font-bold font-mono", churnRateColor)}>
              {metrics.churnRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{monthLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-2">Meta: ≤ 2%</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-150 hover:border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cancelamentos</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserMinus className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className={cn("text-2xl font-bold font-mono", metrics.churnCount > 0 ? "text-destructive" : "text-foreground")}>
              {metrics.churnCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{monthLabel}</p>
            {metrics.churnCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2 truncate">{churnedNames}</p>
            )}
          </CardContent>
        </Card>
        <Card className="transition-all duration-150 hover:border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Receita Perdida</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className={cn("text-2xl font-bold font-mono", metrics.revenueLost > 0 ? "text-destructive" : "text-muted-foreground")}>
              {formatCurrencyFull(metrics.revenueLost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">em contratos cancelados no mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Churn history chart */}
      <ChurnHistoryCard data={metrics.churnHistory} />
    </>
  );
}

function ChurnHistoryCard({ data }: { data: ChurnHistoryItem[] }) {
  const hasData = data.some(d => d.cancelations > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Churn Histórico</CardTitle>
          </div>
          <CardDescription>Cancelamentos e churn rate dos últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-10 text-muted-foreground text-sm">
            <CheckCircle className="h-6 w-6 text-success mb-2" />
            Sem dados de churn registrados
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Churn Histórico</CardTitle>
        </div>
        <CardDescription>Cancelamentos e churn rate dos últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'cancelations') return [`${value}`, 'Cancelamentos'];
                  if (name === 'churnRate') return [`${value.toFixed(1)}%`, 'Churn Rate'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Bar yAxisId="left" dataKey="cancelations" radius={[4, 4, 0, 0]} name="cancelations">
                {data.map((entry, i) => (
                  <Cell key={i} fill="hsl(var(--destructive))" fillOpacity={entry.isCurrent ? 1 : 0.7} />
                ))}
              </Bar>
              <Line
                yAxisId="right" type="monotone" dataKey="churnRate" name="churnRate"
                stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--warning))' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsCard({ alerts, navigate }: { alerts: CsAlert[]; navigate: ReturnType<typeof useNavigate> }) {
  const iconMap: Record<CsAlert['type'], React.ElementType> = {
    onboarding_delayed: Clock,
    meeting_overdue: Calendar,
    traffic_no_checkin: Activity,
    recent_churn: UserMinus,
  };
  const colorMap: Record<CsAlert['type'], string> = {
    onboarding_delayed: 'bg-destructive',
    meeting_overdue: 'bg-yellow-500',
    traffic_no_checkin: 'bg-yellow-500',
    recent_churn: 'bg-destructive',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Alertas de Hoje</CardTitle>
            {alerts.length > 0 && (
              <span className="text-[11px] font-semibold rounded-xl px-2 py-0.5 bg-destructive/12 text-destructive">
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
      </CardHeader>
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShieldCheck className="h-8 w-8 text-success mb-3 opacity-70" />
            <p className="font-semibold text-sm">Tudo em ordem</p>
            <p className="text-sm text-muted-foreground mt-1">Nenhum alerta ativo no momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {alerts.map(a => {
              const Icon = iconMap[a.type];
              const dotColor = colorMap[a.type];
              return (
                <div key={a.id} className="flex items-center gap-3 py-3 group hover:bg-primary/[0.03] -mx-2 px-2 rounded-md transition-colors">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.clientName}</p>
                    <p className="text-xs text-muted-foreground">{a.details}</p>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="text-xs h-7 px-2.5 rounded-md shrink-0 text-muted-foreground"
                    onClick={() => navigate(`/cs/client/${a.clientId}`)}
                  >
                    Resolver
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Distribuição de Health</CardTitle>
        </div>
        <CardDescription className="text-[13px]">
          Baseado no Checkup do Cliente — será atualizado com NPS e Reuniões
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Distribution bar */}
        <div className="h-2 rounded-md overflow-hidden flex mb-5">
          {segments.map((s, i) => (
            <div key={i} className="transition-all duration-[600ms] ease-out" style={{ width: `${s.pct}%`, background: s.color }} />
          ))}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {segments.map((s, i) => (
            <div key={i} className={cn("flex items-start gap-2", i > 0 && "sm:border-l sm:border-border sm:pl-4")}>
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: s.color }} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-[28px] font-extrabold font-mono leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.pct}%</p>
              </div>
            </div>
          ))}
        </div>

        {/* Critical clients */}
        {data.criticalClients.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">Críticos em destaque</p>
            {data.criticalClients.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 group hover:bg-primary/[0.03] -mx-2 px-2 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-destructive/12 text-destructive">
                    Perfil D
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {c.csOwner && <span className="text-xs text-muted-foreground">{c.csOwner}</span>}
                  <button onClick={() => onClientClick(c.id)}
                    className="text-xs font-medium text-primary hover:underline">
                    Ver cliente
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {data.critical === 0 && (
          <p className="text-sm text-center py-2 text-success">Nenhum cliente crítico</p>
        )}
      </CardContent>
    </Card>
  );
}

function ChurnNicheCard({ data, monthLabel }: { data: ChurnDimensionItem[]; monthLabel: string }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Churn por Nicho</CardTitle>
          <CardDescription>Taxa de cancelamento por segmento de mercado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-muted-foreground text-sm">
            <ShieldCheck className="h-6 w-6 text-success mb-2" />
            Sem churn em {monthLabel}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 8).map(d => ({
    name: d.name.length > 18 ? d.name.substring(0, 18) + '…' : d.name,
    value: d.churnCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Churn por Nicho</CardTitle>
        <CardDescription>Taxa de cancelamento por segmento de mercado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} clientes`]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead className="text-[11px] uppercase">Nicho</TableHead><TableHead className="text-right text-[11px] uppercase">Taxa</TableHead><TableHead className="text-right text-[11px] uppercase">Qtd</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 5).map(d => (
              <TableRow key={d.name} className="hover:bg-primary/[0.03]">
                <TableCell className="font-medium text-sm">{d.name}</TableCell>
                <TableCell className="text-right text-sm font-mono">{d.churnRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-sm font-mono">{d.churnCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChurnPlanCard({ data, monthLabel }: { data: ChurnDimensionItem[]; monthLabel: string }) {
  const hasChurn = data.some(d => d.churnCount > 0);

  if (!hasChurn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Churn por Plano</CardTitle>
          <CardDescription>Taxa de cancelamento por plano contratado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-muted-foreground text-sm">
            <ShieldCheck className="h-6 w-6 text-success mb-2" />
            Sem churn em {monthLabel}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    name: d.name,
    value: d.churnCount,
    color: planColorMap[d.name] || 'hsl(var(--muted-foreground))',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Churn por Plano</CardTitle>
        <CardDescription>Taxa de cancelamento por plano contratado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} clientes`]} />
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
            <TableRow><TableHead className="text-[11px] uppercase">Plano</TableHead><TableHead className="text-right text-[11px] uppercase">Taxa</TableHead><TableHead className="text-right text-[11px] uppercase">Qtd</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.map(d => (
              <TableRow key={d.name} className="hover:bg-primary/[0.03]">
                <TableCell className="font-medium text-sm">{d.name}</TableCell>
                <TableCell className="text-right text-sm font-mono">{d.churnRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-sm font-mono">{d.churnCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getCohortCellColor(value: number | null): string {
  if (value === null) return 'bg-muted/30';
  if (value >= 90) return 'bg-primary/80 text-primary-foreground';
  if (value >= 70) return 'bg-primary/60 text-primary-foreground';
  if (value >= 50) return 'bg-primary/40';
  if (value >= 30) return 'bg-primary/20';
  return 'bg-muted/50';
}

function CohortCard({ data }: { data: CohortRow[] }) {
  const months = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Análise de Cohort</CardTitle>
        </div>
        <CardDescription>Retenção mensal por coorte de entrada (% de clientes ativos)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground border-b">Coorte</th>
                  <th className="text-center p-2 font-medium text-muted-foreground border-b w-12">N</th>
                  {months.map(m => (
                    <th key={m} className="text-center p-2 font-medium text-muted-foreground border-b w-12">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.label} className="border-b border-border/50 last:border-0">
                    <td className="p-2 font-medium text-[13px]">{row.label}</td>
                    <td className="p-2 text-center text-muted-foreground font-mono text-[13px]">{row.totalClients || '—'}</td>
                    {row.months.map((val, i) => (
                      <td key={i} className="p-1">
                        <div className={cn(
                          "flex items-center justify-center h-8 rounded text-xs font-medium font-mono",
                          getCohortCellColor(val),
                        )}>
                          {val !== null ? `${val}%` : '—'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
