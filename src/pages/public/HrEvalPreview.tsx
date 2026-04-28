// Preview TEMPORÁRIO da UI de avaliação do recrutador.
// Mostra como o sidebar e os componentes ficam quando todos os sinais existem.

import { Card, CardContent } from '@/components/ui/card';
import { ConsolidatedScoreCard } from '@/components/rh/ConsolidatedScoreCard';
import { DiscFitCard } from '@/components/rh/DiscFitBadge';
import { DiscResultsCard } from '@/components/rh/DiscResultsCard';
import { InterviewEvaluationsList } from '@/components/rh/InterviewEvaluationsList';
import { TechnicalTestPanel } from '@/components/rh/TechnicalTestPanel';
import type { DiscAssessment } from '@/types/disc';
import type {
  HrInterviewEvaluation,
  HrTechnicalSubmission,
  HrTechnicalTestConfig,
} from '@/types/hrEvaluations';

const disc: DiscAssessment = {
  id: 'preview', application_id: 'preview', access_token: 'p', status: 'completed',
  responses: null, dominant_profile: 'DI', invited_by_member_id: null,
  score_d_most: 8, score_i_most: 7, score_s_most: 5, score_c_most: 4,
  score_d_least: 4, score_i_least: 5, score_s_least: 7, score_c_least: 8,
  started_at: null, completed_at: '2026-04-27T22:30:00Z',
  created_at: '2026-04-27T22:00:00Z', updated_at: '2026-04-27T22:30:00Z',
};

const target = { D: 70, I: 35, S: 40, C: 85 };

const evals: HrInterviewEvaluation[] = [
  {
    id: 'e1', application_id: 'p', stage_id: null, stage_name: 'Entrevista 001',
    evaluator_member_id: null,
    scores: [
      { competency: 'Comunicação', weight: 4, score: 4 },
      { competency: 'Proatividade', weight: 4, score: 3 },
      { competency: 'Conhecimento técnico', weight: 5, score: 4 },
      { competency: 'Fit cultural', weight: 4, score: 5 },
      { competency: 'Capacidade analítica', weight: 3, score: 4 },
    ],
    decision: 'advance',
    justification: 'Domínio bom de Meta Ads, faltou um pouco de proatividade nas respostas, mas demonstrou bastante alinhamento com o time.',
    total_score: 80, notes: null,
    completed_at: '2026-04-27T20:00:00Z',
    created_at: '2026-04-27T20:00:00Z', updated_at: '2026-04-27T20:00:00Z',
  },
];

const techConfig: HrTechnicalTestConfig = {
  enabled: true,
  title: 'Auditoria de campanha Meta Ads',
  briefing: 'Acesse o Ads Manager e identifique 3 problemas...',
  deadline_hours: 72,
  rubric: [
    { criterion: 'Diagnóstico', weight: 5 },
    { criterion: 'Priorização', weight: 4 },
    { criterion: 'Ações propostas', weight: 5 },
    { criterion: 'Comunicação', weight: 3 },
  ],
};

const techSub: HrTechnicalSubmission = {
  id: 't1', application_id: 'p',
  access_token: 'tok', status: 'evaluated',
  test_snapshot: techConfig,
  submission_url: 'https://drive.google.com/loom-fake-deliver',
  submission_text: 'Identifiquei 3 problemas: CTR baixo (1.2%), CPL crescente 40% MoM em retargeting, gasto concentrado em 1 criativo (75%). Priorização por impacto: 1) CPL retargeting 2) CTR público frio 3) Concentração de criativo. Ações: ampliar LAL 5%, testar 4 ângulos novos, subir 3 variações do top.',
  submitted_at: '2026-04-27T22:33:00Z',
  scores: [
    { criterion: 'Diagnóstico', weight: 5, score: 5 },
    { criterion: 'Priorização', weight: 4, score: 4 },
    { criterion: 'Ações propostas', weight: 5, score: 4 },
    { criterion: 'Comunicação', weight: 3, score: 4 },
  ],
  total_score: 85, decision: 'advance',
  evaluator_notes: 'Diagnóstico afiado. Priorização poderia ter números de impacto. Ações executáveis.',
  evaluator_member_id: null, evaluated_at: '2026-04-27T22:50:00Z',
  invited_by_member_id: null, deadline_at: '2026-04-30T22:00:00Z',
  created_at: '2026-04-27T22:00:00Z', updated_at: '2026-04-27T22:50:00Z',
};

const consolidated = { ai_score: 72, disc_fit: 60, interview_avg: 80, technical_score: 85 };

export default function HrEvalPreview() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Preview · UI do Recrutador (mock data)</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Como o sidebar + tabs ficam quando todos os sinais existem (IA + DISC + Entrevista + Teste técnico).
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                Tab "Entrevistas"
              </div>
              <InterviewEvaluationsList evaluations={evals} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                Tab "Teste Técnico"
              </div>
              <TechnicalTestPanel
                job={{ id: 'p', title: 'Gestor(a) de Tráfego Pago' } as never}
                candidate={{ id: 'p', full_name: 'Iuri Borges', phone: null } as never}
                testConfig={techConfig}
                submission={techSub}
                recruiterName="Gui Rosso"
                onCreateInvite={async () => null}
                onSendWhatsapp={() => {}}
                onEvaluate={async () => {}}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Sidebar
            </div>
            <ConsolidatedScoreCard inputs={consolidated} />
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-semibold mb-1">Score IA · currículo</div>
                <div className="text-3xl font-bold text-primary">72</div>
              </CardContent>
            </Card>
            <DiscFitCard assessment={disc} target={target} />
            <DiscResultsCard assessment={disc} />
          </div>
        </div>
      </div>
    </div>
  );
}
