import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Copy, Sparkles, Star } from 'lucide-react';
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
import { useRh } from '@/contexts/RhContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { HrPipelineStage, HrApplicationWithRelations } from '@/types/rh';
import { AI_RECOMMENDATION_LABEL, APPLICATION_STATUS_LABEL } from '@/types/rh';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

interface JobKanbanProps {
  profileId: string;
}

export function JobKanban({ profileId }: JobKanbanProps) {
  const navigate = useNavigate();
  const { moveApplicationToStage, getApplicationsByJob } = useRh();

  const [jobId, setJobId] = useState<string | null>(null);
  const [stages, setStages] = useState<HrPipelineStage[]>([]);
  const [applications, setApplications] = useState<HrApplicationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data: jobs } = await sb
        .from('hr_jobs')
        .select('*')
        .eq('job_profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1);

      const job = jobs && jobs.length ? jobs[0] : null;
      if (!job) {
        setJobId(null);
        setStages([]);
        setApplications([]);
        setLoading(false);
        return;
      }

      setJobId(job.id);

      const { data: stagesData } = await sb
        .from('hr_pipeline_stages')
        .select('*')
        .eq('job_id', job.id)
        .order('order_index');
      setStages((stagesData as HrPipelineStage[]) || []);

      const apps = await getApplicationsByJob(job.id);
      setApplications(apps);
    } finally {
      setLoading(false);
    }
  }, [profileId, getApplicationsByJob]);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
    } catch {
      toast.error('Erro ao mover — revertendo');
      load();
    }
  };

  const activeApp = applications.find((a) => a.id === activeId);
  const visibleApps = statusFilter === 'all' ? applications : applications.filter((a) => a.status === 'active');
  const totalByStatus = {
    active: applications.filter((a) => a.status === 'active').length,
    hired: applications.filter((a) => a.status === 'hired').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    all: applications.length,
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando pipeline...</div>;
  }

  if (!jobId) {
    return (
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
            <Copy className="h-4 w-4 mr-2" />
            Copiar link público
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip
          label="Em processo"
          value={totalByStatus.active}
          color="primary"
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <StatChip
          label="Contratados"
          value={totalByStatus.hired}
          color="green"
          active={false}
          onClick={() => setStatusFilter('active')}
        />
        <StatChip
          label="Recusados"
          value={totalByStatus.rejected}
          color="red"
          active={false}
          onClick={() => setStatusFilter('active')}
        />
        <StatChip
          label="Total geral"
          value={totalByStatus.all}
          color="muted"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {stages.map((stage) => {
            const stageApps = visibleApps.filter((a) => a.current_stage_id === stage.id);
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

      <p className="text-[11px] text-muted-foreground text-center">
        Arraste cards entre colunas para mover de etapa · Clique em um card para ver detalhes
      </p>
    </div>
  );
}

// ─── Stats chip ─────────────────────────────────────────────────

function StatChip({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: 'primary' | 'green' | 'red' | 'muted';
  active: boolean;
  onClick: () => void;
}) {
  const colorMap = {
    primary: 'border-primary/40 bg-primary/5',
    green: 'border-green-500/30 bg-green-500/5',
    red: 'border-destructive/30 bg-destructive/5',
    muted: 'border-border bg-muted/30',
  };
  const textMap = {
    primary: 'text-primary',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-destructive',
    muted: 'text-foreground',
  };

  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all hover:scale-[1.02] ${
        colorMap[color]
      } ${active ? 'ring-2 ring-primary/40' : ''}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-bold ${textMap[color]}`}>{value}</div>
    </button>
  );
}

// ─── Kanban column ─────────────────────────────────────────────

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
      className={`flex-shrink-0 w-72 bg-muted/30 rounded-xl p-3 transition-all ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/40 scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold">{stage.name}</h3>
        </div>
        <Badge variant="secondary" className="h-5 text-xs">
          {applications.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[120px]">
        {applications.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8 italic border border-dashed border-border/50 rounded-lg">
            Solte aqui
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

  const daysSince = Math.floor(
    (Date.now() - new Date(application.applied_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      className={`${
        isDragging ? 'shadow-xl rotate-2 border-primary/60' : 'hover:border-primary/40 hover:shadow-md transition-all'
      } ${application.status !== 'active' ? 'opacity-60' : ''}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0 border border-primary/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate text-foreground">
              {application.candidate.full_name}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {application.candidate.email}
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {application.ai_score !== null && application.ai_score !== undefined && (
                <Badge
                  variant="outline"
                  className={`h-5 text-[9px] font-bold gap-0.5 ${
                    application.ai_score >= 70
                      ? 'border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/5'
                      : application.ai_score >= 50
                      ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                      : 'border-destructive/40 text-destructive bg-destructive/5'
                  }`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {application.ai_score}
                </Badge>
              )}
              {application.rating !== null && application.rating !== undefined && application.rating > 0 && (
                <Badge variant="outline" className="h-5 text-[9px] gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  {application.rating}
                </Badge>
              )}
              {application.status !== 'active' && (
                <Badge
                  variant="secondary"
                  className={`h-5 text-[9px] ${
                    application.status === 'hired'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }`}
                >
                  {APPLICATION_STATUS_LABEL[application.status]}
                </Badge>
              )}
              <span className="text-[9px] text-muted-foreground ml-auto">
                {daysSince === 0 ? 'hoje' : daysSince === 1 ? '1d' : `${daysSince}d`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
