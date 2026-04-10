import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { HrPipelineStage, HrApplicationWithRelations } from '@/types/rh';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

export default function RhProfileKanban() {
  const { id: profileId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profiles, moveApplicationToStage, getApplicationsByJob } = useRh();

  const [jobId, setJobId] = useState<string | null>(null);
  const [stages, setStages] = useState<HrPipelineStage[]>([]);
  const [applications, setApplications] = useState<HrApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const profile = profiles.find((p) => p.id === profileId);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      // Achar o job associado ao profile (se existir)
      const { data: jobs, error } = await sb
        .from('hr_jobs')
        .select('*')
        .eq('job_profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) console.error(error);

      const job = jobs && jobs.length ? jobs[0] : null;
      if (!job) {
        setJobId(null);
        setStages([]);
        setApplications([]);
        setLoading(false);
        return;
      }

      setJobId(job.id);

      // Buscar stages
      const { data: stagesData } = await sb
        .from('hr_pipeline_stages')
        .select('*')
        .eq('job_id', job.id)
        .order('order_index');
      setStages((stagesData as HrPipelineStage[]) || []);

      // Buscar applications via hook existente
      const apps = await getApplicationsByJob(job.id);
      setApplications(apps);
    } finally {
      setLoading(false);
    }
  }, [profileId, getApplicationsByJob]);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const applicationId = String(active.id);
    const newStageId = String(over.id);
    const app = applications.find((a) => a.id === applicationId);
    if (!app || app.current_stage_id === newStageId) return;

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
    } catch (e) {
      toast.error('Erro ao mover — revertendo');
      load();
    }
  };

  const activeApp = applications.find((a) => a.id === activeId);

  return (
    <RhLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/rh/vagas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={() => profileId && navigate(`/rh/vagas/${profileId}`)}>
            Editar vaga
          </Button>
        </div>

        {profile && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">{profile.title_internal}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pipeline de candidatos
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={profile.accepting_applications ? 'default' : 'secondary'}
                  >
                    {profile.accepting_applications ? 'Recebendo inscrições' : 'Fechado'}
                  </Badge>
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {applications.length} candidatos
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando pipeline...</div>
        ) : !jobId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-1">Ainda sem candidatos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Quando o primeiro candidato se inscrever, o pipeline vai aparecer aqui automaticamente.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/trabalhe-conosco`);
                  toast.success('Link da página pública copiado');
                }}
              >
                Copiar link da página pública
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
              {activeApp ? <CandidateCard application={activeApp} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </RhLayout>
  );
}

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
            Vazio
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
            <div className="text-sm font-medium truncate">{application.candidate.full_name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {application.candidate.email}
            </div>
            {application.ai_score !== null && (
              <Badge variant="outline" className="h-5 text-[10px] mt-1">
                IA: {application.ai_score}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
