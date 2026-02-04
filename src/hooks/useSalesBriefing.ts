import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  CsSalesTranscript, 
  CsOnboardingBriefing, 
  BriefingContent,
  BriefingStatus,
  BriefingRiskLevel 
} from '@/types/salesBriefing';

// Helper to parse briefing data
function parseBriefingData(rawData: Record<string, unknown>): CsOnboardingBriefing {
  return {
    id: rawData.id as string,
    client_id: rawData.client_id as string,
    transcript_id: rawData.transcript_id as string | null,
    briefing_content: rawData.briefing_content as BriefingContent,
    risk_score: rawData.risk_score as number | null,
    risk_level: rawData.risk_level as BriefingRiskLevel | null,
    status: rawData.status as BriefingStatus,
    cs_notes: rawData.cs_notes as string | null,
    created_at: rawData.created_at as string,
    updated_at: rawData.updated_at as string,
  };
}

// Generic query helper to avoid deep type instantiation
async function queryTable<T>(
  table: string, 
  column: string, 
  value: string
): Promise<T | null> {
  const { data, error } = await (supabase as any)
    .from(table)
    .select('*')
    .eq(column, value)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data as T | null;
}

// Generic insert helper
async function insertRow<T>(
  table: string, 
  row: Record<string, unknown>
): Promise<T> {
  const { data, error } = await (supabase as any)
    .from(table)
    .insert(row)
    .select()
    .single();
  
  if (error) throw error;
  return data as T;
}

// Generic update helper
async function updateRow(
  table: string, 
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await (supabase as any)
    .from(table)
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
}

export function useSalesBriefing(clientId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  // Fetch transcript using React Query
  const { 
    data: transcript, 
    isLoading: transcriptLoading,
    refetch: refetchTranscript
  } = useQuery({
    queryKey: ['cs_sales_transcript', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      return queryTable<CsSalesTranscript>('cs_sales_transcripts', 'client_id', clientId);
    },
    enabled: !!clientId,
  });

  // Fetch briefing using React Query
  const { 
    data: briefing, 
    isLoading: briefingLoading,
    refetch: refetchBriefing
  } = useQuery({
    queryKey: ['cs_onboarding_briefing', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const data = await queryTable<Record<string, unknown>>('cs_onboarding_briefings', 'client_id', clientId);
      return data ? parseBriefingData(data) : null;
    },
    enabled: !!clientId,
  });

  const loading = transcriptLoading || briefingLoading;

  const fetchData = useCallback(async () => {
    await Promise.all([refetchTranscript(), refetchBriefing()]);
  }, [refetchTranscript, refetchBriefing]);

  const saveTranscript = useCallback(async (transcriptText: string): Promise<CsSalesTranscript | null> => {
    if (!clientId) return null;
    
    try {
      // Get current user's team_member_id
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      let memberIdToUse: string | null = null;
      
      if (user) {
        const memberData = await queryTable<{ id: string }>('team_members', 'auth_user_id', user.id);
        memberIdToUse = memberData?.id || null;
      }

      const data = await insertRow<CsSalesTranscript>('cs_sales_transcripts', {
        client_id: clientId,
        transcript_text: transcriptText,
        created_by_member_id: memberIdToUse,
      });
      
      // Invalidate query to refetch
      queryClient.invalidateQueries({ queryKey: ['cs_sales_transcript', clientId] });
      
      return data;
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar transcrição',
        variant: 'destructive',
      });
      return null;
    }
  }, [clientId, queryClient, toast]);

  const generateBriefing = useCallback(async (transcriptText: string) => {
    if (!clientId) return null;
    
    setGenerating(true);
    try {
      // First save the transcript
      const savedTranscript = await saveTranscript(transcriptText);
      if (!savedTranscript) {
        setGenerating(false);
        return null;
      }

      // Call the AI edge function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('cs-generate-briefing', {
        body: { transcript: transcriptText }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao chamar função de geração');
      }

      if (functionData?.error) {
        throw new Error(functionData.error);
      }

      const newBriefingData = await insertRow<Record<string, unknown>>('cs_onboarding_briefings', {
        client_id: clientId,
        transcript_id: savedTranscript.id,
        briefing_content: functionData.briefing_content,
        risk_score: functionData.risk_score,
        risk_level: functionData.risk_level,
        status: 'draft',
      });

      const newBriefing = parseBriefingData(newBriefingData);
      
      // Invalidate query to refetch
      queryClient.invalidateQueries({ queryKey: ['cs_onboarding_briefing', clientId] });

      toast({
        title: 'Briefing gerado',
        description: 'O briefing foi gerado com sucesso pela IA',
      });

      return newBriefing;
    } catch (error) {
      console.error('Error generating briefing:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao gerar briefing',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [clientId, saveTranscript, queryClient, toast]);

  const updateBriefing = useCallback(async (updates: {
    briefing_content?: BriefingContent;
    status?: BriefingStatus;
    cs_notes?: string;
  }) => {
    if (!briefing) return false;

    try {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.briefing_content !== undefined) {
        updatePayload.briefing_content = updates.briefing_content;
      }
      if (updates.status !== undefined) {
        updatePayload.status = updates.status;
      }
      if (updates.cs_notes !== undefined) {
        updatePayload.cs_notes = updates.cs_notes;
      }

      await updateRow('cs_onboarding_briefings', briefing.id, updatePayload);

      // Invalidate query to refetch with updated data
      queryClient.invalidateQueries({ queryKey: ['cs_onboarding_briefing', clientId] });
      
      toast({
        title: 'Salvo',
        description: 'Briefing atualizado com sucesso',
      });

      return true;
    } catch (error) {
      console.error('Error updating briefing:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar briefing',
        variant: 'destructive',
      });
      return false;
    }
  }, [briefing, clientId, queryClient, toast]);

  return {
    transcript,
    briefing,
    loading,
    generating,
    fetchData,
    saveTranscript,
    generateBriefing,
    updateBriefing,
  };
}
