import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentBatch, ContentPost, BatchStatus, PostStatus, ItemType } from '@/types/contentProduction';

export interface SimpleAccount {
  id: string;
  name: string;
  status?: string;
}

const mapBatch = (data: any): ContentBatch => ({
  id: data.id,
  client_id: data.client_id,
  month_ref: data.month_ref,
  status: data.status as BatchStatus,
  notes: data.notes,
  planning_due_date: data.planning_due_date,
  delivery_date: data.delivery_date,
  archived: data.archived ?? false,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

const mapPost = (data: any): ContentPost => ({
  id: data.id,
  batch_id: data.batch_id,
  title: data.title,
  channel: data.channel,
  format: data.format,
  status: data.status as PostStatus,
  due_date: data.due_date,
  briefing: data.briefing,
  briefing_title: data.briefing_title,
  briefing_rich: data.briefing_rich,
  caption: data.caption,
  changes_title: data.changes_title,
  changes_rich: data.changes_rich,
  item_type: data.item_type as ItemType | null,
  responsible_role_id: data.responsible_role_id,
  responsible_role_key: data.responsible_role_key,
  assignee_id: data.assignee_id,
  started_at: data.started_at,
  completed_at: data.completed_at,
  sort_order: data.sort_order ?? 0,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export function useContentProductionData() {
  const [batches, setBatches] = useState<ContentBatch[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async (includeArchived = false) => {
    let query = supabase
      .from('content_batches')
      .select('*')
      .order('month_ref', { ascending: false });
    
    if (!includeArchived) {
      query = query.eq('archived', false);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching batches:', error);
    } else {
      setBatches((data || []).map(mapBatch));
    }
  }, []);

  const archiveBatch = async (id: string) => {
    const { data, error } = await supabase
      .from('content_batches')
      .update({ archived: true })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error archiving batch:', error);
      return null;
    }
    setBatches((prev) => prev.filter((b) => b.id !== id));
    return mapBatch(data);
  };

  const unarchiveBatch = async (id: string) => {
    const { data, error } = await supabase
      .from('content_batches')
      .update({ archived: false, status: 'scheduling' as BatchStatus })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error unarchiving batch:', error);
      return null;
    }
    const mapped = mapBatch(data);
    setBatches((prev) => [...prev, mapped]);
    return mapped;
  };

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts(data || []);
    }
  }, []);

  const fetchPosts = useCallback(async (batchId?: string) => {
    let query = supabase
      .from('content_posts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts((data || []).map(mapPost));
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBatches(), fetchAccounts()]);
    setLoading(false);
  }, [fetchBatches, fetchAccounts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addBatch = async (batch: { client_id: string; month_ref: string; status?: BatchStatus; notes?: string }) => {
    const { data, error } = await supabase
      .from('content_batches')
      .insert([{ ...batch, status: batch.status || 'planning' }])
      .select()
      .single();
    if (error) {
      console.error('Error adding batch:', error);
      return { data: null, error };
    }
    const mapped = mapBatch(data);
    setBatches((prev) => [mapped, ...prev]);
    return { data: mapped, error: null };
  };

  const updateBatch = async (id: string, updates: Partial<ContentBatch>) => {
    const { data, error } = await supabase
      .from('content_batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating batch:', error);
      return null;
    }
    const mapped = mapBatch(data);
    setBatches((prev) => prev.map((b) => (b.id === id ? mapped : b)));
    return mapped;
  };

  // Variable stages where responsible is per-item (not updated automatically)
  const VARIABLE_STAGES = ['production', 'changes'];

  // Reset all posts to 'todo' and update responsible when batch status changes
  const updateBatchWithReset = async (id: string, updates: Partial<ContentBatch>, stageRoleId?: string | null) => {
    // First update the batch
    const result = await updateBatch(id, updates);
    if (!result) return null;

    // If status changed, reset all posts to 'todo' and update responsible
    if (updates.status) {
      const isVariableStage = VARIABLE_STAGES.includes(updates.status);
      
      // Build the update object
      const postUpdates: Record<string, any> = { 
        status: 'todo', 
        updated_at: new Date().toISOString() 
      };
      
      // Only update responsible for fixed stages (not production/changes)
      if (!isVariableStage && stageRoleId !== undefined) {
        postUpdates.responsible_role_id = stageRoleId;
      }

      const { error } = await supabase
        .from('content_posts')
        .update(postUpdates)
        .eq('batch_id', id);
      
      if (error) {
        console.error('Error resetting posts:', error);
      } else {
        // Update local state
        setPosts((prev) => prev.map((p) => {
          if (p.batch_id !== id) return p;
          
          const updated: ContentPost = { 
            ...p, 
            status: 'todo' as PostStatus, 
            updated_at: new Date().toISOString() 
          };
          
          // Update responsible only for fixed stages
          if (!isVariableStage && stageRoleId !== undefined) {
            updated.responsible_role_id = stageRoleId;
          }
          
          return updated;
        }));
      }
    }
    
    return result;
  };

  const deleteBatch = async (id: string) => {
    const { error } = await supabase.from('content_batches').delete().eq('id', id);
    if (error) {
      console.error('Error deleting batch:', error);
      return;
    }
    setBatches((prev) => prev.filter((b) => b.id !== id));
  };

  const addPost = async (post: { batch_id: string; title: string; channel?: string; format?: string; status?: PostStatus; briefing?: string; caption?: string; responsible_role_id?: string }) => {
    // Get max sort_order for this batch
    const { data: maxOrderData } = await supabase
      .from('content_posts')
      .select('sort_order')
      .eq('batch_id', post.batch_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const nextSortOrder = (maxOrderData?.sort_order ?? -1) + 1;
    
    const { data, error } = await supabase
      .from('content_posts')
      .insert([{ ...post, status: post.status || 'todo', sort_order: nextSortOrder }])
      .select()
      .single();
    if (error) {
      console.error('Error adding post:', error);
      return null;
    }
    const mapped = mapPost(data);
    setPosts((prev) => [...prev, mapped]);
    return mapped;
  };

  const updatePost = async (id: string, updates: Partial<ContentPost>) => {
    // Auto-fill lifecycle timestamps
    const currentPost = posts.find(p => p.id === id);
    const enhancedUpdates = { ...updates };
    
    // Set started_at when moving to 'doing' (if not already set)
    if (updates.status === 'doing' && currentPost && !currentPost.started_at) {
      enhancedUpdates.started_at = new Date().toISOString();
    }
    
    // Set completed_at when moving to 'done' (if not already set)
    if (updates.status === 'done' && currentPost && !currentPost.completed_at) {
      enhancedUpdates.completed_at = new Date().toISOString();
    }
    
    // Clear completed_at if moving back from 'done'
    if (updates.status && updates.status !== 'done' && currentPost?.completed_at) {
      enhancedUpdates.completed_at = null;
    }
    
    const { data, error } = await supabase
      .from('content_posts')
      .update(enhancedUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating post:', error);
      return null;
    }
    const mapped = mapPost(data);
    setPosts((prev) => prev.map((p) => (p.id === id ? mapped : p)));
    return mapped;
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from('content_posts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting post:', error);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const getBatchById = (id: string) => batches.find((b) => b.id === id);
  const getPostsByBatch = (batchId: string) => posts.filter((p) => p.batch_id === batchId);
  const getAccountById = (id: string) => accounts.find((a) => a.id === id);

  // Update posts order locally (for drag-and-drop)
  const updatePostsOrder = (reorderedPosts: ContentPost[]) => {
    setPosts((prev) => {
      const otherPosts = prev.filter((p) => !reorderedPosts.some((rp) => rp.id === p.id));
      return [...otherPosts, ...reorderedPosts];
    });
  };

  return {
    batches,
    posts,
    accounts,
    loading,
    addBatch,
    updateBatch,
    updateBatchWithReset,
    deleteBatch,
    archiveBatch,
    unarchiveBatch,
    addPost,
    updatePost,
    deletePost,
    getBatchById,
    getPostsByBatch,
    getAccountById,
    fetchPosts,
    fetchBatches,
    updatePostsOrder,
    refetch: fetchAll,
  };
}
