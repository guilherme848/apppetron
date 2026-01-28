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
  | 'open' | 'in_progress' | 'ready_for_review' | 'approved' | 'done' | 'canceled';

export const REQUEST_STATUS_VARIANT: Record<RequestStatusKey, BadgeVariant> = {
  open: 'neutral',
  in_progress: 'info',
  ready_for_review: 'attention',
  approved: 'info',
  done: 'strong',
  canceled: 'muted',
};

export function getRequestStatusVariant(status: string): BadgeVariant {
  return REQUEST_STATUS_VARIANT[status as RequestStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// BATCH / PIPELINE STATUS
// -----------------------------------------------------------------------------
export type BatchStatusKey = 
  | 'planning' | 'production' | 'review' | 'pdf' 
  | 'to_deliver' | 'delivered' | 'changes' | 'scheduling' | 'done';

export const BATCH_STATUS_VARIANT: Record<BatchStatusKey, BadgeVariant> = {
  planning: 'neutral',
  production: 'info',
  review: 'info',
  pdf: 'neutral',
  to_deliver: 'attention',
  delivered: 'info',
  changes: 'attention',
  scheduling: 'info',
  done: 'strong',
};

export function getBatchStatusVariant(status: string): BadgeVariant {
  return BATCH_STATUS_VARIANT[status as BatchStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// PRIORITY
// -----------------------------------------------------------------------------
export type PriorityKey = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY_VARIANT: Record<PriorityKey, BadgeVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'attention',
  urgent: 'strong',
};

export function getPriorityVariant(priority: string): BadgeVariant {
  return PRIORITY_VARIANT[priority as PriorityKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// ACCOUNT STATUS (CRM)
// -----------------------------------------------------------------------------
export type AccountStatusKey = 'lead' | 'active' | 'churned' | 'archived';

export const ACCOUNT_STATUS_VARIANT: Record<AccountStatusKey, BadgeVariant> = {
  lead: 'neutral',
  active: 'strong',
  churned: 'muted',
  archived: 'muted',
};

export function getAccountStatusVariant(status: string): BadgeVariant {
  return ACCOUNT_STATUS_VARIANT[status as AccountStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// CONTRACT STATUS
// -----------------------------------------------------------------------------
export type ContractStatusKey = 'active' | 'paused' | 'canceled';

export const CONTRACT_STATUS_VARIANT: Record<ContractStatusKey, BadgeVariant> = {
  active: 'strong',
  paused: 'attention',
  canceled: 'muted',
};

export function getContractStatusVariant(status: string): BadgeVariant {
  return CONTRACT_STATUS_VARIANT[status as ContractStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// CONTENT FORMAT / TYPE
// -----------------------------------------------------------------------------
export type ContentFormatKey = 
  | 'reels' | 'video' | 'carousel' | 'static' | 'story' | 'other';

export const CONTENT_FORMAT_VARIANT: Record<ContentFormatKey, BadgeVariant> = {
  reels: 'attention',
  video: 'attention',
  carousel: 'info',
  static: 'neutral',
  story: 'info',
  other: 'neutral',
};

export function getContentFormatVariant(format: string): BadgeVariant {
  return CONTENT_FORMAT_VARIANT[format as ContentFormatKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// CHANNEL
// -----------------------------------------------------------------------------
export type ChannelKey = 
  | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'whatsapp' | 'other';

export const CHANNEL_VARIANT: Record<ChannelKey, BadgeVariant> = {
  instagram: 'info',
  facebook: 'info',
  tiktok: 'attention',
  youtube: 'attention',
  linkedin: 'neutral',
  whatsapp: 'info',
  other: 'neutral',
};

export function getChannelVariant(channel: string): BadgeVariant {
  return CHANNEL_VARIANT[channel as ChannelKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// NPS CLASSIFICATION
// -----------------------------------------------------------------------------
export type NpsClassificationKey = 'promoter' | 'passive' | 'detractor';

export const NPS_CLASSIFICATION_VARIANT: Record<NpsClassificationKey, BadgeVariant> = {
  promoter: 'strong',
  passive: 'neutral',
  detractor: 'attention',
};

export function getNpsClassificationVariant(classification: string): BadgeVariant {
  return NPS_CLASSIFICATION_VARIANT[classification as NpsClassificationKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// RISK LEVEL (CS)
// -----------------------------------------------------------------------------
export type RiskLevelKey = 'low' | 'medium' | 'high' | 'critical';

export const RISK_LEVEL_VARIANT: Record<RiskLevelKey, BadgeVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'attention',
  critical: 'strong',
};

export function getRiskLevelVariant(level: string): BadgeVariant {
  return RISK_LEVEL_VARIANT[level as RiskLevelKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// ONBOARDING STATUS
// -----------------------------------------------------------------------------
export type OnboardingStatusKey = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export const ONBOARDING_STATUS_VARIANT: Record<OnboardingStatusKey, BadgeVariant> = {
  not_started: 'neutral',
  in_progress: 'info',
  completed: 'strong',
  blocked: 'attention',
};

export function getOnboardingStatusVariant(status: string): BadgeVariant {
  return ONBOARDING_STATUS_VARIANT[status as OnboardingStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// MEETING STATUS
// -----------------------------------------------------------------------------
export type MeetingStatusKey = 'scheduled' | 'completed' | 'canceled' | 'no_show';

export const MEETING_STATUS_VARIANT: Record<MeetingStatusKey, BadgeVariant> = {
  scheduled: 'info',
  completed: 'strong',
  canceled: 'muted',
  no_show: 'attention',
};

export function getMeetingStatusVariant(status: string): BadgeVariant {
  return MEETING_STATUS_VARIANT[status as MeetingStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// ALERT TYPE (CS Dashboard)
// -----------------------------------------------------------------------------
export type AlertTypeKey = 
  | 'onboarding_delayed' | 'no_meeting' | 'detractor_no_followup' | 'renewal_soon';

export const ALERT_TYPE_VARIANT: Record<AlertTypeKey, BadgeVariant> = {
  onboarding_delayed: 'attention',
  no_meeting: 'attention',
  detractor_no_followup: 'strong',
  renewal_soon: 'info',
};

export function getAlertTypeVariant(type: string): BadgeVariant {
  return ALERT_TYPE_VARIANT[type as AlertTypeKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// CHANGE REQUEST STATUS
// -----------------------------------------------------------------------------
export type ChangeRequestStatusKey = 'open' | 'in_progress' | 'done' | 'canceled';

export const CHANGE_REQUEST_STATUS_VARIANT: Record<ChangeRequestStatusKey, BadgeVariant> = {
  open: 'attention',
  in_progress: 'info',
  done: 'strong',
  canceled: 'muted',
};

export function getChangeRequestStatusVariant(status: string): BadgeVariant {
  return CHANGE_REQUEST_STATUS_VARIANT[status as ChangeRequestStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// CLIENT STATUS (CS)
// -----------------------------------------------------------------------------
export type ClientStatusKey = 'active' | 'at_risk' | 'onboarding' | 'churned';

export const CLIENT_STATUS_VARIANT: Record<ClientStatusKey, BadgeVariant> = {
  active: 'strong',
  at_risk: 'attention',
  onboarding: 'info',
  churned: 'muted',
};

export function getClientStatusVariant(status: string): BadgeVariant {
  return CLIENT_STATUS_VARIANT[status as ClientStatusKey] || 'neutral';
}

// -----------------------------------------------------------------------------
// OVERDUE HELPER (returns attention if overdue)
// -----------------------------------------------------------------------------
export function getOverdueVariant(dueDate: string | Date | null | undefined, isCompleted: boolean = false): BadgeVariant | null {
  if (!dueDate || isCompleted) return null;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < now ? 'attention' : null;
}
