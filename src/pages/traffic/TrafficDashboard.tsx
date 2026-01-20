import { useState } from 'react';
import { Loader2, AlertTriangle, Clock, CheckCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTraffic } from '@/contexts/TrafficContext';
import { useCrm } from '@/contexts/CrmContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Link } from 'react-router-dom';

export default function TrafficDashboard() {
  const { overdueTasks, todayTasks, openTasks, activePeriods, tasks, getCycleById, loading } = useTraffic();
  const { accounts, getAccountById } = useCrm();
  const { members, getMemberById } = useTeamMembers();

  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  // Get team members who are traffic managers
  const trafficManagers = members.filter((m) => m.active);

  // Apply filters
  const filteredTasks = openTasks.filter((task) => {
    if (filterAssignee !== 'all' && task.assignee_id !== filterAssignee) return false;
    if (filterClient !== 'all' && task.client_id !== filterClient) return false;
    return true;
  });

  const today = new Date().toISOString().split('T')[0];
  const filteredOverdue = filteredTasks.filter((t) => t.due_date && t.due_date < today);
  const filteredToday = filteredTasks.filter((t) => t.due_date === today);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
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
        <h1 className="text-2xl font-bold">Tráfego Pago</h1>
        <p className="text-muted-foreground">Visão geral das tarefas e períodos de tráfego</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="min-w-[200px]">
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por gestor" />
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
        </div>
        <div className="min-w-[200px]">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por cliente" />
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
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{filteredOverdue.length}</div>
            <p className="text-xs text-muted-foreground">Precisam de atenção imediata</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Hoje</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredToday.length}</div>
            <p className="text-xs text-muted-foreground">Vencem hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTasks.length}</div>
            <p className="text-xs text-muted-foreground">Total de tarefas pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Períodos Ativos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePeriods.length}</div>
            <p className="text-xs text-muted-foreground">Clientes com ciclo ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Vencidas */}
      {filteredOverdue.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Tarefas Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Gestor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOverdue.slice(0, 5).map((task) => {
                  const account = getAccountById(task.client_id);
                  const assignee = getMemberById(task.assignee_id);
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Link to={`/traffic/clients/${task.client_id}`} className="hover:underline text-primary">
                          {account?.name || '-'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-destructive">{formatDate(task.due_date)}</TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>{assignee?.name || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredOverdue.length > 5 && (
              <div className="mt-4 text-center">
                <Link to="/traffic/tasks?filter=overdue" className="text-sm text-primary hover:underline">
                  Ver todas as {filteredOverdue.length} tarefas vencidas
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabela de Tarefas de Hoje */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tarefas de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredToday.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma tarefa para hoje</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Gestor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredToday.map((task) => {
                  const account = getAccountById(task.client_id);
                  const assignee = getMemberById(task.assignee_id);
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Link to={`/traffic/clients/${task.client_id}`} className="hover:underline text-primary">
                          {account?.name || '-'}
                        </Link>
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>{assignee?.name || '-'}</TableCell>
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
