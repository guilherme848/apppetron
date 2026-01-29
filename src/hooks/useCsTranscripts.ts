import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CsTranscript, TranscriptType, TranscriptSource } from '@/types/onboardingMeeting';

// ============ Fetch transcripts for a client ============
export function useCsTranscripts(clientId: string | undefined, type?: TranscriptType) {
  return useQuery({
    queryKey: ['cs-transcripts', clientId, type],
    queryFn: async () => {
      if (!clientId) return [];

      let query = (supabase as any)
        .from('cs_transcripts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('transcript_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CsTranscript[];
    },
    enabled: !!clientId,
  });
}

// ============ Get latest transcript of a type ============
export function useLatestTranscript(clientId: string | undefined, type: TranscriptType) {
  return useQuery({
    queryKey: ['cs-transcript-latest', clientId, type],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await (supabase as any)
        .from('cs_transcripts')
        .select('*')
        .eq('client_id', clientId)
        .eq('transcript_type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CsTranscript | null;
    },
    enabled: !!clientId,
  });
}

// ============ Save transcript ============
export function useSaveTranscript() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      client_id: string;
      onboarding_id?: string;
      transcript_type: TranscriptType;
      transcript_text: string;
      source?: TranscriptSource;
      created_by?: string;
    }) => {
      const { data: result, error } = await (supabase as any)
        .from('cs_transcripts')
        .insert({
          client_id: data.client_id,
          onboarding_id: data.onboarding_id || null,
          transcript_type: data.transcript_type,
          transcript_text: data.transcript_text,
          source: data.source || 'paste',
          created_by: data.created_by || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result as CsTranscript;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['cs-transcripts', variables.client_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['cs-transcript-latest', variables.client_id, variables.transcript_type] 
      });
      toast({ title: 'Transcrição salva com sucesso' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar transcrição', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// ============ Update transcript ============
export function useUpdateTranscript() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      client_id: string;
      transcript_text: string;
    }) => {
      const { error } = await (supabase as any)
        .from('cs_transcripts')
        .update({
          transcript_text: data.transcript_text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['cs-transcripts', variables.client_id] 
      });
      toast({ title: 'Transcrição atualizada' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar transcrição', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// ============ AI Autofill Answers ============
export function useAiAutofillAnswers() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      transcript_text: string;
      questions: Array<{
        id: string;
        answer_key: string | null;
        question_text: string;
        field_type: string;
        options_json: unknown;
        ai_extract_hint: string | null;
      }>;
      current_answers: Array<{
        question_id: string;
        answer_text: string | null;
        answer_value_json: unknown;
      }>;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('cs-autofill-answers', {
        body: data,
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result as {
        answers: Array<{
          question_id: string;
          answer_key: string | null;
          value: unknown;
          text: string;
          needs_validation: boolean;
          confidence: number;
        }>;
        total_questions: number;
        filled_count: number;
      };
    },
    onSuccess: (result) => {
      toast({
        title: 'Respostas preenchidas pela IA',
        description: `${result.filled_count} de ${result.total_questions} perguntas preenchidas automaticamente.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao preencher respostas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
