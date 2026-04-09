import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChurnByDimension, MetricMode } from '@/types/commandCenter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChurnByDimensionCardProps {
  title: string;
  data: ChurnByDimension[];
  metricMode: MetricMode;
  onItemClick: (item: ChurnByDimension) => void;
}

export function ChurnByDimensionCard({ title, data, metricMode, onItemClick }: ChurnByDimensionCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const chartData = data.slice(0, 8).map(d => ({
    name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
    value: metricMode === 'mrr' ? d.churnMrr : d.churnCount,
    rate: d.churnRate,
    fullName: d.name,
    id: d.id,
  }));

  const getBarColor = (rate: number) => {
    if (rate >= 10) return 'hsl(var(--destructive))';
    if (rate >= 5) return 'hsl(40, 90%, 50%)';
    return 'hsl(var(--primary))';
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Sem dados no período</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  metricMode === 'mrr' ? formatCurrency(value) : `${value} clientes`,
                  `Taxa: ${props.payload.rate.toFixed(1)}%`
                ]}
                labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.rate)}
                    className="cursor-pointer"
                    onClick={() => onItemClick(data.find(d => d.id === entry.id)!)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top items table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.replace('Churn por ', '')}</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">{metricMode === 'mrr' ? 'MRR' : 'Qtd'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 5).map((item) => (
              <TableRow 
                key={item.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onItemClick(item)}
              >
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant={item.churnRate >= 10 ? 'destructive' : item.churnRate >= 5 ? 'secondary' : 'outline'}
                  >
                    {item.churnRate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {metricMode === 'mrr' ? formatCurrency(item.churnMrr) : item.churnCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface CohortAnalysisCardProps {
  data: {
    cohortMonth: string;
    cohortLabel: string;
    months: (number | null)[];
    totalClients: number;
  }[];
}

export function CohortAnalysisCard({ data }: CohortAnalysisCardProps) {
  const getRetentionColor = (value: number | null) => {
    if (value === null) return 'bg-muted';
    if (value >= 90) return 'bg-success';
    if (value >= 70) return 'bg-success/70';
    if (value >= 50) return 'bg-warning';
    if (value >= 30) return 'bg-warning/70';
    return 'bg-destructive';
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Análise de Coortes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Sem dados suficientes</p>
        </CardContent>
      </Card>
    );
  }

  const months = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Análise de Coortes (Retenção %)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-1 font-medium">Coorte</th>
                <th className="text-center p-1 font-medium">N</th>
                {months.map((m, i) => (
                  <th key={i} className="text-center p-1 font-medium">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(-8).map((cohort) => (
                <tr key={cohort.cohortMonth}>
                  <td className="p-1 font-medium">{cohort.cohortLabel}</td>
                  <td className="text-center p-1">{cohort.totalClients}</td>
                  {cohort.months.map((rate, i) => (
                    <td key={i} className="p-0.5">
                      <div 
                        className={`w-8 h-6 rounded flex items-center justify-center text-white text-xs font-medium ${getRetentionColor(rate)}`}
                      >
                        {rate !== null ? `${rate}` : '-'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success" />
            <span>90%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/70" />
            <span>70-89%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning" />
            <span>50-69%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning/70" />
            <span>30-49%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive" />
            <span>&lt;30%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
