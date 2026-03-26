import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Trash2,
  ArrowLeft,
  Calendar,
  User,
  Star,
  Download,
  FolderArchive,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { downloadFile, downloadFilesAsZip, formatDateForFileName } from '@/lib/fileDownload';
import {
  useOnboardingMeeting,
  useOnboardingQuestions,
  useOnboardingAnswers,
  useOnboardingMeetingFiles,
  useUpdateOnboardingMeeting,
  useSaveOnboardingAnswer,
  useUploadOnboardingMeetingFile,
  useDeleteOnboardingMeetingFile,
} from '@/hooks/useOnboardingMeeting';
import {
  groupQuestionsByBlock,
  calculateQualityScore,
  CS_MEETING_STATUS_LABELS,
  CS_RISK_LEVEL_LABELS,
  CS_RISK_LEVEL_COLORS,
} from '@/types/onboardingMeeting';
import { useToast } from '@/hooks/use-toast';
import { TranscriptImportSection } from '@/components/cs/TranscriptImportSection';
import { TypedQuestionInput } from '@/components/cs/TypedQuestionInput';
import { useLatestTranscript, useAiAutofillAnswers } from '@/hooks/useCsTranscripts';
import { useQueryClient } from '@tanstack/react-query';

export default function CsOnboardingMeeting() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { member } = useAuth();
  const { toast } = useToast();

  const queryClient = useQueryClient();

  // Data hooks
  const { data: meeting, isLoading: loadingMeeting } = useOnboardingMeeting(meetingId);
  const { data: questions = [], isLoading: loadingQuestions } = useOnboardingQuestions();
  const { data: answersData = [], isLoading: loadingAnswers } = useOnboardingAnswers(meetingId);
  const { data: files = [] } = useOnboardingMeetingFiles(meetingId);
  const { members: teamMembers = [] } = useTeamMembers();

  // Transcript for AI autofill
  const clientId = meeting?.client_id;
  const { data: transcript } = useLatestTranscript(clientId, 'onboarding_meeting');
  const aiAutofill = useAiAutofillAnswers();

  // Mutations
  const updateMeeting = useUpdateOnboardingMeeting();
  const saveAnswer = useSaveOnboardingAnswer();
  const uploadFile = useUploadOnboardingMeetingFile();
  const deleteFile = useDeleteOnboardingMeetingFile();

  // Local state
  const [openBlocks, setOpenBlocks] = useState<Set<string>>(new Set());
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localAnswersJson, setLocalAnswersJson] = useState<Record<string, unknown>>({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Group questions by block
  const blocks = useMemo(() => groupQuestionsByBlock(questions), [questions]);

  // Initialize local state from DB
  useEffect(() => {
    if (answersData.length > 0) {
      const answerMap: Record<string, string> = {};
      const answerJsonMap: Record<string, unknown> = {};
      for (const a of answersData) {
        answerMap[a.question_id] = a.answer_text || '';
        answerJsonMap[a.question_id] = a.answer_value_json;
      }
      setLocalAnswers(answerMap);
      setLocalAnswersJson(answerJsonMap);
    }
  }, [answersData]);

  useEffect(() => {
    if (meeting?.general_notes) {
      setGeneralNotes(meeting.general_notes);
    }
  }, [meeting]);

  // Open first block by default
  useEffect(() => {
    if (blocks.length > 0 && openBlocks.size === 0) {
      setOpenBlocks(new Set([blocks[0].block_key]));
    }
  }, [blocks]);

  // Calculate current score
  const currentScore = useMemo(() => {
    return calculateQualityScore(questions, localAnswers);
  }, [questions, localAnswers]);

  // Toggle block open/close
  const toggleBlock = (blockKey: string) => {
    setOpenBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockKey)) {
        next.delete(blockKey);
      } else {
        next.add(blockKey);
      }
      return next;
    });
  };

  // Handle answer change (local)
  const handleAnswerChange = (questionId: string, textValue: string, jsonValue?: unknown) => {
    setLocalAnswers(prev => ({ ...prev, [questionId]: textValue }));
    if (jsonValue !== undefined) {
      setLocalAnswersJson(prev => ({ ...prev, [questionId]: jsonValue }));
    }
  };

  // Save answer on blur
  const handleAnswerBlur = async (questionId: string) => {
    if (!meetingId) return;
    
    setPendingSaves(prev => new Set(prev).add(questionId));
    
    try {
      await saveAnswer.mutateAsync({
        meeting_id: meetingId,
        question_id: questionId,
        answer_text: localAnswers[questionId] || null,
        answer_value_json: localAnswersJson[questionId] ?? null,
      });
    } finally {
      setPendingSaves(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  // AI Autofill handler
  const handleAiAutofill = useCallback(async () => {
    if (!transcript?.transcript_text || !meetingId) return;

    // Get questions with empty answers
    const questionsForAi = questions
      .filter(q => q.is_active)
      .map(q => ({
        id: q.id,
        answer_key: q.answer_key,
        question_text: q.question_text,
        field_type: q.field_type || 'long_text',
        options_json: q.options_json,
        ai_extract_hint: q.ai_extract_hint,
      }));

    const currentAnswers = questions.map(q => ({
      question_id: q.id,
      answer_text: localAnswers[q.id] || null,
      answer_value_json: localAnswersJson[q.id] ?? null,
    }));

    const result = await aiAutofill.mutateAsync({
      transcript_text: transcript.transcript_text,
      questions: questionsForAi,
      current_answers: currentAnswers,
    });

    // Save AI-generated answers
    for (const answer of result.answers) {
      if (answer.value !== null || answer.text) {
        await saveAnswer.mutateAsync({
          meeting_id: meetingId,
          question_id: answer.question_id,
          answer_text: answer.text || null,
          answer_value_json: answer.value ?? null,
          answered_by_ai: true,
          needs_validation: answer.needs_validation,
          confidence: answer.confidence,
        });
      }
    }

    // Refresh answers
    queryClient.invalidateQueries({ queryKey: ['onboarding-answers', meetingId] });
  }, [transcript, meetingId, questions, localAnswers, localAnswersJson, aiAutofill, saveAnswer, queryClient]);

  // Save general notes
  const handleNotesBlur = async () => {
    if (!meetingId || !meeting) return;
    await updateMeeting.mutateAsync({
      id: meetingId,
      general_notes: generalNotes || null,
    });
  };

  // Handle CS owner change
  const handleOwnerChange = async (value: string) => {
    if (!meetingId) return;
    await updateMeeting.mutateAsync({
      id: meetingId,
      cs_owner_id: value === '_none_' ? null : value,
    });
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !meetingId) return;

    for (const file of Array.from(files)) {
      await uploadFile.mutateAsync({
        meeting_id: meetingId,
        file,
        uploaded_by: member?.id,
      });
    }

    e.target.value = '';
  };

  // Handle file delete
  const handleFileDelete = async (file: { id: string; storage_path: string }) => {
    if (!meetingId) return;
    await deleteFile.mutateAsync({
      id: file.id,
      storage_path: file.storage_path,
      meeting_id: meetingId,
    });
  };

  // Handle single file download
  const handleDownloadSingle = async (file: { id: string; file_name: string; file_url: string }) => {
    setDownloadingFileId(file.id);
    try {
      await downloadFile(file.file_url, file.file_name);
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: 'Erro', description: 'Falha ao baixar arquivo', variant: 'destructive' });
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Handle all files download as ZIP
  const handleDownloadAllFiles = async () => {
    if (files.length < 2) return;
    setDownloadingAll(true);
    try {
      const sanitizedClient = meeting?.client_name?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'cliente';
      const dateStr = formatDateForFileName();
      const zipName = `anexos-${sanitizedClient}-onboarding-${dateStr}.zip`;

      const filesForZip = files.map((f) => ({
        name: f.file_name,
        url: f.file_url,
      }));
      await downloadFilesAsZip(filesForZip, zipName);
    } catch (error) {
      console.error('ZIP download error:', error);
      toast({ title: 'Erro', description: 'Falha ao criar arquivo ZIP', variant: 'destructive' });
    } finally {
      setDownloadingAll(false);
    }
  };

  // Complete meeting
  const handleCompleteMeeting = async () => {
    if (!meetingId) return;

    await updateMeeting.mutateAsync({
      id: meetingId,
      status: 'completed',
      overall_quality_score: currentScore.score,
      risk_level: currentScore.riskLevel,
    });

    toast({ title: 'Reunião concluída com sucesso!' });
  };

  if (loadingMeeting || loadingQuestions || loadingAnswers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Reunião não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/cs/onboarding')}>
          Voltar
        </Button>
      </div>
    );
  }

  const isCompleted = meeting.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cs/onboarding')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Reunião de Onboarding</h1>
            <p className="text-muted-foreground">{meeting.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={isCompleted ? 'default' : 'secondary'}>
            {CS_MEETING_STATUS_LABELS[meeting.status]}
          </Badge>
          
          {meeting.overall_quality_score !== null && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${CS_RISK_LEVEL_COLORS[meeting.risk_level || 'low']}`}>
              Score: {meeting.overall_quality_score}%
            </div>
          )}
        </div>
      </div>

      {/* Meeting Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data da Reunião</p>
                <p className="font-medium">
                  {format(new Date(meeting.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">CS Responsável</p>
                {isCompleted ? (
                  <p className="font-medium">{meeting.cs_owner_name || 'Não definido'}</p>
                ) : (
                  <Select
                    value={meeting.cs_owner_id || '_none_'}
                    onValueChange={handleOwnerChange}
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Não definido</SelectItem>
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Qualidade (prévia)</p>
                <div className={`font-medium ${CS_RISK_LEVEL_COLORS[currentScore.riskLevel]}`}>
                  {currentScore.score}% - {CS_RISK_LEVEL_LABELS[currentScore.riskLevel]}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Import Section */}
      {clientId && !isCompleted && (
        <TranscriptImportSection
          clientId={clientId}
          transcriptType="onboarding_meeting"
          title="Transcrição da Reunião"
          description="Importe a transcrição para preencher respostas automaticamente com IA"
          showAiButton={true}
          onAiAutofill={handleAiAutofill}
          aiButtonDisabled={!transcript?.transcript_text}
          aiButtonLoading={aiAutofill.isPending}
        />
      )}

      {/* Question Blocks */}
      <div className="space-y-4">
        {blocks.map(block => {
          const isOpen = openBlocks.has(block.block_key);
          const answeredCount = block.questions.filter(q => {
            const answer = localAnswers[q.id];
            return answer && answer.trim().length > 0;
          }).length;
          const requiredCount = block.questions.filter(q => q.is_required).length;
          const requiredAnswered = block.questions.filter(q => {
            if (!q.is_required) return true;
            const answer = localAnswers[q.id];
            return answer && answer.trim().length > 0;
          }).length === block.questions.length;

          return (
            <Card key={block.block_key}>
              <Collapsible open={isOpen} onOpenChange={() => toggleBlock(block.block_key)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <CardTitle className="text-lg">
                          Bloco {block.block_key} — {block.block_title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {answeredCount}/{block.questions.length}
                        </Badge>
                        {requiredAnswered ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : requiredCount > 0 ? (
                          <AlertCircle className="h-5 w-5 text-accent" />
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                        {block.questions.map((question, idx) => {
                          const isPending = pendingSaves.has(question.id);
                          const answer = answersData.find(a => a.question_id === question.id);

                          return (
                            <div key={question.id} className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <span className="font-medium">{idx + 1}.</span>
                              </div>
                              <TypedQuestionInput
                                question={question}
                                answer={answer}
                                value={localAnswers[question.id] || ''}
                                valueJson={localAnswersJson[question.id]}
                                onChange={(textValue, jsonValue) => handleAnswerChange(question.id, textValue, jsonValue)}
                                onBlur={() => handleAnswerBlur(question.id)}
                                disabled={isCompleted}
                                isPending={isPending}
                              />
                            </div>
                          );
                        })}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arquivos Anexados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCompleted && (
            <div>
              <Input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild className="cursor-pointer">
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Arquivos
                  </span>
                </Button>
              </label>
            </div>
          )}

          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo anexado</p>
          ) : (
            <div className="space-y-3">
              {/* Download all button */}
              {files.length >= 2 && (
                <div className="flex justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadAllFiles}
                          disabled={downloadingAll}
                        >
                          {downloadingAll ? (
                            <Skeleton className="h-4 w-16 rounded" />
                          ) : (
                            <FolderArchive className="h-4 w-4 mr-2" />
                          )}
                          Baixar todos ({files.length})
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Baixar todos os arquivos em um único ZIP</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              <div className="space-y-2">
                {files.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {file.file_name}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {file.uploaded_by_name && `Enviado por ${file.uploaded_by_name} • `}
                          {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadSingle(file)}
                              disabled={downloadingFileId === file.id}
                            >
                              {downloadingFileId === file.id ? (
                                <Skeleton className="h-4 w-16 rounded" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Baixar arquivo</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {!isCompleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFileDelete(file)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações Gerais do CS</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Anotações, insights, próximos passos..."
            disabled={isCompleted}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/cs/onboarding')}>
            Voltar
          </Button>
          <Button onClick={handleCompleteMeeting}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluir Reunião
          </Button>
        </div>
      )}
    </div>
  );
}
