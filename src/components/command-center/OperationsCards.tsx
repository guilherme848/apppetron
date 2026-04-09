import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OnboardingFunnel, NpsDistribution } from '@/types/commandCenter';
import { ArrowRight } from 'lucide-react';

interface OnboardingFunnelCardProps {
  data: OnboardingFunnel;
  onStageClick: (stage: string) => void;
}

export function OnboardingFunnelCard({ data, onStageClick }: OnboardingFunnelCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Funil de Onboarding</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Funnel stages */}
        <div className="flex items-center justify-between mb-6">
          <button 
            className="text-center hover:bg-muted/50 rounded-lg p-3 transition-colors flex-1"
            onClick={() => onStageClick('created')}
          >
            <div className="text-2xl font-bold">{data.created}</div>
            <div className="text-xs text-muted-foreground">Criados</div>
          </button>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          
          <button 
            className="text-center hover:bg-muted/50 rounded-lg p-3 transition-colors flex-1"
            onClick={() => onStageClick('in_progress')}
          >
            <div className="text-2xl font-bold text-primary">{data.inProgress}</div>
            <div className="text-xs text-muted-foreground">Em Andamento</div>
          </button>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          
          <button 
            className="text-center hover:bg-muted/50 rounded-lg p-3 transition-colors flex-1"
            onClick={() => onStageClick('completed')}
          >
            <div className="text-2xl font-bold text-success">{data.completed}</div>
            <div className="text-xs text-muted-foreground">Concluídos</div>
          </button>
        </div>

        {/* On time vs delayed */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <button 
            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
            onClick={() => onStageClick('on_time')}
          >
            <div className="w-3 h-3 rounded-full bg-success" />
            <div>
              <div className="text-sm font-medium">No Prazo</div>
              <div className="text-lg font-bold text-success">{data.onTime}</div>
            </div>
          </button>
          
          <button 
            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
            onClick={() => onStageClick('delayed')}
          >
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <div>
              <div className="text-sm font-medium">Atrasados</div>
              <div className="text-lg font-bold text-destructive">{data.delayed}</div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

interface NpsDistributionCardProps {
  data: NpsDistribution;
  onSegmentClick: (classification: 'promoter' | 'passive' | 'detractor') => void;
}

export function NpsDistributionCard({ data, onSegmentClick }: NpsDistributionCardProps) {
  const total = data.promoters + data.passives + data.detractors;
  const npsScore = total > 0 
    ? Math.round(((data.promoters - data.detractors) / total) * 100)
    : 0;
  
  const getPercentage = (value: number) => total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">NPS</CardTitle>
          <Badge 
            variant={npsScore >= 50 ? 'default' : npsScore >= 0 ? 'secondary' : 'destructive'}
            className="text-lg px-3"
          >
            {npsScore}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <div className="text-3xl font-bold">{data.avgScore.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Média do período</div>
        </div>

        {/* Distribution */}
        <div className="space-y-3">
          <button 
            className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => onSegmentClick('promoter')}
          >
            <div className="w-3 h-3 rounded-full bg-success shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span>Promotores (9-10)</span>
                <span className="font-medium">{data.promoters}</span>
              </div>
              <Progress value={getPercentage(data.promoters)} className="h-2 mt-1" />
            </div>
          </button>

          <button 
            className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => onSegmentClick('passive')}
          >
            <div className="w-3 h-3 rounded-full bg-warning shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span>Neutros (7-8)</span>
                <span className="font-medium">{data.passives}</span>
              </div>
              <Progress value={getPercentage(data.passives)} className="h-2 mt-1" />
            </div>
          </button>

          <button 
            className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => onSegmentClick('detractor')}
          >
            <div className="w-3 h-3 rounded-full bg-destructive shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span>Detratores (0-6)</span>
                <span className="font-medium">{data.detractors}</span>
              </div>
              <Progress value={getPercentage(data.detractors)} className="h-2 mt-1" />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
