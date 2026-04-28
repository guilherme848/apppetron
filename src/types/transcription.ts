// Tipos do módulo de Transcrições de Vídeo (Petron OS)
// A row no DB é Database['public']['Tables']['transcriptions'] mas como a
// types.ts é gerada e ainda não tem essa tabela, definimos manualmente aqui.

export type TranscriptionStatus =
  | 'pending'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type TranscriptionSourceType = 'manual' | 'crm' | 'content' | 'reuniao' | 'outro';

export type TranscriptionProvider = 'groq' | 'assemblyai';

export const TRANSCRIPTION_PROVIDER_LABELS: Record<TranscriptionProvider, string> = {
  groq: 'Whisper (rápido)',
  assemblyai: 'AssemblyAI (completo)',
};

export const TRANSCRIPTION_PROVIDER_COLORS: Record<TranscriptionProvider, string> = {
  groq: 'bg-info/15 text-info',
  assemblyai: 'bg-primary/15 text-primary',
};

export interface TranscriptionUtterance {
  speaker: string;
  start: number; // ms
  end: number; // ms
  text: string;
  confidence?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence?: number;
    speaker?: string;
  }>;
}

export interface TranscriptionChapter {
  start: number;
  end: number;
  headline: string;
  gist: string;
  summary: string;
}

export interface TranscriptionEntity {
  entity_type: string;
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionHighlight {
  text: string;
  count: number;
  rank: number;
  timestamps: Array<{ start: number; end: number }>;
}

export interface Transcription {
  id: string;
  source_type: TranscriptionSourceType;
  source_id: string | null;

  title: string;
  notes: string | null;
  video_path: string;
  video_size_bytes: number | null;
  video_mime_type: string | null;
  duration_seconds: number | null;
  language_code: string;

  status: TranscriptionStatus;
  error_message: string | null;

  provider: TranscriptionProvider | null;
  assemblyai_id: string | null;

  transcript_text: string | null;
  utterances: TranscriptionUtterance[] | null;
  summary: string | null;
  chapters: TranscriptionChapter[] | null;
  entities: TranscriptionEntity[] | null;
  highlights: TranscriptionHighlight[] | null;
  action_items: string[] | null;
  speakers: string[] | null;
  raw_response: unknown;

  cost_cents: number | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export const TRANSCRIPTION_STATUS_LABELS: Record<TranscriptionStatus, string> = {
  pending: 'Aguardando',
  uploading: 'Enviando',
  queued: 'Na fila',
  processing: 'Transcrevendo',
  completed: 'Pronto',
  failed: 'Falhou',
};

export const TRANSCRIPTION_STATUS_COLORS: Record<TranscriptionStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  uploading: 'bg-info/15 text-info',
  queued: 'bg-info/15 text-info',
  processing: 'bg-warning/15 text-warning',
  completed: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
};

export const TRANSCRIPTION_SOURCE_LABELS: Record<TranscriptionSourceType, string> = {
  manual: 'Avulso',
  crm: 'CRM',
  content: 'Conteúdo',
  reuniao: 'Reunião',
  outro: 'Outro',
};

// Speaker color rotation (HSL) — 8 cores estáveis
export const SPEAKER_COLORS = [
  'hsl(217, 91%, 60%)', // azul
  'hsl(142, 71%, 45%)', // verde
  'hsl(38, 92%, 50%)',  // âmbar
  'hsl(0, 84%, 60%)',   // vermelho
  'hsl(262, 83%, 58%)', // violeta
  'hsl(173, 80%, 40%)', // teal
  'hsl(330, 81%, 60%)', // rosa
  'hsl(24, 95%, 53%)',  // laranja
];

export function getSpeakerColor(speaker: string, allSpeakers: string[]): string {
  const idx = allSpeakers.indexOf(speaker);
  return SPEAKER_COLORS[idx >= 0 ? idx % SPEAKER_COLORS.length : 0];
}

export function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatCostBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}
