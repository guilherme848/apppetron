import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ContentStage, ContentJobWithPendingCount, STAGE_COLOR_MAP } from '@/types/contentBoard';
import { ContentBoardCard } from './ContentBoardCard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentBoardColumnProps {
  stage: ContentStage;
  jobs: ContentJobWithPendingCount[];
  onCardClick: (job: ContentJobWithPendingCount) => void;
}

export function ContentBoardColumn({ stage, jobs, onCardClick }: ContentBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const colorClasses = STAGE_COLOR_MAP[stage.color] || STAGE_COLOR_MAP.blue;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border-2 min-w-[280px] max-w-[320px] h-full',
        colorClasses,
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-inherit">
        <h3 className="font-semibold text-sm">{stage.name}</h3>
        <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px]">
            {jobs.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">
                Nenhum cliente
              </div>
            ) : (
              jobs.map((job) => (
                <ContentBoardCard
                  key={job.id}
                  job={job}
                  onClick={() => onCardClick(job)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
