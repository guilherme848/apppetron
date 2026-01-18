import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContentProduction } from '@/contexts/ContentProductionContext';
import { BatchCard } from '@/components/content/BatchCard';
import { BatchForm } from '@/components/content/BatchForm';
import { PostForm } from '@/components/content/PostForm';
import { BATCH_STATUS_OPTIONS, BatchStatus } from '@/types/contentProduction';

export default function ContentProduction() {
  const navigate = useNavigate();
  const { batches, posts, accounts, loading, addBatch, updateBatch, addPost } = useContentProduction();
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<BatchStatus>('planning');

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
    batches.forEach((batch) => {
      if (groups[batch.status]) {
        groups[batch.status].push(batch);
      }
    });
    return groups;
  }, [batches]);

  const getPostCount = (batchId: string) => posts.filter((p) => p.batch_id === batchId).length;
  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Sem cliente';
    return accounts.find((a) => a.id === clientId)?.name || 'Cliente desconhecido';
  };

  const handleStatusChange = async (batchId: string, status: BatchStatus) => {
    await updateBatch(batchId, { status });
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produção de Conteúdo</h1>
          <p className="text-muted-foreground">Gerencie pacotes mensais de conteúdo por cliente</p>
        </div>
        <Button onClick={() => setBatchFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pacote
        </Button>
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

      <BatchForm
        open={batchFormOpen}
        onOpenChange={setBatchFormOpen}
        accounts={accounts}
        onSubmit={addBatch}
      />

      <PostForm
        open={postFormOpen}
        onOpenChange={setPostFormOpen}
        batchId={selectedBatchId}
        onSubmit={handlePostSubmit}
      />
    </div>
  );
}
