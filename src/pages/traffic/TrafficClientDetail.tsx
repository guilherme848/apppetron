import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, Circle, PlayCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTraffic } from '@/contexts/TrafficContext';
import { useCrm } from '@/contexts/CrmContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useSettings } from '@/contexts/SettingsContext';
import { TrafficTaskStatus, TRAFFIC_TASK_STATUS_OPTIONS } from '@/types/traffic';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrafficClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const {
    getCycleById,
    getActivePeriodByClient,
    getPeriodsByClient,
    getTasksByPeriod,
    generateCycleTasks,
    updateTrafficTask,
    loading: trafficLoading,
  } = useTraffic();
  const { getAccountById, loading: crmLoading } = useCrm();
  const { getMemberById } = useTeamMembers();
  const { services } = useSettings();

  const [generating, setGenerating] = useState(false);

  const account = getAccountById(id!);
  const activePeriod = getActivePeriodByClient(id!);
  const allPeriods = getPeriodsByClient(id!);
  const periodTasks = activePeriod ? getTasksByPeriod(activePeriod.id) : [];

  // Determine the effective cycle (client override or service default)
  const clientCycleId = (account as any)?.traffic_cycle_id;
  const service = services.find((s) => s.id === account?.service_id);
  const serviceCycleId = (service as any)?.traffic_cycle_id;
  const effectiveCycleId = clientCycleId || serviceCycleId;
  const effectiveCycle = getCycleById(effectiveCycleId);

  const trafficManager = getMemberById(account?.traffic_member_id || null);

  const loading = trafficLoading || crmLoading;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const today = new Date().toISOString().split('T')[0];

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      urgent: 'bg-destructive text-white',
      high: 'bg-primary text-white',
      medium: 'bg-warning text-black',
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
    if (status === 'done') return <CheckCircle className="h-4 w-4 text-success" />;
    if (status === 'doing') return <PlayCircle className="h-4 w-4 text-warning" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const handleGenerateTasks = async () => {
    if (!effectiveCycleId) {
      toast.error('Nenhum ciclo de tráfego definido para este cliente');
      return;
    }
    setGenerating(true);
    const result = await generateCycleTasks(id!, effectiveCycleId, account?.traffic_member_id || null);
    setGenerating(false);
    if (result.success) {
      toast.success('Tarefas do ciclo geradas com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao gerar tarefas');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TrafficTaskStatus) => {
    const result = await updateTrafficTask(taskId, { status: newStatus });
    if (result.error) {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="link" onClick={() => navigate('/traffic')}>
          Voltar para Tráfego
        </Button>
      </div>
    );
  }

  // Sort tasks: uncompleted first, then by due_date
  const sortedTasks = [...periodTasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    return 0;
  });

  // Last 3 closed periods
  const closedPeriods = allPeriods.filter((p) => p.status === 'closed').slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <p className="text-muted-foreground">Tráfego Pago</p>
          </div>
        </div>
        <Button onClick={handleGenerateTasks} disabled={generating || !effectiveCycleId}>
          {generating ? <Skeleton className="h-4 w-16 rounded" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Gerar Tarefas do Ciclo
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{account.service_contracted || service?.name || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ciclo de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {effectiveCycle ? `${effectiveCycle.name} (${effectiveCycle.cadence_days} dias)` : 'Não definido'}
            </p>
            {clientCycleId && <Badge variant="outline" className="mt-1">Override do cliente</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestor de Tráfego
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{trafficManager?.name || 'Não definido'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Período Ativo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Período Ativo</span>
            {activePeriod && (
              <Badge variant="outline">
                {formatDate(activePeriod.period_start)} – {formatDate(activePeriod.period_end)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activePeriod ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Nenhum período ativo</p>
              <Button onClick={handleGenerateTasks} disabled={generating || !effectiveCycleId}>
                Iniciar Novo Ciclo
              </Button>
            </div>
          ) : sortedTasks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma tarefa no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTasks.map((task) => {
                  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                  return (
                    <TableRow key={task.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                      <TableCell>{getStatusIcon(task.status)}</TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {task.title}
                          {task.details && (
                            <p className="text-xs text-muted-foreground">{task.details}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>
                        {formatDate(task.due_date)}
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(v) => handleStatusChange(task.id, v as TrafficTaskStatus)}
                        >
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Períodos */}
      {closedPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Períodos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedPeriods.map((period) => {
                  const cycle = getCycleById(period.cycle_id);
                  return (
                    <TableRow key={period.id}>
                      <TableCell>
                        {formatDate(period.period_start)} – {formatDate(period.period_end)}
                      </TableCell>
                      <TableCell>{cycle?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Encerrado</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
