import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ContentBatch, BatchStatus } from '@/types/contentProduction';
import { BatchBoardCard } from './BatchBoardCard';

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

interface BatchBoardMobileListProps {
  stages: BoardStage[];
  batchesByStage: Record<BatchStatus, BatchWithDetails[]>;
  onCardClick: (batch: BatchWithDetails) => void;
}

export function BatchBoardMobileList({
  stages,
  batchesByStage,
  onCardClick,
}: BatchBoardMobileListProps) {
  // Get stages with batches first, then empty ones
  const sortedStages = [...stages].sort((a, b) => {
    const aCount = batchesByStage[a.id]?.length || 0;
    const bCount = batchesByStage[b.id]?.length || 0;
    if (aCount > 0 && bCount === 0) return -1;
    if (aCount === 0 && bCount > 0) return 1;
    return a.position - b.position;
  });

  // Default open stages with content
  const defaultOpen = sortedStages
    .filter((s) => (batchesByStage[s.id]?.length || 0) > 0)
    .slice(0, 3)
    .map((s) => s.id);

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
      {sortedStages.map((stage) => {
        const batches = batchesByStage[stage.id] || [];
        return (
          <AccordionItem key={stage.id} value={stage.id} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="font-medium">{stage.name}</span>
                <Badge variant="muted" className="text-xs">
                  {batches.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-2">
              {batches.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Nenhum cliente nesta etapa
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.map((batch) => (
                    <BatchBoardCard
                      key={batch.id}
                      batch={batch}
                      onClick={() => onCardClick(batch)}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
