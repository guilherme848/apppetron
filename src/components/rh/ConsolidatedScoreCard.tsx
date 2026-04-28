import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { consolidatedScore, type ConsolidatedInputs } from '@/lib/evaluationScoring';

interface Props {
  inputs: ConsolidatedInputs;
}

export function ConsolidatedScoreCard({ inputs }: Props) {
  const result = consolidatedScore(inputs);
  if (result.total === null) return null;

  const tone =
    result.total >= 75 ? 'good' : result.total >= 55 ? 'mid' : 'bad';
  const ringColor =
    tone === 'good' ? 'text-emerald-500' : tone === 'mid' ? 'text-amber-500' : 'text-rose-500';

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className={`h-4 w-4 ${ringColor}`} />
          <span className="text-sm font-semibold">Score consolidado</span>
        </div>

        <div className="flex items-baseline gap-2">
          <div className={`text-5xl font-bold ${ringColor}`}>{result.total}</div>
          <div className="text-sm text-muted-foreground">/100</div>
        </div>

        <div className="space-y-1.5">
          {result.parts.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {p.label}
                <Badge variant="outline" className="ml-1.5 text-[9px]">
                  peso {p.weight}
                </Badge>
              </span>
              <span className="font-semibold tabular-nums">{p.value}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Combina IA do currículo, fit DISC, média das entrevistas e teste técnico (quando existem).
          Entrevistas e teste técnico pesam mais que IA e DISC.
        </p>
      </CardContent>
    </Card>
  );
}
