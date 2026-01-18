import { useState, useRef } from 'react';
import { Upload, X, FileIcon, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileItem {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
}

interface FileUploadProps {
  files: FileItem[];
  folder: string; // e.g., "batches/batch-id" or "posts/post-id"
  onFileUploaded: (file: { file_name: string; file_path: string; file_size: number; file_type: string }) => Promise<void>;
  onFileDeleted: (fileId: string, filePath: string) => Promise<void>;
}

export function FileUpload({ files, folder, onFileUploaded, onFileDeleted }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const filePath = `${folder}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('content-production')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Erro ao fazer upload do arquivo');
      setUploading(false);
      return;
    }

    await onFileUploaded({
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
    });

    toast.success('Arquivo enviado com sucesso');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async (fileId: string, filePath: string) => {
    setDeleting(fileId);

    const { error: deleteError } = await supabase.storage
      .from('content-production')
      .remove([filePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      toast.error('Erro ao excluir arquivo');
      setDeleting(null);
      return;
    }

    await onFileDeleted(fileId, filePath);
    toast.success('Arquivo excluído');
    setDeleting(null);
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('content-production').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          className="hidden"
          id={`file-upload-${folder}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Enviando...' : 'Anexar Arquivo'}
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
            >
              <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate">{file.file_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.file_size)}
              </span>
              <a
                href={getFileUrl(file.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDelete(file.id, file.file_path)}
                disabled={deleting === file.id}
              >
                {deleting === file.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
