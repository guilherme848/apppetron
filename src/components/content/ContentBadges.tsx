import { Badge } from '@/components/ui/badge';
import { ContentStatus, ContentPriority, CONTENT_STATUS_OPTIONS, CONTENT_PRIORITY_OPTIONS } from '@/types/content';
import { getTaskStatusVariant, getPriorityVariant } from '@/lib/badgeMaps';
import { AlertTriangle } from 'lucide-react';

// Map legacy ContentStatus to task status keys
const contentStatusToTaskStatus: Record<ContentStatus, string> = {
  backlog: 'backlog',
  briefing: 'in_progress',
  producing: 'in_progress',
  review: 'in_progress',
  approved: 'done',
  scheduled: 'done',
  published: 'done',
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const option = CONTENT_STATUS_OPTIONS.find((o) => o.value === status);
  const mappedStatus = contentStatusToTaskStatus[status] || 'neutral';
  const variant = getTaskStatusVariant(mappedStatus);
  return <Badge variant={variant}>{option?.label || status}</Badge>;
}

export function ContentPriorityBadge({ priority }: { priority: ContentPriority }) {
  const option = CONTENT_PRIORITY_OPTIONS.find((o) => o.value === priority);
  const variant = getPriorityVariant(priority);
  return <Badge variant={variant}>{option?.label || priority}</Badge>;
}

export function OverdueBadge() {
  return (
    <Badge variant="attention" className="flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />
      ATRASADO
    </Badge>
  );
}
