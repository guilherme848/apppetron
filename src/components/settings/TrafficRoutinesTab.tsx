import { useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Layers } from 'lucide-react';
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
import { ROUTINE_FREQUENCY_OPTIONS, RoutineFrequency } from '@/types/traffic';
import { Skeleton } from '@/components/ui/skeleton';

export function TrafficRoutinesTab() {
  const { 
    trafficRoutines, cycles, routineCycles, loading,
    addTrafficRoutine, updateTrafficRoutine, deleteTrafficRoutine, toggleTrafficRoutineActive,
    addRoutineCycle, deleteRoutineCycle, toggleRoutineCycleActive,
    getRoutineCyclesByRoutine, getCycleById, getActiveCycles
  } = useTraffic();

  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [frequency, setFrequency] = useState<RoutineFrequency>('weekly');

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
      if (selectedRoutineId === id) setSelectedRoutineId(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleOpenAddCycle = () => {
    setSelectedCycleId('');
    setFrequency('weekly'); 
    setCycleFormOpen(true);
  };

  const handleCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoutineId || !selectedCycleId) return;
    const result = await addRoutineCycle({ 
      routine_id: selectedRoutineId, 
      cycle_id: selectedCycleId, 
      frequency,
      sort_order: getRoutineCyclesByRoutine(selectedRoutineId).length 
    });
    if (!result.error) {
      toast.success('Ciclo adicionado');
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
      <div className="flex items-center justify-center h-32">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Rotinas</CardTitle>
              <CardDescription>Agrupam ciclos com frequências.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="showInactiveRoutines" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="showInactiveRoutines" className="text-xs">Inativos</Label>
              <Button size="sm" onClick={handleOpenNew}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRoutines.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Nenhuma rotina</div>
            ) : (
              <div className="space-y-1">
                {filteredRoutines.map((routine) => {
                  const cyclesCount = getRoutineCyclesByRoutine(routine.id).length;
                  const isSelected = routine.id === selectedRoutineId;
                  return (
                    <div
                      key={routine.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedRoutineId(routine.id)}
                    >
                      <div className="flex-1">
                        <span className="font-medium text-sm">{routine.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">{cyclesCount}</Badge>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={routine.active}
                          onCheckedChange={() => toggleTrafficRoutineActive(routine.id)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenEdit(routine); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(routine.id, routine.name); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                {selectedRoutine ? selectedRoutine.name : 'Ciclos'}
              </CardTitle>
              <CardDescription>
                {selectedRoutine ? 'Ciclos desta rotina.' : 'Selecione uma rotina.'}
              </CardDescription>
            </div>
            {selectedRoutineId && (
              <Button size="sm" onClick={handleOpenAddCycle}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedRoutineId ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Clique em uma rotina</div>
            ) : routineCyclesForSelected.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Nenhum ciclo vinculado</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead className="w-[60px]">Ativo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routineCyclesForSelected.map((rc) => {
                    const cycle = getCycleById(rc.cycle_id);
                    const freqLabel = ROUTINE_FREQUENCY_OPTIONS.find(f => f.value === rc.frequency)?.label || rc.frequency;
                    return (
                      <TableRow key={rc.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {cycle?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{freqLabel}</Badge></TableCell>
                        <TableCell>
                          <Switch checked={rc.active} onCheckedChange={() => toggleRoutineCycleActive(rc.id)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRoutineCycle(rc.id)}>
                            <Trash2 className="h-3 w-3" />
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Rotina' : 'Nova Rotina'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cycleFormOpen} onOpenChange={setCycleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Ciclo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCycleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Ciclo *</Label>
              <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
