export type BatchStatus = 
  | 'planning' 
  | 'production' 
  | 'review' 
  | 'pdf' 
  | 'to_deliver' 
  | 'delivered' 
  | 'changes' 
  | 'scheduling';

export type PostStatus = 'todo' | 'doing' | 'done';

export interface ContentBatch {
  id: string;
  client_id: string | null;
  month_ref: string;
  status: BatchStatus;
  notes: string | null;
  planning_due_date: string | null;
  delivery_date: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchAttachment {
  id: string;
  batch_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export interface PostAttachment {
  id: string;
  post_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export type ItemType = 'design' | 'video' | 'other';

export interface ContentPost {
  id: string;
  batch_id: string;
  title: string;
  channel: string | null;
  format: string | null;
  status: PostStatus;
  due_date: string | null; // deprecated - kept for compatibility
  briefing: string | null;
  caption: string | null;
  item_type: ItemType | null;
  responsible_role_id: string | null;
  responsible_role_key: string | null;
  assignee_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRole {
  id: string;
  name: string;
  created_at: string;
}

export interface ContentStageResponsibility {
  id: string;
  stage_key: BatchStatus;
  role_id: string | null;
  created_at: string;
}

export const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'design', label: 'Design' },
  { value: 'video', label: 'Vídeo' },
  { value: 'other', label: 'Outro' },
];

export const BATCH_STATUS_OPTIONS: { value: BatchStatus; label: string }[] = [
  { value: 'planning', label: 'Planejamento' },
  { value: 'production', label: 'Produção' },
  { value: 'review', label: 'Revisão' },
  { value: 'pdf', label: 'PDF' },
  { value: 'to_deliver', label: 'Para Entregar' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'changes', label: 'Alteração' },
  { value: 'scheduling', label: 'Agendamento' },
];

export const POST_STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: 'todo', label: 'A Fazer' },
  { value: 'doing', label: 'Fazendo' },
  { value: 'done', label: 'Feito' },
];

export const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'blog', label: 'Blog' },
];

export const FORMAT_OPTIONS = [
  { value: 'reels', label: 'Reels' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'story', label: 'Story' },
  { value: 'post', label: 'Post' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'video', label: 'Vídeo' },
  { value: 'artigo', label: 'Artigo' },
];
