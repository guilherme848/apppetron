import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  Transcription,
  TranscriptionStatus,
  TranscriptionSourceType,
  TranscriptionClient,
} from '@/types/transcription';

const QK = {
  list: ['transcriptions', 'list'] as const,
  detail: (id: string) => ['transcriptions', 'detail', id] as const,
};

// ─── List ────────────────────────────────────────────────────────────────
export function useTranscriptions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QK.list,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcriptions' as any)
        .select('*, client:accounts(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Transcription[];
    },
  });

  // Realtime: invalida quando alguma row de transcriptions mudar
  useEffect(() => {
    const channel = supabase
      .channel('transcriptions-list-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transcriptions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transcriptions'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// ─── Detail ──────────────────────────────────────────────────────────────
export function useTranscription(id: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: id ? QK.detail(id) : ['transcriptions', 'detail', 'noop'],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('transcriptions' as any)
        .select('*, client:accounts(id, name)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Transcription | null;
    },
    enabled: !!id,
  });

  // Realtime específico desta row
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`transcription-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transcriptions',
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QK.detail(id) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  return query;
}

// ─── Create (após upload de arquivo) ─────────────────────────────────────
export function useCreateTranscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      video_path: string;
      video_size_bytes?: number | null;
      video_mime_type?: string | null;
      language_code?: string;
      notes?: string | null;
      client_id?: string | null;
      source_type?: TranscriptionSourceType;
      source_id?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('transcriptions' as any)
        .insert({
          title: input.title,
          video_path: input.video_path,
          video_size_bytes: input.video_size_bytes ?? null,
          video_mime_type: input.video_mime_type ?? null,
          language_code: input.language_code ?? 'pt',
          notes: input.notes ?? null,
          client_id: input.client_id ?? null,
          source_type: input.source_type ?? 'manual',
          source_id: input.source_id ?? null,
          status: 'queued' as TranscriptionStatus,
          created_by: userData.user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Transcription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.list });
    },
    onError: (e: Error) => {
      toast({
        title: 'Falha ao criar transcrição',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

// ─── Trigger transcrição (chama edge function de roteamento híbrido) ─────
export function useStartTranscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      input:
        | string
        | { transcription_id: string; force_provider?: 'groq' | 'assemblyai' },
    ) => {
      const body =
        typeof input === 'string'
          ? { transcription_id: input }
          : input;
      const { data, error } = await supabase.functions.invoke('transcribe-start', {
        body,
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || 'Falha ao iniciar transcrição');
      return data;
    },
    onSuccess: (_, input) => {
      const id = typeof input === 'string' ? input : input.transcription_id;
      queryClient.invalidateQueries({ queryKey: QK.list });
      queryClient.invalidateQueries({ queryKey: QK.detail(id) });
    },
    onError: (e: Error) => {
      toast({
        title: 'Falha ao iniciar transcrição',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────
export function useDeleteTranscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transcription: Transcription) => {
      // Apaga arquivo do storage primeiro (best-effort)
      if (transcription.video_path) {
        await supabase.storage
          .from('transcription-videos')
          .remove([transcription.video_path])
          .catch((e) => console.warn('[useDeleteTranscription] storage remove falhou:', e));
      }
      const { error } = await supabase
        .from('transcriptions' as any)
        .delete()
        .eq('id', transcription.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.list });
      toast({ title: 'Transcrição removida' });
    },
    onError: (e: Error) => {
      toast({
        title: 'Falha ao remover',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

// ─── Update (renomear / vincular cliente / alterar notes) ───────────────
export function useUpdateTranscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      notes?: string | null;
      client_id?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.client_id !== undefined) patch.client_id = input.client_id;

      const { data, error } = await supabase
        .from('transcriptions' as any)
        .update(patch)
        .eq('id', input.id)
        .select('*, client:accounts(id, name)')
        .single();
      if (error) throw error;
      return data as unknown as Transcription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QK.list });
      queryClient.invalidateQueries({ queryKey: QK.detail(data.id) });
    },
    onError: (e: Error) => {
      toast({
        title: 'Falha ao atualizar',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

// ─── Lista de clientes (accounts ativos) pra Select ──────────────────────
export function useTranscriptionClients() {
  return useQuery({
    queryKey: ['transcription-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, status')
        .in('status', ['active', 'onboarding'])
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TranscriptionClient[];
    },
    staleTime: 5 * 60 * 1000, // 5min
  });
}

// ─── Signed URL p/ player ────────────────────────────────────────────────
export function useVideoSignedUrl(videoPath: string | null | undefined) {
  return useQuery({
    queryKey: ['transcription-video-url', videoPath],
    queryFn: async () => {
      if (!videoPath) return null;
      const { data, error } = await supabase.storage
        .from('transcription-videos')
        .createSignedUrl(videoPath, 60 * 60); // 1h
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
    enabled: !!videoPath,
    staleTime: 50 * 60 * 1000, // 50min — renova antes de expirar
  });
}
