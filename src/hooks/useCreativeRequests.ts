import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreativeRequest, 
  CreativeRequestFile, 
  CreativeRequestStatus, 
  CreativeRequestPriority,
  CreativeRequestFormat,
  CreativeRequestObjective,
  CreativeResponsibleRole
} from '@/types/creativeRequests';
import { format } from 'date-fns';

interface CreateCreativeRequestInput {
  client_id: string;
  title: string;
  brief_title?: string | null;
  brief_rich?: string | null;
  format: CreativeRequestFormat;
  objective?: CreativeRequestObjective | null;
  priority: CreativeRequestPriority;
  due_date?: string | null;
  requested_by_member_id?: string | null;
  responsible_role_key?: CreativeResponsibleRole | null;
  assignee_id?: string | null;
  reviewer_member_id?: string | null;
}

interface UpdateCreativeRequestInput {
  title?: string;
  brief_title?: string | null;
  brief_rich?: string | null;
  format?: CreativeRequestFormat;
  objective?: CreativeRequestObjective | null;
  priority?: CreativeRequestPriority;
  status?: CreativeRequestStatus;
  due_date?: string | null;
  responsible_role_key?: CreativeResponsibleRole | null;
  assignee_id?: string | null;
  reviewer_member_id?: string | null;
  completed_at?: string | null;
}

