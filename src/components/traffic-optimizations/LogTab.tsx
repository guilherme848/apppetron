import { useState, useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TrafficOptimization, PLATFORM_OPTIONS, TASK_TYPE_OPTIONS } from '@/hooks/useTrafficOptimizations';

// ID do cargo "Gestor de Tráfego"
const TRAFFIC_MANAGER_ROLE_ID = '29521693-8a2e-46fe-81a5-8b78059ad879';

interface Props {
  optimizations: TrafficOptimization[];
  accounts: { id: string; name: string }[];
  teamMembers: { id: string; name: string; role_id?: string | null; active?: boolean }[];
  deleteOptimization: (id: string) => Promise<any>;
}

const TASK_TYPE_MAP: Record<string, { label: string; color: string }> = {
  checkin: { label: 'Check-in', color: 'bg-emerald-100 text-emerald-800' },
  media: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  alta: { label: 'Alta', color: 'bg-red-100 text-red-800' },
};

export function OptimizationLogTab({ optimizations, accounts, teamMembers, deleteOptimization }: Props) {
  const [filterClient, setFilterClient] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filtrar apenas gestores de tráfego para o filtro de responsáveis
  const trafficManagers = useMemo(() => {
    return teamMembers.filter((m) => m.role_id === TRAFFIC_MANAGER_ROLE_ID && m.active !== false);
  }, [teamMembers]);

  const getClientName = (id: string) => accounts.find((a) => a.id === id)?.name || '—';
  const getMemberName = (id: string | null) => (id ? teamMembers.find((m) => m.id === id)?.name || '—' : '—');
  const getPlatformLabel = (v: string) => PLATFORM_OPTIONS.find((p) => p.value === v)?.label || v;

  const filtered = useMemo(() => {
    return optimizations.filter((o) => {
      if (filterClient !== 'all' && o.client_id !== filterClient) return false;
      if (filterPlatform !== 'all' && o.platform !== filterPlatform) return false;
      if (filterType !== 'all' && o.task_type !== filterType) return false;
      if (filterMember !== 'all' && o.member_id !== filterMember) return false;
      if (filterDateFrom && o.optimization_date < filterDateFrom) return false;
      if (filterDateTo && o.optimization_date > filterDateTo) return false;
      return true;
    });
  }, [optimizations, filterClient, filterPlatform, filterType, filterMember, filterDateFrom, filterDateTo]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <span className="text-xs text-muted-foreground">Cliente</span>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Plataforma</span>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PLATFORM_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Tipo</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TASK_TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Responsável</span>
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">De</span>
          <Input type="date" className="h-8 w-[140px]" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Até</span>
          <Input type="date" className="h-8 w-[140px]" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Tempo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhuma otimização encontrada
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
                    <TableCell className="font-medium">{getClientName(opt.client_id)}</TableCell>
                    <TableCell>{getPlatformLabel(opt.platform)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{opt.description || '—'}</TableCell>
                    <TableCell className="text-right">{opt.tempo_gasto_minutos} min</TableCell>
                    <TableCell>{getMemberName(opt.member_id)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(opt.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-right">{filtered.length} registros</p>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir otimização</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteOptimization(deleteId); setDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
