import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentBatch, ContentPost, BatchStatus, PostStatus } from '@/types/contentProduction';

interface SimpleAccount {
  id: string;
  name: string;
}

const mapBatch = (data: any): ContentBatch => ({
  id: data.id,
  client_id: data.client_id,
  month_ref: data.month_ref,
  status: data.status as BatchStatus,
  notes: data.notes,
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
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export function useContentProductionData() {
  const [batches, setBatches] = useState<ContentBatch[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('content_batches')
      .select('*')
      .order('month_ref', { ascending: false });
    if (error) {
      console.error('Error fetching batches:', error);
    } else {
      setBatches((data || []).map(mapBatch));
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts(data || []);
    }
  }, []);

  const fetchPosts = useCallback(async (batchId?: string) => {
    let query = supabase.from('content_posts').select('*').order('created_at', { ascending: true });
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

  const deleteBatch = async (id: string) => {
    const { error } = await supabase.from('content_batches').delete().eq('id', id);
    if (error) {
      console.error('Error deleting batch:', error);
      return;
    }
    setBatches((prev) => prev.filter((b) => b.id !== id));
  };

  const addPost = async (post: { batch_id: string; title: string; channel?: string; format?: string; status?: PostStatus; due_date?: string }) => {
    const { data, error } = await supabase
      .from('content_posts')
      .insert([{ ...post, status: post.status || 'todo' }])
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
    const { data, error } = await supabase
      .from('content_posts')
      .update(updates)
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

  return {
    batches,
    posts,
    accounts,
    loading,
    addBatch,
    updateBatch,
    deleteBatch,
    addPost,
    updatePost,
    deletePost,
    getBatchById,
    getPostsByBatch,
    getAccountById,
    fetchPosts,
    refetch: fetchAll,
  };
}
