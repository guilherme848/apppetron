// =============================================
// PETRON ONBOARDING SYSTEM - TYPES
// =============================================

// ============ Enums ============
export type PetronOnboardingStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type PetronTaskStatus = 'todo' | 'doing' | 'blocked' | 'done';

// ============ Labels ============
export const PETRON_ONBOARDING_STATUS_LABELS: Record<PetronOnboardingStatus, string> = {
  draft: 'Rascunho',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const PETRON_TASK_STATUS_LABELS: Record<PetronTaskStatus, string> = {
  todo: 'A Fazer',
  doing: 'Em Andamento',
  blocked: 'Bloqueado',
  done: 'Concluído',
};

export const PETRON_TASK_STATUS_COLORS: Record<PetronTaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  doing: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

// ============ Plans ============
export interface PetronPlan {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Activity Templates ============
export interface PetronActivityTemplate {
  id: string;
  title: string;
  description: string | null;
  default_owner_role: string;
  default_sla_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Sequences ============
export interface PetronSequence {
  id: string;
  plan_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  plan_name?: string;
  steps_count?: number;
}

// ============ Sequence Steps ============
export interface PetronSequenceStep {
  id: string;
  sequence_id: string;
  activity_template_id: string;
  step_order: number;
  offset_days: number | null;
  required: boolean;
  created_at: string;
  // Joined
  activity_title?: string;
  activity_description?: string;
  default_sla_days?: number;
  default_owner_role?: string;
}

// ============ Customer Onboardings ============
export interface PetronCustomerOnboarding {
  id: string;
  customer_id: string;
  plan_id: string;
  sequence_id: string | null;
  status: PetronOnboardingStatus;
  start_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer_name?: string;
  plan_name?: string;
  sequence_name?: string;
  created_by_name?: string;
  tasks_count?: number;
  tasks_done?: number;
}

// ============ Onboarding Tasks ============
export interface PetronOnboardingTask {
  id: string;
  onboarding_id: string;
  activity_template_id: string | null;
  title: string;
  description: string | null;
  step_order: number;
  due_date: string | null;
  status: PetronTaskStatus;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_to_name?: string;
  customer_name?: string;
  plan_name?: string;
}

// ============ Role Options ============
export const OWNER_ROLE_OPTIONS = [
  { value: 'cs', label: 'Customer Success' },
  { value: 'designer', label: 'Designer' },
  { value: 'videomaker', label: 'Videomaker' },
  { value: 'social', label: 'Social Media' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'support', label: 'Suporte' },
];

export const OWNER_ROLE_LABELS: Record<string, string> = {
  cs: 'Customer Success',
  designer: 'Designer',
  videomaker: 'Videomaker',
  social: 'Social Media',
  traffic: 'Tráfego',
  support: 'Suporte',
};
