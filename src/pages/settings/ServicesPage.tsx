import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Layers, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { useTraffic } from '@/contexts/TrafficContext';
import { Link } from 'react-router-dom';

export default function ServicesPage() {
  const { services, loading, addService, updateService, deleteService, toggleServiceActive } = useSettings();
  const { trafficRoutines, getTrafficRoutineById } = useTraffic();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [trafficRoutineId, setTrafficRoutineId] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const activeRoutines = trafficRoutines.filter(r => r.active);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setTrafficRoutineId('');
    setFormOpen(true);
  };

  const handleOpenEdit = (id: string, currentName: string, currentRoutineId: string | null) => {
    setEditingId(id);
    setName(currentName);
    setTrafficRoutineId(currentRoutineId || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingId) {
      result = await updateService(editingId, { 
        name,
        traffic_routine_id: trafficRoutineId || null 
      });
    } else {
      result = await addService(name, undefined, trafficRoutineId || null);
    }

    if (result.success) {
      toast.success(editingId ? 'Serviço atualizado' : 'Serviço criado');
      setFormOpen(false);
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string, serviceName: string) => {
    const result = await deleteService(id);
    if (result.success) {
      toast.success(`Serviço "${serviceName}" excluído`);
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const filteredServices = showInactive ? services : services.filter(s => s.active);

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
          <Layers className="h-6 w-6" />
          Serviços / Planos
        </h1>
        <p className="text-muted-foreground">Serviços contratados pelos clientes.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Lista de Serviços</CardTitle>
            <CardDescription>
              Serviços ativos aparecem no cadastro de clientes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="showInactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="showInactive" className="text-sm">Mostrar inativos</Label>
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhum serviço cadastrado' : 'Nenhum serviço ativo'}
              </p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeiro serviço
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Rotina de Tráfego</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => {
                  const routine = getTrafficRoutineById(service.traffic_routine_id);
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        {routine ? (
                          <Link 
                            to={`/settings/traffic/routines?routine=${routine.id}`}
                            className="text-sm hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {routine.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">Não definida</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={service.active}
                          onCheckedChange={() => toggleServiceActive(service.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(service.id, service.name, service.traffic_routine_id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(service.id, service.name)}
                          >
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
            <DialogTitle>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Nome do Serviço *</Label>
              <Input
                id="serviceName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Social Media, Tráfego Pago"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="trafficRoutine">Rotina de Tráfego</Label>
                <Link to="/settings/traffic/routines" className="text-xs text-muted-foreground hover:text-primary">
                  Gerenciar rotinas
                </Link>
              </div>
              <Select value={trafficRoutineId} onValueChange={setTrafficRoutineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma rotina (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {activeRoutines.map((routine) => (
                    <SelectItem key={routine.id} value={routine.id}>
                      {routine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Rotina padrão de tráfego para clientes deste plano.
              </p>
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
