import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentStage, ContentJob, ContentJobWithPendingCount, ContentJobHistory, ContentJobPriority } from '@/types/contentBoard';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface ContentBoardFilters {
  assignedTo: string | null;
  serviceId: string | null;
  monthRef: string | null;
}

export function useContentBoardData() {
  const [stages, setStages] = useState<ContentStage[]>([]);
  const [jobs, setJobs] = useState<ContentJobWithPendingCount[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContentBoardFilters>({
    assignedTo: null,
    serviceId: null,
    monthRef: null,
  });

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase
      .from('petron_content_stages')
      .select('*')
      .eq('active', true)
      .order('position');

    if (error) {
      console.error('Error fetching stages:', error);
      return;
    }

    setStages(data || []);
  }, []);

  const fetchJobs = useCallback(async () => {
    let query = supabase
      .from('petron_content_jobs')
      .select(`
        *,
        client:accounts!petron_content_jobs_client_id_fkey(id, name, service_id),
        assignee:team_members!petron_content_jobs_assigned_to_fkey(id, name)
      `)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (filters.monthRef) {
      query = query.eq('month_ref', filters.monthRef);
    }

    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    // Filter by service on client side (since it's a nested field)
    let filteredData = data || [];
    if (filters.serviceId) {
      filteredData = filteredData.filter(
        (job: any) => job.client?.service_id === filters.serviceId
      );
    }

    // Calculate pending count for each job (posts with status != 'done')
    const jobsWithPending = await Promise.all(
      filteredData.map(async (job: any) => {
        const { count } = await supabase
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('batch_id', job.id)
          .neq('status', 'done');

        // Also count from content_batches related to the client for this month
        const { count: batchPendingCount } = await supabase
          .from('content_posts')
          .select('*, batch:content_batches!inner(client_id, month_ref)', { count: 'exact', head: true })
          .eq('batch.client_id', job.client_id)
          .eq('batch.month_ref', job.month_ref)
          .neq('status', 'done');

        return {
          ...job,
          pending_count: batchPendingCount || 0,
        };
      })
    );

    setJobs(jobsWithPending);
  }, [filters]);

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStages(), fetchJobs(), fetchServices(), fetchTeamMembers()]);
    setLoading(false);
  }, [fetchStages, fetchJobs, fetchServices, fetchTeamMembers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchJobs();
  }, [filters, fetchJobs]);

  const moveJobToStage = useCallback(async (jobId: string, newStageId: string, notes?: string) => {
    const { data, error } = await supabase.rpc('move_content_job_to_stage', {
      p_job_id: jobId,
      p_new_stage_id: newStageId,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error moving job:', error);
      toast.error('Erro ao mover cliente');
      return null;
    }

    toast.success('Cliente movido com sucesso');
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  const createJob = useCallback(async (job: {
    client_id: string;
    stage_id: string;
    assigned_to?: string | null;
    month_ref: string;
    due_date?: string | null;
    priority?: ContentJobPriority;
    notes?: string | null;
    status_label?: string | null;
  }) => {
    const { data, error } = await supabase
      .from('petron_content_jobs')
      .insert(job)
      .select()
      .single();

    if (error) {
      console.error('Error creating job:', error);
      toast.error('Erro ao criar registro');
      return null;
    }

    toast.success('Cliente adicionado ao quadro');
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  const updateJob = useCallback(async (jobId: string, updates: Partial<ContentJob>) => {
    const { data, error } = await supabase
      .from('petron_content_jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      console.error('Error updating job:', error);
      toast.error('Erro ao atualizar');
      return null;
    }

    toast.success('Atualizado com sucesso');
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  const deleteJob = useCallback(async (jobId: string) => {
    const { error } = await supabase
      .from('petron_content_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting job:', error);
      toast.error('Erro ao remover');
      return false;
    }

    toast.success('Removido com sucesso');
    await fetchJobs();
    return true;
  }, [fetchJobs]);

  const fetchJobHistory = useCallback(async (jobId: string): Promise<ContentJobHistory[]> => {
    const { data, error } = await supabase
      .from('petron_content_job_history')
      .select(`
        *,
        from_stage:petron_content_stages!petron_content_job_history_from_stage_id_fkey(id, name, color),
        to_stage:petron_content_stages!petron_content_job_history_to_stage_id_fkey(id, name, color),
        changed_by:team_members!petron_content_job_history_changed_by_member_id_fkey(id, name)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching job history:', error);
      return [];
    }

    return data || [];
  }, []);

  const jobsByStage = useMemo(() => {
    const grouped: Record<string, ContentJobWithPendingCount[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = jobs.filter((job) => job.stage_id === stage.id);
    });
    return grouped;
  }, [stages, jobs]);

  // Generate month options (current month + 6 past + 6 future)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7); // YYYY-MM
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);

  return {
    stages,
    jobs,
    jobsByStage,
    services,
    teamMembers,
    loading,
    filters,
    setFilters,
    monthOptions,
    moveJobToStage,
    createJob,
    updateJob,
    deleteJob,
    fetchJobHistory,
    refresh: fetchAll,
  };
}
