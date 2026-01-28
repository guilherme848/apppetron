import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserNote, UserNoteEvent, NoteStatus, NOTE_STATUS_ORDER } from '@/types/notes';

export function useUserNotes() {
  const { member } = useAuth();
  const currentMemberId = member?.id || null;
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!currentMemberId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('member_id', currentMemberId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user notes:', error);
    } else {
      // Sort: non-done first, then by due_date (closest first), then by updated_at
      const sorted = (data || []).sort((a, b) => {
        // Status order (non-done first)
        const statusOrderA = NOTE_STATUS_ORDER[a.status as NoteStatus] || 99;
        const statusOrderB = NOTE_STATUS_ORDER[b.status as NoteStatus] || 99;
        
        // First sort by done/not-done
        const aIsDone = a.status === 'done' || a.status === 'archived';
        const bIsDone = b.status === 'done' || b.status === 'archived';
        
        if (aIsDone !== bIsDone) {
          return aIsDone ? 1 : -1;
        }
        
        // Then by status order
        if (statusOrderA !== statusOrderB) {
          return statusOrderA - statusOrderB;
        }
        
        // Then by due_date (closest first, null last)
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        
        // Finally by updated_at (most recent first)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      
      setNotes(sorted as UserNote[]);
    }
    setLoading(false);
  }, [currentMemberId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async (title: string, content?: string, status?: NoteStatus, due_date?: string | null) => {
    if (!currentMemberId || !title.trim()) return null;

    const { data, error } = await supabase
      .from('user_notes')
      .insert({
        member_id: currentMemberId,
        title: title.trim(),
        content: content?.trim() || null,
        status: status || 'todo',
        due_date: due_date || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return null;
    }

    // Log event
    await supabase.from('user_note_events').insert({
      note_id: data.id,
      actor_member_id: currentMemberId,
      event_type: 'created',
      payload: { title: data.title },
    });

    await fetchNotes();
    return data as UserNote;
  }, [currentMemberId, fetchNotes]);

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<UserNote, 'title' | 'content' | 'status' | 'due_date'>>) => {
    if (!currentMemberId) return false;

    const note = notes.find(n => n.id === id);
    if (!note) return false;

    const { error } = await supabase
      .from('user_notes')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating note:', error);
      return false;
    }

    // Log appropriate event
    if (updates.status && updates.status !== note.status) {
      await supabase.from('user_note_events').insert({
        note_id: id,
        actor_member_id: currentMemberId,
        event_type: 'status_changed',
        payload: { from: note.status, to: updates.status },
      });
    } else if (updates.due_date !== undefined && updates.due_date !== note.due_date) {
      await supabase.from('user_note_events').insert({
        note_id: id,
        actor_member_id: currentMemberId,
        event_type: 'due_changed',
        payload: { from: note.due_date, to: updates.due_date },
      });
    } else if (Object.keys(updates).length > 0) {
      await supabase.from('user_note_events').insert({
        note_id: id,
        actor_member_id: currentMemberId,
        event_type: 'updated',
        payload: updates,
      });
    }

    await fetchNotes();
    return true;
  }, [currentMemberId, notes, fetchNotes]);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return false;
    }

    await fetchNotes();
    return true;
  }, [fetchNotes]);

  const archiveNote = useCallback(async (id: string) => {
    return updateNote(id, { status: 'archived' });
  }, [updateNote]);

  const getNote = useCallback(async (id: string): Promise<UserNote | null> => {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching note:', error);
      return null;
    }

    return data as UserNote | null;
  }, []);

  const getNoteEvents = useCallback(async (noteId: string): Promise<UserNoteEvent[]> => {
    const { data, error } = await supabase
      .from('user_note_events')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching note events:', error);
      return [];
    }

    return data as UserNoteEvent[];
  }, []);

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
    getNote,
    getNoteEvents,
    refetch: fetchNotes,
  };
}
