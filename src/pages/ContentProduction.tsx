import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Archive, RotateCcw, LayoutGrid, Search, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContentProduction } from '@/contexts/ContentProductionContext';
import { BatchCard } from '@/components/content/BatchCard';
import { BatchForm } from '@/components/content/BatchForm';
import { PostForm } from '@/components/content/PostForm';
import { BATCH_STATUS_OPTIONS, BatchStatus, ContentBatch } from '@/types/contentProduction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useStageResponsibilities } from '@/hooks/useStageResponsibilities';
import { SuggestContentModal } from '@/components/content/SuggestContentModal';

export default function ContentProduction() {
  const navigate = useNavigate();
  const { batches, posts, accounts, loading, addBatch, updateBatchWithReset, addPost, unarchiveBatch } = useContentProduction();
  const { roles, getRoleById } = useJobRoles();
  const { responsibilities, getResponsibilityByStage } = useStageResponsibilities();
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<BatchStatus>('planning');
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [archivedBatches, setArchivedBatches] = useState<ContentBatch[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const getStageRoleName = (stageKey: string) => {
    const resp = getResponsibilityByStage(stageKey);
    if (!resp?.role_id) return null;
    return getRoleById(resp.role_id)?.name || null;
  };

  const getStageRoleId = (stageKey: string) => {
    const resp = getResponsibilityByStage(stageKey);
    return resp?.role_id || null;
  };

  const fetchArchivedBatches = async () => {
    setLoadingArchived(true);
    const { data, error } = await supabase
      .from('content_batches')
      .select('*')
      .eq('archived', true)
      .order('month_ref', { ascending: false });
    if (error) {
      console.error('Error fetching archived batches:', error);
    } else {
      setArchivedBatches((data || []).map((d: any) => ({
        id: d.id,
        client_id: d.client_id,
        month_ref: d.month_ref,
        status: d.status as BatchStatus,
        notes: d.notes,
        planning_due_date: d.planning_due_date,
        delivery_date: d.delivery_date,
        archived: d.archived ?? true,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })));
    }
    setLoadingArchived(false);
  };

  useEffect(() => {
    if (showArchived && archivedBatches.length === 0) {
      fetchArchivedBatches();
    }
  }, [showArchived]);

  const handleUnarchive = async (batchId: string) => {
    const result = await unarchiveBatch(batchId);
    if (result) {
      setArchivedBatches((prev) => prev.filter((b) => b.id !== batchId));
      toast.success('Pacote desarquivado com sucesso');
    } else {
      toast.error('Erro ao desarquivar pacote');
    }
  };

  const getPostCount = (batchId: string) => posts.filter((p) => p.batch_id === batchId).length;
  const getDoneCount = (batchId: string) => posts.filter((p) => p.batch_id === batchId && p.status === 'done').length;
  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Sem cliente';
    return accounts.find((a) => a.id === clientId)?.name || 'Cliente desconhecido';
  };

  // Track which client+month combos have duplicates
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    batches.forEach(b => {
      const key = `${b.client_id}||${b.month_ref}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const dupes = new Set<string>();
    counts.forEach((count, key) => { if (count > 1) dupes.add(key); });
    return dupes;
  }, [batches]);

  const isDuplicate = (batch: ContentBatch) => duplicateKeys.has(`${batch.client_id}||${batch.month_ref}`);

  const filteredBatches = useMemo(() => {
    if (!searchTerm.trim()) return batches;
    const term = searchTerm.toLowerCase();
    return batches.filter((batch) => {
      const clientName = getClientName(batch.client_id).toLowerCase();
      return clientName.includes(term);
    });
  }, [batches, searchTerm, accounts]);

  const groupedBatches = useMemo(() => {
    const groups: Record<BatchStatus, typeof batches> = {
      planning: [],
      production: [],
      review: [],
      pdf: [],
      to_deliver: [],
      delivered: [],
      changes: [],
      scheduling: [],
    };
    filteredBatches.forEach((batch) => {
      if (groups[batch.status]) {
        groups[batch.status].push(batch);
      }
    });
    return groups;
  }, [filteredBatches]);

  const isOverdue = (batch: ContentBatch) => {
    if (!batch.planning_due_date || batch.archived) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(batch.planning_due_date);
    return dueDate < today;
  };

  const handleStatusChange = async (batchId: string, status: BatchStatus) => {
    // Get the responsible for the new stage
    const stageRoleId = getStageRoleId(status);
    await updateBatchWithReset(batchId, { status }, stageRoleId);
    
    const isVariable = VARIABLE_STAGES.includes(status);
    if (isVariable) {
      // Check for posts without assignee after reassignment
      const batchPosts = posts.filter(p => p.batch_id === batchId);
      const postsWithoutAssignee = batchPosts.filter(p => !p.assignee_id).length;
      
      if (postsWithoutAssignee > 0) {
        toast.info('Responsáveis atribuídos automaticamente pelo formato', {
          description: `${postsWithoutAssignee} post(s) sem responsável. Configure o Time da Conta do cliente.`,
        });
      } else {
        toast.success('Responsáveis atribuídos automaticamente pelo formato', {
          description: 'Posts de imagem → Designer | Posts de vídeo → Videomaker',
        });
      }
    } else {
      toast.success('Status atualizado');
    }
  };

  const handleAddPost = (batchId: string) => {
    setSelectedBatchId(batchId);
    setPostFormOpen(true);
  };

  const handlePostSubmit = async (data: any) => {
    return addPost({ ...data, batch_id: selectedBatchId });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const VARIABLE_STAGES = ['production', 'changes'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produção de Conteúdo</h1>
          <p className="text-muted-foreground">Gerencie pacotes mensais de conteúdo por cliente</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/content/production/board')}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Quadro Resumo
            </Button>
            <Button
              variant="outline"
              onClick={() => setSuggestOpen(true)}
              className="border-[hsl(var(--accent-primary,24_95%_53%)/0.4)] text-[hsl(var(--accent-primary,24_95%_53%))] hover:bg-[hsl(var(--accent-primary,24_95%_53%)/0.08)]"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Sugerir Conteúdos
            </Button>
            <Button onClick={() => setBatchFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Planejamento
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-3 w-3 mr-1" />
            {showArchived ? 'Ocultar arquivados' : `Ver arquivados${archivedBatches.length > 0 ? ` (${archivedBatches.length})` : ''}`}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BatchStatus)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {BATCH_STATUS_OPTIONS.map((status) => (
            <TabsTrigger key={status.value} value={status.value} className="text-xs px-3">
              {status.label}
              {groupedBatches[status.value].length > 0 && (
                <span className="ml-1 text-muted-foreground">({groupedBatches[status.value].length})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {BATCH_STATUS_OPTIONS.map((status) => (
          <TabsContent key={status.value} value={status.value} className="mt-4">
            {groupedBatches[status.value].length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum pacote em "{status.label}"
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupedBatches[status.value].map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    clientName={getClientName(batch.client_id)}
                    postCount={getPostCount(batch.id)}
                    doneCount={getDoneCount(batch.id)}
                    stageRoleName={getStageRoleName(batch.status)}
                    isVariableStage={VARIABLE_STAGES.includes(batch.status)}
                    isOverdue={isOverdue(batch)}
                    isDuplicate={isDuplicate(batch)}
                    onView={(id) => navigate(`/content/production/${id}`)}
                    onStatusChange={handleStatusChange}
                    onAddPost={handleAddPost}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {showArchived && (
        <div className="mt-6 border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Pacotes Arquivados
          </h2>
          {loadingArchived ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : archivedBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pacote arquivado
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {archivedBatches.map((batch) => (
                <Card key={batch.id} className="relative opacity-75 hover:opacity-100 transition-opacity">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {getClientName(batch.client_id)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{batch.month_ref}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {getPostCount(batch.id)} posts
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnarchive(batch.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Desarquivar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <BatchForm
        open={batchFormOpen}
        onOpenChange={setBatchFormOpen}
        accounts={accounts}
        onSubmit={addBatch}
        existingBatches={batches.map(b => ({ client_id: b.client_id, month_ref: b.month_ref }))}
      />

      <PostForm
        open={postFormOpen}
        onOpenChange={setPostFormOpen}
        batchId={selectedBatchId}
        onSubmit={handlePostSubmit}
      />

      <SuggestContentModal
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        accounts={accounts}
        onContentAdded={() => window.location.reload()}
      />
    </div>
  );
}
