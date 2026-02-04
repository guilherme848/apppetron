export interface ContentStage {
  id: string;
  name: string;
  position: number;
  active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export type ContentJobPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ContentJob {
  id: string;
  client_id: string;
  stage_id: string;
  assigned_to: string | null;
  month_ref: string;
  due_date: string | null;
  priority: ContentJobPriority;
  notes: string | null;
  status_label: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: {
    id: string;
    name: string;
    service_id: string | null;
  };
  assignee?: {
    id: string;
    name: string;
  } | null;
}

export interface ContentJobHistory {
  id: string;
  job_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by_member_id: string | null;
  notes: string | null;
  created_at: string;
  // Joined data (partial)
  from_stage?: { id: string; name: string; color: string } | null;
  to_stage?: { id: string; name: string; color: string };
  changed_by?: {
    id: string;
    name: string;
  } | null;
}

export interface ContentJobWithPendingCount extends ContentJob {
  pending_count: number;
}

export const PRIORITY_OPTIONS: { value: ContentJobPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

export const STAGE_COLOR_MAP: Record<string, string> = {
  slate: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
  blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700',
  amber: 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700',
  purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700',
  orange: 'bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-700',
  rose: 'bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-700',
  green: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700',
};
