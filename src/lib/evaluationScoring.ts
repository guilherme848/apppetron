import type {
  HrCompetencyScore,
  HrCriterionScore,
  HrInterviewEvaluation,
  HrTechnicalSubmission,
} from '@/types/hrEvaluations';

// Score 1..5 → percentual ponderado 0..100
// total = sum(weight * score) / sum(weight * 5) * 100
export function weightedPercent(items: Array<{ weight: number; score: number }>): number {
  if (!items.length) return 0;
  const totalMax = items.reduce((acc, it) => acc + (it.weight || 1) * 5, 0);
  if (totalMax === 0) return 0;
  const total = items.reduce((acc, it) => acc + (it.weight || 1) * (it.score || 0), 0);
  return Math.round((total / totalMax) * 100);
}

export function competencyTotal(scores: HrCompetencyScore[]): number {
  return weightedPercent(scores);
}

export function rubricTotal(scores: HrCriterionScore[]): number {
  return weightedPercent(scores);
}

// Média entre todas as entrevistas avaliadas
export function averageInterviewScore(evals: HrInterviewEvaluation[]): number | null {
  const scored = evals.filter((e) => typeof e.total_score === 'number');
  if (!scored.length) return null;
  const sum = scored.reduce((acc, e) => acc + (e.total_score ?? 0), 0);
  return Math.round(sum / scored.length);
}

// Score consolidado: combina sinais disponíveis com pesos.
// Cada peso só é aplicado se o sinal existir.
export interface ConsolidatedInputs {
  ai_score?: number | null;        // 0..100
  disc_fit?: number | null;        // 0..100
  interview_avg?: number | null;   // 0..100
  technical_score?: number | null; // 0..100
}

export interface ConsolidatedResult {
  total: number | null;             // 0..100, null se nenhum sinal
  parts: Array<{ label: string; value: number; weight: number }>;
}

export function consolidatedScore(inputs: ConsolidatedInputs): ConsolidatedResult {
  // Pesos pensados pra agência: técnica + entrevista mandam mais que IA do currículo.
  const candidates: Array<{ label: string; value: number | null | undefined; weight: number }> = [
    { label: 'IA Currículo', value: inputs.ai_score, weight: 1 },
    { label: 'DISC fit', value: inputs.disc_fit, weight: 1 },
    { label: 'Entrevistas', value: inputs.interview_avg, weight: 3 },
    { label: 'Teste técnico', value: inputs.technical_score, weight: 3 },
  ];

  const present = candidates.filter(
    (c) => typeof c.value === 'number' && Number.isFinite(c.value)
  ) as Array<{ label: string; value: number; weight: number }>;

  if (!present.length) return { total: null, parts: [] };

  const totalW = present.reduce((s, p) => s + p.weight, 0);
  const total = present.reduce((s, p) => s + p.value * p.weight, 0) / totalW;

  return {
    total: Math.round(total),
    parts: present,
  };
}

export function technicalEvaluationTotal(sub: HrTechnicalSubmission | null): number | null {
  if (!sub) return null;
  if (sub.status !== 'evaluated') return null;
  return typeof sub.total_score === 'number' ? sub.total_score : null;
}
