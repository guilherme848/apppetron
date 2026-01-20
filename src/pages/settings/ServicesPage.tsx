import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Layers } from 'lucide-react';
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

export default function ServicesPage() {
  const { services, loading, addService, updateService, deleteService, toggleServiceActive } = useSettings();
  const { getActiveCycles, getCycleById } = useTraffic();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [trafficCycleId, setTrafficCycleId] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const activeCycles = getActiveCycles();

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setTrafficCycleId('');
    setFormOpen(true);
  };

  const handleOpenEdit = (id: string, currentName: string, currentCycleId: string | null) => {
    setEditingId(id);
    setName(currentName);
    setTrafficCycleId(currentCycleId || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingId) {
      result = await updateService(editingId, { 
        name,
        traffic_cycle_id: trafficCycleId || null 
      });
    } else {
      result = await addService(name, trafficCycleId || null);
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
                  <TableHead>Ciclo de Tráfego</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => {
                  const cycle = getCycleById(service.traffic_cycle_id);
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        {cycle ? (
                          <span className="text-sm">{cycle.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Não definido</span>
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
                            onClick={() => handleOpenEdit(service.id, service.name, service.traffic_cycle_id)}
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
              <Label htmlFor="trafficCycle">Ciclo de Tráfego</Label>
              <Select value={trafficCycleId} onValueChange={setTrafficCycleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ciclo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {activeCycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name} ({cycle.cadence_days} dias)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ciclo padrão de tráfego para clientes deste plano.
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
