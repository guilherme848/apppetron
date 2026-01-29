import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CsOnboarding, CS_ONBOARDING_STATUS_LABELS } from '@/hooks/useCsOnboardings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OnboardingListCardProps {
  onboarding: CsOnboarding;
  isSelected: boolean;
  onClick: () => void;
}

export function OnboardingListCard({ onboarding, isSelected, onClick }: OnboardingListCardProps) {
  // Calculate progress
  let completed = 0;
  if (onboarding.step_1_status === 'completed') completed++;
  if (onboarding.step_2_status === 'completed') completed++;
  if (onboarding.step_3_status === 'completed') completed++;
  const progress = Math.round((completed / 3) * 100);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        isSelected && "border-primary ring-1 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{onboarding.client_name || 'Cliente sem nome'}</p>
              <Badge
                variant={
                  onboarding.status === 'completed' ? 'default' :
                  onboarding.status === 'in_progress' ? 'secondary' : 'outline'
                }
                className="shrink-0"
              >
                {CS_ONBOARDING_STATUS_LABELS[onboarding.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Etapa {onboarding.current_step} de 3</span>
              {onboarding.cs_owner_name && (
                <span>CS: {onboarding.cs_owner_name}</span>
              )}
              <span>Início: {format(new Date(onboarding.started_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
          </div>
          <div className="w-24 shrink-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
