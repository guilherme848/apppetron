import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentStageResponsibility, BatchStatus } from '@/types/contentProduction';

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
        created_at: d.created_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResponsibilities();
  }, [fetchResponsibilities]);

  const updateResponsibility = async (stageKey: string, roleId: string | null) => {
    const existing = responsibilities.find((r) => r.stage_key === stageKey);
    if (existing) {
      const { data, error } = await supabase
        .from('content_stage_responsibilities')
        .update({ role_id: roleId })
        .eq('stage_key', stageKey)
        .select()
        .single();
      if (error) {
        console.error('Error updating responsibility:', error);
        return { data: null, error };
      }
      setResponsibilities((prev) =>
        prev.map((r) => (r.stage_key === stageKey ? { ...r, role_id: roleId } : r))
      );
      return { data, error: null };
    } else {
      const { data, error } = await supabase
        .from('content_stage_responsibilities')
        .insert([{ stage_key: stageKey, role_id: roleId }])
        .select()
        .single();
      if (error) {
        console.error('Error inserting responsibility:', error);
        return { data: null, error };
      }
      setResponsibilities((prev) => [
        ...prev,
        { id: data.id, stage_key: stageKey as BatchStatus, role_id: roleId, created_at: data.created_at },
      ]);
      return { data, error: null };
    }
  };

  const getResponsibilityByStage = (stageKey: string) =>
    responsibilities.find((r) => r.stage_key === stageKey);

  return {
    responsibilities,
    loading,
    updateResponsibility,
    getResponsibilityByStage,
    refetch: fetchResponsibilities,
  };
}
