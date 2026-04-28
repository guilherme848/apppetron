import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DISC_COLORS,
  DISC_LABELS,
  DISC_SHORT_DESCRIPTIONS,
  type DiscAssessment,
  type DiscDimension,
} from '@/types/disc';
import { asPercent, bundleFromAssessment, narrativeFor } from '@/lib/discScoring';

const DIMS: DiscDimension[] = ['D', 'I', 'S', 'C'];

interface Props {
  assessment: DiscAssessment;
}

export function DiscResultsCard({ assessment }: Props) {
  const bundle = bundleFromAssessment(assessment);
  if (!bundle) return null;

  const { adapted, natural, real, dominant } = bundle;
  const narrative = narrativeFor(dominant);

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Resultado DISC
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold tracking-tight">{dominant || '—'}</span>
              {dominant.split('').slice(0, 2).map((ch) => {
                const d = ch as DiscDimension;
                return (
                  <Badge
                    key={d}
                    variant="outline"
                    style={{ borderColor: `${DISC_COLORS[d]}66`, color: DISC_COLORS[d] }}
                  >
                    {DISC_LABELS[d]}
                  </Badge>
                );
              })}
            </div>
          </div>
          {assessment.completed_at && (
            <div className="text-[10px] text-muted-foreground text-right">
              Respondido em
              <br />
              <span className="font-medium text-foreground">
                {new Date(assessment.completed_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {narrative && (
          <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-lg border">
            {narrative}
          </p>
        )}

        {/* Barras por dimensão */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            <span>Dimensão</span>
            <div className="flex items-center gap-3">
              <span>Adaptado</span>
              <span>Natural</span>
            </div>
          </div>
          {DIMS.map((dim) => (
            <DimensionRow
              key={dim}
              dim={dim}
              adapted={adapted[dim]}
              natural={natural[dim]}
              real={real[dim]}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-foreground/70" />
            Adaptado = como age sob ambiente (MAIS)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-foreground/30" />
            Natural = comportamento instintivo (MENOS)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionRow({
  dim,
  adapted,
  natural,
  real,
}: {
  dim: DiscDimension;
  adapted: number;
  natural: number;
  real: number;
}) {
  const color = DISC_COLORS[dim];
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {dim}
          </span>
          <span className="font-medium">{DISC_LABELS[dim]}</span>
          <span className="text-muted-foreground hidden sm:inline">— {DISC_SHORT_DESCRIPTIONS[dim]}</span>
        </span>
        <span className="text-muted-foreground">
          <span className="text-foreground font-semibold">{adapted}</span>/{natural}
          <span
            className={`ml-2 font-semibold ${
              real > 0 ? 'text-emerald-600' : real < 0 ? 'text-rose-600' : 'text-muted-foreground'
            }`}
          >
            ({real > 0 ? '+' : ''}
            {real})
          </span>
        </span>
      </div>
      {/* Barra dupla */}
      <div className="space-y-1">
        <Bar value={asPercent(adapted)} color={color} />
        <Bar value={asPercent(natural)} color={color} dimmed />
      </div>
    </div>
  );
}

function Bar({ value, color, dimmed = false }: { value: number; color: string; dimmed?: boolean }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full transition-all"
        style={{
          width: `${value}%`,
          backgroundColor: color,
          opacity: dimmed ? 0.4 : 1,
        }}
      />
    </div>
  );
}