export function useCreativeRequests() {
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('traffic_creative_requests')
      .select(`
        *,
        accounts:client_id (name),
        requested_by:requested_by_member_id (name),
        assignee:assignee_id (name),
        reviewer:reviewer_member_id (name)
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setRequests([]);
    } else {
      const mapped = (data || []).map((r: any) => ({
        ...r,
        client_name: r.accounts?.name,
        requested_by_member_name: r.requested_by?.name,
        assignee_name: r.assignee?.name,
        reviewer_name: r.reviewer?.name,
      }));
      setRequests(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const addRequest = async (input: CreateCreativeRequestInput) => {
    const monthRef = format(new Date(), 'yyyy-MM');

    const { data, error: insertError } = await supabase
      .from('traffic_creative_requests')
      .insert({
        client_id: input.client_id,
        month_ref: monthRef,
        title: input.title,
        brief_title: input.brief_title || null,
        brief_rich: input.brief_rich || null,
        format: input.format,
        objective: input.objective || null,
        priority: input.priority,
        status: 'open',
        due_date: input.due_date || null,
        requested_by_member_id: input.requested_by_member_id || null,
        requested_by_role_key: 'traffic',
        responsible_role_key: input.responsible_role_key || null,
        assignee_id: input.assignee_id || null,
        reviewer_member_id: input.reviewer_member_id || null,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message, data: null };
    }

    await fetchRequests();
    return { success: true, error: null, data };
  };

  const updateRequest = async (id: string, updates: UpdateCreativeRequestInput) => {
    // Auto-set completed_at when status changes to done
    const finalUpdates: any = { ...updates };
    if (updates.status === 'done' && !updates.completed_at) {
      finalUpdates.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'done') {
      finalUpdates.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from('traffic_creative_requests')
      .update(finalUpdates)
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await fetchRequests();
    return { success: true, error: null };
  };

  const deleteRequest = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('traffic_creative_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    await fetchRequests();
    return { success: true, error: null };
  };

  const getRequestById = (id: string) => requests.find((r) => r.id === id);

  return {
    requests,
    loading,
    error,
    addRequest,
    updateRequest,
    deleteRequest,
    getRequestById,
    refetch: fetchRequests,
  };
}

// Hook for single request with files
export function useCreativeRequestDetail(id: string | undefined) {
  const [request, setRequest] = useState<CreativeRequest | null>(null);
  const [files, setFiles] = useState<CreativeRequestFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    if (!id) {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('traffic_creative_requests')
      .select(`
        *,
        accounts:client_id (name),
        requested_by:requested_by_member_id (name),
        assignee:assignee_id (name),
        reviewer:reviewer_member_id (name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      setRequest(null);
    } else {
      setRequest({
        ...data,
        client_name: (data as any).accounts?.name,
        requested_by_member_name: (data as any).requested_by?.name,
        assignee_name: (data as any).assignee?.name,
        reviewer_name: (data as any).reviewer?.name,
      } as CreativeRequest);
    }

    // Fetch files
    const { data: filesData } = await supabase
      .from('traffic_creative_request_files')
      .select('*')
      .eq('request_id', id)
      .order('created_at', { ascending: false });

    setFiles(filesData || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const updateField = async (updates: UpdateCreativeRequestInput) => {
    if (!id) return { success: false, error: 'No ID' };

    const finalUpdates: any = { ...updates };
    if (updates.status === 'done' && !updates.completed_at) {
      finalUpdates.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'done') {
      finalUpdates.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from('traffic_creative_requests')
      .update(finalUpdates)
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await fetchRequest();
    return { success: true, error: null };
  };

  const uploadFile = async (file: File) => {
    if (!id) return { success: false, error: 'No request ID' };

    const path = `creatives/${id}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('creative-requests')
      .upload(path, file);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from('creative-requests')
      .getPublicUrl(path);

    const { error: insertError } = await supabase
      .from('traffic_creative_request_files')
      .insert({
        request_id: id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: path,
        public_url: urlData.publicUrl,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    await fetchRequest();
    return { success: true, error: null };
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    await supabase.storage.from('creative-requests').remove([storagePath]);
    
    const { error } = await supabase
      .from('traffic_creative_request_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      return { success: false, error: error.message };
    }

    await fetchRequest();
    return { success: true, error: null };
  };

  return {
    request,
    files,
    loading,
    updateField,
    uploadFile,
    deleteFile,
    refetch: fetchRequest,
  };
}

// Hook for dashboard metrics
export function useCreativeRequestsMetrics() {
  const [metrics, setMetrics] = useState<{
    totalThisMonth: number;
    openCount: number;
    doneCount: number;
    overdueCount: number;
    avgDeliveryDays: number | null;
    monthlyData: { month_ref: string; total: number; done: number; overdue: number }[];
    topClients: { client_name: string; count: number }[];
    topAssignees: { assignee_name: string; backlog: number }[];
  }>({
    totalThisMonth: 0,
    openCount: 0,
    doneCount: 0,
    overdueCount: 0,
    avgDeliveryDays: null,
    monthlyData: [],
    topClients: [],
    topAssignees: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const currentMonth = format(new Date(), 'yyyy-MM');
      const today = new Date().toISOString().split('T')[0];

      // Fetch all requests
      const { data: allRequests } = await supabase
        .from('traffic_creative_requests')
        .select(`
          *,
          accounts:client_id (name),
          assignee:assignee_id (name)
        `)
        .order('created_at', { ascending: false });

      const requests = allRequests || [];

      // This month
      const thisMonth = requests.filter((r) => r.month_ref === currentMonth);
      const openStatuses = ['open', 'in_progress', 'ready_for_review', 'approved'];
      const openRequests = requests.filter((r) => openStatuses.includes(r.status));
      const doneRequests = requests.filter((r) => r.status === 'done');
      const overdueRequests = requests.filter(
        (r) => r.due_date && r.due_date < today && r.status !== 'done' && r.status !== 'canceled'
      );

      // Average delivery time
      const completedWithDates = doneRequests.filter((r) => r.completed_at && r.created_at);
      let avgDays: number | null = null;
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime();
          const completed = new Date(r.completed_at).getTime();
          return sum + (completed - created) / (1000 * 60 * 60 * 24);
        }, 0);
        avgDays = Math.round(totalDays / completedWithDates.length * 10) / 10;
      }

      // Monthly breakdown (last 12 months)
      const monthsSet = new Set<string>();
      requests.forEach((r) => monthsSet.add(r.month_ref));
      const sortedMonths = Array.from(monthsSet).sort().slice(-12);
      
      const monthlyData = sortedMonths.map((month) => {
        const monthRequests = requests.filter((r) => r.month_ref === month);
        return {
          month_ref: month,
          total: monthRequests.length,
          done: monthRequests.filter((r) => r.status === 'done').length,
          overdue: monthRequests.filter(
            (r) => r.due_date && r.due_date < today && r.status !== 'done' && r.status !== 'canceled'
          ).length,
        };
      });

      // Top clients
      const clientCounts: Record<string, number> = {};
      thisMonth.forEach((r) => {
        const name = (r as any).accounts?.name || 'Sem cliente';
        clientCounts[name] = (clientCounts[name] || 0) + 1;
      });
      const topClients = Object.entries(clientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([client_name, count]) => ({ client_name, count }));

      // Top assignees by backlog
      const assigneeBacklog: Record<string, number> = {};
      openRequests.forEach((r) => {
        const name = (r as any).assignee?.name || 'Sem responsável';
        assigneeBacklog[name] = (assigneeBacklog[name] || 0) + 1;
      });
      const topAssignees = Object.entries(assigneeBacklog)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([assignee_name, backlog]) => ({ assignee_name, backlog }));

      setMetrics({
        totalThisMonth: thisMonth.length,
        openCount: openRequests.length,
        doneCount: doneRequests.filter((r) => r.month_ref === currentMonth).length,
        overdueCount: overdueRequests.length,
        avgDeliveryDays: avgDays,
        monthlyData,
        topClients,
        topAssignees,
      });
      setLoading(false);
    };

    fetchMetrics();
  }, []);

  return { metrics, loading };
}
