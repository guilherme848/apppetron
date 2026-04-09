import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { useTraffic } from '@/contexts/TrafficContext';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { Skeleton } from '@/components/ui/skeleton';

export function ServicesTab() {
  const { services, loading, addService, updateService, deleteService, toggleServiceActive } = useSettings();
  const { trafficRoutines } = useTraffic();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [hasContent, setHasContent] = useState(true);
  const [hasTraffic, setHasTraffic] = useState(true);
  const [trafficRoutineId, setTrafficRoutineId] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setHasContent(true);
    setHasTraffic(true);
    setTrafficRoutineId('');
    setFormOpen(true);
  };

  const handleOpenEdit = (service: typeof services[0]) => {
    setEditingId(service.id);
    setName(service.name);
    setHasContent(service.has_content);
    setHasTraffic(service.has_traffic);
    setTrafficRoutineId(service.traffic_routine_id || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let result;
    if (editingId) {
      result = await updateService(editingId, { 
        name, 
        has_content: hasContent,
        has_traffic: hasTraffic,
        traffic_routine_id: hasTraffic ? (trafficRoutineId || null) : null 
      });
    } else {
      result = await addService(name, hasTraffic ? (trafficRoutineId || null) : null, hasContent, hasTraffic);
    }
    if (result.success) {
      toast.success(editingId ? 'Plano atualizado' : 'Plano criado');
      setFormOpen(false);
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string, serviceName: string) => {
    const result = await deleteService(id);
    if (result.success) {
      toast.success(`Plano "${serviceName}" excluído`);
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const activeRoutines = trafficRoutines.filter(r => r.active);
  const filteredServices = showInactive ? services : services.filter(s => s.active);
  const getRoutineName = (id: string | null) => {
    if (!id) return null;
    return trafficRoutines.find(r => r.id === id)?.name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Serviços/Planos</CardTitle>
            <CardDescription>Planos oferecidos aos clientes.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="showInactiveServices" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="showInactiveServices" className="text-xs">Inativos</Label>
            </div>
            <Button size="sm" onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">Nenhum plano cadastrado</p>
              <Button variant="link" size="sm" onClick={handleOpenNew}>Criar primeiro plano</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Conteúdo</TableHead>
                  <TableHead className="text-center">Tráfego</TableHead>
                  <TableHead>Rotina de Tráfego</TableHead>
                  <TableHead className="w-[80px]">Ativo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-center">
                      {service.has_content ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {service.has_traffic ? (
                        <Badge variant="secondary" className="bg-success/10 text-success">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {service.has_traffic && getRoutineName(service.traffic_routine_id) ? (
                        <Badge variant="outline">{getRoutineName(service.traffic_routine_id)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={service.active} onCheckedChange={() => toggleServiceActive(service.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={service.name}
                          onConfirm={() => handleDelete(service.id, service.name)}
                        >
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDeleteDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Nome *</Label>
              <Input id="serviceName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Plano Básico" required />
            </div>
            
            <div className="space-y-3">
              <Label>Serviços Inclusos</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hasContent" 
                    checked={hasContent} 
                    onCheckedChange={(checked) => setHasContent(checked === true)}
                  />
                  <Label htmlFor="hasContent" className="font-normal cursor-pointer">Conteúdo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hasTraffic" 
                    checked={hasTraffic} 
                    onCheckedChange={(checked) => {
                      setHasTraffic(checked === true);
                      if (!checked) setTrafficRoutineId('');
                    }}
                  />
                  <Label htmlFor="hasTraffic" className="font-normal cursor-pointer">Tráfego Pago</Label>
                </div>
              </div>
            </div>

            {hasTraffic && (
              <div className="space-y-2">
                <Label>Rotina de Tráfego</Label>
                <Select value={trafficRoutineId} onValueChange={setTrafficRoutineId}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {activeRoutines.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
