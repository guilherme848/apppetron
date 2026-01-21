export type ChangeRequestStatus = 'open' | 'in_progress' | 'done' | 'canceled';

export interface ContentChangeRequest {
  id: string;
  post_id: string;
  requested_at: string;
  requested_by_member_id: string | null;
  comment_rich: string;
  status: ChangeRequestStatus;
  resolved_at: string | null;
  resolved_by_member_id: string | null;
  resolution_note_rich: string | null;
  created_at: string;
  updated_at: string;
}

export const CHANGE_REQUEST_STATUS_OPTIONS: { value: ChangeRequestStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Aberta', color: 'bg-yellow-500' },
  { value: 'in_progress', label: 'Em andamento', color: 'bg-blue-500' },
  { value: 'done', label: 'Concluída', color: 'bg-green-500' },
  { value: 'canceled', label: 'Cancelada', color: 'bg-gray-500' },
];
