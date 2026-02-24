import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
}

function getPreviewType(fileType: string | null, fileName: string): 'image' | 'video' | 'audio' | 'pdf' | 'unsupported' {
  if (!fileType) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    return 'unsupported';
  }
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.includes('pdf')) return 'pdf';
  return 'unsupported';
}

export function FilePreviewDialog({ open, onOpenChange, fileUrl, fileName, fileType }: FilePreviewDialogProps) {
  const previewType = getPreviewType(fileType, fileName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b pr-12">
          <DialogTitle className="text-sm font-medium truncate flex-1">{fileName}</DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0">
          {previewType === 'image' && (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
          {previewType === 'video' && (
            <video
              src={fileUrl}
              controls
              className="max-w-full max-h-[70vh] rounded"
            >
              Seu navegador não suporta a reprodução deste vídeo.
            </video>
          )}
          {previewType === 'audio' && (
            <audio src={fileUrl} controls className="w-full max-w-lg">
              Seu navegador não suporta a reprodução deste áudio.
            </audio>
          )}
          {previewType === 'pdf' && (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[70vh] rounded border"
            />
          )}
          {previewType === 'unsupported' && (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground text-sm">
                Pré-visualização não disponível para este tipo de arquivo.
              </p>
              <Button variant="outline" asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Abrir em nova aba
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
