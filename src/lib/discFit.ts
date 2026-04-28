import type { DiscAssessment, DiscDimension } from '@/types/disc';
import type { HrTargetDisc } from '@/types/hrEvaluations';

const DIMS: DiscDimension[] = ['D', 'I', 'S', 'C'];

// % de fit entre o perfil DISC do candidato e o target da vaga.
// Cálculo: distância euclidiana entre vetores 4D normalizados, convertida em similaridade 0..100.
export function calculateDiscFit(
  assessment: DiscAssessment | null,
  target: HrTargetDisc | null
): number | null {
  if (!assessment || assessment.status !== 'completed' || !target) return null;

  // Perfil "real" do candidato em escala 0..100.
  // Adaptado (MOST) é o melhor proxy do que a pessoa entrega no ambiente.
  const candidate: Record<DiscDimension, number> = {
    D: ((assessment.score_d_most ?? 0) / 24) * 100,
    I: ((assessment.score_i_most ?? 0) / 24) * 100,
    S: ((assessment.score_s_most ?? 0) / 24) * 100,
    C: ((assessment.score_c_most ?? 0) / 24) * 100,
  };

  // Distância euclidiana 4D
  let sumSq = 0;
  for (const d of DIMS) {
    const diff = candidate[d] - (target[d] ?? 50);
    sumSq += diff * diff;
  }
  const dist = Math.sqrt(sumSq);
  // Distância máxima teórica = sqrt(4 * 100²) = 200
  const fit = Math.max(0, 100 - (dist / 200) * 100);
  return Math.round(fit);
}

export function discFitLabel(fit: number): { label: string; tone: 'good' | 'mid' | 'bad' } {
  if (fit >= 75) return { label: 'Alto fit', tone: 'good' };
  if (fit >= 55) return { label: 'Fit médio', tone: 'mid' };
  return { label: 'Baixo fit', tone: 'bad' };
}
