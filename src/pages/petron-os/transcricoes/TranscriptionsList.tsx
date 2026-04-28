import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  FileVideo,
  Clock,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranscriptions, useDeleteTranscription } from '@/hooks/useTranscriptions';
import { VideoUploadDialog } from '@/components/transcriptions/VideoUploadDialog';
import { ClientCombobox } from '@/components/transcriptions/ClientCombobox';
import {
  TRANSCRIPTION_STATUS_LABELS,
  TRANSCRIPTION_STATUS_COLORS,
  TRANSCRIPTION_PROVIDER_LABELS,
  TRANSCRIPTION_PROVIDER_COLORS,
  formatDuration,
  formatFileSize,
  type Transcription,
  type TranscriptionStatus,
} from '@/types/transcription';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: Array<{ value: 'all' | TranscriptionStatus; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'processing', label: 'Em andamento' },
  { value: 'completed', label: 'Prontas' },
  { value: 'failed', label: 'Falharam' },
];

export default function TranscriptionsList() {
  const navigate = useNavigate();
  const { data: transcriptions, isLoading } = useTranscriptions();
  const deleteMutation = useDeleteTranscription();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TranscriptionStatus>('all');
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transcription | null>(null);

  const filtered = useMemo(() => {
    if (!transcriptions) return [];
    let list = transcriptions;
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (clientFilter) list = list.filter((t) => t.client_id === clientFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.transcript_text?.toLowerCase().includes(q) ||
          t.client?.name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [transcriptions, statusFilter, clientFilter, search]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/petron-os')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileVideo className="h-6 w-6 text-primary" />
              Transcrições
            </h1>
            <p className="text-sm text-muted-foreground">
              Transcrição automática de vídeos e áudios com identificação de falantes, resumo e
              capítulos.
            </p>
          </div>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova transcrição
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, cliente, notas ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ClientCombobox
          value={clientFilter}
          onChange={setClientFilter}
          placeholder="Todos clientes"
          className="w-[220px]"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as 'all' | TranscriptionStatus)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <FileVideo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            {transcriptions?.length === 0
              ? 'Nenhuma transcrição ainda'
              : 'Nenhuma transcrição encontrada'}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {transcriptions?.length === 0
              ? 'Envie um vídeo ou áudio para começar.'
              : 'Tente ajustar a busca ou filtro.'}
          </p>
          {transcriptions?.length === 0 && (
            <Button onClick={() => setUploadOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Enviar primeiro arquivo
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, idx) => (
            <TranscriptionCard
              key={t.id}
              tx={t}
              idx={idx}
              onOpen={() => navigate(`/petron-os/transcricoes/${t.id}`)}
              onDelete={() => setDeleteTarget(t)}
            />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <VideoUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(id) => navigate(`/petron-os/transcricoes/${id}`)}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover transcrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o arquivo de vídeo, o transcript e todos os dados relacionados.
              Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CardProps {
  tx: Transcription;
  idx: number;
  onOpen: () => void;
  onDelete: () => void;
}

function TranscriptionCard({ tx, idx, onOpen, onDelete }: CardProps) {
  const StatusIcon =
    tx.status === 'completed'
      ? CheckCircle2
      : tx.status === 'failed'
        ? AlertCircle
        : tx.status === 'processing' || tx.status === 'uploading' || tx.status === 'queued'
          ? Loader2
          : Sparkles;

  const isLoading = tx.status === 'processing' || tx.status === 'uploading' || tx.status === 'queued';

  const dt = new Date(tx.created_at);
  const dateStr = dt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className={cn(
        'group relative bg-card border border-border rounded-xl p-4 cursor-pointer',
        'hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md',
        'transition-all duration-200 animate-fade-in',
      )}
      style={{ animationDelay: `${idx * 30}ms` }}
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileVideo className="h-4 w-4 text-primary" />
          </div>
          <Badge
            className={cn(
              'border-0 font-medium text-[10px] gap-1',
              TRANSCRIPTION_STATUS_COLORS[tx.status],
            )}
          >
            <StatusIcon className={cn('h-3 w-3', isLoading && 'animate-spin')} />
            {TRANSCRIPTION_STATUS_LABELS[tx.status]}
          </Badge>
          {tx.provider && (
            <Badge
              className={cn(
                'border-0 font-medium text-[10px]',
                TRANSCRIPTION_PROVIDER_COLORS[tx.provider],
              )}
              title={TRANSCRIPTION_PROVIDER_LABELS[tx.provider]}
            >
              {tx.provider === 'groq' ? 'Whisper' : 'Premium'}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-2">{tx.title}</h3>

      {/* Cliente vinculado */}
      {tx.client && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 min-w-0">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{tx.client.name}</span>
        </div>
      )}

      {/* Notes preview */}
      {tx.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{tx.notes}</p>
      )}

      {/* Error */}
      {tx.status === 'failed' && tx.error_message && (
        <p className="text-xs text-destructive line-clamp-2 mb-3 bg-destructive/5 border border-destructive/20 rounded-md p-2">
          {tx.error_message}
        </p>
      )}

      {/* Footer metrics */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono pt-2 border-t border-border/50">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(tx.duration_seconds)}
        </span>
        {tx.speakers && tx.speakers.length > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {tx.speakers.length} {tx.speakers.length === 1 ? 'falante' : 'falantes'}
          </span>
        )}
        <span className="ml-auto">
          {formatFileSize(tx.video_size_bytes)} · {dateStr}
        </span>
      </div>
    </div>
  );
}
