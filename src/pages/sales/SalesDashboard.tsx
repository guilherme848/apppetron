import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { DC } from '@/lib/dashboardColors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { differenceInDays, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SalesDashboard() {
  const {
    funnels, stages, deals, activities, loading,
    openDeals, totalPipelineValue,
    todayActivities, todayCompleted, overdueActivities,
    conversionRate, getStagesByFunnel, getDealsByFunnel,
  } = useSalesCrmData();

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');

  // Auto-select first funnel
  const activeFunnelId = selectedFunnelId || funnels[0]?.id || '';
  const funnelStages = getStagesByFunnel(activeFunnelId);
  const funnelDeals = getDealsByFunnel(activeFunnelId);

  // Funnel chart data
  const funnelChartData = funnelStages.map(stage => {
    const stageDeals = funnelDeals.filter(d => d.stage_id === stage.id);
    const totalValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
    return {
      name: stage.name,
      deals: stageDeals.length,
      value: totalValue,
      color: stage.color,
    };
  });

  // Monthly closed deals (last 6 months)
  const monthlyData = Array.from({ length: 7 }, (_, i) => {
    const date = subMonths(new Date(), 6 - i);
    const start = startOfMonth(date).toISOString();
    const end = endOfMonth(date).toISOString();
    const closed = deals.filter(d => d.status === 'won' && d.closed_at && d.closed_at >= start && d.closed_at <= end);
    return {
      month: format(date, 'MMM', { locale: ptBR }),
      count: closed.length,
      value: closed.reduce((s, d) => s + Number(d.value || 0), 0),
    };
  });

  // Deals needing attention (no activity > 5 days or overdue activity)
  const now = new Date();
  const attentionDeals = openDeals.filter(deal => {
    const dealActivities = activities.filter(a => a.deal_id === deal.id);
    const lastActivity = dealActivities.sort((a, b) =>
      new Date(b.scheduled_at || b.created_at).getTime() - new Date(a.scheduled_at || a.created_at).getTime()
    )[0];
    const daysSinceActivity = lastActivity
      ? differenceInDays(now, new Date(lastActivity.scheduled_at || lastActivity.created_at))
      : differenceInDays(now, new Date(deal.created_at));
    return daysSinceActivity > 3;
  }).map(deal => {
    const dealActivities = activities.filter(a => a.deal_id === deal.id);
    const lastActivity = dealActivities.sort((a, b) =>
      new Date(b.scheduled_at || b.created_at).getTime() - new Date(a.scheduled_at || a.created_at).getTime()
    )[0];
    const daysSinceActivity = lastActivity
      ? differenceInDays(now, new Date(lastActivity.scheduled_at || lastActivity.created_at))
      : differenceInDays(now, new Date(deal.created_at));
    const stage = stages.find(s => s.id === deal.stage_id);
    const funnel = funnels.find(f => f.id === deal.funnel_id);
    return { ...deal, daysSinceActivity, stageName: stage?.name, funnelName: funnel?.name };
  }).sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: DC.textPrimary }}>Dashboard Comercial</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: DC.bgPage }}>
      <h1 className="text-2xl font-bold" style={{ color: DC.textPrimary }}>Dashboard Comercial</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: DC.orange20 }}>
                <TrendingUp className="h-5 w-5" style={{ color: DC.orange }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: DC.textSecondary }}>Negócios Ativos</p>
                <p className="text-2xl font-bold" style={{ color: DC.textPrimary }}>{openDeals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: DC.teal20 }}>
                <DollarSign className="h-5 w-5" style={{ color: DC.teal }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: DC.textSecondary }}>Valor em Pipeline</p>
                <p className="text-2xl font-bold" style={{ color: DC.textPrimary }}>
                  {totalPipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: DC.orange20 }}>
                <Calendar className="h-5 w-5" style={{ color: DC.orange }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: DC.textSecondary }}>Atividades Hoje</p>
                <p className="text-2xl font-bold" style={{ color: DC.textPrimary }}>
                  {todayCompleted} / {todayActivities.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: overdueActivities.length > 0 ? DC.redBg : DC.teal20 }}>
                <AlertTriangle className="h-5 w-5" style={{ color: overdueActivities.length > 0 ? DC.red : DC.teal }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: DC.textSecondary }}>Atrasadas</p>
                <p className="text-2xl font-bold" style={{ color: overdueActivities.length > 0 ? DC.red : DC.textPrimary }}>
                  {overdueActivities.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: DC.teal20 }}>
                <CheckCircle className="h-5 w-5" style={{ color: DC.teal }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: DC.textSecondary }}>Conversão do Mês</p>
                <p className="text-2xl font-bold" style={{ color: DC.textPrimary }}>
                  {conversionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Conversion Chart */}
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg" style={{ color: DC.textPrimary }}>Funil de Conversão</CardTitle>
          <Select value={activeFunnelId} onValueChange={setSelectedFunnelId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione o funil" />
            </SelectTrigger>
            <SelectContent>
              {funnels.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {funnelChartData.length > 0 ? (
            <div className="space-y-2">
              {funnelChartData.map((stage, i) => {
                const maxDeals = Math.max(...funnelChartData.map(s => s.deals), 1);
                const widthPct = Math.max(((maxDeals - i * (maxDeals / funnelChartData.length)) / maxDeals) * 100, 20);
                return (
                  <div key={stage.name} className="flex items-center gap-3">
                    <div
                      className="relative flex items-center justify-between px-4 py-3 rounded-lg transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: stage.color || DC.border,
                        color: i > funnelChartData.length / 2 ? '#fff' : DC.textPrimary,
                        minWidth: 200,
                      }}
                    >
                      <span className="text-sm font-medium">{stage.name}</span>
                      <span className="text-sm font-bold">{stage.deals}</span>
                    </div>
                    <span className="text-xs whitespace-nowrap" style={{ color: DC.textSecondary }}>
                      {stage.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: DC.textSecondary }}>Nenhuma etapa configurada</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Closed Deals Chart */}
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
        <CardHeader>
          <CardTitle className="text-lg" style={{ color: DC.textPrimary }}>Negócios Fechados por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
              <XAxis dataKey="month" tick={{ fill: DC.textSecondary, fontSize: 12 }} />
              <YAxis tick={{ fill: DC.textSecondary, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: DC.bgCard,
                  border: `1px solid ${DC.border}`,
                  borderRadius: 8,
                  color: DC.textPrimary,
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'value') return [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Valor'];
                  return [value, 'Negócios'];
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={DC.orange} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Attention Deals */}
      {attentionDeals.length > 0 && (
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: DC.textPrimary }}>
              <AlertTriangle className="h-5 w-5" style={{ color: DC.red }} />
              Negócios que Precisam de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Dias Parado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionDeals.slice(0, 10).map(deal => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{deal.funnelName}</TableCell>
                    <TableCell>{deal.stageName}</TableCell>
                    <TableCell className="text-right">
                      {Number(deal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>{deal.responsible?.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        style={{
                          backgroundColor: deal.daysSinceActivity > 7 ? DC.red : DC.orange,
                          color: '#fff',
                        }}
                      >
                        {deal.daysSinceActivity}d
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
