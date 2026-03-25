import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, AlertTriangle, Archive, AlertCircle, Trash2, Lock, MessageSquareWarning, Filter } from 'lucide-react';
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
import { useContentProduction } from '@/contexts/ContentProductionContext';
import { FileUpload } from '@/components/content/FileUpload';
import { Progress } from '@/components/ui/progress';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useStageResponsibilities } from '@/hooks/useStageResponsibilities';
import { SortablePostList } from '@/components/content/SortablePostList';
import { SaveStatus } from '@/components/ui/save-status';
import { useAutoSave, useAutoSaveNavigation } from '@/hooks/useAutoSave';
import { BATCH_STATUS_OPTIONS, BatchStatus, BatchAttachment, ContentPost } from '@/types/contentProduction';
import { isFormatAssignmentStage } from '@/lib/formatRoleMapping';
import { ROLE_KEY_LABELS } from '@/lib/accountTeam';
import { useBatchChangeRequests } from '@/hooks/useBatchChangeRequests';
import { Toggle } from '@/components/ui/toggle';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    batches, posts, accounts, loading, 
    updateBatch, updateBatchWithReset, deleteBatch, archiveBatch, addPost, updatePost, deletePost, fetchPosts, updatePostsOrder 
  } = useContentProduction();
  const { roles, getRoleById } = useJobRoles();
  const { responsibilities, getRoleKeyForStage, getRoleForStage } = useStageResponsibilities();
  
  // Change requests data for visual indicators
  const { 
    hasPendingChanges: postHasPendingChanges, 
    hasAnyChanges: postHasAnyChanges,
    getPendingCount, 
    getDoneCount,
    postsWithPendingCount,
    refetch: refetchChangeRequests,
  } = useBatchChangeRequests(id);

  const initialLoadComplete = useRef(false);
  const [notes, setNotes] = useState('');
  const [planningDueDate, setPlanningDueDate] = useState('');
  const [attachments, setAttachments] = useState<BatchAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [showOnlyWithChanges, setShowOnlyWithChanges] = useState(false);

  const batch = batches.find((b) => b.id === id);
  
  // Sort posts by sort_order, then by created_at
  const batchPosts = useMemo(() => {
    let filtered = posts.filter((p) => p.batch_id === id);
    
    // Filter to show only posts with pending changes if toggle is on
    if (showOnlyWithChanges) {
      filtered = filtered.filter((p) => postHasPendingChanges(p.id));
    }
    
    return filtered.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [posts, id, showOnlyWithChanges, postHasPendingChanges]);

  // Total posts count (without filter)
  const totalPostsCount = useMemo(() => {
    return posts.filter((p) => p.batch_id === id).length;
  }, [posts, id]);

  // AutoSave setup
  const handleSaveBatch = useCallback(async (data: Record<string, any>) => {
    if (!batch) return;
    await updateBatch(batch.id, data);
  }, [batch, updateBatch]);

  const { status: saveStatus, saveNow, queueChange, flush, hasPendingChanges } = useAutoSave({
    onSave: handleSaveBatch,
    showToasts: false,
  });

  // Flush on navigation
  useAutoSaveNavigation(flush, hasPendingChanges);

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
    if (id) {
      fetchPosts(id);
      fetchAttachments();
    }
  }, [id, fetchPosts, fetchAttachments]);

  useEffect(() => {
    if (batch) {
      setNotes(batch.notes || '');
      setPlanningDueDate(batch.planning_due_date || '');
      setTimeout(() => {
        initialLoadComplete.current = true;
      }, 100);
    }
  }, [batch]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Pacote não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/content/production')}>
          Voltar
        </Button>
      </div>
    );
  }

  const clientName = accounts.find((a) => a.id === batch.client_id)?.name || 'Cliente desconhecido';
  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const handleStatusChange = async (status: BatchStatus) => {
    // The batch status change trigger will automatically:
    // 1. For production/changes: set role by format (designer/videomaker)
    // 2. For other stages: set role by pipeline default
    // 3. Always: assign user from Account Team
    await updateBatchWithReset(batch.id, { status }, null);
    
    const VARIABLE_STAGES = ['production', 'changes'];
    const isVariable = VARIABLE_STAGES.includes(status);
    
    if (isVariable) {
      toast.success('Etapa atualizada: responsáveis por formato', {
        description: 'Posts de imagem → Designer | Posts de vídeo → Videomaker',
      });
    } else {
      const stageRoleKey = getRoleKeyForStage(status);
      const roleLabel = stageRoleKey ? ROLE_KEY_LABELS[stageRoleKey] : 'padrão da etapa';
      toast.success(`Etapa atualizada: responsável automático (${roleLabel})`);
    }
  };

  // Calculate progress
  const doneCount = batchPosts.filter(p => p.status === 'done').length;
  const totalCount = batchPosts.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Autosave handlers - commit-based (queue on change, flush on blur)
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
    await deleteBatch(batch.id);
    toast.success('Pacote excluído');
    navigate('/content/production');
  };

  const handleArchiveBatch = async () => {
    await archiveBatch(batch.id);
    toast.success('Pacote finalizado e arquivado');
    navigate('/content/production');
  };

  const handleNewPost = async () => {
    // The trigger will auto-assign based on current batch stage
    const newPost = await addPost({ 
      batch_id: batch.id, 
      title: '',
    } as any);
    if (newPost) {
      navigate(`/content/production/${batch.id}/posts/${newPost.id}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    toast.success('Post excluído');
  };

  const handlePostStatusChange = async (postId: string, status: string) => {
    await updatePost(postId, { status: status as any });
    toast.success('Status atualizado');
  };

  const handlePostResponsibleChange = async (postId: string, roleKey: string) => {
    // IMPORTANT: auto-assign is driven by responsible_role_key (backend trigger)
    await updatePost(postId, { responsible_role_key: roleKey === '_none_' ? null : (roleKey as any) } as any);
    toast.success('Cargo atualizado');
  };

  // Stages where responsible is variable (editable per post)
  const VARIABLE_STAGES = ['production', 'changes'];
  const isVariableStage = VARIABLE_STAGES.includes(batch.status);

  // Get current stage role key for display
  const currentStageRoleKey = getRoleKeyForStage(batch.status);
  const currentStageRoleLabel = currentStageRoleKey ? ROLE_KEY_LABELS[currentStageRoleKey] : null;

  // Check if any post is missing responsible or assignee
  const postsWithoutResponsible = batchPosts.filter(p => !p.responsible_role_id).length;
  const postsWithoutAssignee = batchPosts.filter(p => !p.assignee_id).length;

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


  const canArchive = batch.status === 'scheduling';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/content/production')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{clientName}</h1>
            {isOverdue() && (
              <Badge variant="attention" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                ATRASADO
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{formatMonthRef(batch.month_ref)}</p>
          {/* Progress indicator in header */}
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progress} className="h-2 w-32" />
            <span className="text-xs text-muted-foreground">{doneCount}/{totalCount} concluídos ({progress}%)</span>
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
                    O pacote será arquivado e não aparecerá mais na lista de produção. Esta ação pode ser revertida pelo banco de dados.
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
            itemName={`${clientName} - ${formatMonthRef(batch.month_ref)}`}
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
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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

      {/* Warning for missing assignee only */}
      {batchPosts.length > 0 && postsWithoutAssignee > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-attention/10 border border-attention/30 text-foreground">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-attention" />
          <div className="text-sm">
            <p className="flex items-center gap-1">
              {postsWithoutAssignee === batchPosts.length 
                ? 'Nenhum post possui responsável atribuído.'
                : `${postsWithoutAssignee} post(s) sem responsável atribuído.`}
              <a href={`/crm/${batch.client_id}`} className="underline text-primary hover:text-primary/80">
                Definir no Time da Conta
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Posts do Mês ({totalPostsCount})</CardTitle>
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
                Responsável automático por formato: Post/Carrossel/Story → Designer | Vídeo/Reels/Shorts → Videomaker
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
              clientId={batch.client_id}
              isVariableStage={isVariableStage}
              stageRoleLabel={currentStageRoleLabel}
              roles={roles}
              getRoleById={getRoleById}
              onPostStatusChange={handlePostStatusChange}
              onPostResponsibleChange={handlePostResponsibleChange}
              onDeletePost={handleDeletePost}
              onOrderChange={updatePostsOrder}
              hasPendingChanges={postHasPendingChanges}
              hasAnyChanges={postHasAnyChanges}
              getPendingCount={getPendingCount}
              getDoneCount={getDoneCount}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
