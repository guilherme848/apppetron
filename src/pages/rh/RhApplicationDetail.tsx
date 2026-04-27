import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Upload,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  Star,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
  BookmarkPlus,
  Trash2,
  MoreVertical,
  Copy,
} from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type {
  HrApplication,
  HrCandidate,
  HrJob,
  HrPipelineStage,
  HrFormResponse,
  HrApplicationEvent,
  HrAiAnalysis,
} from '@/types/rh';
import { APPLICATION_STATUS_LABEL, AI_RECOMMENDATION_LABEL } from '@/types/rh';

interface Details {
  application: HrApplication;
  candidate: HrCandidate;
  job: HrJob;
  stages: HrPipelineStage[];
  responses: HrFormResponse[];
  events: HrApplicationEvent[];
  analyses: HrAiAnalysis[];
}

export default function RhApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getApplicationDetails,
    moveApplicationToStage,
    setApplicationStatus,
    deleteCandidate,
    addApplicationNote,
    runAiAnalysis,
    uploadResume,
  } = useRh();
  const { member } = useAuth();

  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [runningAi, setRunningAi] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const d = await getApplicationDetails(id);
    setDetails(d);
    setLoading(false);
  }, [id, getApplicationDetails]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMoveStage = async (stageId: string) => {
    if (!details) return;
    try {
      await moveApplicationToStage(details.application.id, stageId);
      toast.success('Candidato movido');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao mover');
    }
  };

  const handleStatusChange = async (status: HrApplication['status']) => {
    if (!details) return;
    try {
      await setApplicationStatus(details.application.id, status);
      const labels: Record<string, string> = {
        hired: 'Candidato contratado',
        rejected: 'Candidato recusado',
        talent_pool: 'Adicionado ao banco de talentos',
        active: 'Candidato reativado',
      };
      toast.success(labels[status] || 'Status atualizado');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar');
    }
  };

  const handleDeleteCandidate = async () => {
    if (!details) return;
    try {
      await deleteCandidate(details.candidate.id);
      toast.success('Candidato excluído');
      navigate(`/rh/vagas/${details.job.job_profile_id}?view=kanban`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    }
  };

  const handleAddNote = async () => {
    if (!details || !note.trim()) return;
    try {
      await addApplicationNote(details.application.id, note);
      setNote('');
      toast.success('Nota adicionada');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar nota');
    }
  };

  const handleRunAi = async () => {
    if (!details) return;
    setRunningAi(true);
    try {
      await runAiAnalysis(details.application.id);
      toast.success('Análise IA concluída');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro na análise IA. Verifique se a ANTHROPIC_API_KEY está configurada.');
    } finally {
      setRunningAi(false);
    }
  };

  const buildInterviewMessage = useCallback(
    (c: HrCandidate, j: HrJob) => {
      const firstName = c.full_name.split(' ')[0];
      const recruiter = (member?.full_name || member?.name || '').trim();
      const profile = j.snapshot_profile;
      const modalityLabel: Record<string, string> = {
        presencial: 'presencial',
        remoto: 'remoto',
        hibrido: 'híbrido',
      };

      const ctx: string[] = [];
      if (profile?.modality) {
        const mod = modalityLabel[profile.modality] || profile.modality;
        ctx.push(profile.base_city ? `${mod} (${profile.base_city})` : mod);
      } else if (profile?.base_city) {
        ctx.push(profile.base_city);
      }
      if (profile?.contract_type) ctx.push(profile.contract_type.toUpperCase());

      const ctxLine = ctx.length ? ` (${ctx.join(' · ')})` : '';

      return [
        `Olá, ${firstName}! Tudo bem?`,
        '',
        `Aqui é ${recruiter || '[seu nome]'}, da Petron. Vi sua candidatura pra vaga de *${j.title}*${ctxLine} e gostei do seu perfil — gostaria de marcar uma conversa rápida (cerca de 30 min) pra te conhecer melhor e te apresentar a oportunidade.`,
        '',
        'Qual período funciona melhor pra você — manhã, tarde ou noite? Pode ser por chamada de vídeo ou áudio.',
        '',
        'Aguardo seu retorno. 🙌',
      ].join('\n');
    },
    [member],
  );

  const openWhatsapp = () => {
    if (!details) return;
    setWhatsappMessage(buildInterviewMessage(details.candidate, details.job));
    setWhatsappOpen(true);
  };

  const handleSendWhatsapp = async () => {
    if (!details) return;
    const raw = (details.candidate.phone || '').replace(/\D/g, '');
    if (!raw) {
      toast.error('Candidato sem telefone cadastrado');
      return;
    }
    const phone = raw.length === 10 || raw.length === 11 ? `55${raw}` : raw;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    try {
      await addApplicationNote(
        details.application.id,
        `[WhatsApp] Convite de entrevista enviado:\n\n${whatsappMessage}`,
      );
    } catch {
      // não bloqueia o fluxo se a nota falhar
    }
    setWhatsappOpen(false);
    toast.success('WhatsApp aberto com a mensagem');
    load();
  };

  const handleCopyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      toast.success('Mensagem copiada');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const handleResumeUpload = async (file: File) => {
    if (!details) return;
    try {
      await uploadResume(details.application.id, file);
      toast.success('Currículo enviado');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro no upload');
    }
  };

  if (loading || !details) {
    return (
      <RhLayout>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </RhLayout>
    );
  }

  const { application, candidate, job, stages, responses, events, analyses } = details;
  const currentStage = stages.find((s) => s.id === application.current_stage_id);
  const latestAnalysis = analyses[0];
  const isSchedulingStage =
    !!currentStage && currentStage.name.toLowerCase().startsWith('agendar entrevista');

  return (
    <RhLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(`/rh/vagas/${job.job_profile_id}?view=kanban`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para vaga
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => handleStatusChange('talent_pool')}
              disabled={application.status === 'talent_pool'}
              className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/5"
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Banco de talentos
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStatusChange('rejected')}
              disabled={application.status === 'rejected'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Recusar
            </Button>
            <Button
              onClick={() => handleStatusChange('hired')}
              disabled={application.status === 'hired'}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Contratar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {application.status !== 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar pra "em processo"
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir candidato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Header do candidato */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/12 flex items-center justify-center text-xl font-bold text-primary">
                  {candidate.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">{candidate.full_name}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <a
                      href={`mailto:${candidate.email}`}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Mail className="h-3 w-3" />
                      {candidate.email}
                    </a>
                    {candidate.phone && (
                      <a
                        href={`https://wa.me/${candidate.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        {candidate.phone}
                      </a>
                    )}
                    {candidate.linkedin_url && (
                      <a
                        href={candidate.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        LinkedIn <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">Vaga: {job.title}</Badge>
                    <Badge
                      variant={
                        application.status === 'hired'
                          ? 'default'
                          : application.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className={
                        application.status === 'talent_pool'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : ''
                      }
                    >
                      {application.status === 'talent_pool' && (
                        <BookmarkPlus className="h-3 w-3 mr-1" />
                      )}
                      {APPLICATION_STATUS_LABEL[application.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage picker */}
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Mover para:</span>
              <Select
                value={application.current_stage_id || undefined}
                onValueChange={handleMoveStage}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentStage && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentStage.color }}
                  />
                  <span className="text-sm font-medium">{currentStage.name}</span>
                </div>
              )}
            </div>

            {/* CTA contextual da etapa "Agendar Entrevista" */}
            {isSchedulingStage && application.status === 'active' && (
              <div className="mt-5 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Próximo passo: agendar a entrevista
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {candidate.phone
                      ? 'Mande a mensagem com contexto da vaga e proponha horários.'
                      : 'Candidato sem telefone cadastrado — adicione antes de chamar no WhatsApp.'}
                  </div>
                </div>
                <Button
                  onClick={openWhatsapp}
                  disabled={!candidate.phone}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chamar no WhatsApp
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="curriculo">
              <TabsList>
                <TabsTrigger value="curriculo">Currículo</TabsTrigger>
                <TabsTrigger value="respostas">Respostas</TabsTrigger>
                <TabsTrigger value="analise">Análise IA</TabsTrigger>
                <TabsTrigger value="timeline">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="curriculo">
                <Card>
                  <CardContent className="p-6">
                    {application.resume_url ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <a
                            href={application.resume_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {application.resume_filename || 'Currículo'}
                          </a>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <label>
                            <Upload className="h-4 w-4 mr-2" />
                            Substituir currículo
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleResumeUpload(f);
                              }}
                            />
                          </label>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Nenhum currículo anexado ainda.
                        </p>
                        <Button variant="outline" asChild>
                          <label>
                            <Upload className="h-4 w-4 mr-2" />
                            Anexar currículo
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleResumeUpload(f);
                              }}
                            />
                          </label>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="respostas">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {responses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma resposta. Inscrição feita sem formulário.
                      </p>
                    ) : (
                      responses.map((r) => (
                        <div key={r.id}>
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            {r.label}
                          </div>
                          <div className="text-sm">
                            {typeof r.value === 'string'
                              ? r.value
                              : JSON.stringify(r.value, null, 2)}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analise">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Análise IA</span>
                      </div>
                      <Button onClick={handleRunAi} disabled={runningAi}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {runningAi ? 'Analisando...' : latestAnalysis ? 'Re-analisar' : 'Analisar com IA'}
                      </Button>
                    </div>

                    {!latestAnalysis ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhuma análise feita ainda. Clique em "Analisar com IA" para comparar o
                        candidato contra o perfil da função.
                      </div>
                    ) : (
                      <AnalysisView analysis={latestAnalysis} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline">
                <Card>
                  <CardContent className="p-6">
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem eventos</p>
                    ) : (
                      <div className="space-y-3">
                        {events.map((e) => (
                          <div key={e.id} className="flex gap-3 text-sm">
                            <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">
                                {formatEventType(e.event_type)}
                              </div>
                              {e.description && (
                                <div className="text-muted-foreground text-xs">
                                  {e.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(e.created_at).toLocaleString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Adicionar nota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Observação interna sobre o candidato..."
                  rows={4}
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!note.trim()}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Salvar nota
                </Button>
              </CardContent>
            </Card>

            {latestAnalysis && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Score IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary mb-1">
                    {latestAnalysis.score_overall}
                  </div>
                  {latestAnalysis.recommendation && (
                    <Badge variant="outline">
                      {AI_RECOMMENDATION_LABEL[latestAnalysis.recommendation]}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog do WhatsApp pra agendamento de entrevista */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              Chamar {candidate.full_name.split(' ')[0]} no WhatsApp
            </DialogTitle>
            <DialogDescription>
              Mensagem padrão com o contexto da vaga já preenchido. Edite se quiser antes de
              enviar — a mensagem vai ficar registrada no histórico do candidato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {candidate.phone || 'sem telefone cadastrado'}
              <Badge variant="outline" className="ml-auto">
                Vaga: {job.title}
              </Badge>
            </div>
            <Textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              rows={12}
              className="font-mono text-sm leading-relaxed"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setWhatsappOpen(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleCopyWhatsapp}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button
              onClick={handleSendWhatsapp}
              disabled={!candidate.phone || !whatsappMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir candidato?</DialogTitle>
            <DialogDescription>
              O candidato será removido permanentemente do banco, junto com TODAS as candidaturas
              dele (em qualquer vaga), respostas de formulário, currículo, análises de IA e
              histórico. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCandidate}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RhLayout>
  );
}

function AnalysisView({ analysis }: { analysis: HrAiAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">Score geral</div>
          <div className="text-4xl font-bold text-primary">{analysis.score_overall}</div>
        </div>
        {analysis.recommendation && (
          <Badge variant="outline" className="text-sm">
            {AI_RECOMMENDATION_LABEL[analysis.recommendation]}
          </Badge>
        )}
      </div>

      {analysis.summary && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Resumo</div>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {analysis.strengths.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Pontos fortes
          </div>
          <ul className="space-y-1">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.gaps.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Gaps</div>
          <ul className="space-y-1">
            {analysis.gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.red_flags.length > 0 && (
        <div>
          <div className="text-xs font-medium text-destructive uppercase mb-2">Red flags</div>
          <ul className="space-y-1">
            {analysis.red_flags.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatEventType(t: string) {
  const map: Record<string, string> = {
    application_created: 'Inscrição criada',
    stage_changed: 'Mudou de etapa',
    note_added: 'Nota adicionada',
    ai_analyzed: 'Análise IA executada',
    resume_uploaded: 'Currículo anexado',
    rejected: 'Candidato recusado',
    hired: 'Candidato contratado',
    rating_changed: 'Nota alterada',
    withdrawn: 'Candidato desistiu',
    email_sent: 'Email enviado',
  };
  return map[t] || t;
}
