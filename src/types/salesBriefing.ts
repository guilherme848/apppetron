// Types for Sales Transcript and Onboarding Briefing

export interface CsSalesTranscript {
  id: string;
  client_id: string;
  transcript_text: string;
  created_by_member_id: string | null;
  created_at: string;
}

export interface BriefingContent {
  resumo_executivo: string;
  objetivos_expectativas: string[];
  escopo_vendido: {
    itens: string[];
    riscos_desalinhamento: string[];
  };
  pontos_atencao_riscos: string[];
  checklist_validacao: string[];
  frases_chave: string[];
  perfil_comportamental: string;
  risk_score: number;
  risk_justificativa: string;
}

export type BriefingStatus = 'draft' | 'reviewed' | 'approved';
export type BriefingRiskLevel = 'low' | 'medium' | 'high';

export interface CsOnboardingBriefing {
  id: string;
  client_id: string;
  transcript_id: string | null;
  briefing_content: BriefingContent;
  risk_score: number | null;
  risk_level: BriefingRiskLevel | null;
  status: BriefingStatus;
  cs_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const BRIEFING_STATUS_LABELS: Record<BriefingStatus, string> = {
  draft: 'Rascunho',
  reviewed: 'Revisado',
  approved: 'Aprovado',
};

export const BRIEFING_RISK_LABELS: Record<BriefingRiskLevel, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};
