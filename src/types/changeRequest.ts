import type { BadgeVariant } from '@/components/ui/badge';
import { getChangeRequestStatusVariant } from '@/lib/badgeMaps';

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

export const CHANGE_REQUEST_STATUS_OPTIONS: { value: ChangeRequestStatus; label: string; variant: BadgeVariant }[] = [
  { value: 'open', label: 'Aberta', variant: getChangeRequestStatusVariant('open') },
  { value: 'in_progress', label: 'Em andamento', variant: getChangeRequestStatusVariant('in_progress') },
  { value: 'done', label: 'Concluída', variant: getChangeRequestStatusVariant('done') },
  { value: 'canceled', label: 'Cancelada', variant: getChangeRequestStatusVariant('canceled') },
];
