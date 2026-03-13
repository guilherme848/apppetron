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

// Alias for change requests
export function getChangeRequestStatusVariant(status: string): BadgeVariant {
  return getRequestStatusVariant(status);
}

// -----------------------------------------------------------------------------
// BATCH STATUS
// -----------------------------------------------------------------------------
export type BatchStatusKey = 
  | 'planning' | 'review' | 'approved' | 'production' | 'changes' | 'delivered' | 'completed';

export const BATCH_STATUS_VARIANT: Record<BatchStatusKey, BadgeVariant> = {
  planning: 'neutral',
  review: 'attention',
  approved: 'info',
  production: 'info',
  changes: 'attention',
  delivered: 'strong',
  completed: 'strong',
};

export function getBatchStatusVariant(status: string): BadgeVariant {
  return BATCH_STATUS_VARIANT[status as BatchStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// PRIORITY
// -----------------------------------------------------------------------------
export type PriorityKey = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY_VARIANT: Record<PriorityKey, BadgeVariant> = {
  low: 'muted',
  medium: 'neutral',
  high: 'attention',
  urgent: 'destructive' as BadgeVariant,
};

export function getPriorityVariant(priority: string): BadgeVariant {
  return PRIORITY_VARIANT[priority as PriorityKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// ACCOUNT STATUS
// -----------------------------------------------------------------------------
export type AccountStatusKey = 'active' | 'paused' | 'churned' | 'prospect' | 'onboarding';

export const ACCOUNT_STATUS_VARIANT: Record<AccountStatusKey, BadgeVariant> = {
  active: 'strong',
  paused: 'attention',
  churned: 'muted',
  prospect: 'neutral',
  onboarding: 'info',
};

export function getAccountStatusVariant(status: string): BadgeVariant {
  return ACCOUNT_STATUS_VARIANT[status as AccountStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// CONTRACT STATUS
// -----------------------------------------------------------------------------
export type ContractStatusKey = 'active' | 'expired' | 'canceled' | 'pending' | 'draft';

export const CONTRACT_STATUS_VARIANT: Record<ContractStatusKey, BadgeVariant> = {
  active: 'strong',
  expired: 'muted',
  canceled: 'muted',
  pending: 'attention',
  draft: 'neutral',
};

export function getContractStatusVariant(status: string): BadgeVariant {
  return CONTRACT_STATUS_VARIANT[status as ContractStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// CHANNEL
// -----------------------------------------------------------------------------
export type ChannelKey = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'email' | 'other';

export const CHANNEL_VARIANT: Record<ChannelKey, BadgeVariant> = {
  instagram: 'info',
  facebook: 'info',
  linkedin: 'info',
  tiktok: 'attention',
  youtube: 'attention',
  blog: 'neutral',
  email: 'neutral',
  other: 'muted',
};

export function getChannelVariant(channel: string): BadgeVariant {
  return CHANNEL_VARIANT[channel as ChannelKey] || 'muted';
}

// -----------------------------------------------------------------------------
// CONTENT FORMAT
// -----------------------------------------------------------------------------
export type ContentFormatKey = 'post' | 'carrossel' | 'carousel' | 'story' | 'video' | 'vídeo' | 'reels' | 'static';

export const CONTENT_FORMAT_VARIANT: Record<ContentFormatKey, BadgeVariant> = {
  post: 'neutral',
  carrossel: 'info',
  carousel: 'info',
  story: 'attention',
  video: 'attention',
  'vídeo': 'attention',
  reels: 'attention',
  static: 'neutral',
};

export function getContentFormatVariant(format: string): BadgeVariant {
  return CONTENT_FORMAT_VARIANT[format as ContentFormatKey] || 'muted';
}

// -----------------------------------------------------------------------------
// NPS CLASSIFICATION
// -----------------------------------------------------------------------------
export type NpsClassificationKey = 'promoter' | 'passive' | 'detractor';

export const NPS_CLASSIFICATION_VARIANT: Record<NpsClassificationKey, BadgeVariant> = {
  promoter: 'strong',
  passive: 'attention',
  detractor: 'destructive' as BadgeVariant,
};

export function getNpsClassificationVariant(classification: string): BadgeVariant {
  return NPS_CLASSIFICATION_VARIANT[classification as NpsClassificationKey] || 'neutral';
}
