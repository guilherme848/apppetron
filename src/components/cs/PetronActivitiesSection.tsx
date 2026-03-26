import { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, ListChecks, User, Play, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  usePetronOnboardingByClient,
  usePetronOnboardingTasksByClient,
  usePetronSequenceStepsForPlan,
  useCreatePetronOnboardingForClient,
  useUpdatePetronTask,
  useCompletePetronOnboarding,
} from '@/hooks/usePetronClientOnboarding';
import { useCrm } from '@/contexts/CrmContext';
import { PETRON_TASK_STATUS_LABELS, OWNER_ROLE_LABELS, type PetronTaskStatus } from '@/types/petronOnboarding';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PetronActivitiesSectionProps {
  clientId: string;
  isLocked?: boolean;
  onComplete?: () => void;
}

export function PetronActivitiesSection({
  clientId,
  isLocked = false,
  onComplete,
}: PetronActivitiesSectionProps) {
  const { accounts } = useCrm();
  const client = accounts.find((a) => a.id === clientId);
  const planId = client?.service_id || null;

  // Petron onboarding for this client
  const { data: petronOnboarding, isLoading: onboardingLoading } = usePetronOnboardingByClient(clientId);
  const { data: tasks, isLoading: tasksLoading } = usePetronOnboardingTasksByClient(petronOnboarding?.id || null);

  // Sequence preview (when no tasks exist yet)
  const { data: sequenceData, isLoading: sequenceLoading } = usePetronSequenceStepsForPlan(
    !petronOnboarding ? planId : null
  );

  // Mutations
  const createOnboarding = useCreatePetronOnboardingForClient();
  const updateTask = useUpdatePetronTask();
  const completeOnboarding = useCompletePetronOnboarding();

  const hasTasks = tasks && tasks.length > 0;
  const hasSequence = sequenceData?.steps && sequenceData.steps.length > 0;

  const completedTasks = tasks?.filter((t) => t.status === 'done').length || 0;
  const totalTasks = tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const canComplete = totalTasks > 0 && completedTasks === totalTasks;

  const handleStatusChange = async (taskId: string, status: PetronTaskStatus) => {
    if (!petronOnboarding) return;
    await updateTask.mutateAsync({
      taskId,
      onboardingId: petronOnboarding.id,
      updates: { status },
    });
  };

  const handleStartOnboarding = async () => {
    if (!planId) return;
    await createOnboarding.mutateAsync({
      clientId,
      planId,
    });
  };

  const handleCompleteOnboarding = async () => {
    if (!petronOnboarding || !canComplete) return;
    await completeOnboarding.mutateAsync({
      onboardingId: petronOnboarding.id,
      clientId,
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

  const isLoading = onboardingLoading || tasksLoading || sequenceLoading;

  if (isLoading) {
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

  // No onboarding started yet - show preview and start button
  if (!petronOnboarding && hasSequence) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Atividades de Onboarding
            </CardTitle>
            <CardDescription>
              Preview da sequência "{sequenceData.sequence?.name}" do plano {client?.service_contracted}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Iniciar Onboarding</p>
                  <p className="text-sm text-muted-foreground">
                    {sequenceData.steps.length} atividades serão criadas automaticamente
                  </p>
                </div>
                <Button onClick={handleStartOnboarding} disabled={createOnboarding.isPending}>
                  {createOnboarding.isPending ? (
                    <Skeleton className="h-4 w-16 rounded" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Iniciar Onboarding
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {sequenceData.steps.map((step, index) => (
                  <div key={step.id} className="p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{step.activity_title}</p>
                      {step.activity_description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {step.activity_description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {step.offset_days !== null && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            D+{step.offset_days}
                          </span>
                        )}
                        {step.default_owner_role && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {OWNER_ROLE_LABELS[step.default_owner_role] || step.default_owner_role}
                          </span>
                        )}
                        {step.required && (
                          <Badge variant="outline" className="text-xs">
                            Obrigatória
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No sequence configured for plan
  if (!petronOnboarding && !hasSequence) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma sequência de onboarding configurada para o plano deste cliente.</p>
          <p className="text-sm">Configure uma sequência em Configurações → CS → Onboarding.</p>
        </CardContent>
      </Card>
    );
  }

  // Has onboarding with tasks
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
                Sequência: {petronOnboarding?.sequence_name || 'Padrão'}
              </CardDescription>
            </div>
            {canComplete && petronOnboarding?.status !== 'completed' && (
              <Button onClick={handleCompleteOnboarding} disabled={completeOnboarding.isPending}>
                {completeOnboarding.isPending ? (
                  <Skeleton className="h-4 w-16 rounded" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Concluir Onboarding
              </Button>
            )}
            {petronOnboarding?.status === 'completed' && (
              <Badge variant="default">
                Concluído
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso Geral</span>
              <span className="font-medium">
                {completedTasks} de {totalTasks} atividades
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasTasks ? (
            <p className="text-center py-6 text-muted-foreground">
              Nenhuma atividade definida para este onboarding.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 p-4 border rounded-lg transition-colors',
                    task.status === 'done' && 'bg-muted/30'
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {task.status === 'done' ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : task.status === 'doing' ? (
                      <Clock className="h-5 w-5 text-secondary" />
                    ) : task.status === 'blocked' ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={cn(
                          'font-medium',
                          task.status === 'done' && 'line-through text-muted-foreground'
                        )}
                      >
                        {task.title}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        #{task.step_order}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.due_date && (
                        <span>
                          Prazo: {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                      )}
                      {task.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Select */}
                  <Select
                    value={task.status}
                    onValueChange={(value) => handleStatusChange(task.id, value as PetronTaskStatus)}
                    disabled={petronOnboarding?.status === 'completed'}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PETRON_TASK_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
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
