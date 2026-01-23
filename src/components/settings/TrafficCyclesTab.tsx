import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTraffic } from '@/contexts/TrafficContext';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';

export function TrafficCyclesTab() {
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
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Ciclos de Tráfego</CardTitle>
            <CardDescription>Cadências (semanal, quinzenal, mensal).</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="showInactiveCycles" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="showInactiveCycles" className="text-xs">Inativos</Label>
            </div>
            <Button size="sm" onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCycles.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">Nenhum ciclo cadastrado</p>
              <Button variant="link" size="sm" onClick={handleOpenNew}>Criar primeiro ciclo</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cadência</TableHead>
                  <TableHead>Rotinas</TableHead>
                  <TableHead className="w-[80px]">Ativo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCycles.map((cycle) => {
                  const routinesCount = getRoutinesByCycle(cycle.id).length;
                  return (
                    <TableRow key={cycle.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{cycle.name}</p>
                          {cycle.description && (
                            <p className="text-xs text-muted-foreground">{cycle.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{cycle.cadence_days} dias</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{routinesCount}</Badge></TableCell>
                      <TableCell>
                        <Switch checked={cycle.active} onCheckedChange={() => toggleCycleActive(cycle.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(cycle)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDeleteDialog
                            itemName={cycle.name}
                            onConfirm={() => handleDelete(cycle.id, cycle.name)}
                          >
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ConfirmDeleteDialog>
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
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Semanal" required />
            </div>
            <div className="space-y-2">
              <Label>Cadência (dias) *</Label>
              <Input type="number" min={1} value={cadenceDays} onChange={(e) => setCadenceDays(parseInt(e.target.value) || 7)} required />
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
    </>
  );
}
