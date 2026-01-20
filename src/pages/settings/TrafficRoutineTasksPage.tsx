import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Loader2, ListTodo, ArrowLeft, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTraffic } from '@/contexts/TrafficContext';
import { TrafficPriority, TRAFFIC_PRIORITY_OPTIONS, ROUTINE_FREQUENCY_OPTIONS } from '@/types/traffic';

const priorityColors: Record<TrafficPriority, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function TrafficRoutineTasksPage() {
  const [searchParams] = useSearchParams();
  const routineId = searchParams.get('routine');
  
  const { 
    routines,
    cycles,
    loading, 
    getRoutineTasksByRoutine,
    addRoutineTask, 
    updateRoutineTask, 
    deleteRoutineTask 
  } = useTraffic();

  const routine = routines.find((r) => r.id === routineId);
  const cycle = routine ? cycles.find((c) => c.id === routine.cycle_id) : null;
  const tasks = routineId ? getRoutineTasksByRoutine(routineId) : [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [defaultPriority, setDefaultPriority] = useState<TrafficPriority>('medium');
  const [dueOffsetDays, setDueOffsetDays] = useState(0);
  const [taskOrder, setTaskOrder] = useState(0);
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setTitle('');
    setDetails('');
    setDefaultPriority('medium');
    setDueOffsetDays(0);
    setTaskOrder(tasks.length);
    setFormOpen(true);
  };

  const handleOpenEdit = (task: typeof tasks[0]) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDetails(task.details || '');
    setDefaultPriority(task.default_priority);
    setDueOffsetDays(task.due_offset_days);
    setTaskOrder(task.task_order);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineId) return;

    let result;
    if (editingId) {
      result = await updateRoutineTask(editingId, { 
        title, 
        details: details || null, 
        default_priority: defaultPriority,
        due_offset_days: dueOffsetDays,
        task_order: taskOrder,
      });
    } else {
      result = await addRoutineTask({ 
        routine_id: routineId, 
        title, 
        details: details || null, 
        default_priority: defaultPriority,
        due_offset_days: dueOffsetDays,
        task_order: taskOrder,
        active: true,
      });
    }

    if (!result.error) {
      toast.success(editingId ? 'Tarefa atualizada' : 'Tarefa criada');
      setFormOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string, taskTitle: string) => {
    const result = await deleteRoutineTask(id);
    if (!result.error) {
      toast.success(`Tarefa "${taskTitle}" excluída`);
    } else {
      toast.error(result.error);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const result = await updateRoutineTask(id, { active: !currentActive });
    if (result.error) {
      toast.error(result.error);
    }
  };

  const filteredTasks = useMemo(() => {
    const filtered = showInactive ? tasks : tasks.filter((t) => t.active);
    return filtered.sort((a, b) => a.task_order - b.task_order);
  }, [tasks, showInactive]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!routineId || !routine) {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="h-6 w-6" />
            Tarefas da Rotina
          </h1>
          <p className="text-muted-foreground">Selecione uma rotina para gerenciar suas tarefas.</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Nenhuma rotina selecionada.</p>
              <Link to="/settings/general/traffic-cycles">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Ciclos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const freqLabel = ROUTINE_FREQUENCY_OPTIONS.find((o) => o.value === routine.frequency)?.label;

  return (
    <>
      <div className="mb-6">
        <Link 
          to={`/settings/traffic/routines?cycle=${routine.cycle_id}`}
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Rotinas
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListTodo className="h-6 w-6" />
          Tarefas: {routine.name}
        </h1>
        <p className="text-muted-foreground">
          Ciclo: {cycle?.name} • Frequência: {freqLabel}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Lista de Tarefas</CardTitle>
            <CardDescription>Tarefas padrão que serão geradas para cada cliente.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="showInactive" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="showInactive" className="text-sm">Mostrar inativas</Label>
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
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhuma tarefa cadastrada' : 'Nenhuma tarefa ativa'}
              </p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeira tarefa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Offset (dias)</TableHead>
                  <TableHead className="w-[100px]">Ativa</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task, idx) => {
                  const prioLabel = TRAFFIC_PRIORITY_OPTIONS.find((o) => o.value === task.default_priority)?.label;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4" />
                          {idx + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.details && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.details}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[task.default_priority]} variant="secondary">
                          {prioLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.due_offset_days === 0 ? 'Mesmo dia' : `+${task.due_offset_days} dias`}
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={task.active} 
                          onCheckedChange={() => handleToggleActive(task.id, task.active)} 
                        />
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Título *</Label>
              <Input
                id="taskTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Checar gastos, Otimizar criativos"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Detalhes</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Descrição detalhada da tarefa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade Padrão</Label>
                <Select value={defaultPriority} onValueChange={(v) => setDefaultPriority(v as TrafficPriority)}>
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
                <p className="text-xs text-muted-foreground">Dias após o início da rotina</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskOrder">Ordem</Label>
              <Input
                id="taskOrder"
                type="number"
                min={0}
                value={taskOrder}
                onChange={(e) => setTaskOrder(parseInt(e.target.value) || 0)}
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
