import type { DiscAssessment, DiscDimension, DiscScores } from '@/types/disc';

export interface DiscProfileBundle {
  adapted: DiscScores; // perfil sob ambiente (MAIS escolhidas)
  natural: DiscScores; // perfil instintivo (MENOS escolhidas — o que mascara)
  real: DiscScores;    // diferença adapted - natural (range -24..+24)
  dominant: string;    // ex: "DI", "S", "DC"
  topTwo: DiscDimension[];
}

const DIMS: DiscDimension[] = ['D', 'I', 'S', 'C'];

export function bundleFromAssessment(a: DiscAssessment): DiscProfileBundle | null {
  if (a.status !== 'completed') return null;

  const adapted: DiscScores = {
    D: a.score_d_most ?? 0,
    I: a.score_i_most ?? 0,
    S: a.score_s_most ?? 0,
    C: a.score_c_most ?? 0,
  };
  const natural: DiscScores = {
    D: a.score_d_least ?? 0,
    I: a.score_i_least ?? 0,
    S: a.score_s_least ?? 0,
    C: a.score_c_least ?? 0,
  };
  const real: DiscScores = {
    D: adapted.D - natural.D,
    I: adapted.I - natural.I,
    S: adapted.S - natural.S,
    C: adapted.C - natural.C,
  };

  const sorted = [...DIMS].sort((a, b) => real[b] - real[a]);
  const topTwo = sorted.slice(0, 2);
  const dominant = a.dominant_profile?.trim() || sorted.filter((d) => real[d] > 0).slice(0, 2).join('') || sorted[0];

  return { adapted, natural, real, dominant, topTwo };
}

// Percentual relativo dentro do total das 24 escolhas (para barras)
export function asPercent(value: number, total = 24): number {
  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

// Interpretação narrativa por perfil dominante (combinações principais).
// Usado pra gerar resumo no relatório.
export const DISC_PROFILE_NARRATIVES: Record<string, string> = {
  D: 'Perfil de ação rápida e foco em resultado. Funciona bem com autonomia e desafio direto. Pode parecer impaciente em ambientes lentos.',
  I: 'Perfil expressivo e relacional. Energiza grupos, persuade pelo entusiasmo. Pode subestimar prazos e detalhes.',
  S: 'Perfil estável e cooperativo. Constrói confiança aos poucos, valoriza harmonia. Pode resistir a mudanças bruscas.',
  C: 'Perfil analítico e meticuloso. Entrega qualidade e precisão. Pode travar em decisões com pouca informação.',

  DI: 'Combina foco em resultado com energia social — perfil de quem lidera pela frente, vende, abre porta. Bom em vendas consultivas e gestão comercial.',
  DC: 'Combina foco em resultado com rigor analítico — perfil estratégico, exigente, cobra dado e previsibilidade. Bom em tráfego, BI, gestão técnica.',
  DS: 'Foco em resultado com base estável — perfil firme, mas que constrói. Bom em coordenação, projetos longos.',

  ID: 'Influência com força — vendedor agressivo, comunicador que decide rápido. Bom em fechamento, captação.',
  IS: 'Comunicador acolhedor — perfil de relacionamento longo. Bom em CS, atendimento, retenção.',
  IC: 'Comunicador analítico — perfil que persuade com dado, apresentador técnico. Bom em marketing de conteúdo, ensino.',

  SD: 'Estabilidade com determinação — perfil de operador firme, executa o combinado. Bom em ops, gestão de processos.',
  SI: 'Estabilidade com calor humano — perfil de cuidador, cola time. Bom em CS, RH, suporte.',
  SC: 'Estabilidade com método — perfil cuidadoso, segue procedimento. Bom em finanças, compliance, operações sensíveis.',

  CD: 'Análise com determinação — perfil que cobra padrão e qualidade. Bom em QA, gestão técnica, auditoria.',
  CI: 'Análise com comunicação — perfil que explica o complexo, ensina. Bom em conteúdo técnico, treinamento.',
  CS: 'Análise com paciência — perfil meticuloso e calmo. Bom em design, contabilidade, dev backend.',
};

export function narrativeFor(dominant: string): string {
  if (!dominant) return '';
  if (DISC_PROFILE_NARRATIVES[dominant]) return DISC_PROFILE_NARRATIVES[dominant];
  // Fallback: usa só a primeira letra
  const first = dominant[0];
  return DISC_PROFILE_NARRATIVES[first] || '';
}
