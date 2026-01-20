import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Package, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useDeliverablesData, useServiceDeliverables } from '@/hooks/useDeliverablesData';
import { useSettings } from '@/contexts/SettingsContext';
import { Deliverable } from '@/types/deliverables';

export function DeliverablesTab() {
  return (
    <Tabs defaultValue="catalog" className="space-y-4">
      <TabsList>
        <TabsTrigger value="catalog" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Catálogo
        </TabsTrigger>
        <TabsTrigger value="by-plan" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Por Plano
        </TabsTrigger>
      </TabsList>

      <TabsContent value="catalog">
        <CatalogSubTab />
      </TabsContent>

      <TabsContent value="by-plan">
        <ByPlanSubTab />
      </TabsContent>
    </Tabs>
  );
}

// ==================== Catalog Sub-Tab ====================
function CatalogSubTab() {
  const { deliverables, loading, addDeliverable, updateDeliverable, deleteDeliverable, toggleDeliverableActive } = useDeliverablesData();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setUnit('');
    setFormOpen(true);
  };

  const handleOpenEdit = (item: Deliverable) => {
    setEditingId(item.id);
    setName(item.name);
    setUnit(item.unit || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingId) {
      result = await updateDeliverable(editingId, { name, unit: unit || null });
    } else {
      result = await addDeliverable(name, unit || null);
    }

    if (result.success) {
      toast.success(editingId ? 'Entregável atualizado' : 'Entregável criado');
      setFormOpen(false);
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    const result = await deleteDeliverable(id);
    if (result.success) {
      toast.success(`Entregável "${itemName}" excluído`);
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const filteredItems = showInactive ? deliverables : deliverables.filter(d => d.active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Catálogo de Entregas</CardTitle>
            <CardDescription>
              Itens de entrega que podem ser associados aos planos/serviços.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="showInactiveDeliverables"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="showInactiveDeliverables" className="text-sm">Mostrar inativos</Label>
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Entregável
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhum entregável cadastrado' : 'Nenhum entregável ativo'}
              </p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeiro entregável
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.active}
                        onCheckedChange={() => toggleDeliverableActive(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id, item.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
            <DialogTitle>{editingId ? 'Editar Entregável' : 'Novo Entregável'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deliverableName">Nome *</Label>
              <Input
                id="deliverableName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Posts, Meta Ads, Otimização GMB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliverableUnit">Unidade</Label>
              <Input
                id="deliverableUnit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ex: un, campanha, hora, criativo"
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

// ==================== By Plan Sub-Tab ====================
function ByPlanSubTab() {
  const { services, loading: loadingServices } = useSettings();
  const { activeDeliverables, loading: loadingDeliverables } = useDeliverablesData();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const { items, loading: loadingItems, addItem, updateItem, deleteItem } = useServiceDeliverables(selectedServiceId);
  
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const activeServices = services.filter(s => s.active);

  // Get deliverables not yet added to this service
  const availableDeliverables = activeDeliverables.filter(
    d => !items.some(item => item.deliverable_id === d.id)
  );

  const handleOpenAdd = () => {
    setSelectedDeliverableId('');
    setQuantity('');
    setNotes('');
    setFormOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDeliverableId) {
      toast.error('Selecione um entregável');
      return;
    }

    const result = await addItem(selectedDeliverableId, Number(quantity) || 0, notes || null);
    if (result.success) {
      toast.success('Entregável adicionado ao plano');
      setFormOpen(false);
    } else {
      toast.error(result.error || 'Erro ao adicionar');
    }
  };

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    const result = await updateItem(id, { quantity: newQuantity });
    if (!result.success) {
      toast.error(result.error || 'Erro ao atualizar');
    }
  };

  const handleNotesChange = async (id: string, newNotes: string) => {
    const result = await updateItem(id, { notes: newNotes || null });
    if (!result.success) {
      toast.error(result.error || 'Erro ao atualizar');
    }
  };

  const handleRemove = async (id: string) => {
    const result = await deleteItem(id);
    if (result.success) {
      toast.success('Entregável removido do plano');
    } else {
      toast.error(result.error || 'Erro ao remover');
    }
  };

  if (loadingServices || loadingDeliverables) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entregas por Plano</CardTitle>
          <CardDescription>
            Selecione um serviço/plano e configure os entregáveis inclusos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="selectService">Selecionar Plano</Label>
              <Select
                value={selectedServiceId || ''}
                onValueChange={(v) => setSelectedServiceId(v || null)}
              >
                <SelectTrigger id="selectService">
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedServiceId && (
              <div className="pt-6">
                <Button onClick={handleOpenAdd} disabled={availableDeliverables.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Entrega
                </Button>
              </div>
            )}
          </div>

          {selectedServiceId && (
            loadingItems ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-muted-foreground">Nenhum entregável configurado para este plano</p>
                <Button variant="link" onClick={handleOpenAdd} disabled={availableDeliverables.length === 0}>
                  Adicionar primeiro entregável
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="w-[120px]">Quantidade</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.deliverable?.name}</TableCell>
                      <TableCell>{item.deliverable?.unit || '-'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.notes || ''}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          placeholder="Observação..."
                          className="max-w-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}

          {!selectedServiceId && (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">Selecione um plano para configurar as entregas</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Entrega ao Plano</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selectDeliverable">Entregável *</Label>
              <Select
                value={selectedDeliverableId}
                onValueChange={setSelectedDeliverableId}
              >
                <SelectTrigger id="selectDeliverable">
                  <SelectValue placeholder="Selecione um entregável..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDeliverables.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} {d.unit ? `(${d.unit})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observação</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre esta entrega..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
