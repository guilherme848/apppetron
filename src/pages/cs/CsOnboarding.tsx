import { useState, useEffect, useMemo } from 'react';
import { Loader2, Users, Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCsClientOnboarding } from '@/hooks/useCsData';
import { useOnboardingMeetings } from '@/hooks/useOnboardingMeeting';
import { useSalesBriefing } from '@/hooks/useSalesBriefing';
import { OnboardingWizard, type OnboardingStep, type OnboardingStepStatus } from '@/components/cs/OnboardingWizard';
import { SalesBriefingSection } from '@/components/cs/SalesBriefingSection';
import { OnboardingMeetingSection } from '@/components/cs/OnboardingMeetingSection';
import { OnboardingActivitiesSection } from '@/components/cs/OnboardingActivitiesSection';
import { CreateOnboardingMeetingDialog } from '@/components/cs/CreateOnboardingMeetingDialog';
import { useCrm } from '@/contexts/CrmContext';

export default function CsOnboarding() {
  const { onboardings, loading: onboardingsLoading } = useCsClientOnboarding();
  const { accounts, loading: accountsLoading } = useCrm();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

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

  // Get clients that can have onboarding (active or in progress)
  const activeClients = useMemo(() => {
    return accounts.filter(a => a.status === 'active' || a.status === 'lead');
  }, [accounts]);

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!searchTerm) return activeClients;
    const term = searchTerm.toLowerCase();
    return activeClients.filter(c => c.name.toLowerCase().includes(term));
  }, [activeClients, searchTerm]);

  // Get onboarding for selected client
  const selectedOnboarding = useMemo(() => {
    if (!selectedClientId) return null;
    return onboardings.find(o => o.client_id === selectedClientId) || null;
  }, [selectedClientId, onboardings]);

  // Calculate step statuses based on data
  const steps: OnboardingStep[] = useMemo(() => {
    const latestMeeting = clientMeetings?.[0];
    const meetingCompleted = latestMeeting?.status === 'completed';
    const briefingApproved = briefing?.status === 'approved';
    const onboardingCompleted = selectedOnboarding?.status === 'completed';

    // Step 1: Briefing da Venda
    let briefingStatus: OnboardingStepStatus = 'not_started';
    if (briefingApproved) {
      briefingStatus = 'completed';
    } else if (briefing) {
      briefingStatus = 'in_progress';
    }

    // Step 2: Reunião de Onboarding
    let meetingStatus: OnboardingStepStatus = 'not_started';
    if (meetingCompleted) {
      meetingStatus = 'completed';
    } else if (latestMeeting) {
      meetingStatus = 'in_progress';
    }

    // Step 3: Atividades de Onboarding
    let activitiesStatus: OnboardingStepStatus = 'not_started';
    if (onboardingCompleted) {
      activitiesStatus = 'completed';
    } else if (selectedOnboarding?.status === 'in_progress') {
      activitiesStatus = 'in_progress';
    }

    return [
      {
        id: 1,
        key: 'briefing' as const,
        title: 'Briefing da Venda',
        description: 'Transcrição da call de vendas e geração do briefing via IA',
        status: briefingStatus,
        completedAt: briefingApproved ? briefing?.updated_at : undefined,
        isLocked: false,
      },
      {
        id: 2,
        key: 'meeting' as const,
        title: 'Reunião de Onboarding',
        description: 'Perguntas organizadas em blocos para coleta de informações',
        status: meetingStatus,
        completedAt: meetingCompleted ? latestMeeting?.updated_at : undefined,
        responsibleName: latestMeeting?.cs_owner_name,
        isLocked: !briefingApproved,
      },
      {
        id: 3,
        key: 'activities' as const,
        title: 'Atividades de Onboarding',
        description: 'Tarefas automáticas geradas a partir do template do plano',
        status: activitiesStatus,
        completedAt: onboardingCompleted ? selectedOnboarding?.completed_at : undefined,
        isLocked: !meetingCompleted,
      },
    ];
  }, [briefing, clientMeetings, selectedOnboarding]);

  // Auto-select appropriate step based on progress
  useEffect(() => {
    if (!selectedClientId) {
      setCurrentStep(0);
      return;
    }
    
    // Find the first incomplete step, or the last step if all complete
    const firstIncompleteIndex = steps.findIndex(s => s.status !== 'completed' && !s.isLocked);
    if (firstIncompleteIndex >= 0) {
      setCurrentStep(firstIncompleteIndex);
    } else {
      // All steps complete or locked - show the last completed one
      const lastCompletedIndex = [...steps].reverse().findIndex(s => s.status === 'completed');
      setCurrentStep(lastCompletedIndex >= 0 ? steps.length - 1 - lastCompletedIndex : 0);
    }
  }, [selectedClientId, steps]);

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

  const isLoading = onboardingsLoading || accountsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Onboarding</h1>
            <p className="text-muted-foreground">Processo completo de onboarding de clientes em 3 etapas</p>
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
                Use o seletor acima para escolher o cliente e acompanhar o processo de onboarding
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client selected - show wizard */}
      {selectedClientId && (
        <>
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
                onboardingId={selectedOnboarding?.id || null}
                isLocked={steps[2].isLocked}
                onComplete={() => {
                  // Refresh the page data
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
