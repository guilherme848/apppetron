import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NpsDistribution } from '@/types/commandCenter';
import { ThumbsUp, Minus, ThumbsDown, TrendingUp, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NpsSectionProps {
  data: NpsDistribution;
  detractorsWithoutFollowup: number;
  onViewDetractors: () => void;
  onViewPromoters: () => void;
  onCreatePlaybook: () => void;
}

export function NpsSection({
  data,
  detractorsWithoutFollowup,
  onViewDetractors,
  onViewPromoters,
  onCreatePlaybook,
}: NpsSectionProps) {
  const total = data.promoters + data.passives + data.detractors;
  
  const getPercentage = (value: number) => total > 0 ? Math.round((value / total) * 100) : 0;
  
  // NPS Score calculation: % Promoters - % Detractors
  const npsScore = total > 0 
    ? Math.round(((data.promoters - data.detractors) / total) * 100)
    : 0;

  const getNpsColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-yellow-600';
    return 'text-destructive';
  };

  const getNpsLabel = (score: number) => {
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Muito Bom';
    if (score >= 0) return 'Bom';
    if (score >= -50) return 'Ruim';
    return 'Crítico';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            NPS do Período
          </CardTitle>
          <div className={cn('text-2xl font-bold', getNpsColor(npsScore))}>
            {npsScore}
            <span className="text-sm font-normal ml-1 text-muted-foreground">
              ({getNpsLabel(npsScore)})
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Distribution Bar */}
        <div className="space-y-2">
          <div className="h-3 rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 transition-all"
              style={{ width: `${getPercentage(data.promoters)}%` }}
            />
            <div 
              className="bg-gray-400 transition-all"
              style={{ width: `${getPercentage(data.passives)}%` }}
            />
            <div 
              className="bg-red-500 transition-all"
              style={{ width: `${getPercentage(data.detractors)}%` }}
            />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <button
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              onClick={onViewPromoters}
            >
              <div className="flex items-center justify-center gap-1 text-green-600">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-sm font-medium">Promotores</span>
              </div>
              <div className="text-xl font-bold text-green-600">{data.promoters}</div>
              <div className="text-xs text-muted-foreground">{getPercentage(data.promoters)}%</div>
            </button>

            <div className="p-2">
              <div className="flex items-center justify-center gap-1 text-gray-500">
                <Minus className="h-4 w-4" />
                <span className="text-sm font-medium">Neutros</span>
              </div>
              <div className="text-xl font-bold text-gray-500">{data.passives}</div>
              <div className="text-xs text-muted-foreground">{getPercentage(data.passives)}%</div>
            </div>

            <button
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              onClick={onViewDetractors}
            >
              <div className="flex items-center justify-center gap-1 text-destructive">
                <ThumbsDown className="h-4 w-4" />
                <span className="text-sm font-medium">Detratores</span>
              </div>
              <div className="text-xl font-bold text-destructive">{data.detractors}</div>
              <div className="text-xs text-muted-foreground">{getPercentage(data.detractors)}%</div>
            </button>
          </div>
        </div>

        {/* Alert: Detractors without follow-up */}
        {detractorsWithoutFollowup > 0 && (
          <div className="p-3 border border-destructive/30 bg-destructive/5 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {detractorsWithoutFollowup} detratores sem follow-up
                </span>
              </div>
              <Button size="sm" variant="destructive" onClick={onCreatePlaybook}>
                Criar Playbook
              </Button>
            </div>
          </div>
        )}

        {/* Average Score */}
        <div className="flex items-center justify-between text-sm border-t pt-3">
          <span className="text-muted-foreground">Média das notas</span>
          <span className="font-medium">{data.avgScore.toFixed(1)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1" 
            onClick={onViewDetractors}
          >
            Ver Detratores
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1" 
            onClick={onViewPromoters}
          >
            Pedir Cases
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
