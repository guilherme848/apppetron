import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTraffic } from '@/contexts/TrafficContext';
import { Link } from 'react-router-dom';

export default function TrafficCyclesPage() {
  const { cycles, loading, addCycle, updateCycle, deleteCycle, toggleCycleActive, getRoutinesByCycle } = useTraffic();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cadenceDays, setCadenceDays] = useState(7);
  const [description, setDescription] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setCadenceDays(7);
    setDescription('');
    setFormOpen(true);
  };

  const handleOpenEdit = (cycle: typeof cycles[0]) => {
    setEditingId(cycle.id);
    setName(cycle.name);
    setCadenceDays(cycle.cadence_days);
    setDescription(cycle.description || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let result;
    if (editingId) {
      result = await updateCycle(editingId, { name, cadence_days: cadenceDays, description: description || null });
    } else {
      result = await addCycle({ name, cadence_days: cadenceDays, description: description || undefined });
    }

    if (!result.error) {
      toast.success(editingId ? 'Ciclo atualizado' : 'Ciclo criado');
      setFormOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string, cycleName: string) => {
    const result = await deleteCycle(id);
    if (!result.error) {
      toast.success(`Ciclo "${cycleName}" excluído`);
    } else {
      toast.error(result.error);
    }
  };

  const filteredCycles = showInactive ? cycles : cycles.filter((c) => c.active);

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
          <RefreshCw className="h-6 w-6" />
          Ciclos de Tráfego
        </h1>
        <p className="text-muted-foreground">Defina as cadências (semanal, quinzenal, mensal) para as rotinas de tráfego.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Lista de Ciclos</CardTitle>
            <CardDescription>Cada ciclo contém rotinas com tarefas padronizadas.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="showInactive" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="showInactive" className="text-sm">Mostrar inativos</Label>
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ciclo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCycles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhum ciclo cadastrado' : 'Nenhum ciclo ativo'}
              </p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeiro ciclo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cadência</TableHead>
                  <TableHead>Rotinas</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCycles.map((cycle) => {
                  const routinesCount = getRoutinesByCycle(cycle.id).length;
                  return (
                    <TableRow key={cycle.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cycle.name}</p>
                          {cycle.description && (
                            <p className="text-xs text-muted-foreground">{cycle.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{cycle.cadence_days} dias</TableCell>
                      <TableCell>
                        <Link
                          to={`/settings/traffic/routines?cycle=${cycle.id}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Layers className="h-3 w-3" />
                          {routinesCount} rotinas
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Switch checked={cycle.active} onCheckedChange={() => toggleCycleActive(cycle.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(cycle)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(cycle.id, cycle.name)}>
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
            <DialogTitle>{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cycleName">Nome *</Label>
              <Input
                id="cycleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Semanal, Quinzenal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadenceDays">Cadência (dias) *</Label>
              <Input
                id="cadenceDays"
                type="number"
                min={1}
                value={cadenceDays}
                onChange={(e) => setCadenceDays(parseInt(e.target.value) || 7)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional do ciclo"
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
