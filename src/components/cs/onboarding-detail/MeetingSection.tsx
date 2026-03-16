import { useState, useMemo, useCallback } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MeetingSectionProps {
  onboardingId: string;
  questions: any[];
  respostas: any[];
  transcricaoOnboardingConteudo: string | null;
  isConcluido: boolean;
  onAnswerBlur: (perguntaId: string, value: string) => void;
  onAiComplete: (filled: number, total: number) => void;
  onRefreshRespostas: () => void;
}

export default function MeetingSection({
  onboardingId, questions, respostas, transcricaoOnboardingConteudo,
  isConcluido, onAnswerBlur, onAiComplete, onRefreshRespostas,
}: MeetingSectionProps) {
  const { toast } = useToast();
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBanner, setAiBanner] = useState<{ type: 'success' | 'error'; filled?: number; total?: number } | null>(null);
  const [aiFilledIds, setAiFilledIds] = useState<Set<string>>(new Set());
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});

  const questionBlocks = useMemo(() => {
    if (!questions) return [];
    const blocks: Record<string, { title: string; questions: any[] }> = {};
    questions.forEach((q: any) => {
      if (!blocks[q.block_key]) blocks[q.block_key] = { title: q.block_title, questions: [] };
      blocks[q.block_key].questions.push(q);
    });
    return Object.entries(blocks).map(([key, val]) => ({ key, title: val.title, questions: val.questions }));
  }, [questions]);

  const getAnswer = useCallback((perguntaId: string) => {
    if (localAnswers[perguntaId] !== undefined) return localAnswers[perguntaId];
    return respostas?.find((r: any) => r.pergunta_id === perguntaId)?.resposta || '';
  }, [respostas, localAnswers]);

  const answeredCount = useMemo(() => {
    if (!questions || !respostas) return 0;
    return questions.filter((q: any) => {
      const local = localAnswers[q.id];
      if (local !== undefined) return local.trim() !== '';
      return respostas.some((r: any) => r.pergunta_id === q.id && r.resposta?.trim());
    }).length;
  }, [questions, respostas, localAnswers]);

  const getBlockProgress = (blockQuestions: any[]) => {
    let answered = 0;
    blockQuestions.forEach((q: any) => {
      const local = localAnswers[q.id];
      if (local !== undefined) { if (local.trim()) answered++; }
      else if (respostas?.some((r: any) => r.pergunta_id === q.id && r.resposta?.trim())) answered++;
    });
    return answered;
  };

  const handleLocalChange = (perguntaId: string, value: string) => {
    setLocalAnswers(prev => ({ ...prev, [perguntaId]: value }));
    // Clear AI badge on manual edit
    setAiFilledIds(prev => { const n = new Set(prev); n.delete(perguntaId); return n; });
  };

  const handleAiAnalyze = async () => {
    setShowAiDialog(false);
    setAiLoading(true);
    setAiBanner(null);

    try {
      const perguntas = questions.map((q: any) => ({ id: q.id, texto: q.question_text }));

      const { data, error } = await supabase.functions.invoke('cs-autofill-answers', {
        body: { transcricao: transcricaoOnboardingConteudo, perguntas },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const answers = data?.respostas || {};
      let filledCount = 0;
      const newAiIds = new Set<string>();
      const newLocal: Record<string, string> = {};

      for (const [qId, answer] of Object.entries(answers)) {
        if (answer && typeof answer === 'string' && answer.trim()) {
          newLocal[qId] = answer;
          newAiIds.add(qId);
          filledCount++;
          // Save to DB
          onAnswerBlur(qId, answer);
        }
      }

      setLocalAnswers(prev => ({ ...prev, ...newLocal }));
      setAiFilledIds(newAiIds);
      setAiBanner({ type: 'success', filled: filledCount, total: questions.length });
      onAiComplete(filledCount, questions.length);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setAiBanner({ type: 'error' });
      toast({ title: 'Erro ao analisar transcrição', description: 'Verifique sua conexão e tente novamente.', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const hasTranscription = !!transcricaoOnboardingConteudo?.trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Reunião de Onboarding
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn('text-xs font-semibold', answeredCount === questions?.length && questions?.length ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]' : '')}>
            {answeredCount} de {questions?.length || 0} respondidas
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasTranscription || aiLoading || isConcluido}
                    onClick={() => setShowAiDialog(true)}
                    className={cn(
                      'gap-2 text-[13px] font-semibold border rounded-lg',
                      hasTranscription
                        ? 'bg-[hsl(258,90%,66%,0.15)] border-[hsl(258,90%,66%,0.4)] text-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,66%,0.25)]'
                        : ''
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    Analisar com IA
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasTranscription && (
                <TooltipContent>Anexe a transcrição da reunião de onboarding para usar esta função</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* AI Progress / Result Banner */}
      {aiLoading && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(258,90%,66%,0.2)] bg-[hsl(258,90%,66%,0.1)]">
          <Sparkles className="h-4 w-4 text-[hsl(258,90%,66%)] animate-pulse" />
          <div className="flex-1">
            <p className="text-sm text-foreground">Analisando transcrição... isso pode levar alguns segundos.</p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-[hsl(258,90%,66%,0.2)]">
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: 'linear-gradient(90deg, hsl(258,90%,66%), #f43f5e)' }} />
            </div>
          </div>
        </div>
      )}

      {aiBanner?.type === 'success' && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--success)/0.2)] bg-[hsl(var(--success)/0.1)]">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
          <p className="text-sm text-foreground">
            IA preencheu {aiBanner.filled} de {aiBanner.total} perguntas com base na transcrição. Revise e ajuste conforme necessário.
          </p>
          <button onClick={() => setAiBanner(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {aiBanner?.type === 'error' && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-foreground">Não foi possível analisar a transcrição. Tente novamente.</p>
          <button onClick={() => setAiBanner(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* Questions Accordion */}
      <Accordion type="multiple" defaultValue={questionBlocks[0] ? [questionBlocks[0].key] : []}>
        {questionBlocks.map((block) => {
          const blockAnswered = getBlockProgress(block.questions);
          const blockTotal = block.questions.length;
          const isComplete = blockAnswered === blockTotal && blockTotal > 0;

          return (
            <AccordionItem key={block.key} value={block.key} className="border rounded-xl mb-2 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 flex-1">
                  {isComplete && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />}
                  <span className="text-sm font-semibold text-foreground">{block.title}</span>
                  <Badge variant="outline" className={cn('ml-auto mr-2 text-[10px] font-semibold', isComplete ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]' : '')}>
                    {blockAnswered}/{blockTotal}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {block.questions.map((q: any) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">{q.question_text}</label>
                    <Textarea
                      placeholder={q.placeholder || 'Resposta...'}
                      value={getAnswer(q.id)}
                      onChange={(e) => handleLocalChange(q.id, e.target.value)}
                      onBlur={(e) => onAnswerBlur(q.id, e.target.value)}
                      className="min-h-[60px] resize-y text-sm"
                      disabled={isConcluido}
                    />
                    {aiFilledIds.has(q.id) && (
                      <div className="flex items-center gap-1 text-[10px] text-[hsl(258,90%,66%)]">
                        <Sparkles className="h-2.5 w-2.5" />
                        Preenchido por IA
                      </div>
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* AI Confirmation Dialog */}
      <AlertDialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              Analisar transcrição com IA?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A IA irá ler a transcrição da reunião de onboarding e preencher as respostas das perguntas automaticamente.
              Respostas já preenchidas serão substituídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAiAnalyze} className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,56%)] gap-2">
              <Sparkles className="h-4 w-4" />
              Analisar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
