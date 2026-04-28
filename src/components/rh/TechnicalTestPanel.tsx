import { useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, ClipboardCheck, Copy, ExternalLink, FileText, MessageSquare, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { HrCandidate, HrJob } from '@/types/rh';
import type {
  HrCriterionScore,
  HrDecision,
  HrTechnicalSubmission,
  HrTechnicalTestConfig,
} from '@/types/hrEvaluations';
import { DECISION_LABEL } from '@/types/hrEvaluations';
import { rubricTotal } from '@/lib/evaluationScoring';

interface Props {
  job: HrJob;
  candidate: HrCandidate;
  testConfig: HrTechnicalTestConfig | null;
  submission: HrTechnicalSubmission | null;
  recruiterName: string;
  onCreateInvite: () => Promise<{ access_token: string } | null>;
  onSendWhatsapp: (message: string) => void;
  onEvaluate: (params: {
    submission_id: string;
    scores: HrCriterionScore[];
    decision: HrDecision | null;
    evaluator_notes: string | null;
  }) => Promise<void>;
}

export function TechnicalTestPanel({
  job,
  candidate,
  testConfig,
  submission,
  recruiterName,
  onCreateInvite,
  onSendWhatsapp,
  onEvaluate,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [evalScores, setEvalScores] = useState<Record<string, { score: number; notes: string }>>({});
  const [evalDecision, setEvalDecision] = useState<HrDecision | null>(null);
  const [evalNotes, setEvalNotes] = useState('');

  if (!testConfig?.enabled) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Teste técnico não está ativo pra essa vaga. Configure no perfil da função.
        </CardContent>
      </Card>
    );
  }

  // ─── Sem submission ainda → mostrar CTA pra enviar convite ───
  if (!submission) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="text-sm font-semibold">{testConfig.title}</div>
              <div className="text-xs text-muted-foreground">
                Prazo padrão: {testConfig.deadline_hours}h · {testConfig.rubric.length} critério(s)
              </div>
            </div>
          </div>
          <Button
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const inv = await onCreateInvite();
              setBusy(false);
              if (!inv) return;
              const url = `${window.location.origin}/teste-tecnico/${inv.access_token}`;
              const firstName = candidate.full_name.split(' ')[0];
              const msg = [
                `Olá, ${firstName}!`,
                '',
                `Pra próxima etapa do processo da vaga de *${job.title}*, vou te enviar nosso teste técnico — *${testConfig.title}*. Você tem ${testConfig.deadline_hours}h pra entregar a partir de agora.`,
                '',
                'Link com o briefing completo:',
                url,
                '',
                'Qualquer dúvida me chama.',
                recruiterName ? `— ${recruiterName}` : '',
              ].filter(Boolean).join('\n');
              onSendWhatsapp(msg);
            }}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            {busy ? 'Gerando...' : 'Enviar teste técnico'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Submission existe (pending / submitted / evaluated / expired) ───
  const url = `${window.location.origin}/teste-tecnico/${submission.access_token}`;
  const isSubmitted = submission.status === 'submitted';
  const isEvaluated = submission.status === 'evaluated';
  const isExpired = submission.status === 'expired';

  const total = useMemo(() => {
    const arr: HrCriterionScore[] = (testConfig.rubric || []).map((r) => ({
      criterion: r.criterion,
      weight: r.weight,
      score: evalScores[r.criterion]?.score || 0,
      notes: evalScores[r.criterion]?.notes || undefined,
    }));
    return rubricTotal(arr);
  }, [testConfig.rubric, evalScores]);

  const setCrit = (name: string, patch: Partial<{ score: number; notes: string }>) => {
    setEvalScores((prev) => ({
      ...prev,
      [name]: { score: prev[name]?.score ?? 0, notes: prev[name]?.notes ?? '', ...patch },
    }));
  };

  const allScored = (testConfig.rubric || []).every((r) => (evalScores[r.criterion]?.score || 0) > 0);

  const handleEvaluate = async () => {
    if (!allScored || !evalDecision) {
      toast.error('Pontue todos os critérios e selecione uma decisão.');
      return;
    }
    setBusy(true);
    try {
      const arr: HrCriterionScore[] = (testConfig.rubric || []).map((r) => ({
        criterion: r.criterion,
        weight: r.weight,
        score: evalScores[r.criterion]?.score || 0,
        notes: evalScores[r.criterion]?.notes || undefined,
      }));
      await onEvaluate({
        submission_id: submission.id,
        scores: arr,
        decision: evalDecision,
        evaluator_notes: evalNotes.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Teste técnico
            </div>
            <div className="text-base font-semibold">{(submission.test_snapshot || testConfig).title}</div>
          </div>
          <Badge
            variant="outline"
            className={
              isEvaluated
                ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : isSubmitted
                ? 'border-blue-500/40 text-blue-700 dark:text-blue-300'
                : isExpired
                ? 'border-rose-500/40 text-rose-700 dark:text-rose-300'
                : 'border-amber-500/40 text-amber-700 dark:text-amber-300'
            }
          >
            {isEvaluated ? 'Avaliado' : isSubmitted ? 'Aguardando avaliação' : isExpired ? 'Expirado' : 'Aguardando entrega'}
          </Badge>
        </div>

        {!isSubmitted && !isEvaluated && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {submission.deadline_at && (
                <>Prazo até {new Date(submission.deadline_at).toLocaleString('pt-BR')}</>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast.success('Link copiado');
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copiar link
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const firstName = candidate.full_name.split(' ')[0];
                  const msg = [
                    `Oi ${firstName}, lembrando do nosso teste técnico:`,
                    '',
                    url,
                    '',
                    submission.deadline_at
                      ? `Prazo: ${new Date(submission.deadline_at).toLocaleString('pt-BR')}`
                      : '',
                  ].filter(Boolean).join('\n');
                  onSendWhatsapp(msg);
                }}
                disabled={!candidate.phone}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Reenviar via WhatsApp
              </Button>
            </div>
          </div>
        )}

        {(isSubmitted || isEvaluated) && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entrega do candidato
            </div>
            {submission.submission_url && (
              <a
                href={submission.submission_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline break-all"
              >
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                {submission.submission_url}
              </a>
            )}
            {submission.submission_text && (
              <div className="text-sm whitespace-pre-wrap leading-relaxed bg-background rounded p-2 border">
                {submission.submission_text}
              </div>
            )}
            {submission.submitted_at && (
              <div className="text-[11px] text-muted-foreground">
                Enviado em {new Date(submission.submitted_at).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        )}

        {isEvaluated && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-3xl font-bold">{submission.total_score ?? '—'}/100</div>
              {submission.decision && (
                <Badge variant="outline">{DECISION_LABEL[submission.decision]}</Badge>
              )}
            </div>
            <div className="space-y-1.5">
              {submission.scores.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground truncate flex-1">
                    {s.criterion} <span className="text-[10px]">(p{s.weight})</span>
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
            {submission.evaluator_notes && (
              <div className="text-sm bg-muted/40 rounded p-2 border whitespace-pre-wrap">
                {submission.evaluator_notes}
              </div>
            )}
          </div>
        )}

        {isSubmitted && !isEvaluated && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Avaliar entrega · {total}/100</div>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            {(testConfig.rubric || []).map((r) => {
              const cur = evalScores[r.criterion] || { score: 0, notes: '' };
              return (
                <div key={r.criterion} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {r.criterion}{' '}
                        <Badge variant="outline" className="text-[10px] ml-1">
                          peso {r.weight}
                        </Badge>
                      </div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCrit(r.criterion, { score: n })}
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
                    onChange={(e) => setCrit(r.criterion, { notes: e.target.value })}
                    placeholder="Nota (opcional)"
                    rows={2}
                    className="text-xs"
                  />
                </div>
              );
            })}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Decisão *
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['advance', 'hold', 'reject'] as HrDecision[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setEvalDecision(d)}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      evalDecision === d
                        ? d === 'advance'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : d === 'reject'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {DECISION_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={evalNotes}
              onChange={(e) => setEvalNotes(e.target.value)}
              placeholder="Notas internas sobre a entrega"
              rows={3}
            />
            <Button onClick={handleEvaluate} disabled={busy || !allScored || !evalDecision} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {busy ? 'Salvando...' : 'Salvar avaliação'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// não usado — apenas para manter shake-tree consistente
export const _icons = { CheckCircle2, FileText };
