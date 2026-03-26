import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ListChecks, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTraffic } from '@/contexts/TrafficContext';
import { useSearchParams } from 'react-router-dom';
import { TrafficCycleTask, TrafficPriority, TRAFFIC_PRIORITY_OPTIONS } from '@/types/traffic';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrafficCycleTasksPage() {
  const { cycles, cycleTasks, loading, addCycleTask, updateCycleTask, deleteCycleTask, getCycleTasksByCycle } = useTraffic();
  const [searchParams] = useSearchParams();

  const initialCycleId = searchParams.get('cycle') || '';
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycleId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TrafficCycleTask | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<TrafficPriority>('medium');
  const [dueOffsetDays, setDueOffsetDays] = useState(0);
  const [taskOrder, setTaskOrder] = useState(0);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (initialCycleId) {
      setSelectedCycleId(initialCycleId);
    }
  }, [initialCycleId]);

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);
  const tasksForCycle = selectedCycleId ? getCycleTasksByCycle(selectedCycleId) : [];
  const filteredTasks = showInactive ? tasksForCycle : tasksForCycle.filter((t) => t.active);

  const handleOpenNew = () => {
    setEditingTask(null);
    setTitle('');
    setDetails('');
    setPriority('medium');
    setDueOffsetDays(0);
    setTaskOrder(tasksForCycle.length + 1);
    setFormOpen(true);
  };

  const handleOpenEdit = (task: TrafficCycleTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDetails(task.details || '');
    setPriority(task.default_priority);
    setDueOffsetDays(task.due_offset_days);
    setTaskOrder(task.task_order);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCycleId) {
      toast.error('Selecione um ciclo');
      return;
    }

    let result;
    if (editingTask) {
      result = await updateCycleTask(editingTask.id, {
        title,
        details: details || null,
        default_priority: priority,
        due_offset_days: dueOffsetDays,
        task_order: taskOrder,
      });
    } else {
      result = await addCycleTask({
        cycle_id: selectedCycleId,
        title,
        details: details || null,
        default_priority: priority,
        due_offset_days: dueOffsetDays,
        task_order: taskOrder,
        active: true,
      });
    }

    if (!result.error) {
      toast.success(editingTask ? 'Tarefa atualizada' : 'Tarefa criada');
      setFormOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string, taskTitle: string) => {
    const result = await deleteCycleTask(id);
    if (!result.error) {
      toast.success(`Tarefa "${taskTitle}" excluída`);
    } else {
      toast.error(result.error);
    }
  };

  const handleToggleActive = async (task: TrafficCycleTask) => {
    await updateCycleTask(task.id, { active: !task.active });
  };

  const getPriorityLabel = (p: TrafficPriority) => {
    const opt = TRAFFIC_PRIORITY_OPTIONS.find((o) => o.value === p);
    return opt?.label || p;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListChecks className="h-6 w-6" />
          Rotina do Ciclo
        </h1>
        <p className="text-muted-foreground">Defina as tarefas padrão que serão geradas em cada ciclo.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Selecione o Ciclo</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Escolha um ciclo" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.name} ({cycle.cadence_days} dias)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCycleId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Tarefas do Ciclo: {selectedCycle?.name}</CardTitle>
              <CardDescription>
                Estas tarefas serão geradas automaticamente a cada novo período.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="showInactive" checked={showInactive} onCheckedChange={setShowInactive} />
                <Label htmlFor="showInactive" className="text-sm">Mostrar inativos</Label>
              </div>
              <Button onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma tarefa cadastrada para este ciclo</p>
                <Button variant="link" onClick={handleOpenNew}>
                  Criar primeira tarefa
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Ordem</TableHead>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Offset (dias)</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="w-[80px]">Ativo</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                          {task.task_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.details && <p className="text-xs text-muted-foreground">{task.details}</p>}
                        </div>
                      </TableCell>
                      <TableCell>+{task.due_offset_days} dias</TableCell>
                      <TableCell>{getPriorityLabel(task.default_priority)}</TableCell>
                      <TableCell>
                        <Switch checked={task.active} onCheckedChange={() => handleToggleActive(task)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(task)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id, task.title)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Título *</Label>
              <Input
                id="taskTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Checar gastos e entrega"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDetails">Detalhes</Label>
              <Textarea
                id="taskDetails"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Descrição detalhada da tarefa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade Padrão</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TrafficPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAFFIC_PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueOffset">Offset de Vencimento (dias)</Label>
                <Input
                  id="dueOffset"
                  type="number"
                  min={0}
                  value={dueOffsetDays}
                  onChange={(e) => setDueOffsetDays(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskOrder">Ordem</Label>
              <Input
                id="taskOrder"
                type="number"
                min={1}
                value={taskOrder}
                onChange={(e) => setTaskOrder(parseInt(e.target.value) || 1)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
