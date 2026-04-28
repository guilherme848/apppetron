import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import type { DiscDimension } from '@/types/disc';
import { DISC_COLORS, DISC_LABELS } from '@/types/disc';
import type { HrTargetDisc } from '@/types/hrEvaluations';
import { calculateDiscFit, discFitLabel } from '@/lib/discFit';
import type { DiscAssessment } from '@/types/disc';

const DIMS: DiscDimension[] = ['D', 'I', 'S', 'C'];

interface Props {
  assessment: DiscAssessment | null;
  target: HrTargetDisc | null;
}

export function DiscFitCard({ assessment, target }: Props) {
  const fit = calculateDiscFit(assessment, target);
  if (fit === null || !target || !assessment) return null;
  const { label, tone } = discFitLabel(fit);

  const ring =
    tone === 'good' ? 'text-emerald-600' : tone === 'mid' ? 'text-amber-600' : 'text-rose-600';
  const border =
    tone === 'good'
      ? 'border-emerald-500/30'
      : tone === 'mid'
      ? 'border-amber-500/30'
      : 'border-rose-500/30';

  // Vetor candidato (escala 0..100 a partir de MOST/24)
  const candidate: Record<DiscDimension, number> = {
    D: ((assessment.score_d_most ?? 0) / 24) * 100,
    I: ((assessment.score_i_most ?? 0) / 24) * 100,
    S: ((assessment.score_s_most ?? 0) / 24) * 100,
    C: ((assessment.score_c_most ?? 0) / 24) * 100,
  };

  return (
    <Card className={border}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className={`h-4 w-4 ${ring}`} />
            <span className="text-sm font-semibold">DISC fit · vaga</span>
          </div>
          <Badge variant="outline" className={ring}>
            {label}
          </Badge>
        </div>

        <div className="flex items-baseline gap-2">
          <div className={`text-4xl font-bold ${ring}`}>{fit}%</div>
        </div>

        <div className="space-y-1.5">
          {DIMS.map((d) => {
            const cand = Math.round(candidate[d]);
            const tgt = Math.round(target[d] ?? 50);
            return (
              <div key={d}>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="font-medium flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold text-white"
                      style={{ backgroundColor: DISC_COLORS[d] }}
                    >
                      {d}
                    </span>
                    {DISC_LABELS[d]}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="text-foreground font-semibold">{cand}</span>
                    <span className="opacity-50"> · alvo {tgt}</span>
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted">
                  {/* barra do candidato */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, cand))}%`,
                      backgroundColor: DISC_COLORS[d],
                    }}
                  />
                  {/* marcador do target */}
                  <div
                    className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-foreground/70"
                    style={{ left: `${Math.min(100, Math.max(0, tgt))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Barra colorida = candidato (Adaptado). Marca preta = alvo da vaga.
        </p>
      </CardContent>
    </Card>
  );
}
