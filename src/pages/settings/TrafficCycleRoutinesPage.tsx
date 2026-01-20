import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Loader2, RefreshCw, ArrowLeft, ListTodo } from 'lucide-react';
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
import { RoutineFrequency, ROUTINE_FREQUENCY_OPTIONS } from '@/types/traffic';

const frequencyColors: Record<RoutineFrequency, string> = {
  daily: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  weekly: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  biweekly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  monthly: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  quarterly: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function TrafficCycleRoutinesPage() {
  const [searchParams] = useSearchParams();
  const cycleId = searchParams.get('cycle');
  
  const { 
    cycles, 
    loading, 
    getRoutinesByCycle,
    getRoutineTasksByRoutine,
    addRoutine, 
    updateRoutine, 
    deleteRoutine, 
    toggleRoutineActive 
  } = useTraffic();

  const cycle = cycles.find((c) => c.id === cycleId);
  const routines = cycleId ? getRoutinesByCycle(cycleId) : [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<RoutineFrequency>('weekly');
  const [description, setDescription] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = (presetFrequency?: RoutineFrequency) => {
    setEditingId(null);
    setName('');
    setFrequency(presetFrequency || 'weekly');
    setDescription('');
    setFormOpen(true);
  };

  const handleOpenEdit = (routine: typeof routines[0]) => {
    setEditingId(routine.id);
    setName(routine.name);
    setFrequency(routine.frequency);
    setDescription(routine.description || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleId) return;

    let result;
    if (editingId) {
      result = await updateRoutine(editingId, { name, frequency, description: description || null });
    } else {
      result = await addRoutine({ cycle_id: cycleId, name, frequency, description: description || undefined });
    }

    if (!result.error) {
      toast.success(editingId ? 'Rotina atualizada' : 'Rotina criada');
      setFormOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string, routineName: string) => {
    const result = await deleteRoutine(id);
    if (!result.error) {
      toast.success(`Rotina "${routineName}" excluída`);
    } else {
      toast.error(result.error);
    }
  };

  const filteredRoutines = useMemo(() => {
    const filtered = showInactive ? routines : routines.filter((r) => r.active);
    // Sort by frequency order
    const frequencyOrder: RoutineFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'];
    return filtered.sort((a, b) => frequencyOrder.indexOf(a.frequency) - frequencyOrder.indexOf(b.frequency));
  }, [routines, showInactive]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cycleId || !cycle) {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Rotinas do Ciclo
          </h1>
          <p className="text-muted-foreground">Selecione um ciclo para gerenciar suas rotinas.</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Nenhum ciclo selecionado.</p>
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

  return (
    <>
      <div className="mb-6">
        <Link 
          to="/settings/general/traffic-cycles" 
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Ciclos
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="h-6 w-6" />
          Rotinas: {cycle.name}
        </h1>
        <p className="text-muted-foreground">
          Gerencie as rotinas deste ciclo (diária, semanal, quinzenal, mensal, trimestral).
        </p>
      </div>

      {/* Quick add buttons */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adicionar Rotina</CardTitle>
          <CardDescription>Clique para adicionar uma rotina com a frequência desejada.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ROUTINE_FREQUENCY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                size="sm"
                onClick={() => handleOpenNew(opt.value)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Lista de Rotinas</CardTitle>
            <CardDescription>Rotinas ativas serão usadas na geração de tarefas.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="showInactive" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="showInactive" className="text-sm">Mostrar inativas</Label>
            </div>
            <Button onClick={() => handleOpenNew()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Rotina
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRoutines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhuma rotina cadastrada' : 'Nenhuma rotina ativa'}
              </p>
              <Button variant="link" onClick={() => handleOpenNew()}>
                Criar primeira rotina
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Tarefas</TableHead>
                  <TableHead className="w-[100px]">Ativa</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutines.map((routine) => {
                  const tasksCount = getRoutineTasksByRoutine(routine.id).length;
                  const freqLabel = ROUTINE_FREQUENCY_OPTIONS.find((o) => o.value === routine.frequency)?.label;
                  return (
                    <TableRow key={routine.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{routine.name}</p>
                          {routine.description && (
                            <p className="text-xs text-muted-foreground">{routine.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={frequencyColors[routine.frequency]} variant="secondary">
                          {freqLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/settings/traffic/routine-tasks?routine=${routine.id}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ListTodo className="h-3 w-3" />
                          {tasksCount} tarefas
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Switch checked={routine.active} onCheckedChange={() => toggleRoutineActive(routine.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(routine)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(routine.id, routine.name)}>
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
            <DialogTitle>{editingId ? 'Editar Rotina' : 'Nova Rotina'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routineName">Nome *</Label>
              <Input
                id="routineName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Otimização diária, Revisão semanal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência *</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RoutineFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUTINE_FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional da rotina"
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
