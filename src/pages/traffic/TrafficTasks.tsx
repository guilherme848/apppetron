import { useState } from 'react';
import { Loader2, CheckCircle, Circle, PlayCircle, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTraffic } from '@/contexts/TrafficContext';
import { useCrm } from '@/contexts/CrmContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Link, useSearchParams } from 'react-router-dom';
import { TrafficTask, TrafficTaskStatus, TRAFFIC_TASK_STATUS_OPTIONS, TRAFFIC_PRIORITY_OPTIONS } from '@/types/traffic';
import { toast } from 'sonner';

export default function TrafficTasks() {
  const { tasks, updateTrafficTask, getCycleById, periods, loading } = useTraffic();
  const { accounts, getAccountById } = useCrm();
  const { members, getMemberById } = useTeamMembers();
  const [searchParams] = useSearchParams();

  const initialFilter = searchParams.get('filter');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilter === 'overdue' ? 'open' : 'all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(initialFilter === 'overdue');
  const [search, setSearch] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Apply filters
  const filteredTasks = tasks.filter((task) => {
    if (filterAssignee !== 'all' && task.assignee_id !== filterAssignee) return false;
    if (filterClient !== 'all' && task.client_id !== filterClient) return false;
    if (filterStatus === 'open' && task.status === 'done') return false;
    if (filterStatus !== 'all' && filterStatus !== 'open' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (showOverdueOnly && (!task.due_date || task.due_date >= today || task.status === 'done')) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Sort: overdue first, then by due_date asc
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aOverdue = a.due_date && a.due_date < today && a.status !== 'done';
    const bOverdue = b.due_date && b.due_date < today && b.status !== 'done';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getPeriodRange = (periodId: string) => {
    const period = periods.find((p) => p.id === periodId);
    if (!period) return '-';
    return `${formatDate(period.period_start)} – ${formatDate(period.period_end)}`;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-black',
      low: 'bg-gray-400 text-white',
    };
    const labels: Record<string, string> = {
      urgent: 'Urgente',
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
    };
    return <Badge className={variants[priority] || 'bg-gray-400'}>{labels[priority] || priority}</Badge>;
  };

  const getStatusIcon = (status: TrafficTaskStatus) => {
    if (status === 'done') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'doing') return <PlayCircle className="h-4 w-4 text-yellow-500" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const handleStatusChange = async (taskId: string, newStatus: TrafficTaskStatus) => {
    const result = await updateTrafficTask(taskId, { status: newStatus });
    if (result.error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado');
    }
  };

  const handleComplete = async (taskId: string) => {
    await handleStatusChange(taskId, 'done');
  };

  const trafficManagers = members.filter((m) => m.active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tarefas de Tráfego</h1>
        <p className="text-muted-foreground">Gerenciamento de tarefas dos gestores de tráfego</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Gestor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gestores</SelectItem>
                {trafficManagers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {accounts
                  .filter((a) => a.status === 'active')
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Em aberto</SelectItem>
                {TRAFFIC_TASK_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {TRAFFIC_PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showOverdueOnly ? 'default' : 'outline'}
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            >
              Vencidas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {sortedTasks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma tarefa encontrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTasks.map((task) => {
                  const account = getAccountById(task.client_id);
                  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                  return (
                    <TableRow key={task.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                      <TableCell>{getStatusIcon(task.status)}</TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {task.title}
                          {task.details && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{task.details}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/traffic/clients/${task.client_id}`} className="hover:underline text-primary">
                          {account?.name || '-'}
                        </Link>
                      </TableCell>
                      <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>
                        {formatDate(task.due_date)}
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v as TrafficTaskStatus)}>
                          <SelectTrigger className="h-8 w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRAFFIC_TASK_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getPeriodRange(task.period_id)}</TableCell>
                      <TableCell>
                        {task.status !== 'done' && (
                          <Button size="sm" variant="ghost" onClick={() => handleComplete(task.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Concluir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
