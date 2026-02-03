import { useState } from 'react';
import { Download, FileIcon, Loader2, ExternalLink, FolderArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  downloadFile,
  downloadFilesAsZip,
  formatDateForFileName,
  sanitizeFileName,
} from '@/lib/fileDownload';

export interface FileItem {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  file_type?: string | null;
  created_at?: string;
}

export interface FileListWithDownloadProps {
  files: FileItem[];
  contextLabel?: string; // e.g., "briefing", "alterações", "onboarding"
  clientName?: string;
  showCreatedAt?: boolean;
  showFileSize?: boolean;
  showExternalLink?: boolean;
  className?: string;
  emptyMessage?: string;
  /**
   * Additional actions to render for each file (e.g., delete button)
   */
  renderActions?: (file: FileItem) => React.ReactNode;
}

export function FileListWithDownload({
  files,
  contextLabel = 'anexos',
  clientName,
  showCreatedAt = true,
  showFileSize = true,
  showExternalLink = true,
  className = '',
  emptyMessage = 'Nenhum arquivo anexado',
  renderActions,
}: FileListWithDownloadProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadSingle = async (file: FileItem) => {
    setDownloadingId(file.id);
    try {
      await downloadFile(file.file_url, file.file_name);
      toast.success(`${file.file_name} baixado com sucesso`);
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
      const sanitizedClient = clientName ? sanitizeFileName(clientName) : '';
      const sanitizedContext = sanitizeFileName(contextLabel);
      const dateStr = formatDateForFileName();
      
      const zipName = [
        'anexos',
        sanitizedClient,
        sanitizedContext,
        dateStr,
      ].filter(Boolean).join('-') + '.zip';

      const filesForZip = files.map((f) => ({
        name: f.file_name,
        url: f.file_url,
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

  if (files.length === 0) {
    return (
      <div className={`text-center py-4 text-sm text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Download all button - only show when 2+ files */}
      {files.length >= 2 && (
        <div className="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
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

      {/* File list */}
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border"
          >
            <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.file_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {showFileSize && file.file_size && (
                  <>
                    <span>{formatFileSize(file.file_size)}</span>
                    {showCreatedAt && file.created_at && <span>•</span>}
                  </>
                )}
                {showCreatedAt && file.created_at && (
                  <span>
                    {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* External link */}
              {showExternalLink && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Abrir arquivo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Download button */}
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

              {/* Custom actions (e.g., delete) */}
              {renderActions?.(file)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
