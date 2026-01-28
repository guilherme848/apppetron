import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, History, Trash2, Archive, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserNote, UserNoteEvent, NoteStatus, NOTE_STATUS_LABELS } from '@/types/notes';
import { NoteStatusBadge } from './NoteStatusBadge';

interface NoteDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: UserNote | null;
  events: UserNoteEvent[];
  onUpdate: (id: string, updates: Partial<Pick<UserNote, 'title' | 'content' | 'status' | 'due_date'>>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onArchive: (id: string) => Promise<boolean>;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: 'Criado',
  updated: 'Atualizado',
  status_changed: 'Status alterado',
  due_changed: 'Prazo alterado',
};

export function NoteDetailModal({
  open,
  onOpenChange,
  note,
  events,
  onUpdate,
  onDelete,
  onArchive,
}: NoteDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<NoteStatus>('todo');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || '');
      setStatus(note.status);
      setDueDate(note.due_date ? new Date(note.due_date) : undefined);
    }
    setIsEditing(false);
  }, [note, open]);

  const handleSave = useCallback(async () => {
    if (!note || !title.trim()) return;

    setSaving(true);
    const updates: Partial<Pick<UserNote, 'title' | 'content' | 'status' | 'due_date'>> = {};

    if (title.trim() !== note.title) updates.title = title.trim();
    if ((content.trim() || null) !== note.content) updates.content = content.trim() || null;
    if (status !== note.status) updates.status = status;
    const newDueDate = dueDate ? format(dueDate, 'yyyy-MM-dd') : null;
    if (newDueDate !== note.due_date) updates.due_date = newDueDate;

    if (Object.keys(updates).length > 0) {
      await onUpdate(note.id, updates);
    }
    
    setSaving(false);
    setIsEditing(false);
  }, [note, title, content, status, dueDate, onUpdate]);

  const handleDelete = async () => {
    if (!note) return;
    const success = await onDelete(note.id);
    if (success) {
      setShowDeleteDialog(false);
      onOpenChange(false);
    }
  };

  const handleArchive = async () => {
    if (!note) return;
    await onArchive(note.id);
    onOpenChange(false);
  };

  if (!note) return null;

  const isOverdue = note.due_date && isPast(new Date(note.due_date)) && !isToday(new Date(note.due_date)) && note.status !== 'done' && note.status !== 'archived';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2">
                {isEditing ? 'Editando Anotação' : 'Detalhes da Anotação'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    {note.status !== 'archived' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleArchive}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Arquivar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>Título</Label>
                {isEditing ? (
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título da anotação"
                  />
                ) : (
                  <p className="text-lg font-medium">{note.title}</p>
                )}
              </div>

              {/* Status and Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  {isEditing ? (
                    <Select value={status} onValueChange={(v) => setStatus(v as NoteStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(NOTE_STATUS_LABELS) as [NoteStatus, string][]).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <NoteStatusBadge status={note.status} />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Prazo</Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !dueDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                        {dueDate && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => setDueDate(undefined)}
                            >
                              Limpar prazo
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  ) : note.due_date ? (
                    <div className={cn('flex items-center gap-2 text-sm', isOverdue && 'text-destructive')}>
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(note.due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      {isOverdue && <span className="font-medium">(Atrasado)</span>}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem prazo</span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                {isEditing ? (
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Detalhes da anotação..."
                    rows={6}
                  />
                ) : note.content ? (
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {note.content}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem conteúdo</p>
                )}
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={!title.trim() || saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}

              {/* History */}
              {!isEditing && events.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Histórico
                    </Label>
                    <div className="space-y-2">
                      {events.slice(0, 10).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 p-2 rounded"
                        >
                          <span>{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</span>
                          <span className="text-xs">
                            {formatDistanceToNow(new Date(event.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              {!isEditing && (
                <div className="text-xs text-muted-foreground pt-2">
                  Criado em {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {note.updated_at !== note.created_at && (
                    <> • Atualizado {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ptBR })}</>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Anotação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
