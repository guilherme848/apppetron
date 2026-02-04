import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { GripVertical } from 'lucide-react';
import { ContentBatch } from '@/types/contentProduction';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

interface BatchBoardCardProps {
  batch: BatchWithDetails;
  onClick: () => void;
}

export function BatchBoardCard({ batch, onClick }: BatchBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: batch.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDate = batch.planning_due_date || batch.delivery_date;
  const isOverdue = dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  const isDueToday = dueDate && isToday(new Date(dueDate));

  // Format month reference nicely
  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <div
        className={cn(
          'cursor-pointer hover:bg-muted/50 transition-colors rounded-md border-l-2 bg-card p-2',
          isOverdue && 'border-l-destructive',
          isDueToday && 'border-l-accent',
          !isOverdue && !isDueToday && 'border-l-primary'
        )}
        onClick={onClick}
      >
        {/* Header row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-medium truncate flex-1">
            {batch.client?.name || 'Cliente'}
          </span>
          {batch.pending_count > 0 && (
            <span className="text-xs text-accent-foreground font-medium shrink-0">
              {batch.pending_count}
            </span>
          )}
        </div>

        {/* Info row */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {batch.socialMember && (
            <div className="flex items-center gap-1 truncate">
              <MemberAvatar name={batch.socialMember.name} photoPath={null} size="xs" />
              <span className="truncate max-w-[80px]">{batch.socialMember.name.split(' ')[0]}</span>
            </div>
          )}
          {dueDate && (
            <span
              className={cn(
                'shrink-0',
                isOverdue && 'text-destructive font-medium',
                isDueToday && 'text-accent-foreground font-medium'
              )}
            >
              {format(new Date(dueDate), "dd/MM", { locale: ptBR })}
            </span>
          )}
          <Badge variant="muted" className="text-[10px] px-1 py-0 shrink-0">
            {formatMonthRef(batch.month_ref)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
