import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useExtraRequestsMetrics } from '@/hooks/useExtraRequests';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export function ExtraRequestsMetrics() {
  const { metrics, loading } = useExtraRequestsMetrics();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Skeleton className="h-24 w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const formatMonth = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <FileText className="h-4 w-4" />
              Extras no mês
            </div>
            <CardTitle className="text-2xl">{metrics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="h-4 w-4" />
              Em aberto
            </div>
            <CardTitle className="text-2xl text-primary">{metrics.open}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle2 className="h-4 w-4" />
              Concluídas
            </div>
            <CardTitle className="text-2xl text-muted-foreground">{metrics.done}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={metrics.overdue > 0 ? 'bg-destructive/10' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <AlertTriangle className={`h-4 w-4 ${metrics.overdue > 0 ? 'text-destructive' : ''}`} />
              Atrasadas
            </div>
            <CardTitle className={`text-2xl ${metrics.overdue > 0 ? 'text-destructive' : ''}`}>
              {metrics.overdue}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitações Extras por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.byMonth}>
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
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                <TableHead className="text-right">Abertas</TableHead>
                <TableHead className="text-right">Concluídas</TableHead>
                <TableHead className="text-right">Atrasadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.byMonth.map((row) => (
                <TableRow key={row.month_ref}>
                  <TableCell className="font-medium">{formatMonth(row.month_ref)}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right">
                    {row.open > 0 && <Badge variant="secondary">{row.open}</Badge>}
                    {row.open === 0 && <span className="text-muted-foreground">0</span>}
                  </TableCell>
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
