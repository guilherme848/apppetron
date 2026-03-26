import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentItem, ContentRevision, ContentStatus, ContentPriority } from '@/types/content';

interface SimpleAccount {
  id: string;
  name: string;
}

const mapContentItem = (data: any): ContentItem => ({
  id: data.id,
  client_id: data.client_id,
  title: data.title,
  channel: data.channel,
  format: data.format,
  status: data.status as ContentStatus,
  priority: data.priority as ContentPriority,
  owner: data.owner,
  due_date: data.due_date,
  scheduled_at: data.scheduled_at,
  published_at: data.published_at,
  brief: data.brief,
  copy_text: data.copy_text,
  creative_notes: data.creative_notes,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

const mapRevision = (data: any): ContentRevision => ({
  id: data.id,
  content_id: data.content_id,
  notes: data.notes,
  created_at: data.created_at,
});

export function useContentData() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContentItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching content items:', error);
    } else {
      setContentItems((data || []).map(mapContentItem));
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name')
      .or('cliente_interno.is.null,cliente_interno.eq.false')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts(data || []);
    }
  }, []);

  const fetchRevisions = useCallback(async (contentId?: string) => {
    let query = supabase.from('content_revisions').select('*').order('created_at', { ascending: false });
    if (contentId) {
      query = query.eq('content_id', contentId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching revisions:', error);
    } else {
      setRevisions((data || []).map(mapRevision));
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchContentItems(), fetchAccounts()]);
    setLoading(false);
  }, [fetchContentItems, fetchAccounts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addContentItem = async (item: { title: string; [key: string]: any }) => {
    const { data, error } = await supabase
      .from('content_items')
      .insert([item])
      .select()
      .single();
    if (error) {
      console.error('Error adding content item:', error);
      return null;
    }
    const mapped = mapContentItem(data);
    setContentItems((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateContentItem = async (id: string, updates: Partial<ContentItem>) => {
    const { data, error } = await supabase
      .from('content_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating content item:', error);
      return null;
    }
    const mapped = mapContentItem(data);
    setContentItems((prev) => prev.map((c) => (c.id === id ? mapped : c)));
    return mapped;
  };

  const deleteContentItem = async (id: string) => {
    const { error } = await supabase.from('content_items').delete().eq('id', id);
    if (error) {
      console.error('Error deleting content item:', error);
      return;
    }
    setContentItems((prev) => prev.filter((c) => c.id !== id));
  };

  const duplicateContentItem = async (id: string) => {
    const item = contentItems.find((c) => c.id === id);
    if (!item) return null;
    
    const newItem = {
      client_id: item.client_id,
      title: `${item.title} (cópia)`,
      channel: item.channel,
      format: item.format,
      status: 'backlog' as ContentStatus,
      priority: item.priority,
      owner: item.owner,
      due_date: null,
      scheduled_at: null,
      brief: item.brief,
      copy_text: item.copy_text,
      creative_notes: item.creative_notes,
    };
    
    return addContentItem(newItem);
  };

  const addRevision = async (contentId: string, notes: string) => {
    const { data, error } = await supabase
      .from('content_revisions')
      .insert([{ content_id: contentId, notes }])
      .select()
      .single();
    if (error) {
      console.error('Error adding revision:', error);
      return null;
    }
    const mapped = mapRevision(data);
    setRevisions((prev) => [mapped, ...prev]);
    return mapped;
  };

  const getContentById = (id: string) => contentItems.find((c) => c.id === id);
  const getRevisionsByContent = (contentId: string) => revisions.filter((r) => r.content_id === contentId);
  const getAccountById = (id: string) => accounts.find((a) => a.id === id);

  return {
    contentItems,
    revisions,
    accounts,
    loading,
    addContentItem,
    updateContentItem,
    deleteContentItem,
    duplicateContentItem,
    addRevision,
    getContentById,
    getRevisionsByContent,
    getAccountById,
    fetchRevisions,
    refetch: fetchAll,
  };
}
