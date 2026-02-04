import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  PetronCustomerOnboarding,
  PetronOnboardingTask,
  PetronSequenceStep,
  PetronTaskStatus,
} from '@/types/petronOnboarding';

// ============ Get Petron onboarding by client ID ============
export function usePetronOnboardingByClient(clientId: string | null) {
  return useQuery({
    queryKey: ['petron-client-onboarding', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('petron_customer_onboardings')
        .select(`
          *,
          accounts!inner(name, service_id),
          services(name),
          petron_onboarding_sequences(name)
        `)
        .eq('customer_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        customer_name: (data as any).accounts?.name,
        plan_id: (data as any).accounts?.service_id,
        plan_name: (data as any).services?.name,
        sequence_name: (data as any).petron_onboarding_sequences?.name,
      } as PetronCustomerOnboarding & { plan_id: string };
    },
    enabled: !!clientId,
  });
}

// ============ Get tasks for Petron onboarding ============
export function usePetronOnboardingTasksByClient(onboardingId: string | null) {
  return useQuery({
    queryKey: ['petron-onboarding-tasks', onboardingId],
    queryFn: async () => {
      if (!onboardingId) return [];

      const { data, error } = await supabase
        .from('petron_onboarding_tasks')
        .select(`
          *,
          team_members(name)
        `)
        .eq('onboarding_id', onboardingId)
        .order('step_order');

      if (error) throw error;

      return data.map((t: any) => ({
        ...t,
        assigned_to_name: t.team_members?.name,
      })) as PetronOnboardingTask[];
    },
    enabled: !!onboardingId,
  });
}

// ============ Get sequence steps for a plan (preview) ============
export function usePetronSequenceStepsForPlan(planId: string | null) {
  return useQuery({
    queryKey: ['petron-sequence-steps-for-plan', planId],
    queryFn: async () => {
      if (!planId) return { sequence: null, steps: [] };

      // First, find the active sequence for this plan
      const { data: sequence, error: seqError } = await supabase
        .from('petron_onboarding_sequences')
        .select('id, name')
        .eq('plan_id', planId)
        .eq('active', true)
        .limit(1)
        .maybeSingle();

      if (seqError) throw seqError;
      if (!sequence) return { sequence: null, steps: [] };

      // Get sequence steps
      const { data: steps, error: stepsError } = await supabase
        .from('petron_onboarding_sequence_steps')
        .select(`
          *,
          petron_onboarding_activity_templates(title, description, default_sla_days, default_owner_role)
        `)
        .eq('sequence_id', sequence.id)
        .order('step_order');

      if (stepsError) throw stepsError;

      return {
        sequence,
        steps: steps.map((s: any) => ({
          ...s,
          activity_title: s.petron_onboarding_activity_templates?.title,
          activity_description: s.petron_onboarding_activity_templates?.description,
          default_sla_days: s.petron_onboarding_activity_templates?.default_sla_days,
          default_owner_role: s.petron_onboarding_activity_templates?.default_owner_role,
        })) as PetronSequenceStep[],
      };
    },
    enabled: !!planId,
  });
}

// ============ Create Petron onboarding and generate tasks ============
export function useCreatePetronOnboardingForClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      clientId,
      planId,
      startDate,
    }: {
      clientId: string;
      planId: string;
      startDate?: string;
    }) => {
      const effectiveStartDate = startDate || new Date().toISOString().split('T')[0];

      // Create the onboarding record
      const { data: onboarding, error: createError } = await supabase
        .from('petron_customer_onboardings')
        .insert({
          customer_id: clientId,
          plan_id: planId,
          start_date: effectiveStartDate,
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Generate tasks using the RPC function
      const { data: taskCount, error: rpcError } = await supabase.rpc('generate_petron_onboarding_tasks', {
        p_onboarding_id: onboarding.id,
      });

      if (rpcError) throw rpcError;

      return { onboarding, taskCount };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-client-onboarding', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['petron-onboarding-tasks'] });
      toast({
        title: 'Onboarding iniciado',
        description: `${result.taskCount} atividades criadas com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao iniciar onboarding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============ Update Petron task status ============
export function useUpdatePetronTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      onboardingId,
      updates,
    }: {
      taskId: string;
      onboardingId: string;
      updates: {
        status?: PetronTaskStatus;
        assigned_to?: string | null;
        due_date?: string | null;
      };
    }) => {
      const updatePayload: Record<string, unknown> = { ...updates };
      
      // Set completed_at when marking as done
      const newStatus = updates.status;
      if (newStatus === 'done') {
        updatePayload.completed_at = new Date().toISOString();
      } else if (newStatus) {
        updatePayload.completed_at = null;
      }

      const { data, error } = await supabase
        .from('petron_onboarding_tasks')
        .update(updatePayload)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-onboarding-tasks', variables.onboardingId] });
    },
  });
}

// ============ Complete Petron onboarding ============
export function useCompletePetronOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      onboardingId,
      clientId,
    }: {
      onboardingId: string;
      clientId: string;
    }) => {
      const { error } = await supabase
        .from('petron_customer_onboardings')
        .update({ status: 'completed' })
        .eq('id', onboardingId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-client-onboarding', variables.clientId] });
      toast({ title: 'Onboarding concluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao concluir onboarding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
