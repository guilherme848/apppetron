import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useJobRoles } from '@/hooks/useJobRoles';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';

export function RolesTab() {
  const { roles, loading, addRole, updateRole, deleteRole } = useJobRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setName('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (role: { id: string; name: string }) => {
    setEditingRole(role);
    setName(role.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    if (editingRole) {
      const { error } = await updateRole(editingRole.id, name.trim());
      if (error) {
        toast.error('Erro ao atualizar cargo');
      } else {
        toast.success('Cargo atualizado');
        setDialogOpen(false);
      }
    } else {
      const { error } = await addRole(name.trim());
      if (error) {
        toast.error('Erro ao criar cargo');
      } else {
        toast.success('Cargo criado');
        setDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, roleName: string) => {
    const { error } = await deleteRole(id);
    if (error) {
      toast.error('Erro ao excluir. Cargo pode estar em uso.');
    } else {
      toast.success(`Cargo "${roleName}" excluído`);
    }
  };

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
            <CardTitle className="text-base">Cargos</CardTitle>
            <CardDescription>Funções disponíveis para atribuição à equipe.</CardDescription>
          </div>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">Nenhum cargo cadastrado</p>
              <Button variant="link" size="sm" onClick={handleOpenCreate}>
                Criar primeiro cargo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(role)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={role.name}
                          onConfirm={() => handleDelete(role.id, role.name)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nome do Cargo *</Label>
              <Input
                id="roleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Designer, Social Media"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
