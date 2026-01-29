// =============================================
// CS ONBOARDING MEETING - TYPES
// =============================================

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
