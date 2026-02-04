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
import { ContentBatch, BatchStatus } from '@/types/contentProduction';
import { BatchBoardColumn } from './BatchBoardColumn';
import { BatchBoardCard } from './BatchBoardCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

interface BoardStage {
  id: BatchStatus;
  name: string;
  color: string;
  position: number;
}

interface BatchBoardKanbanProps {
  stages: BoardStage[];
  batchesByStage: Record<BatchStatus, BatchWithDetails[]>;
  onMoveBatch: (batchId: string, newStatus: BatchStatus) => Promise<void>;
  onCardClick: (batch: BatchWithDetails) => void;
}

export function BatchBoardKanban({
  stages,
  batchesByStage,
  onMoveBatch,
  onCardClick,
}: BatchBoardKanbanProps) {
  const [activeBatch, setActiveBatch] = useState<BatchWithDetails | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const batchId = event.active.id as string;
    // Find the batch in any stage
    for (const batches of Object.values(batchesByStage)) {
      const batch = batches.find((b) => b.id === batchId);
      if (batch) {
        setActiveBatch(batch);
        break;
      }
    }
  }, [batchesByStage]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBatch(null);

    if (!over) return;

    const batchId = active.id as string;
    const newStatus = over.id as BatchStatus;

    // Find current stage
    let currentStatus: BatchStatus | null = null;
    for (const [status, batches] of Object.entries(batchesByStage)) {
      if (batches.some((b) => b.id === batchId)) {
        currentStatus = status as BatchStatus;
        break;
      }
    }

    // Only move if dropped on a different stage
    if (currentStatus && currentStatus !== newStatus && stages.some((s) => s.id === newStatus)) {
      await onMoveBatch(batchId, newStatus);
    }
  }, [batchesByStage, stages, onMoveBatch]);

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
            <BatchBoardColumn
              key={stage.id}
              stage={stage}
              batches={batchesByStage[stage.id] || []}
              onCardClick={onCardClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeBatch && (
          <div className="opacity-80 rotate-3 scale-105">
            <BatchBoardCard batch={activeBatch} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
