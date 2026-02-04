import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentBatch, BatchStatus, BATCH_STATUS_OPTIONS } from '@/types/contentProduction';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface BatchWithDetails extends ContentBatch {
  client: {
    id: string;
    name: string;
    service_id: string | null;
    social_member_id: string | null;
  } | null;
  socialMember: TeamMember | null;
  pending_count: number;
  planning_due_date: string | null;
}

interface ContentBoardBatchesFilters {
  assignedTo: string | null;
  serviceId: string | null;
  monthRef: string | null;
}

// Map batch status to display stages
const STAGE_CONFIG: { key: BatchStatus; name: string; color: string; position: number }[] = [
  { key: 'planning', name: 'Planejamento', color: 'blue', position: 1 },
  { key: 'production', name: 'Produção', color: 'purple', position: 2 },
  { key: 'review', name: 'Revisão', color: 'orange', position: 3 },
  { key: 'pdf', name: 'PDF', color: 'gray', position: 4 },
  { key: 'to_deliver', name: 'Para Entregar', color: 'yellow', position: 5 },
  { key: 'delivered', name: 'Entregue', color: 'green', position: 6 },
  { key: 'changes', name: 'Alteração', color: 'red', position: 7 },
  { key: 'scheduling', name: 'Agendamento', color: 'teal', position: 8 },
];

export interface BoardStage {
  id: BatchStatus;
  name: string;
  color: string;
  position: number;
}

export function useContentBoardBatches() {
  const [batches, setBatches] = useState<BatchWithDetails[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContentBoardBatchesFilters>({
    assignedTo: null,
    serviceId: null,
    monthRef: null,
  });

  const stages: BoardStage[] = useMemo(() => 
    STAGE_CONFIG.map(s => ({ id: s.key, name: s.name, color: s.color, position: s.position })),
  []);

  const fetchTeamMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error fetching team members:', error);
      return;
    }

    setTeamMembers(data || []);
  }, []);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
      return;
    }

    setServices(data || []);
  }, []);

  const fetchBatches = useCallback(async () => {
    let query = supabase
      .from('content_batches')
      .select(`
        *,
        client:accounts!content_batches_client_id_fkey(
          id, 
          name, 
          service_id,
          social_member_id
        )
      `)
      .eq('archived', false)
      .order('planning_due_date', { ascending: true, nullsFirst: false });

    if (filters.monthRef) {
      query = query.eq('month_ref', filters.monthRef);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching batches:', error);
      return;
    }

    // Process batches with additional data
    const processedBatches = await Promise.all(
      (data || []).map(async (batch: any) => {
        // Get pending posts count
        const { count: pendingCount } = await supabase
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('batch_id', batch.id)
          .neq('status', 'done');

        // Get social member info if exists
        let socialMember: TeamMember | null = null;
        if (batch.client?.social_member_id) {
          const { data: memberData } = await supabase
            .from('team_members')
            .select('id, name')
            .eq('id', batch.client.social_member_id)
            .single();
          socialMember = memberData;
        }

        return {
          ...batch,
          status: batch.status as BatchStatus,
          socialMember,
          pending_count: pendingCount || 0,
        };
      })
    );

    // Apply filters
    let filteredBatches = processedBatches;

    if (filters.serviceId) {
      filteredBatches = filteredBatches.filter(
        (b) => b.client?.service_id === filters.serviceId
      );
    }

    if (filters.assignedTo) {
      filteredBatches = filteredBatches.filter(
        (b) => b.client?.social_member_id === filters.assignedTo
      );
    }

    setBatches(filteredBatches);
  }, [filters]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBatches(), fetchTeamMembers(), fetchServices()]);
    setLoading(false);
  }, [fetchBatches, fetchTeamMembers, fetchServices]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchBatches();
  }, [filters, fetchBatches]);

  const moveBatchToStage = useCallback(async (batchId: string, newStatus: BatchStatus) => {
    const { error } = await supabase
      .from('content_batches')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', batchId);

    if (error) {
      console.error('Error moving batch:', error);
      toast.error('Erro ao mover planejamento');
      return null;
    }

    toast.success('Status atualizado');
    await fetchBatches();
    return true;
  }, [fetchBatches]);

  const batchesByStage = useMemo(() => {
    const grouped: Record<BatchStatus, BatchWithDetails[]> = {} as any;
    stages.forEach((stage) => {
      grouped[stage.id] = batches.filter((b) => b.status === stage.id);
    });
    return grouped;
  }, [stages, batches]);

  // Generate month options
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);

  return {
    stages,
    batches,
    batchesByStage,
    teamMembers,
    services,
    loading,
    filters,
    setFilters,
    monthOptions,
    moveBatchToStage,
    refresh: fetchAll,
  };
}
