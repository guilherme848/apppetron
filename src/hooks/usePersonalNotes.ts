import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentMember } from './usePermissions';

export interface PersonalNote {
  id: string;
  member_id: string;
  content: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function usePersonalNotes() {
  const { currentMemberId } = useCurrentMember();
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!currentMemberId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('personal_notes')
      .select('*')
      .eq('member_id', currentMemberId)
      .order('completed', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }, [currentMemberId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(async (content: string) => {
    if (!currentMemberId || !content.trim()) return null;

    const { data, error } = await supabase
      .from('personal_notes')
      .insert({
        member_id: currentMemberId,
        content: content.trim(),
        sort_order: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return null;
    }

    setNotes(prev => [data, ...prev]);
    return data;
  }, [currentMemberId]);

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<PersonalNote, 'content' | 'completed'>>) => {
    const { error } = await supabase
      .from('personal_notes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating note:', error);
      return false;
    }

    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates } : note
    ));
    return true;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('personal_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return false;
    }

    setNotes(prev => prev.filter(note => note.id !== id));
    return true;
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return false;

    return updateNote(id, { completed: !note.completed });
  }, [notes, updateNote]);

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    toggleComplete,
    refetch: fetchNotes,
  };
}
