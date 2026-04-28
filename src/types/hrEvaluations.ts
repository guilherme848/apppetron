// Tipos pra avaliação estruturada de entrevista, target DISC e teste técnico

import type { DiscDimension } from './disc';

export type HrDecision = 'advance' | 'hold' | 'reject';

export const DECISION_LABEL: Record<HrDecision, string> = {
  advance: 'Avançar',
  hold: 'Segurar pra revisar',
  reject: 'Cortar',
};

export type HrTechStatus = 'pending' | 'submitted' | 'evaluated' | 'expired';

// ─── Perfil DISC alvo da vaga (0..100 cada dimensão) ───
export type HrTargetDisc = Record<DiscDimension, number>;

// ─── Competência da vaga ───
export interface HrCompetency {
  name: string;
  weight: number;          // 1..5
  description?: string;
}

// ─── Pergunta do roteiro ───
export interface HrInterviewQuestion {
  question: string;
  focus_competency?: string;
}

// ─── Critério da rubrica do teste técnico ───
export interface HrRubricCriterion {
  criterion: string;
  weight: number;          // 1..5
  description?: string;
}

// ─── Definição do teste técnico (config no job_profile) ───
export interface HrTechnicalTestConfig {
  enabled: boolean;
  title: string;
  briefing: string;        // markdown / text
  deadline_hours: number;
  rubric: HrRubricCriterion[];
}

// ─── Score por competência em uma avaliação ───
export interface HrCompetencyScore {
  competency: string;
  weight: number;
  score: number;           // 1..5
  notes?: string;
}

// ─── Score por critério no teste técnico ───
export interface HrCriterionScore {
  criterion: string;
  weight: number;
  score: number;           // 1..5
  notes?: string;
}

// ─── Linha em hr_interview_evaluations ───
export interface HrInterviewEvaluation {
  id: string;
  application_id: string;
  stage_id: string | null;
  stage_name: string | null;
  evaluator_member_id: string | null;
  scores: HrCompetencyScore[];
  decision: HrDecision | null;
  justification: string | null;
  total_score: number | null;        // 0..100
  notes: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Linha em hr_technical_submissions ───
export interface HrTechnicalSubmission {
  id: string;
  application_id: string;
  access_token: string;
  status: HrTechStatus;
  test_snapshot: HrTechnicalTestConfig | null;
  submission_url: string | null;
  submission_text: string | null;
  submitted_at: string | null;
  scores: HrCriterionScore[];
  total_score: number | null;
  decision: HrDecision | null;
  evaluator_notes: string | null;
  evaluator_member_id: string | null;
  evaluated_at: string | null;
  invited_by_member_id: string | null;
  deadline_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Resposta pública do RPC do teste técnico ───
export interface HrTechnicalPublicCtx {
  success: boolean;
  error?: string;
  id?: string;
  status?: HrTechStatus;
  candidate_name?: string;
  job_title?: string;
  test?: HrTechnicalTestConfig;
  submission_url?: string | null;
  submission_text?: string | null;
  submitted_at?: string | null;
  deadline_at?: string | null;
}

export const DEFAULT_COMPETENCIES: HrCompetency[] = [
  { name: 'Comunicação', weight: 4, description: 'Clareza, escuta, articulação de ideias' },
  { name: 'Proatividade', weight: 4, description: 'Antecipa problemas, não espera comando' },
  { name: 'Conhecimento técnico', weight: 5, description: 'Domínio das ferramentas e métodos da vaga' },
  { name: 'Fit cultural', weight: 4, description: 'Alinhamento com valores Petron' },
  { name: 'Capacidade analítica', weight: 3, description: 'Lê dado, identifica causa, decide com base' },
];

export const DEFAULT_TARGET_DISC: HrTargetDisc = { D: 50, I: 50, S: 50, C: 50 };
