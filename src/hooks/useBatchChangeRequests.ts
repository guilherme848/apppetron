import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChangeRequestStatus } from '@/types/changeRequest';

export interface PostChangeRequestSummary {
  post_id: string;
  open_count: number;
  in_progress_count: number;
  pending_count: number; // open + in_progress
  done_count: number;
  total_count: number; // all requests for this post
}

export interface BatchChangeRequestData {
  byPostId: Map<string, PostChangeRequestSummary>;
  postsWithPending: Set<string>;
  postsWithAnyChanges: Set<string>; // posts that have any change requests (including resolved)
  totalPendingCount: number;
}

/**
 * Hook to fetch change request counts for all posts in a batch.
 * Used to display visual indicators on post cards.
 */
export function useBatchChangeRequests(batchId: string | undefined) {
  const [data, setData] = useState<BatchChangeRequestData>({
    byPostId: new Map(),
    postsWithPending: new Set(),
    postsWithAnyChanges: new Set(),
    totalPendingCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchChangeRequests = useCallback(async () => {
    if (!batchId) return;
    
    setLoading(true);
    try {
      // Fetch all change requests for posts in this batch
      // First get all post IDs for this batch
      const { data: posts, error: postsError } = await supabase
        .from('content_posts')
        .select('id')
        .eq('batch_id', batchId);

      if (postsError) {
        console.error('Error fetching posts for batch:', postsError);
        setLoading(false);
        return;
      }

      const postIds = posts?.map(p => p.id) || [];
      
      if (postIds.length === 0) {
        setData({
          byPostId: new Map(),
          postsWithPending: new Set(),
          postsWithAnyChanges: new Set(),
          totalPendingCount: 0,
        });
        setLoading(false);
        return;
      }

      // Fetch change requests for these posts
      const { data: requests, error: requestsError } = await supabase
        .from('content_change_requests')
        .select('id, post_id, status')
        .in('post_id', postIds);

      if (requestsError) {
        console.error('Error fetching change requests:', requestsError);
        setLoading(false);
        return;
      }

      // Aggregate by post_id
      const byPostId = new Map<string, PostChangeRequestSummary>();
      const postsWithPending = new Set<string>();
      const postsWithAnyChanges = new Set<string>();
      let totalPendingCount = 0;

      for (const req of requests || []) {
        const status = req.status as ChangeRequestStatus;
        const isOpen = status === 'open';
        const isInProgress = status === 'in_progress';
        const isDone = status === 'done';
        const isPending = isOpen || isInProgress;

        if (!byPostId.has(req.post_id)) {
          byPostId.set(req.post_id, {
            post_id: req.post_id,
            open_count: 0,
            in_progress_count: 0,
            pending_count: 0,
            done_count: 0,
            total_count: 0,
          });
        }

        const summary = byPostId.get(req.post_id)!;
        summary.total_count++;
        postsWithAnyChanges.add(req.post_id);
        
        if (isOpen) summary.open_count++;
        if (isInProgress) summary.in_progress_count++;
        if (isDone) summary.done_count++;
        if (isPending) {
          summary.pending_count++;
          postsWithPending.add(req.post_id);
          totalPendingCount++;
        }
      }

      setData({
        byPostId,
        postsWithPending,
        postsWithAnyChanges,
        totalPendingCount,
      });
    } catch (error) {
      console.error('Error in useBatchChangeRequests:', error);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  // Fetch on mount and when batchId changes
  useEffect(() => {
    fetchChangeRequests();
  }, [fetchChangeRequests]);

  // Helper to check if a post has pending changes
  const hasPendingChanges = useCallback((postId: string): boolean => {
    return data.postsWithPending.has(postId);
  }, [data.postsWithPending]);

  // Helper to check if a post has any changes (including resolved)
  const hasAnyChanges = useCallback((postId: string): boolean => {
    return data.postsWithAnyChanges.has(postId);
  }, [data.postsWithAnyChanges]);

  // Helper to get pending count for a post
  const getPendingCount = useCallback((postId: string): number => {
    return data.byPostId.get(postId)?.pending_count || 0;
  }, [data.byPostId]);

  // Helper to get done count for a post
  const getDoneCount = useCallback((postId: string): number => {
    return data.byPostId.get(postId)?.done_count || 0;
  }, [data.byPostId]);

  return {
    ...data,
    loading,
    refetch: fetchChangeRequests,
    hasPendingChanges,
    hasAnyChanges,
    getPendingCount,
    getDoneCount,
    postsWithPendingCount: data.postsWithPending.size,
    postsWithAnyChangesCount: data.postsWithAnyChanges.size,
  };
}
