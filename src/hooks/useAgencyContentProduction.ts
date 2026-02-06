import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentBatch, ContentPost, BatchStatus } from '@/types/contentProduction';
import { toast } from 'sonner';

export function useAgencyContentProduction() {
  const [batches, setBatches] = useState<ContentBatch[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch agency batches only (scope = 'agency')
      const { data: batchData, error: batchError } = await supabase
        .from('content_batches')
        .select('*')
        .eq('scope', 'agency')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (batchError) throw batchError;

      const mappedBatches: ContentBatch[] = (batchData || []).map((b) => ({
        id: b.id,
        client_id: b.client_id,
        month_ref: b.month_ref,
        status: b.status as BatchStatus,
        notes: b.notes,
        planning_due_date: b.planning_due_date,
        delivery_date: b.delivery_date,
        archived: b.archived ?? false,
        created_at: b.created_at,
        updated_at: b.updated_at,
      }));
      setBatches(mappedBatches);

      // Fetch posts for agency batches
      const batchIds = mappedBatches.map((b) => b.id);
      if (batchIds.length > 0) {
        const { data: postData, error: postError } = await supabase
          .from('content_posts')
          .select('*')
          .in('batch_id', batchIds)
          .order('sort_order', { ascending: true });

        if (postError) throw postError;

        const mappedPosts: ContentPost[] = (postData || []).map((p) => ({
          id: p.id,
          batch_id: p.batch_id,
          title: p.title,
          channel: p.channel,
          format: p.format,
          status: p.status as 'todo' | 'doing' | 'done',
          due_date: p.due_date,
          briefing: p.briefing,
          briefing_title: p.briefing_title,
          briefing_rich: p.briefing_rich,
          caption: p.caption,
          changes_title: p.changes_title,
          changes_rich: p.changes_rich,
          item_type: p.item_type as 'design' | 'video' | 'other' | null,
          responsible_role_id: p.responsible_role_id,
          responsible_role_key: p.responsible_role_key,
          assignee_id: p.assignee_id,
          started_at: p.started_at,
          completed_at: p.completed_at,
          sort_order: p.sort_order,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
        setPosts(mappedPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching agency content:', error);
      toast.error('Erro ao carregar dados de marketing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addBatch = async (batch: { month_ref: string }) => {
    try {
      const { data, error } = await supabase
        .from('content_batches')
        .insert({
          ...batch,
          client_id: null, // Agency content has no client
          scope: 'agency',
          archived: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newBatch: ContentBatch = {
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
      };
      setBatches((prev) => [newBatch, ...prev]);
      toast.success('Planejamento criado com sucesso');
      return newBatch;
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error('Erro ao criar planejamento');
      return null;
    }
  };

  const updateBatchWithReset = async (
    batchId: string,
    updates: Partial<ContentBatch>,
    stageRoleId?: string | null
  ) => {
    try {
      const { error } = await supabase
        .from('content_batches')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId);

      if (error) throw error;

      setBatches((prev) =>
        prev.map((b) =>
          b.id === batchId ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
        )
      );

      // Refresh posts if status changed (for reassignment)
      if (updates.status) {
        await fetchData();
      }

      return true;
    } catch (error) {
      console.error('Error updating batch:', error);
      toast.error('Erro ao atualizar planejamento');
      return false;
    }
  };

  const addPost = async (post: Partial<ContentPost>) => {
    try {
      const { data, error } = await supabase
        .from('content_posts')
        .insert({
          batch_id: post.batch_id,
          title: post.title || 'Novo Post',
          channel: post.channel,
          format: post.format,
          status: 'todo',
          sort_order: posts.filter((p) => p.batch_id === post.batch_id).length,
        })
        .select()
        .single();

      if (error) throw error;

      const newPost: ContentPost = {
        id: data.id,
        batch_id: data.batch_id,
        title: data.title,
        channel: data.channel,
        format: data.format,
        status: data.status as 'todo' | 'doing' | 'done',
        due_date: data.due_date,
        briefing: data.briefing,
        briefing_title: data.briefing_title,
        briefing_rich: data.briefing_rich,
        caption: data.caption,
        changes_title: data.changes_title,
        changes_rich: data.changes_rich,
        item_type: data.item_type as 'design' | 'video' | 'other' | null,
        responsible_role_id: data.responsible_role_id,
        responsible_role_key: data.responsible_role_key,
        assignee_id: data.assignee_id,
        started_at: data.started_at,
        completed_at: data.completed_at,
        sort_order: data.sort_order,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      setPosts((prev) => [...prev, newPost]);
      toast.success('Post criado com sucesso');
      return newPost;
    } catch (error) {
      console.error('Error adding post:', error);
      toast.error('Erro ao criar post');
      return null;
    }
  };

  const unarchiveBatch = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('content_batches')
        .update({ archived: false, updated_at: new Date().toISOString() })
        .eq('id', batchId);

      if (error) throw error;

      await fetchData();
      return true;
    } catch (error) {
      console.error('Error unarchiving batch:', error);
      return false;
    }
  };

  return {
    batches,
    posts,
    loading,
    addBatch,
    updateBatchWithReset,
    addPost,
    unarchiveBatch,
    refetch: fetchData,
  };
}
