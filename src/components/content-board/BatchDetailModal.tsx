import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { Calendar, User, FileText, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ContentBatch, ContentPost, BatchStatus, BATCH_STATUS_OPTIONS, ItemType, PostStatus } from '@/types/contentProduction';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
}

interface BatchWithDetails extends ContentBatch {
  client: {
    id: string;
    name: string;
    service_id: string | null;
    social_member_id: string | null;
  } | null;
  socialMember: TeamMember | null;
  pending_count: number;
}

interface PostWithAssignee extends ContentPost {
  assignee?: { id: string; name: string } | null;
}

interface BatchDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: BatchWithDetails | null;
}

const STATUS_VARIANT_MAP: Record<string, 'neutral' | 'attention' | 'strong'> = {
  todo: 'neutral',
  doing: 'attention',
  done: 'strong',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  todo: 'A Fazer',
  doing: 'Fazendo',
  done: 'Feito',
};

export function BatchDetailModal({ open, onOpenChange, batch }: BatchDetailModalProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState<PostWithAssignee[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (batch && open) {
      fetchPosts();
    }
  }, [batch, open]);

  const fetchPosts = async () => {
    if (!batch) return;
    setLoadingPosts(true);
    
    const { data, error } = await supabase
      .from('content_posts')
      .select(`
        *,
        assignee:team_members!content_posts_assignee_id_fkey(id, name)
      `)
      .eq('batch_id', batch.id)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      const mappedPosts: PostWithAssignee[] = data.map((p: any) => ({
        ...p,
        status: p.status as PostStatus,
        item_type: p.item_type as ItemType | null,
      }));
      setPosts(mappedPosts);
    }
    setLoadingPosts(false);
  };

  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getStatusLabel = (status: BatchStatus) => {
    return BATCH_STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  };

  const pendingPosts = posts.filter((p) => p.status !== 'done');
  const completedPosts = posts.filter((p) => p.status === 'done');

  const content = batch ? (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="info" className="text-sm">
            {getStatusLabel(batch.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate(`/content/production/${batch.id}`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Ver detalhes
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatMonthRef(batch.month_ref)}</span>
          </div>
          {batch.socialMember && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{batch.socialMember.name}</span>
            </div>
          )}
          {batch.planning_due_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Prazo: {format(new Date(batch.planning_due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>

        {batch.notes && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>{batch.notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Posts Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            <AlertCircle className="h-4 w-4 mr-1" />
            Pendentes ({pendingPosts.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            Concluídos ({completedPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 max-h-[300px] overflow-hidden">
          <ScrollArea className="h-full max-h-[300px]">
            {loadingPosts ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : pendingPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum post pendente
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {pendingPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/content/production/${batch.id}/post/${post.id}`);
                    }}
                    className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <span className="text-sm font-medium truncate block max-w-full">{post.title}</span>
                      {post.assignee && (
                        <MemberAvatar name={post.assignee.name} photoPath={null} size="sm" />
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT_MAP[post.status]} className="text-xs shrink-0 ml-2">
                      {STATUS_LABEL_MAP[post.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="completed" className="mt-4 max-h-[300px] overflow-hidden">
          <ScrollArea className="h-full max-h-[300px]">
            {completedPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum post concluído
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {completedPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/content/production/${batch.id}/post/${post.id}`);
                    }}
                    className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm truncate block max-w-full">{post.title}</span>
                    </div>
                    <Badge variant="strong" className="text-xs shrink-0 ml-2">
                      Feito
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>{batch?.client?.name || 'Cliente'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{batch?.client?.name || 'Cliente'}</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
