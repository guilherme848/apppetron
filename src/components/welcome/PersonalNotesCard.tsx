import { useState } from 'react';
import { Plus, Trash2, Check, X, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { usePersonalNotes, PersonalNote } from '@/hooks/usePersonalNotes';

export function PersonalNotesCard() {
  const { notes, loading, addNote, toggleComplete, deleteNote } = usePersonalNotes();
  const [newNoteText, setNewNoteText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    
    await addNote(newNoteText);
    setNewNoteText('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddNote();
    } else if (e.key === 'Escape') {
      setNewNoteText('');
      setIsAdding(false);
    }
  };

  const pendingNotes = notes.filter(n => !n.completed);
  const completedNotes = notes.filter(n => n.completed);

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-accent" />
            Minhas Anotações
          </CardTitle>
          {!isAdding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new note input */}
        {isAdding && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nova anotação..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newNoteText.trim()) {
                  setIsAdding(false);
                }
              }}
              autoFocus
              className="h-9 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              className="h-8 w-8 p-0 text-primary"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewNoteText('');
                setIsAdding(false);
              }}
              className="h-8 w-8 p-0 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Carregando...
          </div>
        )}

        {/* Empty state */}
        {!loading && notes.length === 0 && !isAdding && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            <p>Nenhuma anotação ainda.</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="text-primary p-0 h-auto mt-1"
            >
              Adicionar primeira anotação
            </Button>
          </div>
        )}

        {/* Pending notes */}
        {pendingNotes.length > 0 && (
          <div className="space-y-2">
            {pendingNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onToggle={toggleComplete}
                onDelete={deleteNote}
              />
            ))}
          </div>
        )}

        {/* Completed notes */}
        {completedNotes.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Concluídas</span>
            {completedNotes.slice(0, 3).map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onToggle={toggleComplete}
                onDelete={deleteNote}
              />
            ))}
            {completedNotes.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{completedNotes.length - 3} mais
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NoteItemProps {
  note: PersonalNote;
  onToggle: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

function NoteItem({ note, onToggle, onDelete }: NoteItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex items-start gap-2 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Checkbox
        checked={note.completed}
        onCheckedChange={() => onToggle(note.id)}
        className="mt-0.5"
      />
      <span
        className={cn(
          "flex-1 text-sm leading-tight",
          note.completed && "line-through text-muted-foreground"
        )}
      >
        {note.content}
      </span>
      {isHovered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(note.id)}
          className="h-6 w-6 p-0 opacity-50 hover:opacity-100 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
