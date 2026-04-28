import { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle, Save, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { HrCompetency, HrInterviewQuestion, HrCompetencyScore, HrDecision } from '@/types/hrEvaluations';
import { DECISION_LABEL } from '@/types/hrEvaluations';
import { competencyTotal } from '@/lib/evaluationScoring';

interface Props {
  competencies: HrCompetency[];
  script: HrInterviewQuestion[];
  stageName: string;
  busy?: boolean;
  onSubmit: (params: {
    scores: HrCompetencyScore[];
    decision: HrDecision | null;
    justification: string | null;
  }) => Promise<void>;
}

export function InterviewEvaluationForm({ competencies, script, stageName, busy, onSubmit }: Props) {
  const [scores, setScores] = useState<Record<string, { score: number; notes: string }>>({});
  const [decision, setDecision] = useState<HrDecision | null>(null);
  const [justification, setJustification] = useState('');
  const [showScript, setShowScript] = useState(false);

  const setComp = (name: string, patch: Partial<{ score: number; notes: string }>) => {
    setScores((prev) => ({
      ...prev,
      [name]: { score: prev[name]?.score ?? 0, notes: prev[name]?.notes ?? '', ...patch },
    }));
  };

  const total = useMemo(() => {
    const arr: HrCompetencyScore[] = competencies.map((c) => ({
      competency: c.name,
      weight: c.weight,
      score: scores[c.name]?.score || 0,
      notes: scores[c.name]?.notes || undefined,
    }));
    return competencyTotal(arr);
  }, [competencies, scores]);

  const allScored = competencies.every((c) => (scores[c.name]?.score || 0) > 0);
  const canSubmit = allScored && decision !== null && (decision !== 'reject' || justification.trim().length > 5);

  const handle = async () => {
    if (!canSubmit) {
      toast.error('Pontue todas as competências e selecione uma decisão. Em "Cortar", a justificativa é obrigatória.');
      return;
    }
    const arr: HrCompetencyScore[] = competencies.map((c) => ({
      competency: c.name,
      weight: c.weight,
      score: scores[c.name]?.score || 0,
      notes: scores[c.name]?.notes || undefined,
    }));
    await onSubmit({
      scores: arr,
      decision,
      justification: justification.trim() || null,
    });
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Avaliação · {stageName}
            </div>
            <div className="text-base font-semibold mt-0.5">
              Pontue cada competência · {total}/100
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowScript((v) => !v)}
            className="text-xs"
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            {showScript ? 'Esconder roteiro' : 'Ver roteiro de perguntas'}
          </Button>
        </div>

        {showScript && (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            {script.length ? (
              script.map((q, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground font-mono text-xs flex-shrink-0">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div>{q.question}</div>
                    {q.focus_competency && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        foco: {q.focus_competency}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum roteiro definido pra essa vaga. Configure no perfil da função.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {competencies.map((c) => {
            const cur = scores[c.name] || { score: 0, notes: '' };
            return (
              <div key={c.name} className="rounded-lg border bg-background p-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {c.name}{' '}
                      <Badge variant="outline" className="text-[10px] ml-1">
                        peso {c.weight}
                      </Badge>
                    </div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setComp(c.name, { score: n })}
                        className={`w-8 h-8 rounded-md text-xs font-bold border transition-all ${
                          cur.score === n
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-primary/5'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={cur.notes}
                  onChange={(e) => setComp(c.name, { notes: e.target.value })}
                  placeholder="Observação sobre essa competência (opcional)"
                  rows={2}
                  className="text-xs"
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Decisão *
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['advance', 'hold', 'reject'] as HrDecision[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  decision === d
                    ? d === 'advance'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : d === 'reject'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      : 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {d === 'advance' ? <CheckCircle2 className="h-4 w-4" /> : d === 'reject' ? <XCircle className="h-4 w-4" /> : null}
                {DECISION_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Justificativa {decision === 'reject' ? '*' : '(opcional)'}
          </div>
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder={
              decision === 'reject'
                ? 'Por que cortar? (obrigatório)'
                : 'Resumo da decisão pra deixar registrado.'
            }
            rows={3}
          />
        </div>

        <Button
          type="button"
          onClick={handle}
          disabled={!canSubmit || busy}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {busy ? 'Salvando...' : 'Registrar avaliação'}
        </Button>
      </CardContent>
    </Card>
  );
}
