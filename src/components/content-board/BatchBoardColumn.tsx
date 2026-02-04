import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BatchBoardCard } from './BatchBoardCard';
import { ContentBatch, BatchStatus } from '@/types/contentProduction';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface BatchBoardColumnProps {
  stage: BoardStage;
  batches: BatchWithDetails[];
  onCardClick: (batch: BatchWithDetails) => void;
}

const STAGE_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  purple: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  orange: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
  gray: 'bg-gray-50 border-gray-200 dark:bg-gray-950/30 dark:border-gray-700',
  yellow: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
  green: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  red: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
  teal: 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800',
};

export function BatchBoardColumn({ stage, batches, onCardClick }: BatchBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const colorClasses = STAGE_COLOR_MAP[stage.color] || STAGE_COLOR_MAP.blue;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border min-w-[200px] max-w-[240px] h-full',
        colorClasses,
        isOver && 'ring-2 ring-primary ring-offset-1'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-inherit">
        <h3 className="font-medium text-xs truncate">{stage.name}</h3>
        <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded-full">
          {batches.length}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-1.5">
        <SortableContext items={batches.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5 min-h-[60px]">
            {batches.length === 0 ? (
              <div className="text-center text-[10px] text-muted-foreground py-4">
                Vazio
              </div>
            ) : (
              batches.map((batch) => (
                <BatchBoardCard
                  key={batch.id}
                  batch={batch}
                  onClick={() => onCardClick(batch)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
