export type NoteStatus = 'todo' | 'doing' | 'done' | 'archived';

export interface UserNote {
  id: string;
  member_id: string;
  title: string;
  content: string | null;
  status: NoteStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserNoteEvent {
  id: string;
  note_id: string;
  actor_member_id: string | null;
  event_type: 'created' | 'updated' | 'status_changed' | 'due_changed';
  payload: Record<string, unknown> | null;
  created_at: string;
}

export const NOTE_STATUS_LABELS: Record<NoteStatus, string> = {
  todo: 'A Fazer',
  doing: 'Em Andamento',
  done: 'Concluído',
  archived: 'Arquivado',
};

export const NOTE_STATUS_ORDER: Record<NoteStatus, number> = {
  todo: 1,
  doing: 2,
  done: 3,
  archived: 4,
};
