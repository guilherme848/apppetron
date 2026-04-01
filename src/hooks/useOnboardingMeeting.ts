import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  CsOnboardingQuestion,
  CsOnboardingMeeting,
  CsOnboardingAnswer,
  CsOnboardingMeetingFile,
  CsOnboardingMeetingRiskLevel,
} from '@/types/onboardingMeeting';

// ============ Questions ============
export function useOnboardingQuestions(onlyActive = true) {
  return useQuery({
    queryKey: ['cs-onboarding-questions', onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('cs_onboarding_questions')
        .select('*')
        .order('block_key')
        .order('order_index');

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CsOnboardingQuestion[];
    },
  });
}

// ============ Meetings ============
export function useOnboardingMeetings(clientId?: string) {
  return useQuery({
    queryKey: ['cs-onboarding-meetings', clientId],
    queryFn: async () => {
      let query = supabase
        .from('cs_onboarding_meetings')
        .select(`
          *,
          accounts!cs_onboarding_meetings_client_id_fkey(name),
          team_members!cs_onboarding_meetings_cs_owner_id_fkey(name)
        `)
        .order('meeting_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((m: any) => ({
        ...m,
        client_name: m.accounts?.name,
        cs_owner_name: m.team_members?.name,
      })) as CsOnboardingMeeting[];
    },
  });
}

export function useOnboardingMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['cs-onboarding-meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const { data, error } = await supabase
        .from('cs_onboarding_meetings')
        .select(`
          *,
          accounts!cs_onboarding_meetings_client_id_fkey(name),
          team_members!cs_onboarding_meetings_cs_owner_id_fkey(name)
        `)
        .eq('id', meetingId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        client_name: (data as any).accounts?.name,
        cs_owner_name: (data as any).team_members?.name,
      } as CsOnboardingMeeting;
    },
    enabled: !!meetingId,
  });
}

// ============ Answers ============
export function useOnboardingAnswers(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['cs-onboarding-answers', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];

      const { data, error } = await supabase
        .from('cs_onboarding_answers')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) throw error;
      return data as CsOnboardingAnswer[];
    },
    enabled: !!meetingId,
  });
}

// ============ Files ============
export function useOnboardingMeetingFiles(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['cs-onboarding-meeting-files', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];

      const { data, error } = await supabase
        .from('cs_onboarding_meeting_files')
        .select(`
          *,
          team_members!cs_onboarding_meeting_files_uploaded_by_fkey(name)
        `)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((f: any) => ({
        ...f,
        uploaded_by_name: f.team_members?.name,
      })) as CsOnboardingMeetingFile[];
    },
    enabled: !!meetingId,
  });
}

// ============ Mutations ============
export function useCreateOnboardingMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      client_id: string;
      cs_owner_id?: string;
      meeting_date?: string;
    }) => {
      const { data: meeting, error } = await supabase
        .from('cs_onboarding_meetings')
        .insert({
          client_id: data.client_id,
          cs_owner_id: data.cs_owner_id || null,
          meeting_date: data.meeting_date || new Date().toISOString().split('T')[0],
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-meetings'] });
      toast({ title: 'Reunião criada com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar reunião', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateOnboardingMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      cs_owner_id?: string | null;
      meeting_date?: string;
      status?: 'draft' | 'completed';
      overall_quality_score?: number | null;
      risk_level?: CsOnboardingMeetingRiskLevel | null;
      general_notes?: string | null;
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('cs_onboarding_meetings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-meeting', variables.id] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar reunião', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSaveOnboardingAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      meeting_id: string;
      question_id: string;
      answer_text: string | null;
      answer_value_json?: unknown;
      answered_by_ai?: boolean;
      needs_validation?: boolean;
      confidence?: number;
    }) => {
      const upsertPayload = {
        meeting_id: data.meeting_id,
        question_id: data.question_id,
        answer_text: data.answer_text,
        answer_value_json: data.answer_value_json ?? null,
        answered_by_ai: data.answered_by_ai ?? false,
        needs_validation: data.needs_validation ?? false,
        confidence: data.confidence ?? null,
      };

      const { error } = await (supabase as any)
        .from('cs_onboarding_answers')
        .upsert(upsertPayload, { onConflict: 'meeting_id,question_id' });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-answers', variables.meeting_id] });
    },
  });
}

export function useUploadOnboardingMeetingFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      meeting_id: string;
      file: File;
      uploaded_by?: string;
    }) => {
      const fileName = `${data.meeting_id}/${Date.now()}_${data.file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cs-files')
        .upload(fileName, data.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cs-files')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('cs_onboarding_meeting_files')
        .insert({
          meeting_id: data.meeting_id,
          file_name: data.file.name,
          file_url: urlData.publicUrl,
          file_size: data.file.size,
          file_type: data.file.type,
          storage_path: fileName,
          uploaded_by: data.uploaded_by || null,
        });

      if (dbError) throw dbError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-meeting-files', variables.meeting_id] });
      toast({ title: 'Arquivo enviado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar arquivo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteOnboardingMeetingFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; storage_path: string; meeting_id: string }) => {
      // Delete from storage
      await supabase.storage.from('cs-files').remove([data.storage_path]);

      // Delete from DB
      const { error } = await supabase
        .from('cs_onboarding_meeting_files')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-meeting-files', variables.meeting_id] });
      toast({ title: 'Arquivo removido' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover arquivo', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ Admin: Question Management ============
export function useCreateOnboardingQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      block_key: string;
      block_title: string;
      question_text: string;
      field_type?: string;
      options_json?: unknown;
      placeholder?: string;
      help_text?: string;
      answer_key?: string;
      ai_extract_hint?: string;
      is_required?: boolean;
      is_decision_field?: boolean;
      impacts_quality?: boolean;
      weight?: number;
      order_index?: number;
      is_active?: boolean;
    }) => {
      const { error } = await (supabase as any)
        .from('cs_onboarding_questions')
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-questions'] });
      toast({ title: 'Pergunta criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar pergunta', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateOnboardingQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string } & Partial<CsOnboardingQuestion>) => {
      const { id, ...updates } = data;
      const { error } = await (supabase as any)
        .from('cs_onboarding_questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-questions'] });
      toast({ title: 'Pergunta atualizada' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar pergunta', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteOnboardingQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cs_onboarding_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-questions'] });
      toast({ title: 'Pergunta removida' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover pergunta', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderOnboardingQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; order_index: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('cs_onboarding_questions')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-onboarding-questions'] });
    },
  });
}
