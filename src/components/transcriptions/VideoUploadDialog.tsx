import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileVideo, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreateTranscription, useStartTranscription } from '@/hooks/useTranscriptions';
import { formatFileSize } from '@/types/transcription';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (transcriptionId: string) => void;
  // opcional — pra plugar em outras páginas (CRM, Content)
  defaultSourceType?: 'manual' | 'crm' | 'content' | 'reuniao' | 'outro';
  defaultSourceId?: string | null;
}

const ACCEPTED_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp',
  'video/avi',
  'video/mov',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
];

const MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export function VideoUploadDialog({
  open,
  onOpenChange,
  onUploaded,
  defaultSourceType = 'manual',
  defaultSourceId = null,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'starting'>('idle');
  const [dragOver, setDragOver] = useState(false);

  const createTranscription = useCreateTranscription();
  const startTranscription = useStartTranscription();

  const reset = () => {
    setFile(null);
    setTitle('');
    setNotes('');
    setProgress(0);
    setPhase('idle');
  };

  const closeAndReset = (newOpen: boolean) => {
    if (phase !== 'idle') return; // não fecha durante upload
    onOpenChange(newOpen);
    if (!newOpen) reset();
  };

  const validateAndSet = useCallback(
    (f: File) => {
      if (f.size > MAX_BYTES) {
        toast({
          title: 'Arquivo muito grande',
          description: `Limite: 5 GB. Seu arquivo: ${formatFileSize(f.size)}`,
          variant: 'destructive',
        });
        return;
      }
      const isAccepted =
        ACCEPTED_TYPES.includes(f.type) ||
        /\.(mp4|mov|webm|mkv|avi|m4a|mp3|wav|ogg|flac|aac|3gp|mpeg|mpg)$/i.test(f.name);
      if (!isAccepted) {
        toast({
          title: 'Formato não suportado',
          description: 'Envie um vídeo (mp4, mov, webm, mkv, avi) ou áudio (mp3, wav, m4a, ogg).',
          variant: 'destructive',
        });
        return;
      }
      setFile(f);
      if (!title) {
        // sugere título a partir do nome (truncado pra não estourar)
        const base = f.name.replace(/\.[^.]+$/, '').slice(0, 60);
        setTitle(base);
      }
    },
    [title, toast],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: 'Selecione um arquivo', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Informe um título', variant: 'destructive' });
      return;
    }

    try {
      setPhase('uploading');
      setProgress(2);

      // Path: yyyy/mm/<uuid>-<filename-sanitizado>
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const uuid = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const path = `${yyyy}/${mm}/${uuid}-${safeName}`;

      // Upload
      const { error: upErr } = await supabase.storage
        .from('transcription-videos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });
      if (upErr) throw upErr;

      setProgress(60);

      // Criar row na tabela
      const tx = await createTranscription.mutateAsync({
        title: title.trim(),
        video_path: path,
        video_size_bytes: file.size,
        video_mime_type: file.type || null,
        language_code: 'pt',
        notes: notes.trim() || null,
        source_type: defaultSourceType,
        source_id: defaultSourceId,
      });
      setProgress(80);

      // Disparar transcrição
      setPhase('starting');
      await startTranscription.mutateAsync(tx.id);
      setProgress(100);

      toast({
        title: 'Transcrição iniciada',
        description: 'Você pode acompanhar o progresso na lista.',
      });

      onUploaded?.(tx.id);
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error('[VideoUploadDialog]', e);
      toast({
        title: 'Erro no upload',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
      setPhase('idle');
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogContent className="max-w-xl w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Nova transcrição
          </DialogTitle>
          <DialogDescription>
            Envie um vídeo ou áudio (até 5 GB). Vamos transcrever em pt-BR com identificação de
            falantes (em vídeos longos) e exportar em TXT/SRT/VTT.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 px-0.5 min-w-0">
          {/* Drop zone */}
          {!file && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'w-full border-2 border-dashed rounded-lg p-8 text-center transition-all',
                'hover:bg-muted/40 hover:border-primary/50',
                dragOver ? 'bg-primary/5 border-primary' : 'border-border',
              )}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Arraste e solte o arquivo aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou <span className="text-primary underline">clique para escolher</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-3">
                MP4, MOV, WEBM, MKV, AVI, MP3, WAV, M4A — até 5 GB
              </p>
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validateAndSet(f);
            }}
          />

          {/* Selected file preview */}
          {file && (
            <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-lg p-3">
              <FileVideo className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} · {file.type || 'tipo desconhecido'}
                </p>
              </div>
              {phase === 'idle' && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  className="h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Title + notes */}
          <div className="space-y-2">
            <Label htmlFor="tx-title">Título</Label>
            <Input
              id="tx-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente X — 27/04"
              disabled={phase !== 'idle'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-notes">Observações (opcional)</Label>
            <Textarea
              id="tx-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto, pauta, participantes..."
              rows={3}
              disabled={phase !== 'idle'}
            />
          </div>

          {/* Progress */}
          {phase !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {phase === 'uploading' ? 'Enviando arquivo...' : 'Disparando transcrição...'}
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => closeAndReset(false)} disabled={phase !== 'idle'}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!file || phase !== 'idle'} className="gap-2">
            {phase === 'idle' ? (
              <>
                <Sparkles className="h-4 w-4" />
                Transcrever
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
