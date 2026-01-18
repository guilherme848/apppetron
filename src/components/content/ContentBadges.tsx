import { Badge } from '@/components/ui/badge';
import { ContentStatus, ContentPriority, CONTENT_STATUS_OPTIONS, CONTENT_PRIORITY_OPTIONS } from '@/types/content';

const statusColors: Record<ContentStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  backlog: 'outline',
  briefing: 'secondary',
  producing: 'secondary',
  review: 'default',
  approved: 'default',
  scheduled: 'default',
  published: 'default',
};

const priorityColors: Record<ContentPriority, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const option = CONTENT_STATUS_OPTIONS.find((o) => o.value === status);
  return <Badge variant={statusColors[status]}>{option?.label || status}</Badge>;
}

export function ContentPriorityBadge({ priority }: { priority: ContentPriority }) {
  const option = CONTENT_PRIORITY_OPTIONS.find((o) => o.value === priority);
  return <Badge variant={priorityColors[priority]}>{option?.label || priority}</Badge>;
}

export function OverdueBadge() {
  return <Badge variant="destructive">ATRASADO</Badge>;
}
