import { useState, useRef } from 'react';
import { Upload, X, FileIcon, Loader2, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ContentFile {
  id: string;
  file_name: string;
  file_path?: string;
  storage_path?: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

interface ContentFileUploadProps {
  files: ContentFile[];
  postId: string;
  context: 'briefing' | 'changes';
  onFileUploaded: (file: {
    file_name: string;
    storage_path: string;
    file_size: number;
    file_type: string;
    public_url: string;
  }) => Promise<void>;
  onFileDeleted: (fileId: string, storagePath: string) => Promise<void>;
}

export function ContentFileUpload({ 
  files, 
  postId, 
  context, 
  onFileUploaded, 
  onFileDeleted 
}: ContentFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }

    setUploading(true);
    const storagePath = `posts/${postId}/${context}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('content-production')
      .upload(storagePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Erro ao fazer upload do arquivo');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('content-production')
      .getPublicUrl(storagePath);

    await onFileUploaded({
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      file_type: file.type,
      public_url: urlData.publicUrl,
    });

    toast.success('Arquivo enviado com sucesso');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async (fileId: string, storagePath: string) => {
    setDeleting(fileId);

    const { error: deleteError } = await supabase.storage
      .from('content-production')
      .remove([storagePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      toast.error('Erro ao excluir arquivo do storage');
      // Continue to delete from DB anyway
    }

    await onFileDeleted(fileId, storagePath);
    toast.success('Arquivo excluído');
    setDeleting(null);
  };

  const getFileUrl = (file: ContentFile) => {
    const path = file.storage_path || file.file_path;
    if (!path) return '';
    const { data } = supabase.storage.from('content-production').getPublicUrl(path);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return 'file';
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.includes('pdf')) return 'pdf';
    return 'file';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          className="hidden"
          id={`content-file-upload-${context}`}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Enviando...' : 'Enviar Arquivo'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Máximo 20MB por arquivo
        </span>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <FileIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum arquivo anexado
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const storagePath = file.storage_path || file.file_path || '';
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border"
              >
                <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{format(new Date(file.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={getFileUrl(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir arquivo"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={getFileUrl(file)}
                      download={file.file_name}
                      title="Baixar arquivo"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deleting === file.id}
                      >
                        {deleting === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O arquivo "{file.file_name}" será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(file.id, storagePath)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
