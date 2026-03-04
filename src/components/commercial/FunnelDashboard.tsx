import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SalesFunnelKPI, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, BarChart3, Filter, Percent } from 'lucide-react';
import { parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { SalesFunnelActual } from './SalesFunnelActual';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Props {
  kpis: SalesFunnelKPI[];
  year: number;
}

/* ────────── helpers ────────── */

function getMomBadge(value: number | null) {
  if (value === null || value === undefined) return null;
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium",
      isPositive ? "text-primary" : isNeutral ? "text-muted-foreground" : "text-destructive"
    )}>
      {isPositive ? '+' : ''}{value.toFixed(1)}%
      <Icon className="h-3 w-3" />
    </span>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, mom }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  mom?: number | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {mom !== undefined && getMomBadge(mom ?? null)}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

/* custom tooltip */
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{formatter ? formatter(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function FunnelDashboard({ kpis, year }: Props) {
  const currentMonth = new Date().getMonth();
  const [selectedFunnelMonth, setSelectedFunnelMonth] = useState<number | undefined>(currentMonth);

  // Latest month with data for MoM badges
  const kpisWithData = kpis.filter(k => k.leads_actual !== null && k.leads_actual !== 0);
  const latestKpi = kpisWithData.length > 0 ? kpisWithData[kpisWithData.length - 1] : null;

  // Totals based on selected month — always single month, returns zeros if no data
  const totals = useMemo(() => {
    if (selectedFunnelMonth !== undefined) {
      const kpi = kpis.find(k => parseISO(k.month).getMonth() === selectedFunnelMonth);
      if (kpi) return {
        investment: kpi.investment_actual || 0,
        leads: kpi.leads_actual || 0,
        appointments: kpi.appointments_actual || 0,
        meetings: kpi.meetings_held_actual || 0,
        sales: kpi.sales_actual || 0,
        revenue: kpi.revenue_actual || 0,
        mom_leads: kpi.leads_mom_change,
        mom_sales: kpi.sales_mom_change,
        mom_roas: kpi.roas_mom_change,
      };
    }
    // YTD
    const agg = kpis.reduce((acc, kpi) => ({
      investment: acc.investment + (kpi.investment_actual || 0),
      leads: acc.leads + (kpi.leads_actual || 0),
      appointments: acc.appointments + (kpi.appointments_actual || 0),
      meetings: acc.meetings + (kpi.meetings_held_actual || 0),
      sales: acc.sales + (kpi.sales_actual || 0),
      revenue: acc.revenue + (kpi.revenue_actual || 0),
    }), { investment: 0, leads: 0, appointments: 0, meetings: 0, sales: 0, revenue: 0 });
    return {
      ...agg,
      mom_leads: latestKpi?.leads_mom_change ?? null,
      mom_sales: latestKpi?.sales_mom_change ?? null,
      mom_roas: latestKpi?.roas_mom_change ?? null,
    };
  }, [kpis, selectedFunnelMonth, latestKpi]);

  const cpl = totals.leads > 0 ? totals.investment / totals.leads : 0;
  const roas = totals.investment > 0 ? totals.revenue / totals.investment : 0;
  const tkm = totals.sales > 0 ? totals.revenue / totals.sales : 0;

  const periodSuffix = selectedFunnelMonth !== undefined ? MONTH_NAMES[selectedFunnelMonth] : 'YTD';

  // Chart data — month by month
  const chartData = kpis.map(kpi => {
    const mi = parseISO(kpi.month).getMonth();
    return {
      month: MONTH_NAMES[mi].substring(0, 3),
      investimento: kpi.investment_actual || 0,
      leads: kpi.leads_actual || 0,
      agendamentos: kpi.appointments_actual || 0,
      reunioes: kpi.meetings_held_actual || 0,
      vendas: kpi.sales_actual || 0,
      receita: kpi.revenue_actual || 0,
      cpl: kpi.cpl_actual || 0,
      roas: kpi.roas_actual || 0,
      tkm: kpi.avg_ticket_actual || 0,
      convLeadVenda: kpi.conv_leads_to_sales !== null ? +(kpi.conv_leads_to_sales * 100).toFixed(1) : 0,
      convLeadAgend: kpi.conv_leads_to_appointments !== null ? +(kpi.conv_leads_to_appointments * 100).toFixed(1) : 0,
      convAgendReun: kpi.conv_appointments_to_meetings !== null ? +(kpi.conv_appointments_to_meetings * 100).toFixed(1) : 0,
      convReunVenda: kpi.conv_meetings_to_sales !== null ? +(kpi.conv_meetings_to_sales * 100).toFixed(1) : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={`Investimento ${periodSuffix}`}
          value={formatCurrency(totals.investment)}
          subtitle={`CPL: ${formatCurrency(cpl)}`}
          icon={DollarSign}
        />
        <KPICard
          title={`Leads ${periodSuffix}`}
          value={formatNumber(totals.leads)}
          icon={Users}
          mom={totals.mom_leads}
        />
        <KPICard
          title={`Vendas ${periodSuffix}`}
          value={formatNumber(totals.sales)}
          subtitle={`TKM: ${formatCurrency(tkm)}`}
          icon={Target}
          mom={totals.mom_sales}
        />
        <KPICard
          title={`Receita ${periodSuffix}`}
          value={formatCurrency(totals.revenue)}
          subtitle={`ROAS: ${formatRoas(roas)}`}
          icon={BarChart3}
          mom={totals.mom_roas}
        />
      </div>

      {/* Sales Funnel Visualization */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Funil de Vendas (Realizado)
          </CardTitle>
          <Select
            value={selectedFunnelMonth?.toString() ?? 'ytd'}
            onValueChange={(v) => setSelectedFunnelMonth(v === 'ytd' ? undefined : parseInt(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ytd">Ano (YTD)</SelectItem>
              {MONTH_NAMES.map((name, index) => (
                <SelectItem key={index} value={index.toString()}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <SalesFunnelActual kpis={kpis} selectedMonth={selectedFunnelMonth} />
        </CardContent>
      </Card>

      {/* ── Evolução Mês a Mês ── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Evolução Mensal</h2>

        {/* Volume: Leads, Agendamentos, Reuniões, Vendas */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltip formatter={formatNumber} />} />
                  <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos & Reuniões</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltip formatter={formatNumber} />} />
                  <Bar dataKey="agendamentos" name="Agendamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reunioes" name="Reuniões" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltip formatter={formatNumber} />} />
                  <Bar dataKey="vendas" name="Vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="receita"
                    name="Receita"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Financial: Investimento, CPL, ROAS, TKM */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Investimento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                  <Bar dataKey="investimento" name="Investimento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">CPL (Custo por Lead)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                  <Line type="monotone" dataKey="cpl" name="CPL" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ROAS</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatRoas(v)} />} />
                  <Line type="monotone" dataKey="roas" name="ROAS" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                  <Line type="monotone" dataKey="tkm" name="Ticket Médio" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Rates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Taxas de Conversão (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" unit="%" />
                <Tooltip content={<ChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                <Line type="monotone" dataKey="convLeadAgend" name="Lead → Agend." stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="convAgendReun" name="Agend. → Reunião" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="convReunVenda" name="Reunião → Venda" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="convLeadVenda" name="Lead → Venda" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
