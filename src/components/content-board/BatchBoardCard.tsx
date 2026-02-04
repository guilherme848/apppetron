import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { Calendar, AlertCircle, GripVertical, FileText } from 'lucide-react';
import { ContentBatch, BatchStatus } from '@/types/contentProduction';
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
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-shadow border-l-4',
          isOverdue && 'border-l-destructive',
          isDueToday && 'border-l-orange-500',
          !isOverdue && !isDueToday && 'border-l-primary'
        )}
        onClick={onClick}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium truncate">
                {batch.client?.name || 'Cliente não encontrado'}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 space-y-2">
          {/* Social Media Responsible */}
          {batch.socialMember && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MemberAvatar name={batch.socialMember.name} photoPath={null} size="sm" />
              <span className="truncate">{batch.socialMember.name}</span>
            </div>
          )}

          {/* Due date */}
          {dueDate && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs',
                isOverdue && 'text-destructive font-medium',
                isDueToday && 'text-accent-foreground font-medium',
                !isOverdue && !isDueToday && 'text-muted-foreground'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(dueDate), "dd 'de' MMM", { locale: ptBR })}
                {isOverdue && ' (Atrasado)'}
                {isDueToday && ' (Hoje)'}
              </span>
            </div>
          )}

          {/* Pending count */}
          {batch.pending_count > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-accent-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>{batch.pending_count} pendência{batch.pending_count > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Notes indicator */}
          {batch.notes && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="truncate">{batch.notes}</span>
            </div>
          )}

          {/* Month ref badge */}
          <div className="pt-1">
            <Badge variant="muted" className="text-xs">
              {formatMonthRef(batch.month_ref)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
