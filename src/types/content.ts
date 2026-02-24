export type ContentStatus = 'backlog' | 'briefing' | 'producing' | 'review' | 'approved' | 'scheduled' | 'published';
export type ContentPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ContentItem {
  id: string;
  client_id: string | null;
  title: string;
  channel: string | null;
  format: string | null;
  status: ContentStatus;
  priority: ContentPriority;
  owner: string | null;
  due_date: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  brief: string | null;
  copy_text: string | null;
  creative_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentRevision {
  id: string;
  content_id: string;
  notes: string;
  created_at: string;
}

export const CONTENT_STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'briefing', label: 'Briefing' },
  { value: 'producing', label: 'Produção' },
  { value: 'review', label: 'Revisão' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'published', label: 'Publicado' },
];

export const CONTENT_PRIORITY_OPTIONS: { value: ContentPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
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
  { value: 'reels', label: 'Reels', icon: '🎬' },
  { value: 'carrossel', label: 'Carrossel', icon: '🖼️' },
  { value: 'story', label: 'Story', icon: '📱' },
  { value: 'post', label: 'Post', icon: '📸' },
  { value: 'video', label: 'Vídeo', icon: '🎥' },
];
