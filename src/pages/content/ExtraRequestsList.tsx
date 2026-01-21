import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useExtraRequests } from '@/hooks/useExtraRequests';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  EXTRA_REQUEST_STATUS_LABELS,
  EXTRA_REQUEST_PRIORITY_LABELS,
  EXTRA_REQUESTED_BY_ROLE_LABELS,
  EXTRA_RESPONSIBLE_ROLE_LABELS,
  ExtraRequestStatus,
  ExtraRequestPriority,
  ExtraResponsibleRole,
} from '@/types/extraRequests';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ExtraRequestsList() {
  const { requests, loading } = useExtraRequests();
  const { accounts } = useCrmData();
  const { members } = useTeamMembers();

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterResponsibleRole, setFilterResponsibleRole] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterOnlyOpen, setFilterOnlyOpen] = useState(false);

  // Get unique months from requests
  const availableMonths = useMemo(() => {
    const months = new Set(requests.map(r => r.month_ref));
    return Array.from(months).sort().reverse();
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filterMonth && r.month_ref !== filterMonth) return false;
      if (filterClient && r.client_id !== filterClient) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterPriority && r.priority !== filterPriority) return false;
      if (filterResponsibleRole && r.responsible_role_key !== filterResponsibleRole) return false;
      if (filterAssignee && r.assignee_id !== filterAssignee) return false;
      if (filterOnlyOpen && (r.status === 'done' || r.status === 'canceled')) return false;
      return true;
    });
  }, [requests, filterMonth, filterClient, filterStatus, filterPriority, filterResponsibleRole, filterAssignee, filterOnlyOpen]);

  const getStatusVariant = (status: ExtraRequestStatus) => {
    switch (status) {
      case 'done': return 'default';
      case 'in_progress': return 'secondary';
      case 'canceled': return 'outline';
      default: return 'destructive';
    }
  };

  const getPriorityVariant = (priority: ExtraRequestPriority) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  const clearFilters = () => {
    setFilterMonth('');
    setFilterClient('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterResponsibleRole('');
    setFilterAssignee('');
    setFilterOnlyOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Solicitações Extras</h1>
            <p className="text-muted-foreground">Demandas avulsas fora do planejamento</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/content/extra-requests/new">
            <Plus className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os meses</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os clientes</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                {Object.entries(EXTRA_REQUEST_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {Object.entries(EXTRA_REQUEST_PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResponsibleRole} onValueChange={setFilterResponsibleRole}>
              <SelectTrigger>
                <SelectValue placeholder="Cargo Resp." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os cargos</SelectItem>
                {Object.entries(EXTRA_RESPONSIBLE_ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {members.filter(m => m.active).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Mês</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Cargo Resp.</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link to={`/content/extra-requests/${r.id}`} className="font-medium hover:underline">
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell>{r.client_name}</TableCell>
                    <TableCell>{r.month_ref}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {EXTRA_REQUESTED_BY_ROLE_LABELS[r.requested_by_role_key]}
                      </span>
                      {r.requested_by_member_name && (
                        <span className="block text-sm">{r.requested_by_member_name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.responsible_role_key && EXTRA_RESPONSIBLE_ROLE_LABELS[r.responsible_role_key]}
                    </TableCell>
                    <TableCell>{r.assignee_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(r.status)}>
                        {EXTRA_REQUEST_STATUS_LABELS[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(r.priority)}>
                        {EXTRA_REQUEST_PRIORITY_LABELS[r.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.due_date ? format(new Date(r.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
