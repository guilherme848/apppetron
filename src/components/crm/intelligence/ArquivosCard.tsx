import { ClienteAnexo } from '@/hooks/useClientIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Paperclip, FileText, Image, Video, FileSpreadsheet, File, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArquivosCardProps {
  anexos: ClienteAnexo[];
  loading: boolean;
  onDelete?: (id: string, url: string) => void;
}

function getFileIcon(tipo: string | null) {
  if (!tipo) return { icon: File, color: 'text-muted-foreground' };
  if (tipo.includes('pdf')) return { icon: FileText, color: 'text-destructive' };
  if (tipo.startsWith('image/')) return { icon: Image, color: 'text-[hsl(var(--info))]' };
  if (tipo.startsWith('video/')) return { icon: Video, color: 'text-primary' };
  if (tipo.includes('spreadsheet') || tipo.includes('excel') || tipo.includes('csv'))
    return { icon: FileSpreadsheet, color: 'text-[hsl(var(--success))]' };
  return { icon: File, color: 'text-muted-foreground' };
}

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArquivosCard({ anexos, loading, onDelete }: ArquivosCardProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5" />Arquivos
          </CardTitle>
          {anexos.length > 0 && (
            <Badge className="text-[11px] font-semibold bg-primary/12 text-primary border-primary/25 hover:bg-primary/12">
              {anexos.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {anexos.length === 0 ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <Paperclip className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">Nenhum arquivo anexado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {anexos.map((a) => {
              const { icon: FileIcon, color } = getFileIcon(a.arquivo_tipo);
              return (
                <div key={a.id} className="group bg-muted/40 rounded-lg border border-border/50 p-2.5 flex items-start gap-2 hover:bg-muted/60 transition-colors relative">
                  <FileIcon className={cn("h-4 w-4 shrink-0 mt-0.5", color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate">{a.nome}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {a.categoria && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {a.categoria}
                        </span>
                      )}
                      {a.arquivo_tamanho && (
                        <span className="text-[10px] text-muted-foreground font-mono">{formatSize(a.arquivo_tamanho)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                    <a href={a.arquivo_url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-background rounded">
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                    {onDelete && (
                      <button onClick={() => onDelete(a.id, a.arquivo_url)} className="p-1 hover:bg-background rounded">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
