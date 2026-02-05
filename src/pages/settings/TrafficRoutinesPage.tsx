import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, RotateCcw, RefreshCw, Layers } from 'lucide-react';
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
import { Link, useSearchParams } from 'react-router-dom';
import { ROUTINE_FREQUENCY_OPTIONS, ANCHOR_RULE_OPTIONS, RoutineFrequency } from '@/types/traffic';

export default function TrafficRoutinesPage() {
  const { 
    trafficRoutines, cycles, routineCycles, loading,
    addTrafficRoutine, updateTrafficRoutine, deleteTrafficRoutine, toggleTrafficRoutineActive,
    addRoutineCycle, updateRoutineCycle, deleteRoutineCycle, toggleRoutineCycleActive,
    getRoutineCyclesByRoutine, getCycleById, getActiveCycles
  } = useTraffic();

  const [searchParams] = useSearchParams();
  const selectedRoutineId = searchParams.get('routine');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Cycle linking
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [frequency, setFrequency] = useState<RoutineFrequency>('weekly');
  const [anchorRule, setAnchorRule] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setFormOpen(true);
  };

  const handleOpenEdit = (routine: typeof trafficRoutines[0]) => {
    setEditingId(routine.id);
    setName(routine.name);
    setDescription(routine.description || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let result;
    if (editingId) {
      result = await updateTrafficRoutine(editingId, { name, description: description || null });
    } else {
      result = await addTrafficRoutine({ name, description: description || undefined });
    }
    if (!result.error) {
      toast.success(editingId ? 'Rotina atualizada' : 'Rotina criada');
      setFormOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string, routineName: string) => {
    const result = await deleteTrafficRoutine(id);
    if (!result.error) {
      toast.success(`Rotina "${routineName}" excluída`);
    } else {
      toast.error(result.error);
    }
  };

  // Cycle management
  const handleOpenAddCycle = (routineId: string) => {
    setEditingCycleId(null);
    setSelectedCycleId('');
    setFrequency('weekly');
    setAnchorRule('_none');
    setSortOrder(getRoutineCyclesByRoutine(routineId).length);
    setCycleFormOpen(true);
  };

  const handleCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoutineId || !selectedCycleId) return;

    let result;
    if (editingCycleId) {
      result = await updateRoutineCycle(editingCycleId, { 
        cycle_id: selectedCycleId, 
        frequency, 
        anchor_rule: anchorRule === '_none' ? null : anchorRule,
        sort_order: sortOrder 
      });
    } else {
      result = await addRoutineCycle({ 
        routine_id: selectedRoutineId, 
        cycle_id: selectedCycleId, 
        frequency,
        anchor_rule: anchorRule === '_none' ? undefined : anchorRule,
        sort_order: sortOrder 
      });
    }

    if (!result.error) {
      toast.success(editingCycleId ? 'Ciclo atualizado' : 'Ciclo adicionado');
      setCycleFormOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const filteredRoutines = showInactive ? trafficRoutines : trafficRoutines.filter((r) => r.active);
  const selectedRoutine = trafficRoutines.find(r => r.id === selectedRoutineId);
  const routineCyclesForSelected = selectedRoutineId ? getRoutineCyclesByRoutine(selectedRoutineId) : [];
  const activeCycles = getActiveCycles();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="h-6 w-6" />
          Rotinas de Tráfego
        </h1>
        <p className="text-muted-foreground">Defina rotinas master que agrupam ciclos com diferentes frequências.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Routines List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Lista de Rotinas</CardTitle>
              <CardDescription>Cada rotina contém ciclos de atividades.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="showInactive" checked={showInactive} onCheckedChange={setShowInactive} />
                <Label htmlFor="showInactive" className="text-sm">Inativos</Label>
              </div>
              <Button size="sm" onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRoutines.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma rotina cadastrada</p>
                <Button variant="link" onClick={handleOpenNew}>Criar primeira rotina</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ciclos</TableHead>
                    <TableHead className="w-[80px]">Ativo</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutines.map((routine) => {
                    const cyclesCount = getRoutineCyclesByRoutine(routine.id).length;
                    const isSelected = routine.id === selectedRoutineId;
                    return (
                      <TableRow key={routine.id} className={isSelected ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <Link 
                            to={`/settings/traffic/routines?routine=${routine.id}`}
                            className="font-medium hover:underline"
                          >
                            {routine.name}
                          </Link>
                          {routine.description && (
                            <p className="text-xs text-muted-foreground">{routine.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cyclesCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch checked={routine.active} onCheckedChange={() => toggleTrafficRoutineActive(routine.id)} />
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

        {/* Routine Cycles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                {selectedRoutine ? `Ciclos de "${selectedRoutine.name}"` : 'Ciclos da Rotina'}
              </CardTitle>
              <CardDescription>
                {selectedRoutine ? 'Ciclos e suas frequências nesta rotina.' : 'Selecione uma rotina para ver seus ciclos.'}
              </CardDescription>
            </div>
            {selectedRoutineId && (
              <Button size="sm" onClick={() => handleOpenAddCycle(selectedRoutineId)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Ciclo
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedRoutineId ? (
              <div className="text-center py-8 text-muted-foreground">
                Clique em uma rotina para gerenciar seus ciclos
              </div>
            ) : routineCyclesForSelected.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum ciclo vinculado</p>
                <Button variant="link" onClick={() => handleOpenAddCycle(selectedRoutineId)}>
                  Adicionar primeiro ciclo
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead className="w-[80px]">Ativo</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routineCyclesForSelected.map((rc) => {
                    const cycle = getCycleById(rc.cycle_id);
                    const freqLabel = ROUTINE_FREQUENCY_OPTIONS.find(f => f.value === rc.frequency)?.label || rc.frequency;
                    return (
                      <TableRow key={rc.id}>
                        <TableCell>
                          <Link to={`/settings/traffic/cycle-tasks?cycle=${rc.cycle_id}`} className="font-medium hover:underline flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {cycle?.name || 'Ciclo removido'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{freqLabel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch checked={rc.active} onCheckedChange={() => toggleRoutineCycleActive(rc.id)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteRoutineCycle(rc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Routine Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Rotina' : 'Nova Rotina'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routineName">Nome *</Label>
              <Input id="routineName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Rotina Completa" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Cycle to Routine Dialog */}
      <Dialog open={cycleFormOpen} onOpenChange={setCycleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Ciclo à Rotina</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCycleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Ciclo *</Label>
              <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <SelectTrigger><SelectValue placeholder="Selecione um ciclo" /></SelectTrigger>
                <SelectContent>
                  {activeCycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequência *</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RoutineFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROUTINE_FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Regra de Ancoragem</Label>
              <Select value={anchorRule} onValueChange={setAnchorRule}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {ANCHOR_RULE_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCycleFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={!selectedCycleId}>Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
