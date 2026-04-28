export type DiscDimension = 'D' | 'I' | 'S' | 'C';

export type DiscStatus = 'pending' | 'in_progress' | 'completed' | 'expired';

export interface DiscQuestionOption {
  label: string;
  dimension: DiscDimension;
}

export interface DiscQuestion {
  id: number;
  options: [DiscQuestionOption, DiscQuestionOption, DiscQuestionOption, DiscQuestionOption];
}

export interface DiscResponse {
  q: number;
  most: DiscDimension;
  least: DiscDimension;
}

export interface DiscScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DiscAssessment {
  id: string;
  application_id: string;
  access_token: string;
  status: DiscStatus;
  responses: DiscResponse[] | null;
  score_d_most: number | null;
  score_i_most: number | null;
  score_s_most: number | null;
  score_c_most: number | null;
  score_d_least: number | null;
  score_i_least: number | null;
  score_s_least: number | null;
  score_c_least: number | null;
  dominant_profile: string | null;
  invited_by_member_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscPublicContext {
  success: boolean;
  error?: string;
  id?: string;
  status?: DiscStatus;
  candidate_name?: string;
  job_title?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export const DISC_LABELS: Record<DiscDimension, string> = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

export const DISC_COLORS: Record<DiscDimension, string> = {
  D: '#ef4444', // vermelho — força/ação
  I: '#f59e0b', // âmbar — energia/social
  S: '#10b981', // verde — calma/cooperação
  C: '#3b82f6', // azul — análise/precisão
};

export const DISC_SHORT_DESCRIPTIONS: Record<DiscDimension, string> = {
  D: 'Direto, decidido, gosta de desafio e resultado rápido.',
  I: 'Comunicativo, otimista, persuade e energiza pelo relacionamento.',
  S: 'Paciente, leal, busca harmonia e consistência.',
  C: 'Analítico, preciso, valoriza qualidade, regras e estrutura.',
};
