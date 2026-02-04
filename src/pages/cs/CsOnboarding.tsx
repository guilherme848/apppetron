import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Users, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCsOnboardings, useCsOnboardingByClient, useUpdateOnboardingStep, CS_ONBOARDING_STATUS_LABELS, type CsOnboardingStepStatus } from '@/hooks/useCsOnboardings';
import { useOnboardingMeetings } from '@/hooks/useOnboardingMeeting';
import { useSalesBriefing } from '@/hooks/useSalesBriefing';
import { OnboardingWizard, type OnboardingStep } from '@/components/cs/OnboardingWizard';
import { SalesBriefingSection } from '@/components/cs/SalesBriefingSection';
import { OnboardingMeetingSection } from '@/components/cs/OnboardingMeetingSection';
import { OnboardingActivitiesSection } from '@/components/cs/OnboardingActivitiesSection';
import { OnboardingListCard } from '@/components/cs/OnboardingListCard';
import { useCrm } from '@/contexts/CrmContext';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export default function CsOnboarding() {
  const { accounts, loading: accountsLoading } = useCrm();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // Get all onboardings (for the list)
  const { data: allOnboardings, isLoading: onboardingsLoading, refetch: refetchOnboardings } = useCsOnboardings();

  // Get centralized onboarding for selected client
  const { data: onboarding, isLoading: onboardingLoading, refetch: refetchOnboarding } = useCsOnboardingByClient(selectedClientId);
  const updateStep = useUpdateOnboardingStep();

  // Get briefing data for selected client
  const { briefing, loading: briefingLoading, fetchData: fetchBriefing } = useSalesBriefing(selectedClientId || undefined);
  
  // Get meetings for selected client
  const { data: clientMeetings, isLoading: meetingsLoading } = useOnboardingMeetings(selectedClientId || undefined);

  // Refetch briefing when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchBriefing();
    }
  }, [selectedClientId, fetchBriefing]);

  // Filter in-progress onboardings by search
  const inProgressOnboardings = useMemo(() => {
    if (!allOnboardings) return [];
    // Only show in_progress onboardings
    const filtered = allOnboardings.filter(o => o.status === 'in_progress');
    if (!searchTerm) return filtered;
    const term = searchTerm.toLowerCase();
    return filtered.filter(o => o.client_name?.toLowerCase().includes(term));
  }, [allOnboardings, searchTerm]);

  // Calculate step statuses based on centralized onboarding data
  const steps: OnboardingStep[] = useMemo(() => {
    if (!onboarding) {
      return [
        { id: 1, key: 'briefing' as const, title: 'Briefing da Venda', description: 'Transcrição da call de vendas e geração do briefing via IA', status: 'not_started', isLocked: false },
        { id: 2, key: 'meeting' as const, title: 'Reunião de Onboarding', description: 'Perguntas organizadas em blocos para coleta de informações', status: 'not_started', isLocked: true },
        { id: 3, key: 'activities' as const, title: 'Atividades de Onboarding', description: 'Tarefas automáticas geradas a partir do template do plano', status: 'not_started', isLocked: true },
      ];
    }

    const latestMeeting = clientMeetings?.[0];
    
    return [
      {
        id: 1,
        key: 'briefing' as const,
        title: 'Briefing da Venda',
        description: 'Transcrição da call de vendas e geração do briefing via IA',
        status: onboarding.step_1_status,
        completedAt: onboarding.step_1_status === 'completed' ? onboarding.updated_at : undefined,
        isLocked: false,
      },
      {
        id: 2,
        key: 'meeting' as const,
        title: 'Reunião de Onboarding',
        description: 'Perguntas organizadas em blocos para coleta de informações',
        status: onboarding.step_2_status,
        completedAt: onboarding.step_2_status === 'completed' ? latestMeeting?.updated_at : undefined,
        responsibleName: latestMeeting?.cs_owner_name,
        isLocked: onboarding.step_1_status !== 'completed',
      },
      {
        id: 3,
        key: 'activities' as const,
        title: 'Atividades de Onboarding',
        description: 'Tarefas automáticas geradas a partir do template do plano',
        status: onboarding.step_3_status,
        completedAt: onboarding.completed_at || undefined,
        isLocked: onboarding.step_2_status !== 'completed',
      },
    ];
  }, [onboarding, clientMeetings]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!onboarding) return 0;
    let completed = 0;
    if (onboarding.step_1_status === 'completed') completed++;
    if (onboarding.step_2_status === 'completed') completed++;
    if (onboarding.step_3_status === 'completed') completed++;
    return Math.round((completed / 3) * 100);
  }, [onboarding]);

  // Auto-select appropriate step based on progress
  useEffect(() => {
    if (!selectedClientId || !onboarding) {
      setCurrentStep(0);
      return;
    }
    
    // Navigate to current step based on onboarding data
    setCurrentStep(Math.min(onboarding.current_step - 1, 2));
  }, [selectedClientId, onboarding]);

  // Manual completion of Step 1 (Briefing)
  const handleCompleteStep1 = useCallback(async () => {
    if (!selectedClientId) return;
    if (updateStep.isPending) return;
    
    try {
      await updateStep.mutateAsync({ 
        clientId: selectedClientId, 
        step: 1, 
        status: 'completed' 
      });
      
      toast({
        title: 'Etapa 1 concluída',
        description: 'O briefing foi concluído e a Etapa 2 foi desbloqueada.',
      });
      
      // Automatically navigate to step 2
      setCurrentStep(1);
      
      // Refetch to update UI
      refetchOnboarding();
      refetchOnboardings();
    } catch (error) {
      console.error('Error completing step 1:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao concluir a etapa. Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [selectedClientId, updateStep, toast, refetchOnboarding, refetchOnboardings]);

  // Update Step 1 status to in_progress when briefing exists (without auto-completing)
  useEffect(() => {
    if (!selectedClientId || !onboarding || briefingLoading) return;
    
    const briefingExists = !!briefing;
    
    // Only mark as in_progress if briefing exists and step is not_started
    if (briefingExists && onboarding.step_1_status === 'not_started') {
      updateStep.mutate({ clientId: selectedClientId, step: 1, status: 'in_progress' });
    }
  }, [briefing, onboarding, selectedClientId, briefingLoading, updateStep]);

  // Sync step 2 status based on meeting
  useEffect(() => {
    if (!selectedClientId || !onboarding || meetingsLoading) return;
    
    const latestMeeting = clientMeetings?.[0];
    const meetingCompleted = latestMeeting?.status === 'completed';
    const meetingExists = !!latestMeeting;
    
    let newStatus: CsOnboardingStepStatus | null = null;
    
    if (meetingCompleted && onboarding.step_2_status !== 'completed') {
      newStatus = 'completed';
    } else if (meetingExists && !meetingCompleted && onboarding.step_2_status === 'not_started') {
      newStatus = 'in_progress';
    }
    
    if (newStatus) {
      updateStep.mutate({ clientId: selectedClientId, step: 2, status: newStatus });
    }
  }, [clientMeetings, onboarding, selectedClientId, meetingsLoading, updateStep]);

  const handleSelectOnboarding = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleStepClick = (stepIndex: number) => {
    if (!steps[stepIndex].isLocked) {
      setCurrentStep(stepIndex);
    }
  };

  const isLoading = accountsLoading || onboardingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedClient = accounts.find(a => a.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Onboarding</h1>
            <p className="text-muted-foreground">
              {inProgressOnboardings.length} onboarding{inProgressOnboardings.length !== 1 ? 's' : ''} em andamento
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => refetchOnboardings()}
          disabled={onboardingsLoading}
        >
          <RefreshCw className={cn("h-4 w-4", onboardingsLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Onboarding List - Left Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-4">
              {inProgressOnboardings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhum onboarding encontrado' : 'Nenhum onboarding em andamento'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                inProgressOnboardings.map((item) => (
                  <OnboardingListCard
                    key={item.id}
                    onboarding={item}
                    isSelected={selectedClientId === item.client_id}
                    onClick={() => handleSelectOnboarding(item.client_id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Onboarding Detail - Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* No client selected */}
          {!selectedClientId && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Selecione um onboarding da lista
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clique em um cliente à esquerda para ver os detalhes
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client selected - show wizard */}
          {selectedClientId && (
            <>
              {/* Status Card */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cliente</p>
                        <p className="font-semibold text-lg">{selectedClient?.name}</p>
                      </div>
                      {onboarding && (
                        <Badge
                          variant={
                            onboarding.status === 'completed' ? 'default' :
                            onboarding.status === 'in_progress' ? 'secondary' : 'outline'
                          }
                        >
                          {CS_ONBOARDING_STATUS_LABELS[onboarding.status]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{overallProgress}%</span>
                        </div>
                        <Progress value={overallProgress} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wizard Stepper */}
              <Card>
                <CardContent className="py-6">
                  <OnboardingWizard
                    steps={steps}
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                  />
                </CardContent>
              </Card>

              {/* Step Content */}
              <div className="mt-6">
                {currentStep === 0 && (
                  <SalesBriefingSection 
                    clientId={selectedClientId}
                    onCompleteStep={briefing ? handleCompleteStep1 : undefined}
                    stepCompleted={onboarding?.step_1_status === 'completed'}
                    completeLoading={updateStep.isPending}
                  />
                )}
                
                {currentStep === 1 && (
                  <OnboardingMeetingSection 
                    clientId={selectedClientId} 
                    isLocked={steps[1].isLocked}
                  />
                )}
                
                {currentStep === 2 && (
                  <OnboardingActivitiesSection
                    clientId={selectedClientId}
                    onboardingId={onboarding?.id || null}
                    isLocked={steps[2].isLocked}
                    onComplete={() => {
                      if (selectedClientId) {
                        updateStep.mutate({ clientId: selectedClientId, step: 3, status: 'completed' });
                      }
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
