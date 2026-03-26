import { useState, useRef } from 'react';
import { Upload, X, FileIcon, Eye, Download, FolderArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { downloadFile, downloadFilesAsZip, formatDateForFileName } from '@/lib/fileDownload';
import { FilePreviewDialog } from '@/components/content/FilePreviewDialog';
import { Skeleton } from '@/components/ui/skeleton';

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
  clientName?: string;
}

export function ContentFileUpload({ 
  files, 
  postId, 
  context, 
  onFileUploaded, 
  onFileDeleted,
  clientName,
}: ContentFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [previewFile, setPreviewFile] = useState<ContentFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // No file size limit

    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `posts/${postId}/${context}/${Date.now()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('content-production')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do arquivo. Verifique o tamanho e tente novamente.');
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
    } catch (err) {
      console.error('Upload exception:', err);
      toast.error('Erro inesperado ao enviar arquivo. Tente novamente.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
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

  const handleDownloadSingle = async (file: ContentFile) => {
    const url = getFileUrl(file);
    if (!url) return;
    setDownloadingId(file.id);
    try {
      await downloadFile(url, file.file_name);
      toast.success(`${file.file_name} baixado`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (files.length < 2) return;
    setDownloadingAll(true);
    try {
      const contextLabel = context === 'briefing' ? 'briefing' : 'alteracoes';
      const sanitizedClient = clientName?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || '';
      const dateStr = formatDateForFileName();
      const zipName = ['anexos', sanitizedClient, contextLabel, dateStr].filter(Boolean).join('-') + '.zip';

      const filesForZip = files.map((f) => ({
        name: f.file_name,
        url: getFileUrl(f),
      }));
      await downloadFilesAsZip(filesForZip, zipName);
      toast.success(`${files.length} arquivos baixados como ZIP`);
    } catch (error) {
      console.error('ZIP download error:', error);
      toast.error('Erro ao criar arquivo ZIP');
    } finally {
      setDownloadingAll(false);
    }
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
            <Skeleton className="h-4 w-16 rounded" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Enviando...' : 'Enviar Arquivo'}
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <FileIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum arquivo anexado
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Download all button */}
          {files.length >= 2 && (
            <div className="flex justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                    >
                      {downloadingAll ? (
                        <Skeleton className="h-4 w-16 rounded" />
                      ) : (
                        <FolderArchive className="h-4 w-4 mr-2" />
                      )}
                      Baixar todos ({files.length})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Baixar todos os arquivos em um único ZIP</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Pré-visualizar</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadSingle(file)}
                            disabled={downloadingId === file.id}
                          >
                            {downloadingId === file.id ? (
                              <Skeleton className="h-4 w-16 rounded" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Baixar arquivo</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <ConfirmDeleteDialog
                      itemName={file.file_name}
                      onConfirm={() => handleDelete(file.id, storagePath)}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deleting === file.id}
                      >
                        {deleting === file.id ? (
                          <Skeleton className="h-4 w-16 rounded" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {previewFile && (
        <FilePreviewDialog
          open={!!previewFile}
          onOpenChange={(open) => { if (!open) setPreviewFile(null); }}
          fileUrl={getFileUrl(previewFile)}
          fileName={previewFile.file_name}
          fileType={previewFile.file_type}
        />
      )}
    </div>
  );
}
