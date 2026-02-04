import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withAbortRetry } from '@/lib/withAbortRetry';

// ============ Types ============
export type CsOnboardingStatus = 'not_started' | 'in_progress' | 'completed';
export type CsOnboardingStepStatus = 'not_started' | 'in_progress' | 'completed';

export interface CsOnboarding {
  id: string;
  client_id: string;
  cs_owner_id: string | null;
  current_step: number;
  status: CsOnboardingStatus;
  step_1_status: CsOnboardingStepStatus;
  step_2_status: CsOnboardingStepStatus;
  step_3_status: CsOnboardingStepStatus;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  cs_owner_name?: string;
}

// ============ Labels ============
export const CS_ONBOARDING_STATUS_LABELS: Record<CsOnboardingStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};

export const CS_STEP_STATUS_LABELS: Record<CsOnboardingStepStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};

// ============ Fetch all onboardings ============
export function useCsOnboardings() {
  return useQuery({
    queryKey: ['cs_onboardings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_onboardings')
        .select(`
          *,
          accounts:client_id (name),
          team_members:cs_owner_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        client_name: d.accounts?.name,
        cs_owner_name: d.team_members?.name,
      })) as CsOnboarding[];
    },
  });
}

// ============ Fetch single onboarding by client ID ============
export function useCsOnboardingByClient(clientId: string | null) {
  return useQuery({
    queryKey: ['cs_onboarding', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('cs_onboardings')
        .select(`
          *,
          accounts:client_id (name),
          team_members:cs_owner_id (name)
        `)
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        client_name: (data as any).accounts?.name,
        cs_owner_name: (data as any).team_members?.name,
      } as CsOnboarding;
    },
    enabled: !!clientId,
  });
}

// ============ Update onboarding step status ============
export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      step,
      status,
    }: {
      clientId: string;
      step: 1 | 2 | 3;
      status: CsOnboardingStepStatus;
    }) => {
      const { data, error } = await withAbortRetry(() =>
        supabase.rpc('update_onboarding_step', {
          p_client_id: clientId,
          p_step: step,
          p_new_status: status,
        })
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['cs_onboarding', clientId] });
      queryClient.invalidateQueries({ queryKey: ['cs_onboardings'] });
    },
  });
}

// ============ Direct update onboarding ============
export function useUpdateOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      updates,
    }: {
      clientId: string;
      updates: Partial<Pick<CsOnboarding, 
        'cs_owner_id' | 'current_step' | 'status' | 
        'step_1_status' | 'step_2_status' | 'step_3_status' | 
        'completed_at'
      >>;
    }) => {
      const { data, error } = await supabase
        .from('cs_onboardings')
        .update(updates)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['cs_onboarding', clientId] });
      queryClient.invalidateQueries({ queryKey: ['cs_onboardings'] });
    },
  });
}
