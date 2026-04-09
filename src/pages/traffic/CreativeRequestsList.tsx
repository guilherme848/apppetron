import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertTriangle, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreativeRequests } from '@/hooks/useCreativeRequests';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { getRequestStatusVariant, getPriorityVariant } from '@/lib/badgeMaps';
import {
  CREATIVE_REQUEST_STATUS_LABELS,
  CREATIVE_REQUEST_STATUS_OPTIONS,
  CREATIVE_REQUEST_PRIORITY_LABELS,
  CREATIVE_REQUEST_PRIORITY_OPTIONS,
  CREATIVE_REQUEST_FORMAT_LABELS,
  CREATIVE_REQUEST_FORMAT_OPTIONS,
  CreativeRequestStatus,
  CreativeRequestPriority,
} from '@/types/creativeRequests';
import { format } from 'date-fns';

export default function CreativeRequestsList() {
  const navigate = useNavigate();
  const { requests, loading } = useCreativeRequests();
  const { accounts } = useCrmData();
  const { getActiveMembers } = useTeamMembers();

  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [search, setSearch] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const activeAccounts = accounts.filter((a) => a.status === 'active');

  // Quick stats
  const stats = useMemo(() => {
    const openStatuses: CreativeRequestStatus[] = ['open', 'in_progress', 'ready_for_review'];
    return {
      total: requests.length,
      open: requests.filter(r => openStatuses.includes(r.status)).length,
      overdue: requests.filter(r => r.due_date && r.due_date < today && r.status !== 'done' && r.status !== 'canceled').length,
      done: requests.filter(r => r.status === 'done').length,
    };
  }, [requests, today]);

  const filteredRequests = requests.filter((r) => {
    if (filterClient !== 'all' && r.client_id !== filterClient) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned' && r.assignee_id) return false;
      if (filterAssignee !== 'unassigned' && r.assignee_id !== filterAssignee) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !(r.client_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const aOverdue = a.due_date && a.due_date < today && a.status !== 'done';
    const bOverdue = b.due_date && b.due_date < today && b.status !== 'done';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date + 'T00:00:00'), 'dd/MM');
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'done' || status === 'canceled') return false;
    return dueDate < today;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72 mt-2" /></div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitações de Criativo</h1>
          <p className="text-sm text-muted-foreground">Gerencie peças criativas para campanhas de tráfego</p>
        </div>
        <Button onClick={() => navigate('/traffic/creative-requests/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => { setFilterStatus('all'); }}
          className="rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors"
        >
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className="rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors"
        >
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="text-2xl font-bold text-primary">{stats.open}</p>
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors ${stats.overdue > 0 ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}
        >
          <p className="text-xs text-muted-foreground">Vencidas</p>
          <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-destructive' : ''}`}>{stats.overdue}</p>
        </button>
        <button
          onClick={() => setFilterStatus('done')}
          className="rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors"
        >
          <p className="text-xs text-muted-foreground">Concluídas</p>
          <p className="text-2xl font-bold text-success">{stats.done}</p>
        </button>
      </div>

      {/* Filters - compact */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar título ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[160px] h-9">
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
          <SelectTrigger className="w-[150px] h-9">
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
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CREATIVE_REQUEST_PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[150px] h-9">
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
      </div>

      {/* Request Cards */}
      {sortedRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {requests.length === 0
              ? 'Nenhuma solicitação encontrada. Clique em "Nova Solicitação" para criar.'
              : 'Nenhuma solicitação encontrada com os filtros aplicados.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedRequests.map((request) => {
            const overdue = isOverdue(request.due_date, request.status);
            const isDone = request.status === 'done' || request.status === 'canceled';
            return (
              <div
                key={request.id}
                onClick={() => navigate(`/traffic/creative-requests/${request.id}`)}
                className={`group flex items-center gap-4 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                  overdue ? 'border-destructive/30 bg-destructive/5' : isDone ? 'opacity-70' : 'bg-card'
                }`}
              >
                {/* Left: title + client */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {overdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                    <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {request.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                      {CREATIVE_REQUEST_FORMAT_LABELS[request.format]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="truncate">{request.client_name || 'Sem cliente'}</span>
                    {request.assignee_name && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <User className="h-3 w-3" />
                        {request.assignee_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: badges + date */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={getPriorityVariant(request.priority)} className="text-[10px] px-1.5 py-0">
                    {CREATIVE_REQUEST_PRIORITY_LABELS[request.priority]}
                  </Badge>
                  <Badge variant={getRequestStatusVariant(request.status)} className="text-[10px] px-2 py-0">
                    {CREATIVE_REQUEST_STATUS_LABELS[request.status]}
                  </Badge>
                  {request.due_date && (
                    <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      <Clock className="h-3 w-3" />
                      {formatDate(request.due_date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
