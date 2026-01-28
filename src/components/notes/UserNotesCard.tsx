import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, StickyNote, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUserNotes } from '@/hooks/useUserNotes';
import { UserNote, NoteStatus, UserNoteEvent } from '@/types/notes';
import { NoteStatusBadge } from './NoteStatusBadge';
import { NoteFormModal } from './NoteFormModal';
import { NoteDetailModal } from './NoteDetailModal';

export function UserNotesCard() {
  const { notes, loading, createNote, updateNote, deleteNote, archiveNote, getNoteEvents } = useUserNotes();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [selectedNote, setSelectedNote] = useState<UserNote | null>(null);
  const [selectedNoteEvents, setSelectedNoteEvents] = useState<UserNoteEvent[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleCreateNote = async (data: { title: string; content?: string; status: NoteStatus; due_date?: string | null }) => {
    const result = await createNote(data.title, data.content, data.status, data.due_date);
    return !!result;
  };

  const handleUpdateNote = async (data: { title: string; content?: string; status: NoteStatus; due_date?: string | null }) => {
    if (!editingNote) return false;
    return updateNote(editingNote.id, data);
  };

  const handleOpenDetail = async (note: UserNote) => {
    setSelectedNote(note);
    const events = await getNoteEvents(note.id);
    setSelectedNoteEvents(events);
    setShowDetailModal(true);
  };

  const handleDetailUpdate = async (id: string, updates: Partial<Pick<UserNote, 'title' | 'content' | 'status' | 'due_date'>>) => {
    const success = await updateNote(id, updates);
    if (success) {
      // Refresh the note data
      const events = await getNoteEvents(id);
      setSelectedNoteEvents(events);
      // Find and update the selected note
      const updatedNote = notes.find(n => n.id === id);
      if (updatedNote) {
        setSelectedNote({ ...updatedNote, ...updates } as UserNote);
      }
    }
    return success;
  };

  // Filter: show only non-archived notes, limit to 5
  const visibleNotes = notes.filter(n => n.status !== 'archived').slice(0, 5);
  const totalNotes = notes.filter(n => n.status !== 'archived').length;

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-accent" />
              Minhas Anotações
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingNote(null);
                setShowFormModal(true);
              }}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Loading state */}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {/* Empty state */}
          {!loading && notes.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              <p>Nenhuma anotação ainda.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setEditingNote(null);
                  setShowFormModal(true);
                }}
                className="text-primary p-0 h-auto mt-1"
              >
                Criar primeira anotação
              </Button>
            </div>
          )}

          {/* Notes list */}
          {!loading && visibleNotes.length > 0 && (
            <div className="space-y-2">
              {visibleNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  onClick={() => handleOpenDetail(note)}
                />
              ))}
              {totalNotes > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{totalNotes - 5} mais anotações
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <NoteFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        note={editingNote}
        onSave={editingNote ? handleUpdateNote : handleCreateNote}
      />

      {/* Detail Modal */}
      <NoteDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        note={selectedNote}
        events={selectedNoteEvents}
        onUpdate={handleDetailUpdate}
        onDelete={deleteNote}
        onArchive={archiveNote}
      />
    </>
  );
}

interface NoteListItemProps {
  note: UserNote;
  onClick: () => void;
}

function NoteListItem({ note, onClick }: NoteListItemProps) {
  const isOverdue = note.due_date && 
    isPast(new Date(note.due_date)) && 
    !isToday(new Date(note.due_date)) && 
    note.status !== 'done' && 
    note.status !== 'archived';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        note.status === 'done' && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            note.status === 'done' && 'line-through text-muted-foreground'
          )}>
            {note.title}
          </p>
          {note.due_date && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {isOverdue ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span>
                {format(new Date(note.due_date), 'dd/MM', { locale: ptBR })}
                {isOverdue && ' • Atrasado'}
              </span>
            </div>
          )}
        </div>
        <NoteStatusBadge status={note.status} className="flex-shrink-0" />
      </div>
    </button>
  );
}
