import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Download,
  Trash2,
  Sparkles,
  FileText,
  ListOrdered,
  Tag,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import {
  useTranscription,
  useVideoSignedUrl,
  useDeleteTranscription,
  useStartTranscription,
} from '@/hooks/useTranscriptions';
import { TranscriptViewer } from '@/components/transcriptions/TranscriptViewer';
import {
  buildSRT,
  buildVTT,
  buildTXT,
  downloadFile,
  safeFilename,
} from '@/components/transcriptions/TranscriptExport';
import {
  TRANSCRIPTION_STATUS_LABELS,
  TRANSCRIPTION_STATUS_COLORS,
  TRANSCRIPTION_PROVIDER_LABELS,
  TRANSCRIPTION_PROVIDER_COLORS,
  formatDuration,
  formatTimestamp,
  formatCostBRL,
  getSpeakerColor,
} from '@/types/transcription';
import { cn } from '@/lib/utils';

export default function TranscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tx, isLoading } = useTranscription(id);
  const { data: videoUrl } = useVideoSignedUrl(tx?.video_path);
  const deleteMutation = useDeleteTranscription();
  const startMutation = useStartTranscription();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'transcript' | 'summary' | null>(null);

  // Track player time
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTimeMs(Math.round(v.currentTime * 1000));
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [videoUrl]);

  const handleSeek = (ms: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = ms / 1000;
    void v.play();
  };

  const handleCopy = async (kind: 'transcript' | 'summary') => {
    if (!tx) return;
    const text =
      kind === 'transcript' ? tx.transcript_text || '' : tx.summary || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
      toast({ title: 'Copiado!' });
    } catch {
      toast({ title: 'Falha ao copiar', variant: 'destructive' });
    }
  };

  const handleExport = (fmt: 'txt' | 'srt' | 'vtt' | 'json') => {
    if (!tx) return;
    const filename = safeFilename(tx.title);
    if (fmt === 'txt') {
      downloadFile(buildTXT(tx), `${filename}.txt`, 'text/plain;charset=utf-8');
    } else if (fmt === 'srt' && tx.utterances) {
      downloadFile(buildSRT(tx.utterances), `${filename}.srt`, 'text/plain;charset=utf-8');
    } else if (fmt === 'vtt' && tx.utterances) {
      downloadFile(buildVTT(tx.utterances), `${filename}.vtt`, 'text/vtt;charset=utf-8');
    } else if (fmt === 'json') {
      downloadFile(
        JSON.stringify(tx.raw_response ?? tx, null, 2),
        `${filename}.json`,
        'application/json',
      );
    }
  };

  const speakers = useMemo(() => tx?.speakers ?? [], [tx?.speakers]);
  const utterances = tx?.utterances ?? [];

  const isProcessing =
    tx?.status === 'processing' ||
    tx?.status === 'queued' ||
    tx?.status === 'uploading';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <Skeleton className="h-[500px] rounded-xl" />
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Transcrição não encontrada</h3>
        <Button onClick={() => navigate('/petron-os/transcricoes')} variant="outline">
          Voltar para a lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/petron-os/transcricoes')}
            className="shrink-0 mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{tx.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={cn('border-0 text-[10px]', TRANSCRIPTION_STATUS_COLORS[tx.status])}>
                {TRANSCRIPTION_STATUS_LABELS[tx.status]}
              </Badge>
              {tx.provider && (
                <Badge
                  className={cn(
                    'border-0 text-[10px]',
                    TRANSCRIPTION_PROVIDER_COLORS[tx.provider],
                  )}
                >
                  {TRANSCRIPTION_PROVIDER_LABELS[tx.provider]}
                </Badge>
              )}
              {tx.duration_seconds && (
                <span className="text-xs text-muted-foreground font-mono">
                  {formatDuration(tx.duration_seconds)}
                </span>
              )}
              {speakers.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {speakers.length} {speakers.length === 1 ? 'falante' : 'falantes'}
                </span>
              )}
              {tx.cost_cents !== null && tx.cost_cents !== undefined && (
                <span className="text-xs text-muted-foreground font-mono">
                  · {formatCostBRL(tx.cost_cents)}
                </span>
              )}
            </div>
            {tx.notes && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{tx.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tx.status === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startMutation.mutate(tx.id)}
              disabled={startMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', startMutation.isPending && 'animate-spin')} />
              Tentar novamente
            </Button>
          )}
          {tx.status === 'completed' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('txt')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Texto (.txt)
                </DropdownMenuItem>
                {utterances.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => handleExport('srt')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Legenda (.srt)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('vtt')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Legenda (.vtt)
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Dados completos (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {tx.status === 'failed' && tx.error_message && (
        <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Falha na transcrição</p>
            <p className="text-muted-foreground mt-0.5 break-all">{tx.error_message}</p>
          </div>
        </div>
      )}

      {/* Groq info banner: oferece reprocessar com AssemblyAI pra ganhar diarização */}
      {tx.status === 'completed' && tx.provider === 'groq' && (
        <div className="bg-info/5 border border-info/30 rounded-lg p-3 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <div className="text-sm min-w-0">
              <p className="font-medium text-foreground">
                Transcrito com Whisper (modo rápido)
              </p>
              <p className="text-xs text-muted-foreground">
                Sem identificação de falantes, resumo ou capítulos. Quer reprocessar com o
                modo completo (mais lento, ~10× mais caro)?
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            disabled={startMutation.isPending}
            onClick={() =>
              startMutation.mutate(
                { transcription_id: tx.id, force_provider: 'assemblyai' },
                {
                  onSuccess: () =>
                    toast({ title: 'Reprocessando com modo completo...' }),
                },
              )
            }
          >
            <RefreshCw className={cn('h-4 w-4', startMutation.isPending && 'animate-spin')} />
            Reprocessar completo
          </Button>
        </div>
      )}

      {/* Processing banner */}
      {isProcessing && (
        <div className="bg-warning/5 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-warning animate-spin shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Transcrevendo seu vídeo...</p>
            <p className="text-muted-foreground">
              Isso pode levar de 1 a 5 minutos dependendo da duração. A página vai atualizar
              automaticamente quando terminar.
            </p>
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-4">
        {/* Coluna principal: player + transcript/summary/chapters */}
        <div className="space-y-4 min-w-0">
          {/* Player */}
          <Card className="overflow-hidden border-border bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full aspect-video bg-black"
                preload="metadata"
              />
            ) : (
              <div className="aspect-video bg-muted/40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </Card>

          {/* Tabs: Transcript | Resumo | Capítulos | Entidades */}
          <Card className="p-4">
            <Tabs defaultValue="transcript">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <TabsList>
                  <TabsTrigger value="transcript" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Transcrição
                  </TabsTrigger>
                  {tx.summary && (
                    <TabsTrigger value="summary" className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Resumo
                    </TabsTrigger>
                  )}
                  {tx.chapters && tx.chapters.length > 0 && (
                    <TabsTrigger value="chapters" className="gap-1.5">
                      <ListOrdered className="h-3.5 w-3.5" />
                      Capítulos
                    </TabsTrigger>
                  )}
                  {tx.entities && tx.entities.length > 0 && (
                    <TabsTrigger value="entities" className="gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Entidades
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar no texto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>

              <TabsContent value="transcript" className="mt-2">
                {utterances.length > 0 ? (
                  <TranscriptViewer
                    utterances={utterances}
                    speakers={speakers}
                    currentTimeMs={currentTimeMs}
                    searchQuery={search}
                    onSeek={handleSeek}
                  />
                ) : tx.transcript_text ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {tx.transcript_text}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {isProcessing ? 'Aguardando transcrição...' : 'Sem transcrição disponível.'}
                  </div>
                )}
              </TabsContent>

              {tx.summary && (
                <TabsContent value="summary" className="mt-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy('summary')}
                        className="gap-2 text-xs"
                      >
                        {copied === 'summary' ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copiar
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{tx.summary}</p>
                    </div>
                  </div>
                </TabsContent>
              )}

              {tx.chapters && tx.chapters.length > 0 && (
                <TabsContent value="chapters" className="mt-2 space-y-2">
                  {tx.chapters.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => handleSeek(c.start)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/40 hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-mono font-semibold text-primary">
                          {formatTimestamp(c.start)}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {c.headline}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.gist}</p>
                      {c.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {c.summary}
                        </p>
                      )}
                    </button>
                  ))}
                </TabsContent>
              )}

              {tx.entities && tx.entities.length > 0 && (
                <TabsContent value="entities" className="mt-2">
                  <EntityList entities={tx.entities} />
                </TabsContent>
              )}
            </Tabs>
          </Card>
        </div>

        {/* Coluna lateral: speakers + highlights */}
        <div className="space-y-4">
          {speakers.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Falantes
              </h3>
              <div className="space-y-2">
                {speakers.map((s) => {
                  const count =
                    utterances.filter((u) => u.speaker === s).length;
                  return (
                    <div
                      key={s}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: getSpeakerColor(s, speakers) }}
                      />
                      <span className="font-medium">{s}</span>
                      <span className="text-xs text-muted-foreground ml-auto font-mono">
                        {count} {count === 1 ? 'fala' : 'falas'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tx.highlights && tx.highlights.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Palavras-chave
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tx.highlights.slice(0, 20).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => h.timestamps[0] && handleSeek(h.timestamps[0].start)}
                    className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    style={{
                      fontSize: `${Math.max(11, Math.min(14, 11 + h.rank * 3))}px`,
                    }}
                  >
                    {h.text}
                    <span className="text-[9px] opacity-60 ml-1">×{h.count}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {tx.transcript_text && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Texto contínuo
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy('transcript')}
                  className="h-7 gap-1.5 text-xs"
                >
                  {copied === 'transcript' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copiar tudo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-6 leading-relaxed">
                {tx.transcript_text}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover transcrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai remover o vídeo, transcript e dados relacionados. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteMutation.mutateAsync(tx);
                navigate('/petron-os/transcricoes');
              }}
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

function EntityList({
  entities,
}: {
  entities: NonNullable<ReturnType<typeof useTranscription>['data']>['entities'];
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (entities ?? []).forEach((e) => {
      if (!map.has(e.entity_type)) map.set(e.entity_type, new Set());
      map.get(e.entity_type)!.add(e.text);
    });
    return Array.from(map.entries()).map(([type, set]) => ({
      type,
      items: Array.from(set),
    }));
  }, [entities]);

  if (grouped.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Nenhuma entidade detectada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(({ type, items }) => (
        <div key={type} className="space-y-1.5">
          <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {type.replace(/_/g, ' ')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {items.map((it, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {it}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
