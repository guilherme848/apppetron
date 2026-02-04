import { useState, useCallback } from 'react';
import { Loader2, LayoutGrid, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContentBoardBatches } from '@/hooks/useContentBoardBatches';
import { ContentBoardFilters } from '@/components/content-board/ContentBoardFilters';
import { BatchBoardKanban } from '@/components/content-board/BatchBoardKanban';
import { BatchBoardMobileList } from '@/components/content-board/BatchBoardMobileList';
import { BatchDetailModal } from '@/components/content-board/BatchDetailModal';
import { ContentBatch, BatchStatus } from '@/types/contentProduction';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function ContentBoardPage() {
  const isMobile = useIsMobile();
  const {
    stages,
    batchesByStage,
    services,
    teamMembers,
    loading,
    filters,
    setFilters,
    monthOptions,
    moveBatchToStage,
    refresh,
  } = useContentBoardBatches();

  const [selectedBatch, setSelectedBatch] = useState<BatchWithDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleCardClick = useCallback((batch: BatchWithDetails) => {
    setSelectedBatch(batch);
    setModalOpen(true);
  }, []);

  const handleMoveBatch = useCallback(async (batchId: string, newStatus: BatchStatus) => {
    await moveBatchToStage(batchId, newStatus);
  }, [moveBatchToStage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            Quadro Resumo
          </h1>
          <p className="text-muted-foreground">
            Visualize o status dos planejamentos dos clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ContentBoardFilters
        filters={filters}
        onFiltersChange={setFilters}
        teamMembers={teamMembers}
        services={services}
        monthOptions={monthOptions}
      />

      {/* Board */}
      {stages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma etapa configurada.
        </div>
      ) : isMobile ? (
        <BatchBoardMobileList
          stages={stages}
          batchesByStage={batchesByStage}
          onCardClick={handleCardClick}
        />
      ) : (
        <BatchBoardKanban
          stages={stages}
          batchesByStage={batchesByStage}
          onMoveBatch={handleMoveBatch}
          onCardClick={handleCardClick}
        />
      )}

      {/* Batch Detail Modal */}
      <BatchDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        batch={selectedBatch}
      />
    </div>
  );
}
