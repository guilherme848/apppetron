import { useState } from 'react';
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useJobRoles } from '@/hooks/useJobRoles';
import { Skeleton } from '@/components/ui/skeleton';

export default function RolesPage() {
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
      toast.error('Erro ao excluir cargo. Pode estar em uso.');
    } else {
      toast.success(`Cargo "${roleName}" excluído`);
    }
  };

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
          <Briefcase className="h-6 w-6" />
          Cargos
        </h1>
        <p className="text-muted-foreground">Cargos usados para definir responsabilidades no pipeline.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Lista de Cargos</CardTitle>
            <CardDescription>
              Gerencie os cargos da equipe.
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cargo
          </Button>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum cargo cadastrado</p>
              <Button variant="link" onClick={handleOpenCreate}>
                Criar primeiro cargo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cargo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Se o cargo estiver em uso, a exclusão falhará.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(role.id, role.name)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nome do Cargo *</Label>
              <Input
                id="roleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Designer, Videomaker, Social Media"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Skeleton className="h-4 w-16 rounded" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
