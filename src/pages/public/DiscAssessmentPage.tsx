import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { DISC_QUESTIONS } from '@/data/discQuestions';
import type { DiscDimension, DiscPublicContext, DiscResponse } from '@/types/disc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

interface AnswerState {
  most: DiscDimension | null;
  least: DiscDimension | null;
}

export default function DiscAssessmentPage() {
  const { token } = useParams<{ token: string }>();

  const [ctx, setCtx] = useState<DiscPublicContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'intro' | 'quiz' | 'done'>('intro');
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await sb.rpc('hr_disc_get_by_token', { p_token: token });
      if (error) {
        toast.error('Erro ao carregar teste');
      } else {
        const result = data as DiscPublicContext;
        setCtx(result);
        if (result.success && result.status === 'completed') setStep('done');
      }
      setLoading(false);
    })();
  }, [token]);

  const totalAnswered = useMemo(
    () =>
      Object.values(answers).filter((a) => a.most !== null && a.least !== null && a.most !== a.least).length,
    [answers]
  );
  const totalQuestions = DISC_QUESTIONS.length;
  const progressPct = (totalAnswered / totalQuestions) * 100;
  const allAnswered = totalAnswered === totalQuestions;

  const startQuiz = async () => {
    if (!token) return;
    await sb.rpc('hr_disc_mark_started', { p_token: token });
    setStep('quiz');
  };

  const setAnswer = (qId: number, kind: 'most' | 'least', dim: DiscDimension) => {
    setAnswers((prev) => {
      const cur = prev[qId] || { most: null, least: null };
      const next: AnswerState = { ...cur, [kind]: dim };
      // garantia: most e least não podem ser iguais
      if (next.most && next.least && next.most === next.least) {
        // se já tinha o outro lado, esse outro lado vira null
        if (kind === 'most') next.least = null;
        else next.most = null;
      }
      return { ...prev, [qId]: next };
    });
  };

  const handleSubmit = async () => {
    if (!token || !allAnswered) return;
    setSubmitting(true);
    const responses: DiscResponse[] = DISC_QUESTIONS.map((q) => {
      const a = answers[q.id];
      return { q: q.id, most: a.most as DiscDimension, least: a.least as DiscDimension };
    });
    try {
      const { data, error } = await sb.rpc('hr_disc_submit', {
        p_token: token,
        p_responses: responses,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'erro ao enviar');
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar respostas';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Carregando teste...</span>
        </div>
      </Shell>
    );
  }

  if (!ctx?.success) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-10 text-center">
            <div className="text-lg font-semibold mb-1">Link inválido</div>
            <p className="text-sm text-muted-foreground">
              Esse link de teste não é válido ou foi removido. Fala com a equipe Petron pra gerar um novo.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (step === 'done' || ctx.status === 'completed') {
    return (
      <Shell>
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="text-xl font-semibold">Teste enviado, {firstName(ctx.candidate_name)}!</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              A equipe Petron já recebeu suas respostas. Em breve você terá retorno sobre os próximos
              passos da vaga {ctx.job_title ? <strong>{ctx.job_title}</strong> : 'em questão'}.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (step === 'intro') {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 sm:p-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/12 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Avaliação comportamental — Petron
                </div>
                <div className="text-xl font-semibold">
                  Olá, {firstName(ctx.candidate_name)} 👋
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Esse é o teste comportamental do processo seletivo da vaga de{' '}
                <strong>{ctx.job_title}</strong>. Ele leva cerca de <strong>10 minutos</strong> e ajuda
                a gente a entender como você prefere trabalhar — não tem resposta certa nem errada.
              </p>
              <div className="bg-muted/40 rounded-lg p-4 space-y-2 border">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Como funciona
                </div>
                <ul className="text-sm space-y-1.5 list-disc pl-5">
                  <li>São <strong>24 grupos de 4 palavras</strong>.</li>
                  <li>
                    Em cada grupo, escolha a palavra que <strong>MAIS</strong> tem a ver com você e a
                    que <strong>MENOS</strong> tem a ver.
                  </li>
                  <li>Responda pensando em como você é no dia-a-dia, não em como gostaria de ser.</li>
                  <li>Pode responder pelo celular ou computador.</li>
                </ul>
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={startQuiz}>
              Começar teste
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ─── Quiz ─────────────────────────────────────────────
  const q = DISC_QUESTIONS[currentIdx];
  const ans = answers[q.id] || { most: null, least: null };

  return (
    <Shell>
      <Card>
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Pergunta <strong className="text-foreground">{currentIdx + 1}</strong> de{' '}
                {totalQuestions}
              </span>
              <span>{totalAnswered} respondidas</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Em cada palavra abaixo, escolha:</div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-emerald-500/80" /> MAIS parecida
                comigo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-rose-500/80" /> MENOS parecida comigo
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {q.options.map((opt) => {
              const isMost = ans.most === opt.dimension;
              const isLeast = ans.least === opt.dimension;
              return (
                <div
                  key={opt.dimension}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                    isMost
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : isLeast
                      ? 'border-rose-500/50 bg-rose-500/5'
                      : 'border-border'
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setAnswer(q.id, 'most', opt.dimension)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                        isMost
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-background border-border hover:bg-emerald-500/10'
                      }`}
                    >
                      MAIS
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(q.id, 'least', opt.dimension)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                        isLeast
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-background border-border hover:bg-rose-500/10'
                      }`}
                    >
                      MENOS
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
            >
              Voltar
            </Button>
            {currentIdx < totalQuestions - 1 ? (
              <Button
                onClick={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
                disabled={!ans.most || !ans.least}
              >
                Próxima
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                  </>
                ) : (
                  'Enviar respostas'
                )}
              </Button>
            )}
          </div>

          {!allAnswered && currentIdx === totalQuestions - 1 && (
            <p className="text-xs text-muted-foreground text-center">
              Faltam {totalQuestions - totalAnswered} resposta(s) para enviar.
            </p>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}

function firstName(full?: string) {
  if (!full) return '';
  return full.split(' ')[0];
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8 sm:py-14 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            <span className="text-primary">⬢</span> Petron · Avaliação Comportamental
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
