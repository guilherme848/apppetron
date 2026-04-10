/**
 * Tipos do módulo RH (Recrutamento & Seleção)
 * Corresponde ao schema definido em supabase/migrations/*_hr_recruitment_module.sql
 */

export type HrSeniority =
  | 'estagio'
  | 'junior'
  | 'pleno'
  | 'senior'
  | 'especialista'
  | 'lideranca';

export type HrContractType =
  | 'clt'
  | 'pj'
  | 'estagio'
  | 'freelancer'
  | 'temporario';

export type HrModality = 'presencial' | 'remoto' | 'hibrido';

export type HrProfileStatus = 'active' | 'archived';

export type HrJobStatus = 'draft' | 'open' | 'paused' | 'closed';

export type HrApplicationStatus =
  | 'active'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | 'on_hold';

export type HrQuestionType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'date'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'scale'
  | 'url'
  | 'checkbox'
  | 'file';

export type HrAiRecommendation =
  | 'advance'
  | 'hold'
  | 'reject'
  | 'strong_advance';

export type HrEventType =
  | 'application_created'
  | 'stage_changed'
  | 'note_added'
  | 'ai_analyzed'
  | 'resume_uploaded'
  | 'rejected'
  | 'hired'
  | 'rating_changed'
  | 'withdrawn'
  | 'email_sent';

// ─── JOB PROFILE (Função) ───────────────────────────────────────────

export interface HrJobProfileSkill {
  name: string;
  level?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  required?: boolean;
}

export interface HrJobProfileTool {
  name: string;
  required?: boolean;
}

export interface HrJobProfileProcessStep {
  name: string;
  description?: string;
}

export interface HrJobProfilePlan30Item {
  day: number;
  goal: string;
  kpi?: string;
}

export interface HrDefaultStage {
  name: string;
  order: number;
  color: string;
  is_terminal_success: boolean;
  is_terminal_rejection: boolean;
}

