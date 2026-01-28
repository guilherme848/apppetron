import { Badge } from '@/components/ui/badge';
import { NoteStatus, NOTE_STATUS_LABELS } from '@/types/notes';
import type { BadgeVariant } from '@/components/ui/badge';

const STATUS_VARIANTS: Record<NoteStatus, BadgeVariant> = {
  todo: 'neutral',
  doing: 'attention',
  done: 'strong',
  archived: 'muted',
};

interface NoteStatusBadgeProps {
  status: NoteStatus;
  className?: string;
}

export function NoteStatusBadge({ status, className }: NoteStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] || 'neutral';
  const label = NOTE_STATUS_LABELS[status] || status;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
