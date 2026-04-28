import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HrInterviewEvaluation } from '@/types/hrEvaluations';
import { DECISION_LABEL } from '@/types/hrEvaluations';

interface Props {
  evaluations: HrInterviewEvaluation[];
}

export function InterviewEvaluationsList({ evaluations }: Props) {
  if (!evaluations.length) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-6">
        Nenhuma avaliação de entrevista registrada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {evaluations.map((e) => (
        <Card key={e.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  {e.stage_name || 'Avaliação'}
                </div>
                <div className="text-2xl font-bold">{e.total_score ?? '—'}/100</div>
              </div>
              {e.decision && (
                <Badge
                  variant="outline"
                  className={
                    e.decision === 'advance'
                      ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5'
                      : e.decision === 'reject'
                      ? 'border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/5'
                      : 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/5'
                  }
                >
                  {e.decision === 'advance' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : e.decision === 'reject' ? <XCircle className="h-3 w-3 mr-1" /> : <MinusCircle className="h-3 w-3 mr-1" />}
                  {DECISION_LABEL[e.decision]}
                </Badge>
              )}
            </div>

            {e.scores.length > 0 && (
              <div className="space-y-1.5">
                {e.scores.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground truncate flex-1">
                      {s.competency} <span className="text-[10px]">(p{s.weight})</span>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={`w-2 h-2 rounded-full ${
                            n <= s.score ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                      <span className="ml-1 font-semibold tabular-nums">{s.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {e.justification && (
              <div className="text-sm bg-muted/40 rounded p-2 border whitespace-pre-wrap">
                {e.justification}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground">
              {new Date(e.completed_at).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
