import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============ Types ============
export type OnboardingStatus = 'em_andamento' | 'concluido';
export type AtividadeStatus = 'pendente' | 'concluida';

export interface Onboarding {
  id: string;
  client_id: string;
  cs_owner_id: string | null;
  traffic_owner_id: string | null;
  status: OnboardingStatus;
  transcricao_reuniao_vendas: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client_name?: string;
  client_service_name?: string;
  cs_owner_name?: string;
  traffic_owner_name?: string;
  atividades_total?: number;
  atividades_concluidas?: number;
}

export interface OnboardingAtividade {
  id: string;
  onboarding_id: string;
  atividade_template_id: string | null;
  new_template_id: string | null;
  etapa_id: string | null;
  titulo: string;
  descricao: string | null;
  responsavel_perfil: string | null;
  responsavel_id: string | null;
  status: AtividadeStatus;
  ordem: number;
  etapa: number | null;
  data_conclusao: string | null;
  delegado_para_id: string | null;
  delegado_por_id: string | null;
  delegado_em: string | null;
  created_at: string;
  // Joined
  responsavel_name?: string;
  delegado_para_name?: string;
  etapa_nome?: string;
}

export interface OnboardingReuniaoResposta {
  id: string;
  onboarding_id: string;
  pergunta_id: string | null;
  resposta: string | null;
  resposta_json: any;
  created_at: string;
  updated_at: string;
}

// ============ Labels ============
export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

// ============ Fetch all onboardings ============
export function useOnboardingsList() {
  return useQuery({
    queryKey: ['onboardings-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboardings')
        .select(`
          *,
          accounts!onboardings_client_id_fkey (name, service_id, services:service_id (name)),
          cs_owner:team_members!onboardings_cs_owner_id_fkey (name),
          traffic_owner:team_members!onboardings_traffic_owner_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('useOnboardingsList error:', error);
        throw error;
      }

      // Fetch activity counts per onboarding
      const ids = (data || []).map((d: any) => d.id);
      let atividades: any[] = [];
      if (ids.length > 0) {
        const { data: atData } = await supabase
          .from('onboarding_atividades')
          .select('onboarding_id, status')
          .in('onboarding_id', ids);
        atividades = atData || [];
      }

      return (data || []).map((d: any) => {
        const myAtividades = atividades.filter((a: any) => a.onboarding_id === d.id);
        return {
          ...d,
          client_name: d.accounts?.name,
          client_service_name: d.accounts?.services?.name,
          cs_owner_name: d.cs_owner?.name,
          traffic_owner_name: d.traffic_owner?.name,
          atividades_total: myAtividades.length,
          atividades_concluidas: myAtividades.filter((a: any) => a.status === 'concluida').length,
        } as Onboarding;
      });
    },
  });
}

// ============ Fetch single onboarding ============
export function useOnboardingDetail(onboardingId: string | null) {
  return useQuery({
    queryKey: ['onboarding-detail', onboardingId],
    queryFn: async () => {
      if (!onboardingId) return null;
      const { data, error } = await supabase
        .from('onboardings')
        .select(`
          *,
          accounts!onboardings_client_id_fkey (name, service_id, services:service_id (name)),
          cs_owner:team_members!onboardings_cs_owner_id_fkey (name),
          traffic_owner:team_members!onboardings_traffic_owner_id_fkey (name)
        `)
        .eq('id', onboardingId)
        .single();

      if (error) {
        console.error('useOnboardingDetail error:', error);
        throw error;
      }

      return {
        ...data,
        client_name: (data as any).accounts?.name,
        client_service_name: (data as any).accounts?.services?.name,
        cs_owner_name: (data as any).cs_owner?.name,
        traffic_owner_name: (data as any).traffic_owner?.name,
      } as Onboarding;
    },
    enabled: !!onboardingId,
  });
}

// ============ Fetch activities for an onboarding ============
export function useOnboardingAtividades(onboardingId: string | null) {
  return useQuery({
    queryKey: ['onboarding-atividades', onboardingId],
    queryFn: async () => {
      if (!onboardingId) return [];
      const { data, error } = await supabase
        .from('onboarding_atividades')
        .select(`
          *,
          team_members:responsavel_id (name),
          delegado:delegado_para_id (name),
          etapa_template:etapa_id (nome, ordem)
        `)
        .eq('onboarding_id', onboardingId)
        .order('etapa')
        .order('ordem');

      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        responsavel_name: d.team_members?.name,
        delegado_para_name: d.delegado?.name,
        etapa_nome: d.etapa_template?.nome,
      })) as OnboardingAtividade[];
    },
    enabled: !!onboardingId,
  });
}

// ============ Fetch meeting answers for an onboarding ============
export function useOnboardingRespostas(onboardingId: string | null) {
  return useQuery({
    queryKey: ['onboarding-respostas', onboardingId],
    queryFn: async () => {
      if (!onboardingId) return [];
      const { data, error } = await supabase
        .from('onboarding_reuniao_respostas')
        .select('*')
        .eq('onboarding_id', onboardingId);

      if (error) throw error;
      return (data || []) as OnboardingReuniaoResposta[];
    },
    enabled: !!onboardingId,
  });
}

// ============ Fetch onboarding questions ============
export function useOnboardingQuestions() {
  return useQuery({
    queryKey: ['onboarding-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_onboarding_questions')
        .select('*')
        .eq('is_active', true)
        .order('block_key')
        .order('order_index');

      if (error) throw error;
      return data || [];
    },
  });
}

// ============ Create onboarding ============
export function useCreateOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      clientId,
      csOwnerId,
      trafficOwnerId,
    }: {
      clientId: string;
      csOwnerId?: string;
      trafficOwnerId?: string;
    }) => {
      // Create onboarding
      const { data: onboarding, error: createError } = await supabase
        .from('onboardings')
        .insert({
          client_id: clientId,
          cs_owner_id: csOwnerId || null,
          traffic_owner_id: trafficOwnerId || null,
          status: 'em_andamento',
        })
        .select()
        .single();

      if (createError) {
        if (createError.message?.includes('idx_onboardings_active_client')) {
          throw new Error('Este cliente já possui um onboarding em andamento.');
        }
        throw createError;
      }

      // Generate activities from templates
      const { data: count, error: rpcError } = await supabase.rpc('generate_onboarding_atividades', {
        p_onboarding_id: onboarding.id,
      });

      if (rpcError) throw rpcError;

      return { onboarding, activitiesCount: count };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings-list'] });
      toast({
        title: 'Onboarding criado',
        description: `${result.activitiesCount} atividades geradas automaticamente.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar onboarding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============ Update transcription ============
export function useUpdateTranscricao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ onboardingId, text }: { onboardingId: string; text: string }) => {
      const { error } = await supabase
        .from('onboardings')
        .update({ transcricao_reuniao_vendas: text })
        .eq('id', onboardingId);
      if (error) throw error;
    },
    onSuccess: (_, { onboardingId }) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-detail', onboardingId] });
    },
  });
}

