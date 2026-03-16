import { useState, useRef, useCallback } from 'react';
import { Upload, FileCheck, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TranscriptionUploadCardProps {
  title: string;
  type: 'vendas' | 'onboarding';
  onboardingId: string;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  fileContent: string | null;
  uploadedAt: string | null;
  disabled?: boolean;
  onUploaded: (data: { url: string; nome: string; tamanho: number; conteudo: string; uploaded_at: string }) => void;
  onRemoved: () => void;
}

const ACCEPTED = '.txt,.pdf,.docx,.doc,.md';
const MAX_SIZE = 10 * 1024 * 1024;

export default function TranscriptionUploadCard({
  title, type, onboardingId, fileName, fileSize, fileUrl, fileContent,
  uploadedAt, disabled, onUploaded, onRemoved,
}: TranscriptionUploadCardProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const extractText = async (file: File): Promise<string> => {
    // For text-based files, read directly
    if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      return file.text();
    }
    // For other formats, try to read as text (best effort)
    try {
      return await file.text();
    } catch {
      return '[Conteúdo não extraído - formato binário]';
    }
  };

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 10MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const path = `${onboardingId}/${type}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('onboarding-transcricoes')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('onboarding-transcricoes')
        .getPublicUrl(path);

      const content = await extractText(file);
      const now = new Date().toISOString();

      onUploaded({
        url: urlData.publicUrl,
        nome: file.name,
        tamanho: file.size,
        conteudo: content,
        uploaded_at: now,
      });

      toast({ title: 'Arquivo enviado com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [onboardingId, type, onUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleRemove = async () => {
    if (fileUrl) {
      const path = `${onboardingId}/${type}/${fileName}`;
      await supabase.storage.from('onboarding-transcricoes').remove([path]);
    }
    onRemoved();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasFile = !!fileName;

  if (hasFile) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--success)/0.3)] bg-card p-5 space-y-3 animate-fade-in">
        <div className="flex items-start gap-3">
          <FileCheck className="h-5 w-5 text-[hsl(var(--success))] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
            <div className="flex items-center gap-3 mt-1">
              {fileSize && <span className="text-xs text-muted-foreground">{formatSize(fileSize)}</span>}
              {uploadedAt && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {format(new Date(uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          {!disabled && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Substituir
              </button>
              <button
                onClick={handleRemove}
                className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Remover
              </button>
            </div>
          )}
        </div>

        {fileContent && (
          <div>
            <button
              onClick={() => setShowContent(!showContent)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {showContent ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showContent ? 'Ocultar' : 'Ver conteúdo'}
            </button>
            {showContent && (
              <textarea
                readOnly
                value={fileContent}
                className="mt-2 w-full max-h-[200px] min-h-[80px] rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground resize-none overflow-y-auto font-mono"
              />
            )}
          </div>
        )}

        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed bg-card p-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200',
        dragging ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/5',
        uploading && 'opacity-60 pointer-events-none',
        disabled && 'opacity-50 pointer-events-none'
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-[13px] text-muted-foreground text-center">
        {uploading ? 'Enviando...' : 'Arraste um arquivo ou clique para selecionar'}
      </p>
      <p className="text-[11px] text-muted-foreground">.txt, .pdf, .docx, .doc, .md — máx 10MB</p>
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
    </div>
  );
}
