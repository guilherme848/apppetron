export type BatchStatus = 
  | 'planning' 
  | 'production' 
  | 'review' 
  | 'pdf' 
  | 'to_deliver' 
  | 'delivered' 
  | 'changes' 
  | 'scheduling' 
  | 'done';

export type PostStatus = 'todo' | 'doing' | 'done';

export interface ContentBatch {
  id: string;
  client_id: string | null;
  month_ref: string;
  status: BatchStatus;
  notes: string | null;
  planning_due_date: string | null;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
}

export const BATCH_STATUS_OPTIONS: { value: BatchStatus; label: string }[] = [
  { value: 'planning', label: 'Planejamento' },
  { value: 'production', label: 'Produção' },
  { value: 'review', label: 'Revisão' },
  { value: 'pdf', label: 'PDF' },
  { value: 'to_deliver', label: 'Para Entregar' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'changes', label: 'Alteração' },
  { value: 'scheduling', label: 'Agendamento' },
  { value: 'done', label: 'Concluído' },
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
