import { useMemo } from 'react';
import { Check, Lock, Clock, FileText, Users, ListChecks, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type OnboardingStepStatus = 'not_started' | 'in_progress' | 'completed';

export interface OnboardingStep {
  id: number;
  key: 'briefing' | 'meeting' | 'activities';
  title: string;
  description: string;
  status: OnboardingStepStatus;
  completedAt?: string;
  responsibleName?: string;
  isLocked: boolean;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
}

const stepIcons = {
  briefing: FileText,
  meeting: Users,
  activities: ListChecks,
};

const statusLabels: Record<OnboardingStepStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};

const statusColors: Record<OnboardingStepStatus, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-secondary text-secondary-foreground',
  completed: 'bg-primary text-primary-foreground',
};

export function OnboardingWizard({ steps, currentStep, onStepClick }: OnboardingWizardProps) {
  return (
    <div className="w-full">
      {/* Desktop Stepper */}
      <div className="hidden md:flex items-start justify-between relative">
        {/* Connection Line */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-border" style={{ left: '8.33%', right: '8.33%' }} />
        
        {steps.map((step, index) => {
          const Icon = stepIcons[step.key];
          const isClickable = !step.isLocked;
          const isActive = currentStep === index;
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center w-1/3 relative z-10",
                isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all",
                  step.status === 'completed' && "bg-primary border-primary text-primary-foreground",
                  step.status === 'in_progress' && "bg-secondary border-secondary text-secondary-foreground",
                  step.status === 'not_started' && !step.isLocked && "bg-background border-muted-foreground/30 text-muted-foreground",
                  step.isLocked && "bg-muted border-muted-foreground/20 text-muted-foreground",
                  isActive && "ring-4 ring-primary/30"
                )}
              >
                {step.isLocked ? (
                  <Lock className="h-6 w-6" />
                ) : step.status === 'completed' ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              
              {/* Step Info */}
              <div className="mt-3 text-center">
                <p className={cn(
                  "font-semibold text-sm",
                  isActive && "text-primary"
                )}>
                  Etapa {step.id}
                </p>
                <p className={cn(
                  "font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                <Badge 
                  variant="outline" 
                  className={cn("mt-2", statusColors[step.status])}
                >
                  {statusLabels[step.status]}
                </Badge>
                {step.completedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Concluído em {new Date(step.completedAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {step.responsibleName && (
                  <p className="text-xs text-muted-foreground">
                    CS: {step.responsibleName}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Mobile Stepper */}
      <div className="md:hidden space-y-2">
        {steps.map((step, index) => {
          const Icon = stepIcons[step.key];
          const isClickable = !step.isLocked;
          const isActive = currentStep === index;
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                isClickable ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed opacity-60",
                isActive && "ring-2 ring-primary bg-muted/30"
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  step.status === 'completed' && "bg-primary text-primary-foreground",
                  step.status === 'in_progress' && "bg-secondary text-secondary-foreground",
                  step.status === 'not_started' && "bg-muted text-muted-foreground"
                )}
              >
                {step.isLocked ? (
                  <Lock className="h-4 w-4" />
                ) : step.status === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  Etapa {step.id} — {step.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              <Badge variant="outline" className={cn("flex-shrink-0", statusColors[step.status])}>
                {statusLabels[step.status]}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
