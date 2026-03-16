import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClienteCheckup {
  id: string;
  client_id: string;
  onboarding_id: string;
  atividade_redes: number | null;
  producao_video: number | null;
  mix_produtos: number | null;
  atendimento_whatsapp: number | null;
  maturidade_comercial: number | null;
  habitantes_raio: number | null;
  tamanho_operacao: number | null;
  bonus_acabamento: boolean;
  pontuacao_total: number | null;
  classificacao: string | null;
  preenchido_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CheckupDimension =
  | 'atividade_redes'
  | 'producao_video'
  | 'mix_produtos'
  | 'atendimento_whatsapp'
  | 'maturidade_comercial'
  | 'habitantes_raio'
  | 'tamanho_operacao';

const DIMENSIONS: CheckupDimension[] = [
  'atividade_redes',
  'producao_video',
  'mix_produtos',
  'atendimento_whatsapp',
  'maturidade_comercial',
  'habitantes_raio',
  'tamanho_operacao',
];

export function calcClassificacao(total: number): string {
  if (total >= 18) return 'A';
  if (total >= 13) return 'B';
  if (total >= 7) return 'C';
  return 'D';
}

export function calcTotal(values: Record<CheckupDimension, number | null>, bonus: boolean): number {
  let sum = 0;
  for (const d of DIMENSIONS) {
    if (values[d] != null) sum += values[d]!;
  }
  if (bonus) sum += 1;
  return sum;
}

export function countFilled(values: Record<CheckupDimension, number | null>): number {
  return DIMENSIONS.filter(d => values[d] != null).length;
}

export function useClienteCheckup(onboardingId: string | null) {
  return useQuery({
    queryKey: ['cliente-checkup', onboardingId],
    queryFn: async () => {
      if (!onboardingId) return null;
      const { data, error } = await (supabase as any)
        .from('cliente_checkup')
        .select('*')
        .eq('onboarding_id', onboardingId)
        .maybeSingle();
      if (error) throw error;
      return data as ClienteCheckup | null;
    },
    enabled: !!onboardingId,
  });
}

export function useUpsertCheckup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      onboardingId,
      clientId,
      values,
      bonus,
      showToast = false,
    }: {
      onboardingId: string;
      clientId: string;
      values: Record<CheckupDimension, number | null>;
      bonus: boolean;
      showToast?: boolean;
    }) => {
      const total = calcTotal(values, bonus);
      const classificacao = countFilled(values) === 7 ? calcClassificacao(total) : null;

      // Get current member
      const { data: memberData } = await supabase
        .from('team_members')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id || '')
        .maybeSingle();

      const payload = {
        client_id: clientId,
        onboarding_id: onboardingId,
        ...values,
        bonus_acabamento: bonus,
        pontuacao_total: total,
        classificacao,
        preenchido_por_id: memberData?.id || null,
      };

      const { data: existing } = await (supabase as any)
        .from('cliente_checkup')
        .select('id')
        .eq('onboarding_id', onboardingId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('cliente_checkup' as any)
          .update(payload as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cliente_checkup' as any)
          .insert(payload as any);
        if (error) throw error;
      }

      // Update accounts table with classification
      if (classificacao) {
        await supabase
          .from('accounts')
          .update({
            checkup_classificacao: classificacao,
            checkup_pontuacao: total,
            checkup_updated_at: new Date().toISOString(),
          } as any)
          .eq('id', clientId);
      }

      return { total, classificacao };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cliente-checkup', variables.onboardingId] });
      if (variables.showToast && result.classificacao) {
        toast({
          title: `Checkup salvo! Cliente classificado como Perfil ${result.classificacao}`,
        });
      }
    },
    onError: () => {
      toast({ title: 'Erro ao salvar checkup', variant: 'destructive' });
    },
  });
}