// ============ Upsert meeting answer ============
export function useUpsertResposta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      onboardingId,
      perguntaId,
      resposta,
      respostaJson,
    }: {
      onboardingId: string;
      perguntaId: string;
      resposta?: string | null;
      respostaJson?: any;
    }) => {
      const payload: any = { onboarding_id: onboardingId, pergunta_id: perguntaId };
      if (resposta !== undefined) payload.resposta = resposta;
      if (respostaJson !== undefined) payload.resposta_json = respostaJson;
      
      const { error } = await supabase
        .from('onboarding_reuniao_respostas')
        .upsert(payload, { onConflict: 'onboarding_id,pergunta_id' });
      if (error) throw error;
    },
    onSuccess: (_, { onboardingId }) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-respostas', onboardingId] });
    },
  });
}

// ============ Update activity status ============
export function useUpdateAtividade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      atividadeId,
      onboardingId,
      updates,
    }: {
      atividadeId: string;
      onboardingId: string;
      updates: {
        status?: AtividadeStatus;
        responsavel_id?: string | null;
        data_conclusao?: string | null;
      };
    }) => {
      const { error } = await supabase
        .from('onboarding_atividades')
        .update(updates)
        .eq('id', atividadeId);
      if (error) throw error;
    },
    onSuccess: (_, { onboardingId }) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-atividades', onboardingId] });
      queryClient.invalidateQueries({ queryKey: ['onboardings-list'] });
    },
  });
}

// ============ Complete onboarding ============
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ onboardingId, clientName }: { onboardingId: string; clientName: string }) => {
      const { error } = await supabase.rpc('complete_onboarding', {
        p_onboarding_id: onboardingId,
      });
      if (error) throw error;
      return clientName;
    },
    onSuccess: (clientName) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings-list'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-detail'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-atividades'] });
      toast({
        title: `Onboarding de ${clientName} concluído com sucesso!`,
      });
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

// ============ Delete onboarding ============
export function useDeleteOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ onboardingId, clientName }: { onboardingId: string; clientName: string }) => {
      const { error } = await supabase
        .from('onboardings')
        .delete()
        .eq('id', onboardingId);
      if (error) throw error;
      return clientName;
    },
    onSuccess: (clientName) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings-list'] });
      toast({
        title: `Onboarding de ${clientName} removido.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir onboarding',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
