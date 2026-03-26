import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, AlertTriangle, Archive, AlertCircle, Trash2, Lock, MessageSquareWarning, Filter, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileUpload } from '@/components/content/FileUpload';
import { Progress } from '@/components/ui/progress';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useStageResponsibilities } from '@/hooks/useStageResponsibilities';
import { SortablePostList } from '@/components/content/SortablePostList';
import { SaveStatus } from '@/components/ui/save-status';
import { useAutoSave, useAutoSaveNavigation } from '@/hooks/useAutoSave';
import { BATCH_STATUS_OPTIONS, BatchStatus, BatchAttachment, ContentPost, ContentBatch } from '@/types/contentProduction';
import { ROLE_KEY_LABELS } from '@/lib/accountTeam';
import { useBatchChangeRequests } from '@/hooks/useBatchChangeRequests';
import { Toggle } from '@/components/ui/toggle';
import { Skeleton } from '@/components/ui/skeleton';

export default function MarketingBatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, getRoleById } = useJobRoles();
  const { getRoleKeyForStage } = useStageResponsibilities();
  
  const [batch, setBatch] = useState<ContentBatch | null>(null);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { 
    hasPendingChanges: postHasPendingChanges, 
    hasAnyChanges: postHasAnyChanges,
    getPendingCount, 
    getDoneCount,
    postsWithPendingCount,
  } = useBatchChangeRequests(id);

  const initialLoadComplete = useRef(false);
  const [notes, setNotes] = useState('');
  const [planningDueDate, setPlanningDueDate] = useState('');
  const [attachments, setAttachments] = useState<BatchAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [showOnlyWithChanges, setShowOnlyWithChanges] = useState(false);

  // Fetch batch data
  const fetchBatch = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('content_batches')
      .select('*')
      .eq('id', id)
      .eq('scope', 'agency')
      .single();

    if (error || !data) {
      console.error('Error fetching batch:', error);
      setBatch(null);
      return;
    }

    setBatch({
      id: data.id,
      client_id: data.client_id,
      month_ref: data.month_ref,
      status: data.status as BatchStatus,
      notes: data.notes,
      planning_due_date: data.planning_due_date,
      delivery_date: data.delivery_date,
      archived: data.archived ?? false,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  }, [id]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('batch_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    setPosts((data || []).map((p) => ({
      id: p.id,
      batch_id: p.batch_id,
      title: p.title,
      channel: p.channel,
      format: p.format,
      status: p.status as 'todo' | 'doing' | 'done',
      due_date: p.due_date,
      briefing: p.briefing,
      briefing_title: p.briefing_title,
      briefing_rich: p.briefing_rich,
      caption: p.caption,
      changes_title: p.changes_title,
      changes_rich: p.changes_rich,
      item_type: p.item_type as 'design' | 'video' | 'other' | null,
      responsible_role_id: p.responsible_role_id,
      responsible_role_key: p.responsible_role_key,
      assignee_id: p.assignee_id,
      started_at: p.started_at,
      completed_at: p.completed_at,
      sort_order: p.sort_order,
      is_drawer: p.is_drawer ?? false,
      sugerido_por_ia: p.sugerido_por_ia ?? false,
      legenda_sugerida: p.legenda_sugerida ?? null,
      briefing_sugerido: p.briefing_sugerido ?? null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })));
  }, [id]);

  const fetchAttachments = useCallback(async () => {
    if (!id) return;
    setLoadingAttachments(true);
    const { data, error } = await supabase
      .from('batch_attachments')
      .select('*')
      .eq('batch_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching attachments:', error);
    } else {
      setAttachments(data || []);
    }
    setLoadingAttachments(false);
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBatch(), fetchPosts(), fetchAttachments()]);
      setLoading(false);
    };
    loadData();
  }, [fetchBatch, fetchPosts, fetchAttachments]);

  useEffect(() => {
    if (batch) {
      setNotes(batch.notes || '');
      setPlanningDueDate(batch.planning_due_date || '');
      setTimeout(() => {
        initialLoadComplete.current = true;
      }, 100);
    }
  }, [batch]);

  // Sort and filter posts
  const batchPosts = useMemo(() => {
    let filtered = posts;
    if (showOnlyWithChanges) {
      filtered = filtered.filter((p) => postHasPendingChanges(p.id));
    }
    return filtered.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [posts, showOnlyWithChanges, postHasPendingChanges]);

  const totalPostsCount = posts.length;

  // AutoSave setup
  const handleSaveBatch = useCallback(async (data: Record<string, any>) => {
    if (!batch) return;
    await supabase
      .from('content_batches')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', batch.id);
    await fetchBatch();
  }, [batch, fetchBatch]);

  const { status: saveStatus, saveNow, queueChange, flush, hasPendingChanges } = useAutoSave({
    onSave: handleSaveBatch,
    showToasts: false,
  });

  useAutoSaveNavigation(flush, hasPendingChanges);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Pacote não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/commercial/marketing')}>
          Voltar
        </Button>
      </div>
    );
  }

  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const handleStatusChange = async (status: BatchStatus) => {
    await supabase
      .from('content_batches')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', batch.id);
    await fetchBatch();
    await fetchPosts();
    toast.success('Status atualizado');
  };

  const doneCount = batchPosts.filter(p => p.status === 'done').length;
  const progress = totalPostsCount > 0 ? Math.round((doneCount / totalPostsCount) * 100) : 0;

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (initialLoadComplete.current) {
      queueChange({ notes: value || null });
    }
  };

  const handleNotesBlur = async () => {
    if (initialLoadComplete.current) {
      await flush();
    }
  };

  const handlePlanningDueDateChange = (value: string) => {
    setPlanningDueDate(value);
    if (initialLoadComplete.current) {
      saveNow({ planning_due_date: value || null });
    }
  };

  const handleDeleteBatch = async () => {
    await supabase.from('content_batches').delete().eq('id', batch.id);
    toast.success('Pacote excluído');
    navigate('/commercial/marketing');
  };

  const handleArchiveBatch = async () => {
    await supabase
      .from('content_batches')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', batch.id);
    toast.success('Pacote arquivado');
    navigate('/commercial/marketing');
  };

  const handleNewPost = async () => {
    const { data, error } = await supabase
      .from('content_posts')
      .insert({
        batch_id: batch.id,
        title: '',
        status: 'todo',
        sort_order: posts.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar post');
      return;
    }
    navigate(`/commercial/marketing/${batch.id}/posts/${data.id}`);
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('content_posts').delete().eq('id', postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success('Post excluído');
  };

  const handlePostStatusChange = async (postId: string, status: string) => {
    // Block transition to 'doing' without assignee
    if (status === 'doing') {
      const post = posts.find(p => p.id === postId);
      if (post && !post.assignee_id) {
        toast.error('Atribua um responsável antes de iniciar a produção');
        return;
      }
    }
    await supabase
      .from('content_posts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', postId);
    await fetchPosts();
    toast.success('Status atualizado');
  };

  const handlePostResponsibleChange = async (postId: string, roleKey: string) => {
    await supabase
      .from('content_posts')
      .update({ responsible_role_key: roleKey === '_none_' ? null : roleKey, updated_at: new Date().toISOString() })
      .eq('id', postId);
    await fetchPosts();
    toast.success('Cargo atualizado');
  };

  const handlePostsOrderChange = async (reorderedPosts: ContentPost[]) => {
    const updates = reorderedPosts.map((post, index) => 
      supabase.from('content_posts').update({ sort_order: index }).eq('id', post.id)
    );
    await Promise.all(updates);
    await fetchPosts();
  };

  const handleFileUploaded = async (file: { file_name: string; file_path: string; file_size: number; file_type: string }) => {
    const { data, error } = await supabase
      .from('batch_attachments')
      .insert([{ batch_id: id, ...file }])
      .select()
      .single();
    if (error) {
      console.error('Error saving attachment:', error);
      return;
    }
    setAttachments((prev) => [data, ...prev]);
  };

  const handleFileDeleted = async (fileId: string) => {
    await supabase.from('batch_attachments').delete().eq('id', fileId);
    setAttachments((prev) => prev.filter((a) => a.id !== fileId));
  };

  const isOverdue = () => {
    if (!batch.planning_due_date || batch.archived) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(batch.planning_due_date);
    return dueDate < today;
  };

  const VARIABLE_STAGES = ['production', 'changes'];
  const isVariableStage = VARIABLE_STAGES.includes(batch.status);
  const currentStageRoleKey = getRoleKeyForStage(batch.status);
  const currentStageRoleLabel = currentStageRoleKey ? ROLE_KEY_LABELS[currentStageRoleKey] : null;
  const canArchive = batch.status === 'scheduling';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/commercial/marketing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Marketing Interno</h1>
            {isOverdue() && (
              <Badge variant="attention" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                ATRASADO
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{formatMonthRef(batch.month_ref)}</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progress} className="h-2 w-32" />
            <span className="text-xs text-muted-foreground">{doneCount}/{totalPostsCount} concluídos ({progress}%)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus status={saveStatus} size="sm" onRetry={() => flush()} />
          <Select value={batch.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {BATCH_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canArchive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default">
                  <Archive className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalizar pacote?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O pacote será arquivado e não aparecerá mais na lista de produção.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveBatch}>Finalizar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <ConfirmDeleteDialog
            itemName={`Marketing - ${formatMonthRef(batch.month_ref)}`}
            warning="Todos os posts deste pacote serão excluídos."
            onConfirm={handleDeleteBatch}
          >
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmDeleteDialog>
        </div>
      </div>

      {/* Planning Due Date & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vencimento do Planejamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={planningDueDate}
              onChange={(e) => handlePlanningDueDateChange(e.target.value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas do Pacote</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Observações sobre este pacote..."
              rows={2}
            />
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivos do Pacote</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAttachments ? (
            <div className="flex items-center justify-center py-4">
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ) : (
            <FileUpload
              files={attachments}
              folder={`batches/${id}`}
              onFileUploaded={handleFileUploaded}
              onFileDeleted={handleFileDeleted}
            />
          )}
        </CardContent>
      </Card>

      {/* Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Posts ({totalPostsCount})</CardTitle>
              {postsWithPendingCount > 0 && (
                <Badge variant="attention" className="flex items-center gap-1">
                  <MessageSquareWarning className="h-3 w-3" />
                  {postsWithPendingCount} com alteração
                </Badge>
              )}
            </div>
            {isVariableStage && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Lock className="h-3 w-3" />
                Responsável automático por formato
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {postsWithPendingCount > 0 && (
              <Toggle
                pressed={showOnlyWithChanges}
                onPressedChange={setShowOnlyWithChanges}
                variant="outline"
                size="sm"
                className="data-[state=on]:bg-attention/20 data-[state=on]:text-attention data-[state=on]:border-attention"
              >
                <Filter className="h-4 w-4 mr-1" />
                Só alterações
              </Toggle>
            )}
            <Button size="sm" onClick={handleNewPost}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Post
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {batchPosts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {showOnlyWithChanges 
                ? 'Nenhum post com alteração pendente' 
                : 'Nenhum post cadastrado'}
            </p>
          ) : (
            <SortablePostList
              posts={batchPosts}
              batchId={batch.id}
              clientId={null}
              isVariableStage={isVariableStage}
              stageRoleLabel={currentStageRoleLabel}
              roles={roles}
              getRoleById={getRoleById}
              onPostStatusChange={handlePostStatusChange}
              onPostResponsibleChange={handlePostResponsibleChange}
              onDeletePost={handleDeletePost}
              onOrderChange={handlePostsOrderChange}
              hasPendingChanges={postHasPendingChanges}
              hasAnyChanges={postHasAnyChanges}
              getPendingCount={getPendingCount}
              getDoneCount={getDoneCount}
              basePath="/commercial/marketing"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
