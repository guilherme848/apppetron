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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [hasContent, setHasContent] = useState(true);
  const [hasTraffic, setHasTraffic] = useState(true);
  const [isLegacy, setIsLegacy] = useState(false);
  const [trafficRoutineId, setTrafficRoutineId] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const activeRoutines = trafficRoutines.filter(r => r.active);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setHasContent(true);
    setHasTraffic(true);
    setIsLegacy(false);
    setTrafficRoutineId('');
    setFormOpen(true);
  };

  const handleOpenEdit = (service: typeof services[0]) => {
    setEditingId(service.id);
    setName(service.name);
    setHasContent(service.has_content);
    setHasTraffic(service.has_traffic);
    setIsLegacy(service.is_legacy);
    setTrafficRoutineId(service.traffic_routine_id || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const routineId = hasTraffic ? (trafficRoutineId === 'none' ? null : (trafficRoutineId || null)) : null;
    
    let result;
    if (editingId) {
      result = await updateService(editingId, { 
        name,
        has_content: hasContent,
        has_traffic: hasTraffic,
        is_legacy: isLegacy,
        traffic_routine_id: routineId
      });
    } else {
      result = await addService(name, routineId, hasContent, hasTraffic, isLegacy);
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
  const legacyServices = filteredServices.filter(s => s.is_legacy);
  const currentServices = filteredServices.filter(s => !s.is_legacy);

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

      {/* Current Plans Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Planos Ativos</CardTitle>
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
          {currentServices.length === 0 ? (
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
                  <TableHead className="text-center">Conteúdo</TableHead>
                  <TableHead className="text-center">Tráfego</TableHead>
                  <TableHead>Rotina de Tráfego</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentServices.map((service) => {
                  const routine = getTrafficRoutineById(service.traffic_routine_id);
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-center">
                        {service.has_content ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Sim</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {service.has_traffic ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Sim</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {service.has_traffic && routine ? (
                          <Link 
                            to={`/settings/traffic/routines?routine=${routine.id}`}
                            className="text-sm hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {routine.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
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
                            onClick={() => handleOpenEdit(service)}
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

      {/* Legacy Plans Section */}
      {legacyServices.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">Legacy</Badge>
                Planos Descontinuados
              </CardTitle>
              <CardDescription>
                Planos que não são mais foco comercial.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Conteúdo</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {legacyServices.map((service) => (
                  <TableRow key={service.id} className="opacity-70">
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-center">
                      {service.has_content ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
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
                          onClick={() => handleOpenEdit(service)}
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}


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

            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox 
                id="isLegacy" 
                checked={isLegacy} 
                onCheckedChange={(checked) => setIsLegacy(checked === true)}
              />
              <div>
                <Label htmlFor="isLegacy" className="font-normal cursor-pointer">Plano Legacy</Label>
                <p className="text-xs text-muted-foreground">Marque se este plano não é foco comercial atual</p>
              </div>
            </div>

            {hasTraffic && (
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
            )}
            
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
