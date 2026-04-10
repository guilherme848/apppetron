import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Settings2,
  Copy,
  ExternalLink,
  Save,
  FileText,
  Link2,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type {
  HrJob,
  HrPipelineStage,
  HrApplicationWithRelations,
} from '@/types/rh';
import { JOB_STATUS_LABEL } from '@/types/rh';

export default function RhJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getJobById,
    getApplicationsByJob,
    moveApplicationToStage,
    updateJob,
    getFormsByJob,
    createForm,
  } = useRh();

  const [job, setJob] = useState<HrJob | null>(null);
  const [stages, setStages] = useState<HrPipelineStage[]>([]);
  const [applications, setApplications] = useState<HrApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<HrJob['status']>('draft');
  const [forms, setForms] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const jobData = await getJobById(id);
      if (jobData) {
        setJob(jobData.job);
        setStages(jobData.stages);
        setEditTitle(jobData.job.title);
        setEditDescription(jobData.job.description || '');
        setEditStatus(jobData.job.status);
      }
      const apps = await getApplicationsByJob(id);
      setApplications(apps);
      const jobForms = await getFormsByJob(id);
      setForms(jobForms);
    } finally {
      setLoading(false);
    }
  }, [id, getJobById, getApplicationsByJob, getFormsByJob]);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const applicationId = String(active.id);
    const newStageId = String(over.id);
    const app = applications.find((a) => a.id === applicationId);
    if (!app || app.current_stage_id === newStageId) return;

    // Optimistic update
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              current_stage_id: newStageId,
              stage: stages.find((s) => s.id === newStageId) || a.stage,
            }
          : a
      )
    );

    try {
      await moveApplicationToStage(applicationId, newStageId);
      toast.success('Candidato movido');
    } catch (e: any) {
      toast.error('Erro ao mover — revertendo');
      load();
    }
  };

  const handleSaveJob = async () => {
    if (!job) return;
    try {
      await updateJob(job.id, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        opened_at:
          editStatus === 'open' && !job.opened_at ? new Date().toISOString() : job.opened_at,
        closed_at:
          editStatus === 'closed' && !job.closed_at ? new Date().toISOString() : job.closed_at,
      });
      toast.success('Vaga atualizada');
      setEditOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    }
  };

  const handleCreateForm = async () => {
    if (!job) return;
    try {
      const slug = `${job.slug}-inscricao`;
      const form = await createForm(job.id, `Inscrição ${job.title}`, slug);
      toast.success('Formulário criado');
      navigate(`/rh/formularios/${form.id}`);
    } catch (e: any) {
      if (e?.message?.includes('duplicate')) {
        toast.error('Já existe um formulário com este slug');
      } else {
        toast.error(e.message || 'Erro ao criar formulário');
      }
    }
  };

  const activeApp = applications.find((a) => a.id === activeId);

  if (!job && !loading) {
    return (
      <RhLayout>
        <div className="text-center py-12 text-muted-foreground">Vaga não encontrada</div>
      </RhLayout>
    );
  }

  const publicUrl = forms[0]?.slug ? `${window.location.origin}/vagas/${forms[0].slug}` : null;

  return (
    <RhLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/rh/vagas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vagas
          </Button>
          <div className="flex gap-2">
            {forms.length === 0 ? (
              <Button variant="outline" onClick={handleCreateForm}>
                <FileText className="h-4 w-4 mr-2" />
                Criar Formulário
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/rh/formularios/${forms[0].id}`)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Formulário
                </Button>
                {publicUrl && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      toast.success('Link copiado');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                )}
              </>
            )}
            <Button onClick={() => setEditOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Editar Vaga
            </Button>
          </div>
        </div>

        {job && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-semibold">{job.title}</h1>
                    <Badge
                      variant={
                        job.status === 'open'
                          ? 'default'
                          : job.status === 'draft'
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      {JOB_STATUS_LABEL[job.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>/{job.slug}</span>
                    <span>•</span>
                    <span>{job.candidates_count} candidatos</span>
                    {job.hired_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{job.hired_count} contratados</span>
                      </>
                    )}
                  </div>
                  {publicUrl && (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                    >
                      <Link2 className="h-3 w-3" />
                      {publicUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kanban */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando pipeline...</div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map((stage) => {
                const stageApps = applications.filter(
                  (a) => a.current_stage_id === stage.id && a.status === 'active'
                );
                return (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    applications={stageApps}
                    onCardClick={(appId) => navigate(`/rh/candidatos/${appId}`)}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeApp ? (
                <CandidateCard application={activeApp} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modal editar vaga */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Vaga</DialogTitle>
            <DialogDescription>Atualize informações básicas e status da vaga.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="closed">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveJob}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RhLayout>
  );
}

// ─── KANBAN COLUMN ─────────────────────────────────────────────────

function KanbanColumn({
  stage,
  applications,
  onCardClick,
}: {
  stage: HrPipelineStage;
  applications: HrApplicationWithRelations[];
  onCardClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-xl p-3 transition-colors ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/40' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold">{stage.name}</h3>
        </div>
        <Badge variant="secondary" className="h-5 text-xs">
          {applications.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[100px]">
        {applications.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8 italic">
            Nenhum candidato
          </div>
        ) : (
          applications.map((app) => (
            <DraggableCard key={app.id} application={app} onClick={() => onCardClick(app.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  application,
  onClick,
}: {
  application: HrApplicationWithRelations;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.3 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div onClick={onClick} className="cursor-grab active:cursor-grabbing">
        <CandidateCard application={application} />
      </div>
    </div>
  );
}

function CandidateCard({
  application,
  isDragging = false,
}: {
  application: HrApplicationWithRelations;
  isDragging?: boolean;
}) {
  const initials = application.candidate.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card className={`${isDragging ? 'shadow-lg rotate-2' : 'hover:border-primary/40'}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/12 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {application.candidate.full_name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {application.candidate.email}
            </div>
            {application.ai_score !== null && (
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="outline" className="h-5 text-[10px]">
                  IA: {application.ai_score}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
