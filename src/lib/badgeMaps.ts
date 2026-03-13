import type { BadgeVariant } from '@/components/ui/badge';

// =============================================================================
// CENTRAL BADGE MAPPING SYSTEM
// All status/type → badge variant mappings in one place
// Uses only Petron palette: neutral, info, attention, strong, muted
// =============================================================================

// -----------------------------------------------------------------------------
// TASK / POST STATUS
// -----------------------------------------------------------------------------
export type TaskStatusKey = 
  | 'todo' | 'doing' | 'done' 
  | 'not_started' | 'in_progress' | 'completed' 
  | 'canceled' | 'backlog';

export const TASK_STATUS_VARIANT: Record<TaskStatusKey, BadgeVariant> = {
  todo: 'neutral',
  not_started: 'neutral',
  backlog: 'muted',
  doing: 'attention',
  in_progress: 'attention',
  done: 'strong',
  completed: 'strong',
  canceled: 'muted',
};

export function getTaskStatusVariant(status: string): BadgeVariant {
  return TASK_STATUS_VARIANT[status as TaskStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// REQUEST STATUS (Extra Requests, Creative Requests, Change Requests)
// -----------------------------------------------------------------------------
export type RequestStatusKey = 
  | 'open' | 'in_progress' | 'ready_for_review' | 'approved' | 'rejected' | 'done' | 'canceled';

export const REQUEST_STATUS_VARIANT: Record<RequestStatusKey, BadgeVariant> = {
  open: 'neutral',
  in_progress: 'info',
  ready_for_review: 'attention',
  approved: 'info',
  rejected: 'destructive' as BadgeVariant,
  done: 'strong',
  canceled: 'muted',
};

export function getRequestStatusVariant(status: string): BadgeVariant {
  return REQUEST_STATUS_VARIANT[status as RequestStatusKey] || 'neutral';
}
