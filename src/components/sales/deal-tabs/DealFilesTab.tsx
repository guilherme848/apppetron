import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DC } from '@/lib/dashboardColors';
import { Upload, File, Trash2, Download, Image, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { DealFile } from '@/hooks/useDealDetail';

interface Props {
  files: DealFile[];
  uploadFile: (file: File) => Promise<boolean>;
  deleteFile: (fileId: string, storagePath: string) => Promise<void>;
}

export function DealFilesTab({ files, uploadFile, deleteFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (fileList: FileList) => {
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const ok = await uploadFile(file);
      if (ok) toast.success(`${file.name} enviado`);
      else toast.error(`Erro ao enviar ${file.name}`);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const getFileIcon = (type: string | null) => {
    if (type?.startsWith('image/')) return Image;
    if (type?.includes('pdf')) return FileText;
    return File;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">Arraste arquivos aqui ou</p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Enviando...' : 'Selecionar arquivos'}
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Files list */}
      {files.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-4">Nenhum arquivo</p>
      ) : (
        <div className="space-y-2">
          {files.map(file => {
            const Icon = getFileIcon(file.file_type);
            return (
              <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.file_size)} · {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {file.public_url && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(file.public_url!, '_blank')}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteFile(file.id, file.storage_path)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
