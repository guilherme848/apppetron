import { useState, useEffect, useMemo } from 'react';
import { Loader2, Users, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCsOnboardingByClient, useUpdateOnboardingStep, CS_ONBOARDING_STATUS_LABELS, type CsOnboardingStepStatus } from '@/hooks/useCsOnboardings';
import { useOnboardingMeetings } from '@/hooks/useOnboardingMeeting';
import { useSalesBriefing } from '@/hooks/useSalesBriefing';
import { OnboardingWizard, type OnboardingStep } from '@/components/cs/OnboardingWizard';
import { SalesBriefingSection } from '@/components/cs/SalesBriefingSection';
import { OnboardingMeetingSection } from '@/components/cs/OnboardingMeetingSection';
import { OnboardingActivitiesSection } from '@/components/cs/OnboardingActivitiesSection';
import { useCrm } from '@/contexts/CrmContext';
import { cn } from '@/lib/utils';

export default function CsOnboarding() {
  const { accounts, loading: accountsLoading } = useCrm();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

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

  // Get all clients (not just active - every client has onboarding)
  const allClients = useMemo(() => {
    return accounts.filter(a => a.deleted_at === null);
  }, [accounts]);

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!searchTerm) return allClients;
    const term = searchTerm.toLowerCase();
    return allClients.filter(c => c.name.toLowerCase().includes(term));
  }, [allClients, searchTerm]);

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

  // Sync step 1 status based on briefing
  useEffect(() => {
    if (!selectedClientId || !onboarding || briefingLoading) return;
    
    const briefingApproved = briefing?.status === 'approved';
    const briefingExists = !!briefing;
    
    let newStatus: CsOnboardingStepStatus | null = null;
    
    if (briefingApproved && onboarding.step_1_status !== 'completed') {
      newStatus = 'completed';
    } else if (briefingExists && !briefingApproved && onboarding.step_1_status === 'not_started') {
      newStatus = 'in_progress';
    }
    
    if (newStatus) {
      updateStep.mutate({ clientId: selectedClientId, step: 1, status: newStatus });
    }
  }, [briefing, onboarding, selectedClientId, briefingLoading]);

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
  }, [clientMeetings, onboarding, selectedClientId, meetingsLoading]);

  const handleClientChange = (clientId: string) => {
    if (clientId === '_none_') {
      setSelectedClientId(null);
    } else {
      setSelectedClientId(clientId);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (!steps[stepIndex].isLocked) {
      setCurrentStep(stepIndex);
    }
  };

  const isLoading = accountsLoading;

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
            <p className="text-muted-foreground">Processo de onboarding em 3 etapas obrigatórias e sequenciais</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Client Search & Select */}
          <div className="w-full sm:w-80">
            <Select value={selectedClientId || '_none_'} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <SelectItem value="_none_">Nenhum cliente selecionado</SelectItem>
                {filteredClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedClientId && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchOnboarding()}
              disabled={onboardingLoading}
            >
              <RefreshCw className={cn("h-4 w-4", onboardingLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {/* No client selected */}
      {!selectedClientId && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Selecione um cliente para ver o onboarding
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Todo cliente possui automaticamente um processo de onboarding
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
              <SalesBriefingSection clientId={selectedClientId} />
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
  );
}
