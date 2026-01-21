import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentChangeRequest, ChangeRequestStatus } from '@/types/changeRequest';

export function useChangeRequests(postId: string | undefined) {
  const [requests, setRequests] = useState<ContentChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('content_change_requests')
      .select('*')
      .eq('post_id', postId)
      .order('requested_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching change requests:', error);
    } else {
      setRequests((data || []) as ContentChangeRequest[]);
    }
    setLoading(false);
  }, [postId]);

  const addRequest = async (commentRich: string, requestedByMemberId?: string) => {
    if (!postId) return null;
    
    const { data, error } = await supabase
      .from('content_change_requests')
      .insert([{
        post_id: postId,
        comment_rich: commentRich,
        requested_by_member_id: requestedByMemberId || null,
        status: 'open',
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding change request:', error);
      return null;
    }
    
    const newRequest = data as ContentChangeRequest;
    setRequests((prev) => [newRequest, ...prev]);
    return newRequest;
  };

  const updateRequestStatus = async (
    requestId: string, 
    status: ChangeRequestStatus,
    resolvedByMemberId?: string,
    resolutionNoteRich?: string
  ) => {
    const updates: Record<string, any> = { status };
    
    if (status === 'done' || status === 'canceled') {
      updates.resolved_at = new Date().toISOString();
      if (resolvedByMemberId) {
        updates.resolved_by_member_id = resolvedByMemberId;
      }
      if (resolutionNoteRich) {
        updates.resolution_note_rich = resolutionNoteRich;
      }
    } else {
      updates.resolved_at = null;
      updates.resolved_by_member_id = null;
      updates.resolution_note_rich = null;
    }
    
    const { data, error } = await supabase
      .from('content_change_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating change request:', error);
      return null;
    }
    
    const updated = data as ContentChangeRequest;
    setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
    return updated;
  };

  const deleteRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('content_change_requests')
      .delete()
      .eq('id', requestId);
    
    if (error) {
      console.error('Error deleting change request:', error);
      return false;
    }
    
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    return true;
  };

  // Stats
  const openCount = requests.filter(r => r.status === 'open' || r.status === 'in_progress').length;
  const totalCount = requests.length;

  return {
    requests,
    loading,
    fetchRequests,
    addRequest,
    updateRequestStatus,
    deleteRequest,
    openCount,
    totalCount,
  };
}
