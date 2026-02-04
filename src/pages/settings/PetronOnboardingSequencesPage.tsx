import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, List } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  usePetronSequences,
  usePetronSequenceSteps,
  usePetronActivityTemplates,
  useCreatePetronSequence,
  useUpdatePetronSequence,
  useDeletePetronSequence,
  useAddPetronSequenceStep,
  useUpdatePetronSequenceStep,
  useDeletePetronSequenceStep,
  useReorderPetronSequenceSteps,
} from '@/hooks/usePetronOnboarding';
import { useSettingsData } from '@/hooks/useSettingsData';
import { OWNER_ROLE_LABELS } from '@/types/petronOnboarding';
import type { PetronSequence, PetronSequenceStep } from '@/types/petronOnboarding';

// Sortable Step Row
function SortableStepRow({
  step,
  onUpdate,
  onDelete,
}: {
  step: PetronSequenceStep;
  onUpdate: (id: string, updates: Partial<PetronSequenceStep>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{step.activity_title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{OWNER_ROLE_LABELS[step.default_owner_role || ''] || step.default_owner_role}</span>
          <span>•</span>
          <span>SLA: {step.default_sla_days}d</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          className="w-20 h-8 text-sm"
          placeholder="Offset"
          value={step.offset_days ?? ''}
          onChange={(e) =>
            onUpdate(step.id, { offset_days: e.target.value ? parseInt(e.target.value) : null })
          }
        />
        <div className="flex items-center gap-1">
          <Checkbox
            checked={step.required}
            onCheckedChange={(checked) => onUpdate(step.id, { required: !!checked })}
          />
          <span className="text-xs">Obrig.</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(step.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function PetronOnboardingSequencesPage() {
  const { services = [], loading: isLoadingServices } = useSettingsData();
  const activeServices = services.filter((s) => s.active);
  const { data: templates = [] } = usePetronActivityTemplates(true);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  const { data: sequences = [], isLoading: loadingSequences } = usePetronSequences(selectedServiceId || undefined);
  const { data: steps = [] } = usePetronSequenceSteps(selectedSequenceId || undefined);

  const createSequence = useCreatePetronSequence();
  const updateSequence = useUpdatePetronSequence();
  const deleteSequence = useDeletePetronSequence();
  const addStep = useAddPetronSequenceStep();
  const updateStep = useUpdatePetronSequenceStep();
  const deleteStep = useDeletePetronSequenceStep();
  const reorderSteps = useReorderPetronSequenceSteps();

  const [seqDialogOpen, setSeqDialogOpen] = useState(false);
  const [editingSeq, setEditingSeq] = useState<PetronSequence | null>(null);
  const [seqFormData, setSeqFormData] = useState({ name: '', active: true });

  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [deleteSeqDialogOpen, setDeleteSeqDialogOpen] = useState(false);
  const [seqToDelete, setSeqToDelete] = useState<PetronSequence | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedSequence = sequences.find((s) => s.id === selectedSequenceId);

  const availableTemplates = useMemo(() => {
    const usedIds = new Set(steps.map((s) => s.activity_template_id));
    return templates.filter((t) => !usedIds.has(t.id));
  }, [templates, steps]);

  const openCreateSeqDialog = () => {
    if (!selectedServiceId) return;
    setEditingSeq(null);
    setSeqFormData({ name: '', active: true });
    setSeqDialogOpen(true);
  };

  const openEditSeqDialog = (seq: PetronSequence) => {
    setEditingSeq(seq);
    setSeqFormData({ name: seq.name, active: seq.active });
    setSeqDialogOpen(true);
  };

  const handleSeqSubmit = async () => {
    if (editingSeq) {
      await updateSequence.mutateAsync({ id: editingSeq.id, ...seqFormData });
    } else if (selectedServiceId) {
      const newSeq = await createSequence.mutateAsync({ plan_id: selectedServiceId, ...seqFormData });
      setSelectedSequenceId(newSeq.id);
    }
    setSeqDialogOpen(false);
  };

  const handleDeleteSeq = async () => {
    if (seqToDelete) {
      await deleteSequence.mutateAsync(seqToDelete.id);
      if (selectedSequenceId === seqToDelete.id) {
        setSelectedSequenceId(null);
      }
      setDeleteSeqDialogOpen(false);
      setSeqToDelete(null);
    }
  };

  const handleAddStep = async () => {
    if (!selectedSequenceId || !selectedTemplateId) return;
    const maxOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.step_order)) : -1;
    await addStep.mutateAsync({
      sequence_id: selectedSequenceId,
      activity_template_id: selectedTemplateId,
      step_order: maxOrder + 1,
    });
    setAddStepDialogOpen(false);
    setSelectedTemplateId('');
  };

  const handleUpdateStep = async (id: string, updates: Partial<PetronSequenceStep>) => {
    if (!selectedSequenceId) return;
    await updateStep.mutateAsync({ id, sequence_id: selectedSequenceId, ...updates });
  };

  const handleDeleteStep = async (id: string) => {
    if (!selectedSequenceId) return;
    await deleteStep.mutateAsync({ id, sequence_id: selectedSequenceId });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedSequenceId) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex);

    const updates = reordered.map((s, idx) => ({ id: s.id, step_order: idx }));
    await reorderSteps.mutateAsync({ sequence_id: selectedSequenceId, updates });
  };

  if (isLoadingServices) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sequências de Onboarding</h1>
        <p className="text-muted-foreground">Monte sequências de atividades por plano</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Selector + Sequences List */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione o Plano/Serviço</label>
            <Select
              value={selectedServiceId || ''}
              onValueChange={(value) => {
                setSelectedServiceId(value);
                setSelectedSequenceId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um plano..." />
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedServiceId && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Sequências</CardTitle>
                  <Button size="sm" onClick={openCreateSeqDialog}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingSequences ? (
                  <Skeleton className="h-20 w-full" />
                ) : sequences.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma sequência
                  </p>
                ) : (
                  sequences.map((seq) => (
                    <div
                      key={seq.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSequenceId === seq.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedSequenceId(seq.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{seq.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={seq.active ? 'default' : 'secondary'} className="text-xs">
                            {seq.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSeqDialog(seq);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSeqToDelete(seq);
                              setDeleteSeqDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sequence Steps Editor */}
        <div className="lg:col-span-2">
          {selectedSequence ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedSequence.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {steps.length} atividade(s) na sequência
                    </p>
                  </div>
                  <Button
                    onClick={() => setAddStepDialogOpen(true)}
                    disabled={availableTemplates.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Atividade
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {steps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma atividade adicionada</p>
                    <p className="text-sm">Clique em "Adicionar Atividade" para começar</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {steps.map((step) => (
                          <SortableStepRow
                            key={step.id}
                            step={step}
                            onUpdate={handleUpdateStep}
                            onDelete={handleDeleteStep}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um plano e uma sequência para editar</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Sequence Dialog */}
      <Dialog open={seqDialogOpen} onOpenChange={setSeqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeq ? 'Editar Sequência' : 'Nova Sequência'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={seqFormData.name}
                onChange={(e) => setSeqFormData({ ...seqFormData, name: e.target.value })}
                placeholder="Ex: Sequência Padrão"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Ativa</label>
              <Switch
                checked={seqFormData.active}
                onCheckedChange={(checked) => setSeqFormData({ ...seqFormData, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeqDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSeqSubmit}
              disabled={!seqFormData.name.trim() || createSequence.isPending || updateSequence.isPending}
            >
              {editingSeq ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Step Dialog */}
      <Dialog open={addStepDialogOpen} onOpenChange={setAddStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Atividade</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStepDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddStep} disabled={!selectedTemplateId || addStep.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleteSeqDialogOpen && (
        <ConfirmDeleteDialog
          open={deleteSeqDialogOpen}
          onOpenChange={setDeleteSeqDialogOpen}
          onConfirm={handleDeleteSeq}
          title="Excluir Sequência"
          description={`Tem certeza que deseja excluir a sequência "${seqToDelete?.name}"? Todos os passos serão removidos.`}
        >
          <span />
        </ConfirmDeleteDialog>
      )}
    </div>
  );
}
