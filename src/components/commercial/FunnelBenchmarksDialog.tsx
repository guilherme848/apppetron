import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings } from 'lucide-react';
import { FunnelBenchmark, useFunnelBenchmarks } from '@/hooks/useFunnelBenchmarks';
import { formatPercent, formatRoas } from '@/types/salesFunnel';

interface Props {
  benchmarks: FunnelBenchmark[];
  canEdit: boolean;
  onUpdate: (id: string, data: Partial<Pick<FunnelBenchmark, 'bad_threshold' | 'regular_threshold' | 'good_threshold'>>) => Promise<boolean>;
}

export function FunnelBenchmarksDialog({ benchmarks, canEdit, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    bad: string;
    regular: string;
    good: string;
  }>({ bad: '', regular: '', good: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (benchmark: FunnelBenchmark) => {
    setEditingId(benchmark.id);
    const multiplier = benchmark.is_percentage ? 100 : 1;
    setEditValues({
      bad: (benchmark.bad_threshold * multiplier).toString(),
      regular: (benchmark.regular_threshold * multiplier).toString(),
      good: (benchmark.good_threshold * multiplier).toString(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ bad: '', regular: '', good: '' });
  };

  const saveEdit = async (benchmark: FunnelBenchmark) => {
    setSaving(true);
    const divisor = benchmark.is_percentage ? 100 : 1;
    
    const success = await onUpdate(benchmark.id, {
      bad_threshold: parseFloat(editValues.bad) / divisor,
      regular_threshold: parseFloat(editValues.regular) / divisor,
      good_threshold: parseFloat(editValues.good) / divisor,
    });

    if (success) {
      setEditingId(null);
    }
    setSaving(false);
  };

  const formatValue = (value: number, isPercentage: boolean) => {
    if (isPercentage) {
      return formatPercent(value);
    }
    return `${value.toFixed(1)}x`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Benchmarks
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Benchmarks de Mercado</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure os níveis de benchmark para cada métrica. Os valores serão usados para colorir 
            as células na tabela de Realizado.
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-center text-destructive">Ruim</TableHead>
                <TableHead className="text-center text-warning">Regular</TableHead>
                <TableHead className="text-center text-success">Bom</TableHead>
                {canEdit && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map((benchmark) => (
                <TableRow key={benchmark.id}>
                  <TableCell className="font-medium">{benchmark.metric_label}</TableCell>
                  
                  {editingId === benchmark.id ? (
                    <>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={editValues.bad}
                            onChange={(e) => setEditValues(prev => ({ ...prev, bad: e.target.value }))}
                            className="w-20 h-8"
                          />
                          <span className="text-xs text-muted-foreground">
                            {benchmark.is_percentage ? '%' : 'x'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={editValues.regular}
                            onChange={(e) => setEditValues(prev => ({ ...prev, regular: e.target.value }))}
                            className="w-20 h-8"
                          />
                          <span className="text-xs text-muted-foreground">
                            {benchmark.is_percentage ? '%' : 'x'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={editValues.good}
                            onChange={(e) => setEditValues(prev => ({ ...prev, good: e.target.value }))}
                            className="w-20 h-8"
                          />
                          <span className="text-xs text-muted-foreground">
                            {benchmark.is_percentage ? '%' : 'x'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            ✕
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => saveEdit(benchmark)}
                            disabled={saving}
                          >
                            ✓
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-center text-destructive">
                        {formatValue(benchmark.bad_threshold, benchmark.is_percentage)}
                      </TableCell>
                      <TableCell className="text-center text-warning">
                        {formatValue(benchmark.regular_threshold, benchmark.is_percentage)}
                      </TableCell>
                      <TableCell className="text-center text-success">
                        {formatValue(benchmark.good_threshold, benchmark.is_percentage)}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => startEdit(benchmark)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-destructive" />
              <span>Ruim (abaixo do esperado)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-warning" />
              <span>Regular (aceitável)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-success" />
              <span>Bom (meta atingida)</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
