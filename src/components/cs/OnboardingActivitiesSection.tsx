import { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, ListChecks, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCsClientOnboarding, useCsClientTasks } from '@/hooks/useCsData';
import { CS_TASK_STATUS_LABELS, type CsOnboardingTaskStatus } from '@/types/cs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OnboardingActivitiesSectionProps {
  clientId: string;
  onboardingId: string | null;
  isLocked?: boolean;
  onComplete?: () => void;
}

export function OnboardingActivitiesSection({
  clientId,
  onboardingId,
  isLocked = false,
  onComplete,
}: OnboardingActivitiesSectionProps) {
  const { tasks, loading, updateTask } = useCsClientTasks(onboardingId);
  const { updateOnboarding } = useCsClientOnboarding();

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const requiredTasks = tasks.filter(t => t.required);
  const requiredCompleted = requiredTasks.filter(t => t.status === 'done').length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const canComplete = requiredTasks.every(t => t.status === 'done');

  const handleStatusChange = async (taskId: string, status: CsOnboardingTaskStatus) => {
    await updateTask(taskId, { status });
  };

  const handleCompleteOnboarding = async () => {
    if (!onboardingId || !canComplete) return;
    await updateOnboarding(onboardingId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    onComplete?.();
  };

  if (isLocked) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Etapa Bloqueada</p>
            <p className="text-sm">
              Complete a Reunião de Onboarding (Etapa 2) para liberar as Atividades.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!onboardingId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum fluxo de onboarding iniciado para este cliente.</p>
          <p className="text-sm">As atividades serão geradas automaticamente após a conclusão da Reunião de Onboarding.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Atividades de Onboarding
              </CardTitle>
              <CardDescription>
                Tarefas geradas automaticamente a partir do template do plano do cliente
              </CardDescription>
            </div>
            {canComplete && (
              <Button onClick={handleCompleteOnboarding}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir Onboarding
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso Geral</span>
              <span className="font-medium">{completedTasks} de {totalTasks} tarefas</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
                {requiredCompleted}/{requiredTasks.length} obrigatórias
              </span>
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                {completedTasks - requiredCompleted}/{totalTasks - requiredTasks.length} opcionais
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              Nenhuma atividade definida para este onboarding.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-4 border rounded-lg transition-colors",
                    task.status === 'done' && "bg-muted/30"
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {task.status === 'done' ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : task.status === 'in_progress' ? (
                      <Clock className="h-5 w-5 text-secondary" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn(
                        "font-medium",
                        task.status === 'done' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      {task.required && (
                        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                          Obrigatória
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.due_at && (
                        <span>
                          Prazo: {format(new Date(task.due_at), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                      )}
                      {task.responsible_member_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.responsible_member_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Select */}
                  <Select
                    value={task.status}
                    onValueChange={(value) => handleStatusChange(task.id, value as CsOnboardingTaskStatus)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CS_TASK_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
