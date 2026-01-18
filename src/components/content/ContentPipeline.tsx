import { ContentItem, CONTENT_STATUS_OPTIONS } from '@/types/content';
import { ContentStatusBadge, ContentPriorityBadge, OverdueBadge } from './ContentBadges';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, Copy, CheckCircle, Send } from 'lucide-react';

interface SimpleAccount {
  id: string;
  name: string;
}

interface ContentPipelineProps {
  items: ContentItem[];
  accounts: SimpleAccount[];
  onStatusChange: (id: string, status: string) => void;
  onView: (id: string) => void;
  onDuplicate: (id: string) => void;
  onApprove: (id: string) => void;
  onPublish: (id: string) => void;
}

export function ContentPipeline({ items, accounts, onStatusChange, onView, onDuplicate, onApprove, onPublish }: ContentPipelineProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const groupedByStatus = CONTENT_STATUS_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = items.filter((item) => item.status === opt.value);
    return acc;
  }, {} as Record<string, ContentItem[]>);

  const getAccountName = (clientId: string | null) => {
    if (!clientId) return '-';
    const account = accounts.find((a) => a.id === clientId);
    return account?.name || '-';
  };

  const isOverdue = (item: ContentItem) => {
    return item.due_date && item.due_date < today && item.status !== 'published';
  };

  return (
    <div className="space-y-6">
      {CONTENT_STATUS_OPTIONS.map((statusOpt) => {
        const statusItems = groupedByStatus[statusOpt.value] || [];
        if (statusItems.length === 0) return null;
        
        return (
          <div key={statusOpt.value} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{statusOpt.label}</h3>
              <span className="text-muted-foreground text-sm">({statusItems.length})</span>
            </div>
            <div className="border rounded-lg bg-background divide-y">
              {statusItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{item.title}</span>
                      {isOverdue(item) && <OverdueBadge />}
                      <ContentPriorityBadge priority={item.priority} />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span>Cliente: {getAccountName(item.client_id)}</span>
                      {item.channel && <span>• {item.channel}</span>}
                      {item.format && <span>• {item.format}</span>}
                      {item.owner && <span>• {item.owner}</span>}
                      {item.due_date && <span>• Prazo: {new Date(item.due_date).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => onView(item.id)} title="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDuplicate(item.id)} title="Duplicar">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {item.status !== 'approved' && item.status !== 'scheduled' && item.status !== 'published' && (
                      <Button variant="ghost" size="icon" onClick={() => onApprove(item.id)} title="Aprovar">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {item.status !== 'published' && (
                      <Button variant="ghost" size="icon" onClick={() => onPublish(item.id)} title="Marcar como publicado">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum conteúdo encontrado
        </div>
      )}
    </div>
  );
}
