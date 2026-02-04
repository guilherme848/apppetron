import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import {
  usePetronActivityTemplates,
  useCreatePetronActivityTemplate,
  useUpdatePetronActivityTemplate,
  useDeletePetronActivityTemplate,
} from '@/hooks/usePetronOnboarding';
import { OWNER_ROLE_OPTIONS, OWNER_ROLE_LABELS } from '@/types/petronOnboarding';
import type { PetronActivityTemplate } from '@/types/petronOnboarding';

export default function PetronOnboardingActivitiesPage() {
  const { data: templates = [], isLoading } = usePetronActivityTemplates();
  const createTemplate = useCreatePetronActivityTemplate();
  const updateTemplate = useUpdatePetronActivityTemplate();
  const deleteTemplate = useDeletePetronActivityTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PetronActivityTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PetronActivityTemplate | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    default_owner_role: 'cs',
    default_sla_days: 1,
    active: true,
  });

  const openCreateDialog = () => {
    setEditing(null);
    setFormData({ title: '', description: '', default_owner_role: 'cs', default_sla_days: 1, active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (template: PetronActivityTemplate) => {
    setEditing(template);
    setFormData({
      title: template.title,
      description: template.description || '',
      default_owner_role: template.default_owner_role,
      default_sla_days: template.default_sla_days,
      active: template.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      await updateTemplate.mutateAsync({ id: editing.id, ...formData });
    } else {
      await createTemplate.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (toDelete) {
      await deleteTemplate.mutateAsync(toDelete.id);
      setDeleteDialogOpen(false);
      setToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atividades</h1>
          <p className="text-muted-foreground">Catálogo de atividades-template para sequências de onboarding</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Responsável Padrão</TableHead>
                <TableHead className="w-24">SLA (dias)</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma atividade cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {OWNER_ROLE_LABELS[t.default_owner_role] || t.default_owner_role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{t.default_sla_days}</TableCell>
                    <TableCell>
                      <Badge variant={t.active ? 'default' : 'secondary'}>
                        {t.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setToDelete(t);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Configurar conta Meta Ads"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes da atividade..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsável Padrão</label>
                <Select
                  value={formData.default_owner_role}
                  onValueChange={(value) => setFormData({ ...formData, default_owner_role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNER_ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SLA (dias)</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.default_sla_days}
                  onChange={(e) => setFormData({ ...formData, default_sla_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Ativo</label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title.trim() || createTemplate.isPending || updateTemplate.isPending}
            >
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleteDialogOpen && (
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Excluir Atividade"
          description={`Tem certeza que deseja excluir a atividade "${toDelete?.title}"?`}
        >
          <span />
        </ConfirmDeleteDialog>
      )}
    </div>
  );
}
