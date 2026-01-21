import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtraRequest, ExtraRequestFile, ExtraRequestStatus } from '@/types/extraRequests';

export function useExtraRequests() {
  const [requests, setRequests] = useState<ExtraRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_extra_requests')
      .select(`
        *,
        accounts:client_id (name),
        requested_by:requested_by_member_id (name),
        assignee:assignee_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching extra requests:', error);
    } else {
      const mapped = (data || []).map((d: any) => ({
        ...d,
        client_name: d.accounts?.name,
        requested_by_member_name: d.requested_by?.name,
        assignee_name: d.assignee?.name,
      }));
      setRequests(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const addRequest = useCallback(async (request: Omit<ExtraRequest, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => {
    const monthRef = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data, error } = await supabase
      .from('content_extra_requests')
      .insert({ ...request, month_ref: monthRef })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchRequests();
    return { success: true, data };
  }, [fetchRequests]);

  const updateRequest = useCallback(async (id: string, updates: Partial<ExtraRequest>) => {
    // If status changes to done, set completed_at
    if (updates.status === 'done') {
      const current = requests.find(r => r.id === id);
      if (current && !current.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
    }
    // If status changes from done to something else, clear completed_at
    if (updates.status && updates.status !== 'done') {
      updates.completed_at = null;
    }

    const { error } = await supabase
      .from('content_extra_requests')
      .update(updates)
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    
    // Update local state with the updates
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } as ExtraRequest : r));
    return { success: true };
  }, [requests]);

  const deleteRequest = useCallback(async (id: string) => {
    const { error } = await supabase.from('content_extra_requests').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setRequests(prev => prev.filter(r => r.id !== id));
    return { success: true };
  }, []);

  return { requests, loading, addRequest, updateRequest, deleteRequest, refetch: fetchRequests };
}

export function useExtraRequestFiles(requestId: string | null) {
  const [files, setFiles] = useState<ExtraRequestFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!requestId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('content_extra_request_files')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching files:', error);
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = useCallback(async (file: File) => {
    if (!requestId) return { success: false, error: 'No request ID' };

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `extra-requests/${requestId}/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('content-production')
      .upload(storagePath, file);

    if (uploadError) return { success: false, error: uploadError.message };

    const { data: urlData } = supabase.storage
      .from('content-production')
      .getPublicUrl(storagePath);

    const { data, error } = await supabase
      .from('content_extra_request_files')
      .insert({
        request_id: requestId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    setFiles(prev => [data, ...prev]);
    return { success: true, data };
  }, [requestId]);

  const deleteFile = useCallback(async (fileId: string, storagePath: string) => {
    await supabase.storage.from('content-production').remove([storagePath]);
    const { error } = await supabase.from('content_extra_request_files').delete().eq('id', fileId);
    if (error) return { success: false, error: error.message };
    setFiles(prev => prev.filter(f => f.id !== fileId));
    return { success: true };
  }, []);

  return { files, loading, uploadFile, deleteFile, refetch: fetchFiles };
}

// Dashboard metrics hook
export function useExtraRequestsMetrics() {
  const [metrics, setMetrics] = useState<{
    total: number;
    open: number;
    done: number;
    overdue: number;
    byMonth: { month_ref: string; total: number; open: number; done: number; overdue: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    const { data: all, error } = await supabase
      .from('content_extra_requests')
      .select('id, status, due_date, month_ref');

    if (error) {
      console.error('Error fetching metrics:', error);
      setLoading(false);
      return;
    }

    const currentMonthRequests = (all || []).filter(r => r.month_ref === currentMonth);
    const total = currentMonthRequests.length;
    const open = currentMonthRequests.filter(r => r.status === 'open' || r.status === 'in_progress').length;
    const done = currentMonthRequests.filter(r => r.status === 'done').length;
    const overdue = currentMonthRequests.filter(r => 
      r.due_date && r.due_date < today && r.status !== 'done' && r.status !== 'canceled'
    ).length;

    // Group by month (last 12 months)
    const monthsSet = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthsSet.add(d.toISOString().slice(0, 7));
    }

    const byMonth = Array.from(monthsSet).sort().reverse().map(month => {
      const monthRequests = (all || []).filter(r => r.month_ref === month);
      return {
        month_ref: month,
        total: monthRequests.length,
        open: monthRequests.filter(r => r.status === 'open' || r.status === 'in_progress').length,
        done: monthRequests.filter(r => r.status === 'done').length,
        overdue: monthRequests.filter(r => 
          r.due_date && r.due_date < today && r.status !== 'done' && r.status !== 'canceled'
        ).length,
      };
    });

    setMetrics({ total, open, done, overdue, byMonth });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}
