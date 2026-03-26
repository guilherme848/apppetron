import { useState } from 'react';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function NichesPage() {
  const { niches, loading, addNiche, updateNiche, deleteNiche, toggleNicheActive } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setFormOpen(true);
  };

  const handleOpenEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setName(currentName);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingId) {
      result = await updateNiche(editingId, { name });
    } else {
      result = await addNiche(name);
    }

    if (result.success) {
      toast.success(editingId ? 'Nicho atualizado' : 'Nicho criado');
      setFormOpen(false);
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string, nicheName: string) => {
    const result = await deleteNiche(id);
    if (result.success) {
      toast.success(`Nicho "${nicheName}" excluído`);
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const filteredNiches = showInactive ? niches : niches.filter(n => n.active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6" />
          Nichos
        </h1>
        <p className="text-muted-foreground">Categorias de mercado para classificar clientes.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Lista de Nichos</CardTitle>
            <CardDescription>
              Nichos ativos aparecem no cadastro de clientes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="showInactiveNiches"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="showInactiveNiches" className="text-sm">Mostrar inativos</Label>
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Nicho
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNiches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {showInactive ? 'Nenhum nicho cadastrado' : 'Nenhum nicho ativo'}
              </p>
              <Button variant="link" onClick={handleOpenNew}>
                Criar primeiro nicho
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Ativo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNiches.map((niche) => (
                  <TableRow key={niche.id}>
                    <TableCell className="font-medium">{niche.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={niche.active}
                        onCheckedChange={() => toggleNicheActive(niche.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(niche.id, niche.name)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(niche.id, niche.name)}
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
            <DialogTitle>{editingId ? 'Editar Nicho' : 'Novo Nicho'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nicheName">Nome do Nicho *</Label>
              <Input
                id="nicheName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tecnologia, Saúde, Varejo"
                required
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
