import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCreativeRequests } from '@/hooks/useCreativeRequests';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  CREATIVE_REQUEST_STATUS_LABELS,
  CREATIVE_REQUEST_STATUS_OPTIONS,
  CREATIVE_REQUEST_PRIORITY_LABELS,
  CREATIVE_REQUEST_PRIORITY_OPTIONS,
  CREATIVE_REQUEST_FORMAT_LABELS,
  CREATIVE_REQUEST_FORMAT_OPTIONS,
  CREATIVE_RESPONSIBLE_ROLE_OPTIONS,
  CreativeRequestStatus,
  CreativeRequestPriority,
  CreativeRequestFormat,
  CreativeResponsibleRole,
} from '@/types/creativeRequests';
import { format } from 'date-fns';

export default function CreativeRequestsList() {
  const navigate = useNavigate();
  const { requests, loading } = useCreativeRequests();
  const { accounts } = useCrmData();
  const { members, getActiveMembers } = useTeamMembers();

  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterRoleKey, setFilterRoleKey] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [search, setSearch] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const openStatuses: CreativeRequestStatus[] = ['open', 'in_progress', 'ready_for_review', 'approved'];

  const filteredRequests = requests.filter((r) => {
    if (filterClient !== 'all' && r.client_id !== filterClient) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    if (filterFormat !== 'all' && r.format !== filterFormat) return false;
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned' && r.assignee_id) return false;
      if (filterAssignee !== 'unassigned' && r.assignee_id !== filterAssignee) return false;
    }
    if (filterRoleKey !== 'all' && r.responsible_role_key !== filterRoleKey) return false;
    if (showOpenOnly && !openStatuses.includes(r.status)) return false;
    if (showOverdueOnly && (!r.due_date || r.due_date >= today || r.status === 'done' || r.status === 'canceled')) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    // Overdue first
    const aOverdue = a.due_date && a.due_date < today && a.status !== 'done';
    const bOverdue = b.due_date && b.due_date < today && b.status !== 'done';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    // Then by due_date
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getStatusBadge = (status: CreativeRequestStatus) => {
    const variants: Record<CreativeRequestStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      open: 'secondary',
      in_progress: 'default',
      ready_for_review: 'default',
      approved: 'default',
      done: 'outline',
      canceled: 'outline',
    };
    return <Badge variant={variants[status]}>{CREATIVE_REQUEST_STATUS_LABELS[status]}</Badge>;
  };

  const getPriorityBadge = (priority: CreativeRequestPriority) => {
    const classes: Record<CreativeRequestPriority, string> = {
      low: 'bg-gray-400 text-white',
      medium: 'bg-yellow-500 text-black',
      high: 'bg-orange-500 text-white',
      urgent: 'bg-red-500 text-white',
    };
    return <Badge className={classes[priority]}>{CREATIVE_REQUEST_PRIORITY_LABELS[priority]}</Badge>;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy');
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'done' || status === 'canceled') return false;
    return dueDate < today;
  };

  const formatMonthRef = (monthRef: string) => {
    if (!monthRef) return '-';
    const [year, month] = monthRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  const activeAccounts = accounts.filter((a) => a.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Criativo</h1>
          <p className="text-muted-foreground">Gerencie peças criativas para campanhas de tráfego</p>
        </div>
        <Button onClick={() => navigate('/traffic/creatives/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {CREATIVE_REQUEST_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CREATIVE_REQUEST_PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CREATIVE_REQUEST_FORMAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRoleKey} onValueChange={setFilterRoleKey}>
              <SelectTrigger>
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {CREATIVE_RESPONSIBLE_ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unassigned">Sem responsável</SelectItem>
                {getActiveMembers().map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={showOpenOnly ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setShowOpenOnly(!showOpenOnly)}
              >
                Abertas
              </Button>
              <Button
                variant={showOverdueOnly ? 'destructive' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              >
                Vencidas
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {sortedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {requests.length === 0
                ? 'Nenhuma solicitação encontrada. Clique em "Nova Solicitação" para criar.'
                : 'Nenhuma solicitação encontrada com os filtros aplicados.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRequests.map((request) => {
                    const overdue = isOverdue(request.due_date, request.status);
                    return (
                      <TableRow
                        key={request.id}
                        className={overdue ? 'bg-destructive/5' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {overdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            <span className="font-medium">{request.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>{request.client_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{CREATIVE_REQUEST_FORMAT_LABELS[request.format]}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                        <TableCell>{request.assignee_name || '-'}</TableCell>
                        <TableCell className={overdue ? 'text-destructive font-medium' : ''}>
                          {formatDate(request.due_date)}
                        </TableCell>
                        <TableCell>{formatMonthRef(request.month_ref)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/traffic/creatives/${request.id}`)}
                          >
                            Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
