// =============================================
// CS ONBOARDING MEETING - TYPES
// =============================================

// ============ Field Types ============
export type QuestionFieldType = 
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'money'
  | 'date'
  | 'single_select'
  | 'multi_select'
  | 'boolean'
  | 'phone'
  | 'time'
  | 'email'
  | 'compound';

// ============ Sub-field for compound questions ============
export interface SubFieldDef {
  key: string;
  label: string;
  type: 'short_text' | 'single_select' | 'multi_select' | 'boolean' | 'money' | 'date' | 'number';
  options?: SelectOption[];
  prefill_field?: string;
  per_option?: boolean; // show one input per selected option
  condition?: {
    field: string;
    equals?: unknown;
    in?: string[];
  };
}

export const FIELD_TYPE_LABELS: Record<QuestionFieldType, string> = {
  short_text: 'Texto Curto',
  long_text: 'Texto Longo',
  number: 'Número',
  money: 'Valor (R$)',
  date: 'Data',
  single_select: 'Seleção Única',
  multi_select: 'Múltipla Escolha',
  boolean: 'Sim/Não',
  phone: 'Telefone',
  time: 'Horário',
  email: 'E-mail',
};

export interface SelectOption {
  label: string;
  value: string;
  [key: string]: string; // Index signature for JSON compatibility
}

// ============ Questions (Configurable) ============
export interface CsOnboardingQuestion {
  id: string;
  block_key: string;
  block_title: string;
  question_text: string;
  is_required: boolean;
  impacts_quality: boolean;
  weight: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New typed fields
  field_type: QuestionFieldType;
  options_json: SelectOption[] | null;
  placeholder: string | null;
  help_text: string | null;
  is_decision_field: boolean;
  answer_key: string | null;
  validation_json: unknown;
  ai_extract_hint: string | null;
}

// ============ Meetings ============
export type CsOnboardingMeetingStatus = 'draft' | 'completed';
export type CsOnboardingMeetingRiskLevel = 'low' | 'medium' | 'high';

export interface CsOnboardingMeeting {
  id: string;
  client_id: string;
  cs_owner_id: string | null;
  meeting_date: string;
  status: CsOnboardingMeetingStatus;
  overall_quality_score: number | null;
  risk_level: CsOnboardingMeetingRiskLevel | null;
  general_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  cs_owner_name?: string;
}

// ============ Answers ============
export interface CsOnboardingAnswer {
  id: string;
  meeting_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value_json: unknown;
  answered_by_ai: boolean;
  confidence: number | null;
  needs_validation: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Files ============
export interface CsOnboardingMeetingFile {
  id: string;
  meeting_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  // Joined fields
  uploaded_by_name?: string;
}

// ============ Transcripts ============
export type TranscriptType = 'sales_call' | 'onboarding_meeting';
export type TranscriptSource = 'paste' | 'upload' | 'integration';

export interface CsTranscript {
  id: string;
  client_id: string;
  onboarding_id: string | null;
  transcript_type: TranscriptType;
  transcript_text: string;
  source: TranscriptSource;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============ Grouped Questions by Block ============
export interface QuestionBlock {
  block_key: string;
  block_title: string;
  questions: CsOnboardingQuestion[];
}

// ============ Labels ============
export const CS_MEETING_STATUS_LABELS: Record<CsOnboardingMeetingStatus, string> = {
  draft: 'Rascunho',
  completed: 'Concluída',
};

export const CS_RISK_LEVEL_LABELS: Record<CsOnboardingMeetingRiskLevel, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

export const CS_RISK_LEVEL_COLORS: Record<CsOnboardingMeetingRiskLevel, string> = {
  low: 'text-green-600 bg-green-100',
  medium: 'text-yellow-600 bg-yellow-100',
  high: 'text-red-600 bg-red-100',
};

// ============ Score Calculation ============
export function calculateQualityScore(
  questions: CsOnboardingQuestion[],
  answers: Record<string, string>
): { score: number; riskLevel: CsOnboardingMeetingRiskLevel } {
  const qualityQuestions = questions.filter(q => q.impacts_quality && q.is_active);
  
  if (qualityQuestions.length === 0) {
    return { score: 100, riskLevel: 'low' };
  }

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const question of qualityQuestions) {
    totalWeight += question.weight;
    const answer = answers[question.id];
    if (answer && answer.trim().length > 0) {
      earnedWeight += question.weight;
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  
  let riskLevel: CsOnboardingMeetingRiskLevel;
  if (score >= 75) {
    riskLevel = 'low';
  } else if (score >= 50) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return { score, riskLevel };
}

// ============ Group questions by block ============
export function groupQuestionsByBlock(questions: CsOnboardingQuestion[]): QuestionBlock[] {
  const blockMap = new Map<string, QuestionBlock>();
  
  for (const q of questions) {
    if (!blockMap.has(q.block_key)) {
      blockMap.set(q.block_key, {
        block_key: q.block_key,
        block_title: q.block_title,
        questions: [],
      });
    }
    blockMap.get(q.block_key)!.questions.push(q);
  }
  
  // Sort blocks by key (A, B, C, ...) and questions by order_index
  const blocks = Array.from(blockMap.values());
  blocks.sort((a, b) => a.block_key.localeCompare(b.block_key));
  
  for (const block of blocks) {
    block.questions.sort((a, b) => a.order_index - b.order_index);
  }
  
  return blocks;
}

// ============ Helper: Get display value for typed answers ============
export function getAnswerDisplayValue(
  answer: CsOnboardingAnswer | undefined,
  question: CsOnboardingQuestion
): string {
  if (!answer) return '';
  
  // For typed fields, prefer answer_value_json
  if (answer.answer_value_json !== null && answer.answer_value_json !== undefined) {
    const value = answer.answer_value_json;
    
    switch (question.field_type) {
      case 'boolean':
        return value === true ? 'Sim' : value === false ? 'Não' : '';
      case 'money':
        return typeof value === 'number' 
          ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : String(value);
      case 'single_select':
        const option = question.options_json?.find(o => o.value === value);
        return option?.label || String(value);
      case 'multi_select':
        if (Array.isArray(value)) {
          return value.map(v => {
            const opt = question.options_json?.find(o => o.value === v);
            return opt?.label || v;
          }).join(', ');
        }
        return String(value);
      default:
        return String(value);
    }
  }
  
  // Fallback to text
  return answer.answer_text || '';
}
