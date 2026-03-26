import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentBatch, BatchStatus } from '@/types/contentProduction';
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
      return [];
    }

    setTeamMembers(data || []);
    return data || [];
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

  const fetchBatches = useCallback(async (membersData?: TeamMember[]) => {
    // Single query to get batches with client info
    // Exclude finalized batches (delivered and scheduling) from the board
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
      .not('status', 'in', '("delivered","scheduling")')
      .order('planning_due_date', { ascending: true, nullsFirst: false });

    if (filters.monthRef) {
      query = query.eq('month_ref', filters.monthRef);
    }

    const { data: batchesData, error: batchesError } = await query;

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return;
    }

    if (!batchesData || batchesData.length === 0) {
      setBatches([]);
      return;
    }

    // Get all batch IDs for a single pending count query
    const batchIds = batchesData.map((b: any) => b.id);

    // Single query to get pending counts for all batches
    const { data: pendingData } = await supabase
      .from('content_posts')
      .select('batch_id')
      .in('batch_id', batchIds)
      .neq('status', 'done')
      .or('archived.is.null,archived.eq.false');

    // Count pending posts per batch
    const pendingCountMap: Record<string, number> = {};
    (pendingData || []).forEach((post: any) => {
      pendingCountMap[post.batch_id] = (pendingCountMap[post.batch_id] || 0) + 1;
    });

    // Use provided members data or current state
    const members = membersData || teamMembers;
    const membersMap = new Map(members.map(m => [m.id, m]));

    // Process batches with pre-fetched data (no additional queries)
    const processedBatches: BatchWithDetails[] = batchesData.map((batch: any) => {
      const socialMember = batch.client?.social_member_id 
        ? membersMap.get(batch.client.social_member_id) || null 
        : null;

      return {
        ...batch,
        status: batch.status as BatchStatus,
        socialMember,
        pending_count: pendingCountMap[batch.id] || 0,
      };
    });

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
  }, [filters, teamMembers]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Fetch team members first so we can use them for batch processing
    const [membersData] = await Promise.all([
      fetchTeamMembers(),
      fetchServices(),
    ]);
    // Pass members data to avoid stale state
    await fetchBatches(membersData);
    setLoading(false);
  }, [fetchTeamMembers, fetchServices, fetchBatches]);

  useEffect(() => {
    fetchAll();
  }, []);

  // Re-fetch only batches when filters change (not on initial mount)
  useEffect(() => {
    if (!loading && teamMembers.length > 0) {
      fetchBatches();
    }
  }, [filters.monthRef, filters.serviceId, filters.assignedTo]);

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
