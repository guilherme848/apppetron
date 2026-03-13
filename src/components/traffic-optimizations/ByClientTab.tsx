import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrafficOptimization, PLATFORM_OPTIONS, TASK_TYPE_OPTIONS } from '@/hooks/useTrafficOptimizations';

const TASK_TYPE_MAP: Record<string, { label: string; color: string }> = {
  checkin: { label: 'Leve', color: 'bg-emerald-100 text-emerald-800' },
  media: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  alta: { label: 'Alta', color: 'bg-red-100 text-red-800' },
};

interface Props {
  optimizations: TrafficOptimization[];
  accounts: { id: string; name: string }[];
  teamMembers: { id: string; name: string }[];
}

export function OptimizationByClientTab({ optimizations, accounts, teamMembers }: Props) {
  const [selectedClient, setSelectedClient] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState('all');

  const getMemberName = (id: string | null) => (id ? teamMembers.find((m) => m.id === id)?.name || '—' : '—');
  const getPlatformLabel = (v: string) => PLATFORM_OPTIONS.find((p) => p.value === v)?.label || v;

  const filtered = useMemo(() => {
    if (!selectedClient) return [];
    return optimizations.filter((o) => {
      if (o.client_id !== selectedClient) return false;
      if (filterType !== 'all' && o.task_type !== filterType) return false;
      if (filterDateFrom && o.optimization_date < filterDateFrom) return false;
      if (filterDateTo && o.optimization_date > filterDateTo) return false;
      return true;
    });
  }, [optimizations, selectedClient, filterType, filterDateFrom, filterDateTo]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const totalMinutes = filtered.reduce((sum, o) => sum + o.tempo_gasto_minutos, 0);
    const byType = { checkin: 0, media: 0, alta: 0 };
    filtered.forEach((o) => {
      if (o.task_type in byType) byType[o.task_type as keyof typeof byType]++;
    });
    return { total, totalMinutes, totalHours: (totalMinutes / 60).toFixed(1), byType };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Client selector */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <span className="text-xs text-muted-foreground">Cliente</span>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="h-9 w-[250px]"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Tipo</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TASK_TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">De</span>
          <Input type="date" className="h-9 w-[140px]" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Até</span>
          <Input type="date" className="h-9 w-[140px]" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
      </div>

      {!selectedClient ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Selecione um cliente para visualizar o histórico.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total otimizações</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{summary.totalHours}h</p>
                <p className="text-xs text-muted-foreground">Tempo investido</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{summary.byType.checkin}</p>
                <p className="text-xs text-muted-foreground">Leve</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.byType.media}</p>
                <p className="text-xs text-muted-foreground">Média</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.byType.alta}</p>
                <p className="text-xs text-muted-foreground">Alta</p>
              </CardContent>
            </Card>
          </div>

          {/* History table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((opt) => {
                    const typeInfo = TASK_TYPE_MAP[opt.task_type] || { label: opt.task_type, color: '' };
                    return (
                      <TableRow key={opt.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(opt.optimization_date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{getPlatformLabel(opt.platform)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{opt.description || '—'}</TableCell>
                        <TableCell className="text-right">{opt.tempo_gasto_minutos} min</TableCell>
                        <TableCell>{getMemberName(opt.member_id)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
