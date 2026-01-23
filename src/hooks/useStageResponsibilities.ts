import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BatchStatus } from '@/types/contentProduction';
import { RoleKey } from '@/lib/accountTeam';

export interface ContentStageResponsibility {
  id: string;
  stage_key: BatchStatus;
  role_id: string | null;
  default_responsible_role_key: RoleKey | null;
  created_at: string;
}

export function useStageResponsibilities() {
  const [responsibilities, setResponsibilities] = useState<ContentStageResponsibility[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResponsibilities = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_stage_responsibilities')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching responsibilities:', error);
    } else {
      setResponsibilities((data || []).map((d) => ({
        id: d.id,
        stage_key: d.stage_key as BatchStatus,
        role_id: d.role_id,
        default_responsible_role_key: (d as any).default_responsible_role_key as RoleKey | null,
        created_at: d.created_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResponsibilities();
  }, [fetchResponsibilities]);

  const updateResponsibility = async (stageKey: string, roleKey: RoleKey | null) => {
    const existing = responsibilities.find((r) => r.stage_key === stageKey);
    if (existing) {
      const { data, error } = await supabase
        .from('content_stage_responsibilities')
        .update({ default_responsible_role_key: roleKey } as any)
        .eq('stage_key', stageKey)
        .select()
        .single();
      if (error) {
        console.error('Error updating responsibility:', error);
        return { data: null, error };
      }
      setResponsibilities((prev) =>
        prev.map((r) => (r.stage_key === stageKey ? { ...r, default_responsible_role_key: roleKey } : r))
      );
      return { data, error: null };
    } else {
      const { data, error } = await supabase
        .from('content_stage_responsibilities')
        .insert([{ stage_key: stageKey, default_responsible_role_key: roleKey } as any])
        .select()
        .single();
      if (error) {
        console.error('Error inserting responsibility:', error);
        return { data: null, error };
      }
      setResponsibilities((prev) => [
        ...prev,
        { 
          id: data.id, 
          stage_key: stageKey as BatchStatus, 
          role_id: null, 
          default_responsible_role_key: roleKey, 
          created_at: data.created_at 
        },
      ]);
      return { data, error: null };
    }
  };

  const getResponsibilityByStage = (stageKey: string) =>
    responsibilities.find((r) => r.stage_key === stageKey);

  const getRoleKeyForStage = (stageKey: string): RoleKey | null => {
    const resp = responsibilities.find((r) => r.stage_key === stageKey);
    return resp?.default_responsible_role_key || null;
  };

  // Legacy: Get role_id for stage (deprecated, use getRoleKeyForStage)
  const getRoleForStage = (stageKey: string): string | null => {
    const resp = responsibilities.find((r) => r.stage_key === stageKey);
    return resp?.role_id || null;
  };

  return {
    responsibilities,
    loading,
    updateResponsibility,
    getResponsibilityByStage,
    getRoleKeyForStage,
    getRoleForStage,
    refetch: fetchResponsibilities,
  };
}
