import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SalesFunnelKPI, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, BarChart3, Filter } from 'lucide-react';
import { parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { SalesFunnelActual } from './SalesFunnelActual';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  kpis: SalesFunnelKPI[];
  year: number;
}

export function FunnelDashboard({ kpis, year }: Props) {
  const [selectedFunnelMonth, setSelectedFunnelMonth] = useState<number | undefined>(undefined);
  // Calculate YTD metrics
  const ytdMetrics = kpis.reduce((acc, kpi) => {
    return {
      investment: acc.investment + (kpi.investment_actual || 0),
      leads: acc.leads + (kpi.leads_actual || 0),
      appointments: acc.appointments + (kpi.appointments_actual || 0),
      meetings: acc.meetings + (kpi.meetings_held_actual || 0),
      sales: acc.sales + (kpi.sales_actual || 0),
      revenue: acc.revenue + (kpi.revenue_actual || 0),
    };
  }, { investment: 0, leads: 0, appointments: 0, meetings: 0, sales: 0, revenue: 0 });

  const ytdCpl = ytdMetrics.leads > 0 ? ytdMetrics.investment / ytdMetrics.leads : 0;
  const ytdRoas = ytdMetrics.investment > 0 ? ytdMetrics.revenue / ytdMetrics.investment : 0;
  const ytdTkm = ytdMetrics.sales > 0 ? ytdMetrics.revenue / ytdMetrics.sales : 0;

  // Latest month with data
  const latestKpi = kpis.find(k => k.leads_actual !== null);

  // Chart data
  const chartData = kpis.map(kpi => {
    const monthIndex = parseISO(kpi.month).getMonth();
    return {
      month: MONTH_NAMES[monthIndex].substring(0, 3),
      leads: kpi.leads_actual || 0,
      leadsTarget: kpi.leads_target || 0,
      sales: kpi.sales_actual || 0,
      salesTarget: kpi.sales_target || 0,
      roas: kpi.roas_actual || 0,
      roasTarget: kpi.roas_target || 0,
      revenue: (kpi.revenue_actual || 0) / 1000,
      revenueTarget: (kpi.revenue_target || 0) / 1000,
    };
  });

  const MomIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-primary" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const AchievementBadge = ({ value }: { value: number | null }) => {
    if (value === null) return <span className="text-muted-foreground">-</span>;
    const color = value >= 100 ? 'text-primary' : value >= 80 ? 'text-attention' : 'text-destructive';
    return <span className={`font-medium ${color}`}>{value.toFixed(0)}%</span>;
  };

  return (
    <div className="space-y-6">
      {/* YTD KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investimento YTD</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ytdMetrics.investment)}</div>
            <p className="text-xs text-muted-foreground">
              CPL médio: {formatCurrency(ytdCpl)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads YTD</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(ytdMetrics.leads)}</div>
            <p className="text-xs text-muted-foreground">
              Reuniões: {formatNumber(ytdMetrics.meetings)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas YTD</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(ytdMetrics.sales)}</div>
            <p className="text-xs text-muted-foreground">
              TKM: {formatCurrency(ytdTkm)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita YTD</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ytdMetrics.revenue)}</div>
            <p className="text-xs text-muted-foreground">
              ROAS: {formatRoas(ytdRoas)}
            </p>
          </CardContent>
        </Card>
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
                <SelectItem key={index} value={index.toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <SalesFunnelActual kpis={kpis} selectedMonth={selectedFunnelMonth} />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads vs Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leadsTarget" name="Meta" fill="hsl(var(--muted))" />
                <Bar dataKey="leads" name="Realizado" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas vs Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="salesTarget" name="Meta" fill="hsl(var(--muted))" />
                <Bar dataKey="sales" name="Realizado" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROAS Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="roasTarget" 
                  name="Meta" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5" 
                />
                <Line 
                  type="monotone" 
                  dataKey="roas" 
                  name="Realizado" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita (mil R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenueTarget" 
                  name="Meta" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5" 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Realizado" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Taxas de Conversão por Etapa</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Mês</TableHead>
                <TableHead className="text-right">Leads → Agend.</TableHead>
                <TableHead className="text-right">Agend. → Reunião</TableHead>
                <TableHead className="text-right">Reunião → Venda</TableHead>
                <TableHead className="text-right">Lead → Venda</TableHead>
                <TableHead className="text-right">% Meta Leads</TableHead>
                <TableHead className="text-right">% Meta Vendas</TableHead>
                <TableHead className="text-right">% Meta Receita</TableHead>
                <TableHead className="text-center">MoM Vendas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((kpi) => {
                const monthIndex = parseISO(kpi.month).getMonth();
                return (
                  <TableRow key={kpi.month}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {MONTH_NAMES[monthIndex]}
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(kpi.conv_leads_to_appointments)}</TableCell>
                    <TableCell className="text-right">{formatPercent(kpi.conv_appointments_to_meetings)}</TableCell>
                    <TableCell className="text-right">{formatPercent(kpi.conv_meetings_to_sales)}</TableCell>
                    <TableCell className="text-right">{formatPercent(kpi.conv_leads_to_sales)}</TableCell>
                    <TableCell className="text-right">
                      <AchievementBadge value={kpi.leads_achievement} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AchievementBadge value={kpi.sales_achievement} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AchievementBadge value={kpi.revenue_achievement} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MomIndicator value={kpi.sales_mom_change} />
                        {kpi.sales_mom_change !== null && (
                          <span className="text-xs">{kpi.sales_mom_change.toFixed(1)}%</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
