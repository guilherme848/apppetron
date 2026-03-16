import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Trash2, ChevronRight, Info, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useOnboardingDetail, useOnboardingAtividades, useOnboardingRespostas,
  useOnboardingQuestions, useUpsertResposta, useUpdateAtividade,
  useCompleteOnboarding, useDeleteOnboarding, ONBOARDING_STATUS_LABELS,
} from '@/hooks/useOnboardings';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import StickyNav from '@/components/cs/onboarding-detail/StickyNav';
import TranscriptionUploadCard from '@/components/cs/onboarding-detail/TranscriptionUploadCard';
import MeetingSection from '@/components/cs/onboarding-detail/MeetingSection';
import ActivitiesSection from '@/components/cs/onboarding-detail/ActivitiesSection';
import CheckupSection from '@/components/cs/onboarding-detail/CheckupSection';
import { useClienteCheckup, countFilled } from '@/hooks/useClienteCheckup';

function getPlanBadgeClass(planName?: string): string {
  if (!planName) return 'bg-muted text-muted-foreground border-border';
  const lower = planName.toLowerCase();
  if (lower.includes('start')) return 'bg-secondary text-secondary-foreground border-border';
  if (lower.includes('performance')) return 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]';
  if (lower.includes('escala')) return 'bg-primary/12 text-primary border-primary/25';
  if (lower.includes('growth')) return 'bg-[hsl(258,90%,66%,0.12)] text-[hsl(258,90%,66%)] border-[hsl(258,90%,66%,0.25)]';
  return 'bg-muted text-muted-foreground border-border';
}

function DayCounter({ dataInicio }: { dataInicio: string }) {
  const days = differenceInDays(new Date(), new Date(dataInicio));
  if (days < 0) return null;

  const isDanger = days >= 10;
  const isWarning = days >= 8 && days < 10;

  return (
    <span className={cn(
      'text-xs font-medium font-mono flex items-center gap-1',
      isDanger ? 'text-destructive' : isWarning ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'
    )}>
      {isDanger && <AlertCircle className="h-[13px] w-[13px] animate-pulse" />}
      {isWarning && <Clock className="h-[13px] w-[13px]" />}
      {days} dias em onboarding
    </span>
  );
}

