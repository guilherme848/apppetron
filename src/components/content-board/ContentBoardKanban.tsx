import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { ContentStage, ContentJobWithPendingCount } from '@/types/contentBoard';
import { ContentBoardColumn } from './ContentBoardColumn';
import { ContentBoardCard } from './ContentBoardCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ContentBoardKanbanProps {
  stages: ContentStage[];
  jobsByStage: Record<string, ContentJobWithPendingCount[]>;
  onMoveJob: (jobId: string, newStageId: string) => Promise<void>;
  onCardClick: (job: ContentJobWithPendingCount) => void;
}

export function ContentBoardKanban({
  stages,
  jobsByStage,
  onMoveJob,
  onCardClick,
}: ContentBoardKanbanProps) {
  const [activeJob, setActiveJob] = useState<ContentJobWithPendingCount | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const jobId = event.active.id as string;
    // Find the job in any stage
    for (const jobs of Object.values(jobsByStage)) {
      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        setActiveJob(job);
        break;
      }
    }
  }, [jobsByStage]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const newStageId = over.id as string;

    // Find current stage
    let currentStageId: string | null = null;
    for (const [stageId, jobs] of Object.entries(jobsByStage)) {
      if (jobs.some((j) => j.id === jobId)) {
        currentStageId = stageId;
        break;
      }
    }

    // Only move if dropped on a different stage
    if (currentStageId && currentStageId !== newStageId && stages.some((s) => s.id === newStageId)) {
      await onMoveJob(jobId, newStageId);
    }
  }, [jobsByStage, stages, onMoveJob]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-h-[calc(100vh-280px)]">
          {stages.map((stage) => (
            <ContentBoardColumn
              key={stage.id}
              stage={stage}
              jobs={jobsByStage[stage.id] || []}
              onCardClick={onCardClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeJob && (
          <div className="opacity-80 rotate-3 scale-105">
            <ContentBoardCard job={activeJob} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
