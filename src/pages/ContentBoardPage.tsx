import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, LayoutGrid, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContentBoardData } from '@/hooks/useContentBoardData';
import { ContentBoardFilters } from '@/components/content-board/ContentBoardFilters';
import { ContentBoardKanban } from '@/components/content-board/ContentBoardKanban';
import { ContentBoardMobileList } from '@/components/content-board/ContentBoardMobileList';
import { ContentJobModal } from '@/components/content-board/ContentJobModal';
import { AddJobDialog } from '@/components/content-board/AddJobDialog';
import { ContentJobWithPendingCount } from '@/types/contentBoard';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ContentBoardPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    stages,
    jobs,
    jobsByStage,
    services,
    teamMembers,
    loading,
    filters,
    setFilters,
    monthOptions,
    moveJobToStage,
    createJob,
    updateJob,
    deleteJob,
    fetchJobHistory,
    refresh,
  } = useContentBoardData();

  const [selectedJob, setSelectedJob] = useState<ContentJobWithPendingCount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleCardClick = useCallback((job: ContentJobWithPendingCount) => {
    setSelectedJob(job);
    setModalOpen(true);
  }, []);

  const handleMoveJob = useCallback(async (jobId: string, newStageId: string) => {
    await moveJobToStage(jobId, newStageId);
  }, [moveJobToStage]);

  const handleUpdateJob = useCallback(async (jobId: string, updates: Partial<ContentJobWithPendingCount>) => {
    await updateJob(jobId, updates);
    // Update selected job state
    setSelectedJob((prev) =>
      prev && prev.id === jobId ? { ...prev, ...updates } : prev
    );
  }, [updateJob]);

  const handleDeleteJob = useCallback(async (jobId: string) => {
    await deleteJob(jobId);
    setModalOpen(false);
    setSelectedJob(null);
  }, [deleteJob]);

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
            Visualize e gerencie o status de produção dos clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cliente
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
          Nenhuma etapa configurada. Configure as etapas em Configurações.
        </div>
      ) : isMobile ? (
        <ContentBoardMobileList
          stages={stages}
          jobsByStage={jobsByStage}
          onCardClick={handleCardClick}
        />
      ) : (
        <ContentBoardKanban
          stages={stages}
          jobsByStage={jobsByStage}
          onMoveJob={handleMoveJob}
          onCardClick={handleCardClick}
        />
      )}

      {/* Job Detail Modal */}
      <ContentJobModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        job={selectedJob}
        stages={stages}
        teamMembers={teamMembers}
        onUpdate={handleUpdateJob}
        onDelete={handleDeleteJob}
        fetchHistory={fetchJobHistory}
      />

      {/* Add Job Dialog */}
      <AddJobDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        stages={stages}
        monthOptions={monthOptions}
        onSubmit={createJob}
      />
    </div>
  );
}