export default function CsOnboardingDetail() {
  const { onboardingId } = useParams<{ onboardingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { members } = useTeamMembers();

  const { data: onboarding, isLoading: loadingDetail } = useOnboardingDetail(onboardingId || null);
  const { data: atividades, isLoading: loadingAtividades } = useOnboardingAtividades(onboardingId || null);
  const { data: respostas, isLoading: loadingRespostas } = useOnboardingRespostas(onboardingId || null);
  const { data: questions, isLoading: loadingQuestions } = useOnboardingQuestions();

  const { data: checkupData } = useClienteCheckup(onboardingId || null);

  const upsertResposta = useUpsertResposta();
  const updateAtividade = useUpdateAtividade();
  const completeOnboarding = useCompleteOnboarding();
  const deleteOnboarding = useDeleteOnboarding();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [activeTab, setActiveTab] = useState('transcricoes');

  const transcricoesRef = useRef<HTMLDivElement>(null);
  const reuniaoRef = useRef<HTMLDivElement>(null);
  const atividadesRef = useRef<HTMLDivElement>(null);

  const csMembers = useMemo(() => members.filter(m => m.active), [members]);
  const trafficMembers = useMemo(() => members.filter(m => m.active), [members]);

  const completedCount = atividades?.filter(a => a.status === 'concluida').length || 0;
  const totalCount = atividades?.length || 0;

  const answeredCount = useMemo(() => {
    if (!questions || !respostas) return 0;
    return questions.filter((q: any) =>
      respostas.some(r => r.pergunta_id === q.id && r.resposta && r.resposta.trim() !== '')
    ).length;
  }, [questions, respostas]);

  const transcriptionCount = useMemo(() => {
    if (!onboarding) return 0;
    let count = 0;
    if ((onboarding as any).transcricao_vendas_nome) count++;
    if ((onboarding as any).transcricao_onboarding_nome) count++;
    return count;
  }, [onboarding]);

  const checkupFilled = useMemo(() => {
    if (!checkupData) return 0;
    const dims = ['atividade_redes', 'producao_video', 'mix_produtos', 'atendimento_whatsapp', 'maturidade_comercial', 'habitantes_raio', 'tamanho_operacao'] as const;
    return dims.filter(d => (checkupData as any)[d] != null).length;
  }, [checkupData]);
  const checkupClassificacao = checkupData?.classificacao || null;

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const ref = tab === 'transcricoes' ? transcricoesRef : tab === 'reuniao' ? reuniaoRef : atividadesRef;
    const el = ref.current;
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section');
            if (id) setActiveTab(id);
          }
        });
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0.3 }
    );

    [transcricoesRef, reuniaoRef, atividadesRef].forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [loadingDetail]);

  const handleTranscriptionUploaded = async (
    type: 'vendas' | 'onboarding',
    data: { url: string; nome: string; tamanho: number; conteudo: string; uploaded_at: string }
  ) => {
    if (!onboardingId) return;
    const updates = type === 'vendas'
      ? { transcricao_vendas_url: data.url, transcricao_vendas_nome: data.nome, transcricao_vendas_tamanho: data.tamanho, transcricao_vendas_conteudo: data.conteudo, transcricao_vendas_uploaded_at: data.uploaded_at }
      : { transcricao_onboarding_url: data.url, transcricao_onboarding_nome: data.nome, transcricao_onboarding_tamanho: data.tamanho, transcricao_onboarding_conteudo: data.conteudo, transcricao_onboarding_uploaded_at: data.uploaded_at };

    await supabase.from('onboardings').update(updates).eq('id', onboardingId);
    queryClient.invalidateQueries({ queryKey: ['onboarding-detail', onboardingId] });
  };

  const handleTranscriptionRemoved = async (type: 'vendas' | 'onboarding') => {
    if (!onboardingId) return;
    const updates = type === 'vendas'
      ? { transcricao_vendas_url: null, transcricao_vendas_nome: null, transcricao_vendas_tamanho: null, transcricao_vendas_conteudo: null, transcricao_vendas_uploaded_at: null }
      : { transcricao_onboarding_url: null, transcricao_onboarding_nome: null, transcricao_onboarding_tamanho: null, transcricao_onboarding_conteudo: null, transcricao_onboarding_uploaded_at: null };

    await supabase.from('onboardings').update(updates).eq('id', onboardingId);
    queryClient.invalidateQueries({ queryKey: ['onboarding-detail', onboardingId] });
  };

  const handleAnswerBlur = (perguntaId: string, value: string) => {
    if (!onboardingId) return;
    upsertResposta.mutate({ onboardingId, perguntaId, resposta: value });
  };

  const handleToggleAtividade = (atividadeId: string, currentStatus: string) => {
    if (!onboardingId) return;
    const newStatus = currentStatus === 'concluida' ? 'pendente' : 'concluida';
    updateAtividade.mutate({
      atividadeId, onboardingId,
      updates: { status: newStatus as any, data_conclusao: newStatus === 'concluida' ? new Date().toISOString() : null },
    });
  };

  const handleResponsavelChange = (atividadeId: string, memberId: string) => {
    if (!onboardingId) return;
    updateAtividade.mutate({
      atividadeId, onboardingId,
      updates: { responsavel_id: memberId === '_none_' ? null : memberId },
    });
  };

  const handleComplete = async () => {
    if (!onboardingId || !onboarding) return;
    await completeOnboarding.mutateAsync({ onboardingId, clientName: onboarding.client_name || '' });
    setShowCompleteDialog(false);
    navigate('/cs/onboarding');
  };

  const handleDelete = async () => {
    if (!onboardingId || !onboarding) return;
    await deleteOnboarding.mutateAsync({ onboardingId, clientName: onboarding.client_name || '' });
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
  const ob = onboarding as any;

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate('/cs')} className="hover:text-foreground transition-colors">Customer Success</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button onClick={() => navigate('/cs/onboarding')} className="hover:text-foreground transition-colors">Onboarding</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{onboarding.client_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{onboarding.client_name}</h1>
            <Badge variant="outline" className={cn('text-[11px] font-semibold border rounded-md px-2 py-0.5', isConcluido ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]' : 'bg-primary/12 text-primary border-primary/25')}>
              {ONBOARDING_STATUS_LABELS[onboarding.status as keyof typeof ONBOARDING_STATUS_LABELS]}
            </Badge>
            {onboarding.client_service_name && (
              <Badge variant="outline" className={cn('text-[11px] font-semibold border rounded-md px-2 py-0.5', getPlanBadgeClass(onboarding.client_service_name))}>
                {onboarding.client_service_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {onboarding.data_inicio && <span>Início: {format(new Date(onboarding.data_inicio), "dd 'de' MMM yyyy", { locale: ptBR })}</span>}
            {onboarding.cs_owner_name && <span>CS: {onboarding.cs_owner_name}</span>}
            {onboarding.traffic_owner_name && <span>Tráfego: {onboarding.traffic_owner_name}</span>}
          </div>
          {/* Day counter */}
          {!isConcluido && onboarding.data_inicio && (
            <DayCounter dataInicio={onboarding.data_inicio} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isConcluido && (
            <Button variant="outline" onClick={() => setShowCompleteDialog(true)} className="gap-2">
              <Check className="h-4 w-4 text-[hsl(var(--success))]" />
              Concluir Onboarding
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Onboarding
          </Button>
        </div>
      </div>

      {/* Sticky Navigation */}
      <StickyNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        transcriptionCount={transcriptionCount}
        answeredCount={answeredCount}
        totalQuestions={questions?.length || 0}
        completedActivities={completedCount}
        totalActivities={totalCount}
        checkupFilled={checkupFilled}
        checkupClassificacao={checkupClassificacao}
      />

      {/* Tab content — only active tab is rendered */}
      <div className="pt-8 pb-8 animate-fade-in" key={activeTab}>
        {activeTab === 'transcricoes' && (
          <div className="space-y-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Transcrições
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TranscriptionUploadCard
                title="Transcrição da Reunião de Vendas"
                type="vendas"
                onboardingId={onboardingId || ''}
                fileName={ob.transcricao_vendas_nome}
                fileSize={ob.transcricao_vendas_tamanho}
                fileUrl={ob.transcricao_vendas_url}
                fileContent={ob.transcricao_vendas_conteudo}
                uploadedAt={ob.transcricao_vendas_uploaded_at}
                disabled={isConcluido}
                onUploaded={(data) => handleTranscriptionUploaded('vendas', data)}
                onRemoved={() => handleTranscriptionRemoved('vendas')}
              />
              <TranscriptionUploadCard
                title="Transcrição da Reunião de Onboarding"
                type="onboarding"
                onboardingId={onboardingId || ''}
                fileName={ob.transcricao_onboarding_nome}
                fileSize={ob.transcricao_onboarding_tamanho}
                fileUrl={ob.transcricao_onboarding_url}
                fileContent={ob.transcricao_onboarding_conteudo}
                uploadedAt={ob.transcricao_onboarding_uploaded_at}
                disabled={isConcluido}
                onUploaded={(data) => handleTranscriptionUploaded('onboarding', data)}
                onRemoved={() => handleTranscriptionRemoved('onboarding')}
              />
            </div>
            <div className="flex items-start gap-3 p-3 px-4 rounded-[10px] border border-[hsl(var(--info)/0.2)] bg-[hsl(var(--info)/0.08)]">
              <Info className="h-4 w-4 text-[hsl(var(--info))] mt-0.5 shrink-0" />
              <p className="text-[13px] text-muted-foreground">
                Anexe a transcrição da reunião de onboarding para que a IA possa preencher automaticamente as perguntas.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'reuniao' && (
          <MeetingSection
            onboardingId={onboardingId || ''}
            questions={questions || []}
            respostas={respostas || []}
            transcricaoOnboardingConteudo={ob.transcricao_onboarding_conteudo}
            isConcluido={isConcluido}
            onAnswerBlur={handleAnswerBlur}
            onAiComplete={() => {}}
            onRefreshRespostas={() => queryClient.invalidateQueries({ queryKey: ['onboarding-respostas', onboardingId] })}
          />
        )}

        {activeTab === 'atividades' && (
          <ActivitiesSection
            atividades={atividades || []}
            isConcluido={isConcluido}
            csMembers={csMembers}
            trafficMembers={trafficMembers}
            onToggle={handleToggleAtividade}
            onResponsavelChange={handleResponsavelChange}
          />
        )}
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
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-destructive text-lg">Excluir onboarding?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Esta ação é irreversível. Todas as atividades, respostas, transcrições e anexos vinculados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm text-muted-foreground">
              Digite <span className="font-semibold text-foreground">{onboarding.client_name}</span> para confirmar:
            </label>
            <Input value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder={onboarding.client_name || ''} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!canDeleteConfirm || deleteOnboarding.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteOnboarding.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