export interface HrJobProfile {
  id: string;
  title_internal: string;
  title_public: string;
  department: string | null;
  seniority: HrSeniority;
  contract_type: HrContractType;
  modality: HrModality;
  base_city: string | null;
  manager_member_id: string | null;
  synonyms: string[];
  mission: string | null;
  short_pitch: string | null;
  deliverables: string[];
  skills: HrJobProfileSkill[];
  tools: HrJobProfileTool[];
  requirements: string[];
  process: HrJobProfileProcessStep[];
  plan_30: HrJobProfilePlan30Item[];
  notes: string | null;
  default_stages: HrDefaultStage[];
  status: HrProfileStatus;
  accepting_applications: boolean;
  requires_experience: boolean;
  salary_range: string | null;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── JOB (Vaga) ─────────────────────────────────────────────────────

export interface HrJob {
  id: string;
  job_profile_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  snapshot_profile: HrJobProfile | null;
  status: HrJobStatus;
  opened_at: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  candidates_count: number;
  hired_count: number;
  manager_member_id: string | null;
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── PIPELINE STAGE ─────────────────────────────────────────────────

export interface HrPipelineStage {
  id: string;
  job_id: string;
  name: string;
  order_index: number;
  color: string;
  is_terminal_success: boolean;
  is_terminal_rejection: boolean;
  description: string | null;
  created_at: string;
}

// ─── FORM (Formulário) ──────────────────────────────────────────────

export interface HrForm {
  id: string;
  job_id: string;
  name: string;
  slug: string;
  active: boolean;
  public: boolean;
  intro_text: string | null;
  success_message: string | null;
  submit_button_text: string | null;
  captcha_enabled: boolean;
  honeypot_enabled: boolean;
  resume_required: boolean;
  resume_formats: string[];
  resume_max_mb: number;
  auto_ai_analysis: boolean;
  default_stage_order: number;
  auto_tags: string[];
  created_by_member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HrFormQuestionOption {
  value: string;
  label: string;
}

export interface HrFormQuestion {
  id: string;
  form_id: string;
  order_index: number;
  field_key: string;
  label: string;
  help_text: string | null;
  placeholder: string | null;
  field_type: HrQuestionType;
  required: boolean;
  options: HrFormQuestionOption[];
  validation: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  default_value: string | null;
  created_at: string;
}

// ─── CANDIDATE ──────────────────────────────────────────────────────

export interface HrCandidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  city: string | null;
  state: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  source: string | null;
  raw_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── APPLICATION ────────────────────────────────────────────────────

export interface HrApplication {
  id: string;
  candidate_id: string;
  job_id: string;
  form_id: string | null;
  current_stage_id: string | null;
  status: HrApplicationStatus;
  rating: number | null;
  resume_url: string | null;
  resume_filename: string | null;
  internal_notes: string | null;
  applied_at: string;
  decided_at: string | null;
  decided_by_member_id: string | null;
  ai_score: number | null;
  ai_recommendation: HrAiRecommendation | null;
  ai_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Application com candidate e stage carregados (pra UI do kanban)
export interface HrApplicationWithRelations extends HrApplication {
  candidate: HrCandidate;
  stage: HrPipelineStage | null;
  job?: HrJob;
}

// ─── FORM RESPONSE ──────────────────────────────────────────────────

export interface HrFormResponse {
  id: string;
  application_id: string;
  question_id: string | null;
  field_key: string;
  label: string;
  value: unknown;
  created_at: string;
}

// ─── AI ANALYSIS ────────────────────────────────────────────────────

export interface HrAiAnalysis {
  id: string;
  application_id: string;
  provider: string;
  model: string;
  prompt_version: string;
  score_overall: number;
  score_skills: number | null;
  score_experience: number | null;
  score_culture: number | null;
  strengths: string[];
  gaps: string[];
  red_flags: string[];
  highlights: string[];
  recommendation: HrAiRecommendation | null;
  summary: string | null;
  full_response: Record<string, unknown> | null;
  tokens_input: number | null;
  tokens_output: number | null;
  created_by_member_id: string | null;
  created_at: string;
}

// ─── APPLICATION EVENT (Timeline) ───────────────────────────────────

export interface HrApplicationEvent {
  id: string;
  application_id: string;
  event_type: HrEventType;
  description: string | null;
  from_stage_id: string | null;
  to_stage_id: string | null;
  member_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Helpers: labels amigáveis ──────────────────────────────────────

export const SENIORITY_LABEL: Record<HrSeniority, string> = {
  estagio: 'Estágio',
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
  lideranca: 'Liderança',
};

export const CONTRACT_TYPE_LABEL: Record<HrContractType, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  freelancer: 'Freelancer',
  temporario: 'Temporário',
};

export const MODALITY_LABEL: Record<HrModality, string> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Híbrido',
};

export const JOB_STATUS_LABEL: Record<HrJobStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  paused: 'Pausada',
  closed: 'Encerrada',
};

export const APPLICATION_STATUS_LABEL: Record<HrApplicationStatus, string> = {
  active: 'Em processo',
  hired: 'Contratado',
  rejected: 'Recusado',
  withdrawn: 'Desistiu',
  on_hold: 'Em espera',
};

export const AI_RECOMMENDATION_LABEL: Record<HrAiRecommendation, string> = {
  strong_advance: 'Avançar (forte)',
  advance: 'Avançar',
  hold: 'Aguardar',
  reject: 'Recusar',
};

export const QUESTION_TYPE_LABEL: Record<HrQuestionType, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  email: 'E-mail',
  phone: 'Telefone',
  date: 'Data',
  number: 'Número',
  select: 'Seleção única',
  multiselect: 'Seleção múltipla',
  scale: 'Escala (1-10)',
  url: 'Link (URL)',
  checkbox: 'Concordância (checkbox)',
  file: 'Upload de arquivo',
};
