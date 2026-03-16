import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Trash2, ChevronRight, Info, CheckCircle2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  useOnboardingDetail,
  useOnboardingAtividades,
  useOnboardingRespostas,
  useOnboardingQuestions,
  useUpdateTranscricao,
  useUpsertResposta,
  useUpdateAtividade,
  useCompleteOnboarding,
  useDeleteOnboarding,
  ONBOARDING_STATUS_LABELS,
} from '@/hooks/useOnboardings';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function getPlanBadgeClass(planName?: string): string {
  if (!planName) return 'bg-muted text-muted-foreground border-border';
  const lower = planName.toLowerCase();
  if (lower.includes('start')) return 'bg-secondary text-secondary-foreground border-border';
  if (lower.includes('performance')) return 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]';
  if (lower.includes('escala')) return 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.25)]';
  if (lower.includes('growth')) return 'bg-[hsl(258,90%,66%,0.12)] text-[hsl(258,90%,66%)] border-[hsl(258,90%,66%,0.25)]';
  return 'bg-muted text-muted-foreground border-border';
}

export default function CsOnboardingDetail() {
  const { onboardingId } = useParams<{ onboardingId: string }>();
  const navigate = useNavigate();
  const { members } = useTeamMembers();

  const { data: onboarding, isLoading: loadingDetail } = useOnboardingDetail(onboardingId || null);
  const { data: atividades, isLoading: loadingAtividades } = useOnboardingAtividades(onboardingId || null);
  const { data: respostas, isLoading: loadingRespostas } = useOnboardingRespostas(onboardingId || null);
  const { data: questions, isLoading: loadingQuestions } = useOnboardingQuestions();

  const updateTranscricao = useUpdateTranscricao();
  const upsertResposta = useUpsertResposta();
  const updateAtividade = useUpdateAtividade();
  const completeOnboarding = useCompleteOnboarding();
  const deleteOnboarding = useDeleteOnboarding();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [transcricaoLocal, setTranscricaoLocal] = useState<string | null>(null);
  const [editingTranscricao, setEditingTranscricao] = useState(false);

  // Initialize transcription from data
  const transcricaoValue = transcricaoLocal ?? onboarding?.transcricao_reuniao_vendas ?? '';

  const csMembers = useMemo(() => members.filter(m => m.active), [members]);
  // Filtering traffic managers would require role_id check, for now show all active members
  const trafficMembers = useMemo(() => members.filter(m => m.active), [members]);

  const completedCount = atividades?.filter(a => a.status === 'concluida').length || 0;
  const totalCount = atividades?.length || 0;

  // Group questions by block
  const questionBlocks = useMemo(() => {
    if (!questions) return [];
    const blocks: Record<string, { title: string; questions: typeof questions }> = {};
    questions.forEach((q: any) => {
      if (!blocks[q.block_key]) {
        blocks[q.block_key] = { title: q.block_title, questions: [] };
      }
      blocks[q.block_key].questions.push(q);
    });
    return Object.entries(blocks).map(([key, val]) => ({
      key,
      title: val.title,
      questions: val.questions,
    }));
  }, [questions]);

  // Get answer for a question
  const getAnswer = useCallback((perguntaId: string) => {
    return respostas?.find(r => r.pergunta_id === perguntaId)?.resposta || '';
  }, [respostas]);

  const answeredCount = useMemo(() => {
    if (!questions || !respostas) return 0;
    return questions.filter((q: any) =>
      respostas.some(r => r.pergunta_id === q.id && r.resposta && r.resposta.trim() !== '')
    ).length;
  }, [questions, respostas]);

  const handleTranscricaoBlur = () => {
    if (!onboardingId || transcricaoLocal === null) return;
    updateTranscricao.mutate({ onboardingId, text: transcricaoLocal });
    setEditingTranscricao(false);
  };

  const handleAnswerBlur = (perguntaId: string, value: string) => {
    if (!onboardingId) return;
    upsertResposta.mutate({ onboardingId, perguntaId, resposta: value });
  };

  const handleToggleAtividade = (atividadeId: string, currentStatus: string) => {
    if (!onboardingId) return;
    const newStatus = currentStatus === 'concluida' ? 'pendente' : 'concluida';
    updateAtividade.mutate({
      atividadeId,
      onboardingId,
      updates: {
        status: newStatus as any,
        data_conclusao: newStatus === 'concluida' ? new Date().toISOString() : null,
      },
    });
  };

  const handleResponsavelChange = (atividadeId: string, memberId: string) => {
    if (!onboardingId) return;
    updateAtividade.mutate({
      atividadeId,
      onboardingId,
      updates: { responsavel_id: memberId === '_none_' ? null : memberId },
    });
  };

  const handleComplete = async () => {
    if (!onboardingId || !onboarding) return;
    await completeOnboarding.mutateAsync({
      onboardingId,
      clientName: onboarding.client_name || '',
    });
    setShowCompleteDialog(false);
    navigate('/cs/onboarding');
  };

  const handleDelete = async () => {
    if (!onboardingId || !onboarding) return;
    await deleteOnboarding.mutateAsync({
      onboardingId,
      clientName: onboarding.client_name || '',
    });
    setShowDeleteDialog(false);
    navigate('/cs/onboarding');
  };

  const isLoading = loadingDetail || loadingAtividades || loadingRespostas || loadingQuestions;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Onboarding não encontrado.</p>
      </div>
    );
  }

  const isConcluido = onboarding.status === 'concluido';
  const canDeleteConfirm = deleteConfirmName.trim().toLowerCase() === (onboarding.client_name || '').toLowerCase();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => navigate('/cs')} className="hover:text-foreground transition-colors">Customer Success</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button onClick={() => navigate('/cs/onboarding')} className="hover:text-foreground transition-colors">Onboarding</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{onboarding.client_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{onboarding.client_name}</h1>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-semibold border',
                isConcluido
                  ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]'
                  : 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.25)]'
              )}
            >
              {ONBOARDING_STATUS_LABELS[onboarding.status as keyof typeof ONBOARDING_STATUS_LABELS]}
            </Badge>
            {onboarding.client_service_name && (
              <Badge variant="outline" className={cn('text-xs font-semibold border', getPlanBadgeClass(onboarding.client_service_name))}>
                {onboarding.client_service_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {onboarding.data_inicio && (
              <span>Início: {format(new Date(onboarding.data_inicio), "dd 'de' MMM yyyy", { locale: ptBR })}</span>
            )}
            {onboarding.cs_owner_name && <span>CS: {onboarding.cs_owner_name}</span>}
            {onboarding.traffic_owner_name && <span>Tráfego: {onboarding.traffic_owner_name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isConcluido && (
            <Button variant="outline" onClick={() => setShowCompleteDialog(true)} className="gap-2">
              <Check className="h-4 w-4 text-[hsl(var(--success))]" />
              Concluir Onboarding
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* SECTION 1 — Transcrição da Reunião de Vendas */}
      <div className="space-y-4" style={{ animationDelay: '40ms', animationFillMode: 'both' }}>
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Transcrição da Reunião de Vendas
        </h2>

        {transcricaoValue && !editingTranscricao ? (
          <div className="space-y-2">
            <div className="p-4 rounded-lg border bg-card text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {transcricaoValue}
            </div>
            {!isConcluido && (
              <Button variant="ghost" size="sm" onClick={() => { setTranscricaoLocal(transcricaoValue); setEditingTranscricao(true); }}>
                Editar
              </Button>
            )}
          </div>
        ) : (
          <Textarea
            placeholder="Cole aqui a transcrição da reunião de vendas..."
            value={transcricaoValue}
            onChange={(e) => setTranscricaoLocal(e.target.value)}
            onBlur={handleTranscricaoBlur}
            className="min-h-[120px] resize-y"
            disabled={isConcluido}
          />
        )}

        <div className="flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--info)/0.2)] bg-[hsl(var(--info)/0.06)]">
          <Info className="h-4 w-4 text-[hsl(var(--info))] mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Esta etapa será integrada automaticamente quando as reuniões de vendas estiverem registradas no CRM.
          </p>
        </div>
      </div>

      {/* SECTION 2 — Reunião de Onboarding */}
      <div className="space-y-4" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Reunião de Onboarding
          </h2>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-semibold',
              answeredCount === (questions?.length || 0) && questions?.length
                ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]'
                : ''
            )}
          >
            {answeredCount} de {questions?.length || 0} perguntas respondidas
          </Badge>
        </div>

        {questionBlocks.map((block) => (
          <div key={block.key} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
            {block.questions.map((q: any) => (
              <div key={q.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{q.question_text}</label>
                <Textarea
                  placeholder={q.placeholder || 'Resposta...'}
                  defaultValue={getAnswer(q.id)}
                  onBlur={(e) => handleAnswerBlur(q.id, e.target.value)}
                  className="min-h-[60px] resize-y text-sm"
                  disabled={isConcluido}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* SECTION 3 — Atividades */}
      <div className="space-y-4" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Atividades
          </h2>
          <span className="text-xs text-muted-foreground">{completedCount} de {totalCount} concluídas</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
              background: 'linear-gradient(90deg, #F97316, #f43f5e)',
            }}
          />
        </div>

        <div className="space-y-2">
          {atividades?.map((at, idx) => {
            const isDone = at.status === 'concluida';
            const membersList = at.responsavel_perfil === 'trafego' ? trafficMembers : csMembers;

            return (
              <div
                key={at.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-all hover:border-primary/20"
                style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
              >
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => handleToggleAtividade(at.id, at.status)}
                  disabled={isConcluido}
                  className={cn(
                    'transition-transform',
                    isDone && 'data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', isDone && 'line-through text-muted-foreground')}>
                    {at.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {at.responsavel_perfil && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-semibold border',
                          at.responsavel_perfil === 'cs'
                            ? 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]'
                            : 'bg-[hsl(258,90%,66%,0.12)] text-[hsl(258,90%,66%)] border-[hsl(258,90%,66%,0.25)]'
                        )}
                      >
                        {at.responsavel_perfil === 'cs' ? 'CS' : 'Tráfego'}
                      </Badge>
                    )}
                    {isDone && at.data_conclusao && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {format(new Date(at.data_conclusao), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>

                {!isConcluido && (
                  <Select
                    value={at.responsavel_id || '_none_'}
                    onValueChange={(v) => handleResponsavelChange(at.id, v)}
                  >
                    <SelectTrigger className="w-[160px] text-xs">
                      <SelectValue placeholder="Responsável..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {membersList.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {isConcluido && at.responsavel_name && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {at.responsavel_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as atividades pendentes serão marcadas como concluídas automaticamente e o onboarding será encerrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={completeOnboarding.isPending}>
              {completeOnboarding.isPending ? 'Concluindo...' : 'Concluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeleteConfirmName(''); }}>
        <AlertDialogContent className="border-destructive/30">
          <AlertDialogHeader>
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-destructive text-lg">Excluir onboarding?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Esta ação é irreversível. Todas as atividades, respostas e a transcrição vinculadas serão permanentemente removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm text-muted-foreground">
              Digite <span className="font-semibold text-foreground">{onboarding.client_name}</span> para confirmar:
            </label>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={onboarding.client_name || ''}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!canDeleteConfirm || deleteOnboarding.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOnboarding.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
