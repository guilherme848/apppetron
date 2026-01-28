import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  CsSalesTranscript, 
  CsOnboardingBriefing, 
  BriefingContent,
  BriefingStatus,
  BriefingRiskLevel 
} from '@/types/salesBriefing';

// Type-safe wrapper to avoid deep type instantiation issues
type SupabaseClient = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (count: number) => {
            maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
    insert: (data: Record<string, unknown>) => {
      select: () => {
        single: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    update: (data: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  functions: {
    invoke: (name: string, options: { body: Record<string, unknown> }) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

const db = supabase as unknown as SupabaseClient;

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

export function useSalesBriefing(clientId: string | undefined) {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState<CsSalesTranscript | null>(null);
  const [briefing, setBriefing] = useState<CsOnboardingBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Fetch latest transcript for this client
      const transcriptResult = await db
        .from('cs_sales_transcripts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (transcriptResult.error) throw new Error(transcriptResult.error.message);
      setTranscript(transcriptResult.data as CsSalesTranscript | null);

      // Fetch latest briefing for this client
      const briefingResult = await db
        .from('cs_onboarding_briefings')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (briefingResult.error) throw new Error(briefingResult.error.message);
      
      if (briefingResult.data) {
        setBriefing(parseBriefingData(briefingResult.data as Record<string, unknown>));
      } else {
        setBriefing(null);
      }
    } catch (error) {
      console.error('Error fetching sales briefing data:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do briefing',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  const saveTranscript = useCallback(async (transcriptText: string): Promise<CsSalesTranscript | null> => {
    if (!clientId) return null;
    
    try {
      // Get current user's team_member_id
      const authResult = await db.auth.getUser();
      const user = authResult.data.user;
      let memberIdToUse: string | null = null;
      
      if (user) {
        const memberResult = await db
          .from('team_members')
          .select('id')
          .eq('auth_uid', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const memberData = memberResult.data as { id: string } | null;
        memberIdToUse = memberData?.id || null;
      }

      const insertResult = await db
        .from('cs_sales_transcripts')
        .insert({
          client_id: clientId,
          transcript_text: transcriptText,
          created_by_member_id: memberIdToUse,
        })
        .select()
        .single();

      if (insertResult.error) throw new Error(insertResult.error.message);
      const data = insertResult.data as CsSalesTranscript;
      setTranscript(data);
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
  }, [clientId, toast]);

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
      const functionResult = await db.functions.invoke('cs-generate-briefing', {
        body: { transcript: transcriptText }
      });

      if (functionResult.error) {
        throw new Error(functionResult.error.message || 'Erro ao chamar função de geração');
      }

      const functionData = functionResult.data as { 
        briefing_content: BriefingContent; 
        risk_score: number; 
        risk_level: BriefingRiskLevel;
        error?: string;
      };

      if (functionData.error) {
        throw new Error(functionData.error);
      }

      const briefingInsertResult = await db
        .from('cs_onboarding_briefings')
        .insert({
          client_id: clientId,
          transcript_id: savedTranscript.id,
          briefing_content: functionData.briefing_content,
          risk_score: functionData.risk_score,
          risk_level: functionData.risk_level,
          status: 'draft',
        })
        .select()
        .single();

      if (briefingInsertResult.error) throw new Error(briefingInsertResult.error.message);

      const newBriefing = parseBriefingData(briefingInsertResult.data as Record<string, unknown>);
      setBriefing(newBriefing);

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
  }, [clientId, saveTranscript, toast]);

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

      const updateResult = await db
        .from('cs_onboarding_briefings')
        .update(updatePayload)
        .eq('id', briefing.id);

      if (updateResult.error) throw new Error(updateResult.error.message);

      setBriefing(prev => prev ? { ...prev, ...updates } : null);
      
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
  }, [briefing, toast]);

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
