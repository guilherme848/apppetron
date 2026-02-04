import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LayoutGrid, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContentBoardBatches } from '@/hooks/useContentBoardBatches';
import { BatchBoardKanban } from '@/components/content-board/BatchBoardKanban';
import { BatchBoardMobileList } from '@/components/content-board/BatchBoardMobileList';
import { BatchDetailModal } from '@/components/content-board/BatchDetailModal';
import { BoardOverviewStats } from '@/components/content-board/BoardOverviewStats';
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    stages,
    batchesByStage,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/content/production')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Quadro Resumo
            </h1>
            <p className="text-sm text-muted-foreground">
              Status dos planejamentos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filters.monthRef || 'all'}
            onValueChange={(value) => setFilters({ ...filters, monthRef: value === 'all' ? null : value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <BoardOverviewStats stages={stages} batchesByStage={batchesByStage} />

      {/* Board */}
      {stages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
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
