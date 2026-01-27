import { Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrafficAnalytics } from '@/hooks/useTrafficAnalytics';
import { useSettings } from '@/contexts/SettingsContext';
import { PERIOD_OPTIONS } from '@/types/trafficAnalytics';
import { useState } from 'react';

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '—';
  
  switch (unit) {
    case 'BRL':
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    case 'PERCENT':
      return `${value.toFixed(2)}%`;
    default:
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}

export default function TrafficBenchmarks() {
  const { activeMetrics, benchmarks, filters, setFilters, loading } = useTrafficAnalytics();
  const { niches } = useSettings();
  const [selectedNiche, setSelectedNiche] = useState<string>('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Benchmarks</h1>
        <p className="text-muted-foreground">
          Comparativo de performance baseado nos dados internos Petron
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="min-w-[200px]">
              <label className="text-xs text-muted-foreground">Período</label>
              <Select 
                value={filters.period} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, period: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[200px]">
              <label className="text-xs text-muted-foreground">Nicho</label>
              <Select value={selectedNiche} onValueChange={setSelectedNiche}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Global (Todos)</SelectItem>
                  <SelectItem value="_none_">Sem nicho</SelectItem>
                  {niches.map(n => (
                    <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Quartis de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {benchmarks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de benchmark disponível. Importe dados de métricas para gerar benchmarks.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">P25 (25%)</TableHead>
                  <TableHead className="text-right">P50 (Mediana)</TableHead>
                  <TableHead className="text-right">P75 (75%)</TableHead>
                  <TableHead className="text-right">Amostras</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map(bm => {
                  const metric = activeMetrics.find(m => m.slug === bm.metric_slug);
                  if (!metric) return null;
                  
                  return (
                    <TableRow key={bm.metric_slug}>
                      <TableCell className="font-medium">{metric.name}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">{metric.category}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMetricValue(bm.p25, metric.unit)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatMetricValue(bm.p50, metric.unit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMetricValue(bm.p75, metric.unit)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {bm.count}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Como interpretar os benchmarks</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>P25 (25%):</strong> 25% das contas têm valor igual ou inferior a este.
            </p>
            <p>
              <strong>P50 (Mediana):</strong> Metade das contas está acima e metade abaixo deste valor.
            </p>
            <p>
              <strong>P75 (75%):</strong> 75% das contas têm valor igual ou inferior a este.
            </p>
            <p className="pt-2">
              Para métricas onde "menor é melhor" (CPM, CPC, CPA), estar abaixo do P25 é excelente.
              Para métricas onde "maior é melhor" (CTR, ROAS), estar acima do P75 é excelente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
