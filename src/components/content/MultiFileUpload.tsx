import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileIcon, Loader2, ExternalLink, Download, AlertCircle, RotateCcw, FolderArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { downloadFile, downloadFilesAsZip, formatDateForFileName } from '@/lib/fileDownload';

interface ContentFile {
  id: string;
  file_name: string;
  file_path?: string;
  storage_path?: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface MultiFileUploadProps {
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
  maxFileSizeMb?: number;
  clientName?: string;
}

export function MultiFileUpload({ 
  files, 
  postId, 
  context, 
  onFileUploaded, 
  onFileDeleted,
  maxFileSizeMb = 20,
  clientName,
}: MultiFileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxFileSize = maxFileSizeMb * 1024 * 1024;

  const generateUniqueFileName = useCallback((fileName: string, existingNames: string[]): string => {
    if (!existingNames.includes(fileName)) {
      return fileName;
    }
    
    const lastDot = fileName.lastIndexOf('.');
    const name = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
    const ext = lastDot > 0 ? fileName.slice(lastDot) : '';
    
    let counter = 2;
    let newName = `${name} (${counter})${ext}`;
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${name} (${counter})${ext}`;
    }
    
    return newName;
  }, []);

  const uploadSingleFile = useCallback(async (uploadingFile: UploadingFile): Promise<void> => {
    const { id, file } = uploadingFile;
    
    // Update status to uploading
    setUploadingFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: 'uploading' as const, progress: 0 } : f
    ));

    const storagePath = `posts/${postId}/${context}/${Date.now()}-${file.name}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('content-production')
        .upload(storagePath, file);

      if (uploadError) {
        throw uploadError;
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

      // Update status to success
      setUploadingFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'success' as const, progress: 100 } : f
      ));

      // Remove from uploading list after a short delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== id));
      }, 1500);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadingFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'error' as const, error: error.message || 'Erro ao enviar' } : f
      ));
    }
  }, [postId, context, onFileUploaded]);

  const processFiles = useCallback(async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    if (fileArray.length === 0) return;

    const existingNames = [
      ...files.map(f => f.file_name),
      ...uploadingFiles.map(f => f.file.name),
    ];

    const newUploadingFiles: UploadingFile[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: arquivo muito grande (máx. ${maxFileSizeMb}MB)`);
        continue;
      }

      // Generate unique name if duplicate
      const uniqueName = generateUniqueFileName(file.name, existingNames);
      existingNames.push(uniqueName);

      // Create a new file with the unique name if needed
      const finalFile = uniqueName !== file.name 
        ? new File([file], uniqueName, { type: file.type })
        : file;

      newUploadingFiles.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: finalFile,
        progress: 0,
        status: 'pending',
      });
    }

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    if (newUploadingFiles.length === 0) return;

    // Add to state
    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Start uploads in parallel
    await Promise.all(newUploadingFiles.map(uploadSingleFile));

    const successCount = newUploadingFiles.length - errors.length;
    if (successCount > 0) {
      toast.success(`${successCount} arquivo${successCount > 1 ? 's' : ''} enviado${successCount > 1 ? 's' : ''}`);
    }
  }, [files, uploadingFiles, maxFileSize, maxFileSizeMb, generateUniqueFileName, uploadSingleFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input to allow selecting same files again
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleCancelUpload = useCallback((id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleRetryUpload = useCallback((uploadingFile: UploadingFile) => {
    setUploadingFiles(prev => prev.map(f => 
      f.id === uploadingFile.id ? { ...f, status: 'pending' as const, error: undefined } : f
    ));
    uploadSingleFile(uploadingFile);
  }, [uploadSingleFile]);

  const handleDelete = async (fileId: string, storagePath: string) => {
    setDeleting(fileId);

    const { error: deleteError } = await supabase.storage
      .from('content-production')
      .remove([storagePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
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

  const hasUploading = uploadingFiles.length > 0;

  return (
    <div className="space-y-4">
      {/* Drop zone and button */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id={`multi-file-upload-${context}`}
        />
        <Upload className={cn(
          "h-8 w-8 mx-auto mb-2",
          isDragOver ? "text-primary" : "text-muted-foreground"
        )} />
        <p className="text-sm font-medium">
          {isDragOver ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Máximo {maxFileSizeMb}MB por arquivo • Múltiplos arquivos permitidos
        </p>
      </div>

      {/* Uploading files */}
      {hasUploading && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Enviando...</p>
          {uploadingFiles.map((uf) => (
            <div
              key={uf.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-md border",
                uf.status === 'error' ? "bg-destructive/10 border-destructive/30" : "bg-muted/50"
              )}
            >
              {uf.status === 'uploading' || uf.status === 'pending' ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin flex-shrink-0" />
              ) : uf.status === 'success' ? (
                <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{uf.file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(uf.file.size)}</span>
                  {uf.status === 'error' && uf.error && (
                    <span className="text-destructive">• {uf.error}</span>
                  )}
                  {uf.status === 'success' && (
                    <span className="text-primary">• Enviado</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {uf.status === 'error' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRetryUpload(uf)}
                    title="Tentar novamente"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                {(uf.status === 'pending' || uf.status === 'uploading' || uf.status === 'error') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleCancelUpload(uf.id)}
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files list */}
      {files.length === 0 && !hasUploading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Nenhum arquivo anexado
        </div>
      ) : files.length > 0 && (
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
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                            <Loader2 className="h-4 w-4 animate-spin" />
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
                        <Loader2 className="h-4 w-4 animate-spin" />
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
    </div>
  );
}
