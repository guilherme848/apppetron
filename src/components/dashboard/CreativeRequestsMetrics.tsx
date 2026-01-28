import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Palette, Clock, CheckCircle2, AlertTriangle, Timer, Users, Building2 } from 'lucide-react';
import { useCreativeRequestsMetrics } from '@/hooks/useCreativeRequests';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function CreativeRequestsMetrics() {
  const { metrics, loading } = useCreativeRequestsMetrics();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const formatMonth = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Palette className="h-4 w-4" />
              Criativos no mês
            </div>
            <CardTitle className="text-2xl">{metrics.totalThisMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="h-4 w-4" />
              Em aberto
            </div>
            <CardTitle className="text-2xl text-primary">{metrics.openCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle2 className="h-4 w-4" />
              Concluídos (mês)
            </div>
            <CardTitle className="text-2xl text-muted-foreground">{metrics.doneCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={metrics.overdueCount > 0 ? 'bg-destructive/10' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <AlertTriangle className={`h-4 w-4 ${metrics.overdueCount > 0 ? 'text-destructive' : ''}`} />
              Atrasados
            </div>
            <CardTitle className={`text-2xl ${metrics.overdueCount > 0 ? 'text-destructive' : ''}`}>
              {metrics.overdueCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Timer className="h-4 w-4" />
              Tempo médio (dias)
            </div>
            <CardTitle className="text-2xl">
              {metrics.avgDeliveryDays !== null ? metrics.avgDeliveryDays : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solicitações por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month_ref" 
                    tickFormatter={formatMonth} 
                    tick={{ fontSize: 10 }} 
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={formatMonth}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="done" name="Concluídos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Top Clientes (mês atual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topClients.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.topClients}
                      dataKey="count"
                      nameKey="client_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ client_name, count }) => `${client_name}: ${count}`}
                      labelLine={false}
                    >
                      {metrics.topClients.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backlog by Assignee */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Backlog por Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topAssignees.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-4">
              Nenhuma solicitação em aberto
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {metrics.topAssignees.map((item, index) => (
                <div key={item.assignee_name} className="flex flex-col items-center p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground truncate max-w-full">{item.assignee_name}</span>
                  <span className="text-2xl font-bold" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                    {item.backlog}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por Mês (últimos 12)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Concluídos</TableHead>
                <TableHead className="text-right">Atrasados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.monthlyData.map((row) => (
                <TableRow key={row.month_ref}>
                  <TableCell className="font-medium">{formatMonth(row.month_ref)}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right">
                    {row.done > 0 && <Badge variant="outline">{row.done}</Badge>}
                    {row.done === 0 && <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.overdue > 0 && <Badge variant="destructive">{row.overdue}</Badge>}
                    {row.overdue === 0 && <span className="text-muted-foreground">0</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
