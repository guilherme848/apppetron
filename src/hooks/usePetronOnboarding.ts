import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  PetronActivityTemplate,
  PetronSequence,
  PetronSequenceStep,
  PetronCustomerOnboarding,
  PetronOnboardingTask,
  PetronOnboardingStatus,
  PetronTaskStatus,
} from '@/types/petronOnboarding';

// Note: Plans are now fetched from the services table via useSettingsData

// ============ Activity Templates ============
export function usePetronActivityTemplates(onlyActive = false) {
  return useQuery({
    queryKey: ['petron-activity-templates', onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('petron_onboarding_activity_templates')
        .select('*')
        .order('title');

      if (onlyActive) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PetronActivityTemplate[];
    },
  });
}

export function useCreatePetronActivityTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      default_owner_role?: string;
      default_sla_days?: number;
      active?: boolean;
    }) => {
      const { data: template, error } = await supabase
        .from('petron_onboarding_activity_templates')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-activity-templates'] });
      toast({ title: 'Atividade criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar atividade', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePetronActivityTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      default_owner_role?: string;
      default_sla_days?: number;
      active?: boolean;
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from('petron_onboarding_activity_templates').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-activity-templates'] });
      toast({ title: 'Atividade atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar atividade', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeletePetronActivityTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('petron_onboarding_activity_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-activity-templates'] });
      toast({ title: 'Atividade removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover atividade', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ Sequences ============
export function usePetronSequences(planId?: string) {
  return useQuery({
    queryKey: ['petron-sequences', planId],
    queryFn: async () => {
      let query = supabase
        .from('petron_onboarding_sequences')
        .select(`
          *,
          services!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (planId) {
        query = query.eq('plan_id', planId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((s: any) => ({
        ...s,
        plan_name: s.services?.name,
      })) as PetronSequence[];
    },
  });
}

export function useCreatePetronSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { plan_id: string; name: string; active?: boolean }) => {
      const { data: sequence, error } = await supabase
        .from('petron_onboarding_sequences')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return sequence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-sequences'] });
      toast({ title: 'Sequência criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar sequência', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePetronSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; name?: string; active?: boolean }) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from('petron_onboarding_sequences').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-sequences'] });
      toast({ title: 'Sequência atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar sequência', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeletePetronSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('petron_onboarding_sequences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-sequences'] });
      toast({ title: 'Sequência removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover sequência', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ Sequence Steps ============
export function usePetronSequenceSteps(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ['petron-sequence-steps', sequenceId],
    queryFn: async () => {
      if (!sequenceId) return [];

      const { data, error } = await supabase
        .from('petron_onboarding_sequence_steps')
        .select(`
          *,
          petron_onboarding_activity_templates(title, description, default_sla_days, default_owner_role)
        `)
        .eq('sequence_id', sequenceId)
        .order('step_order');

      if (error) throw error;

      return data.map((s: any) => ({
        ...s,
        activity_title: s.petron_onboarding_activity_templates?.title,
        activity_description: s.petron_onboarding_activity_templates?.description,
        default_sla_days: s.petron_onboarding_activity_templates?.default_sla_days,
        default_owner_role: s.petron_onboarding_activity_templates?.default_owner_role,
      })) as PetronSequenceStep[];
    },
    enabled: !!sequenceId,
  });
}

export function useAddPetronSequenceStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      sequence_id: string;
      activity_template_id: string;
      step_order: number;
      offset_days?: number;
      required?: boolean;
    }) => {
      const { data: step, error } = await supabase
        .from('petron_onboarding_sequence_steps')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return step;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-sequence-steps', variables.sequence_id] });
      toast({ title: 'Passo adicionado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar passo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePetronSequenceStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      sequence_id: string;
      step_order?: number;
      offset_days?: number | null;
      required?: boolean;
    }) => {
      const { id, sequence_id, ...updates } = data;
      const { error } = await supabase.from('petron_onboarding_sequence_steps').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-sequence-steps', variables.sequence_id] });
    },
  });
}

export function useDeletePetronSequenceStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; sequence_id: string }) => {
      const { error } = await supabase.from('petron_onboarding_sequence_steps').delete().eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-sequence-steps', variables.sequence_id] });
      toast({ title: 'Passo removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover passo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderPetronSequenceSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { sequence_id: string; updates: { id: string; step_order: number }[] }) => {
      for (const update of data.updates) {
        const { error } = await supabase
          .from('petron_onboarding_sequence_steps')
          .update({ step_order: update.step_order })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-sequence-steps', variables.sequence_id] });
    },
  });
}

// ============ Customer Onboardings ============
export function usePetronCustomerOnboardings(status?: PetronOnboardingStatus) {
  return useQuery({
    queryKey: ['petron-customer-onboardings', status],
    queryFn: async () => {
      let query = supabase
        .from('petron_customer_onboardings')
        .select(`
          *,
          accounts!inner(name),
          services(name),
          petron_onboarding_sequences(name),
          team_members(name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((o: any) => ({
        ...o,
        customer_name: o.accounts?.name,
        plan_name: o.services?.name,
        sequence_name: o.petron_onboarding_sequences?.name,
        created_by_name: o.team_members?.name,
      })) as PetronCustomerOnboarding[];
    },
  });
}

export function usePetronCustomerOnboarding(id: string | undefined) {
  return useQuery({
    queryKey: ['petron-customer-onboarding', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('petron_customer_onboardings')
        .select(`
          *,
          accounts!inner(name),
          services(name),
          petron_onboarding_sequences(name),
          team_members(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      return {
        ...data,
        customer_name: (data as any).accounts?.name,
        plan_name: (data as any).services?.name,
        sequence_name: (data as any).petron_onboarding_sequences?.name,
        created_by_name: (data as any).team_members?.name,
      } as PetronCustomerOnboarding;
    },
    enabled: !!id,
  });
}

export function useCreatePetronCustomerOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      customer_id: string;
      plan_id: string;
      start_date: string;
      created_by?: string;
    }) => {
      const { data: onboarding, error } = await supabase
        .from('petron_customer_onboardings')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return onboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-customer-onboardings'] });
      toast({ title: 'Onboarding criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar onboarding', description: error.message, variant: 'destructive' });
    },
  });
}

export function useStartPetronOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (onboardingId: string) => {
      const { data, error } = await supabase.rpc('generate_petron_onboarding_tasks', {
        p_onboarding_id: onboardingId,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (taskCount) => {
      queryClient.invalidateQueries({ queryKey: ['petron-customer-onboardings'] });
      queryClient.invalidateQueries({ queryKey: ['petron-onboarding-tasks'] });
      toast({ title: `Onboarding iniciado`, description: `${taskCount} tarefas criadas` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao iniciar onboarding', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePetronCustomerOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; status?: PetronOnboardingStatus }) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from('petron_customer_onboardings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-customer-onboardings'] });
      queryClient.invalidateQueries({ queryKey: ['petron-customer-onboarding', variables.id] });
      toast({ title: 'Onboarding atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar onboarding', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ Onboarding Tasks ============
export function usePetronOnboardingTasks(onboardingId: string | undefined) {
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

export function useUpdatePetronOnboardingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      onboarding_id: string;
      status?: PetronTaskStatus;
      assigned_to?: string | null;
      due_date?: string | null;
    }) => {
      const { id, onboarding_id, ...updates } = data;

      // Set completed_at if status is done
      const finalUpdates: any = { ...updates };
      if (updates.status === 'done') {
        finalUpdates.completed_at = new Date().toISOString();
      } else if (updates.status) {
        finalUpdates.completed_at = null;
      }

      const { error } = await supabase.from('petron_onboarding_tasks').update(finalUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['petron-onboarding-tasks', variables.onboarding_id] });
    },
  });
}
