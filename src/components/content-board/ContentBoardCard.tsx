import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { Calendar, AlertCircle, GripVertical } from 'lucide-react';
import { ContentJobWithPendingCount, ContentJobPriority } from '@/types/contentBoard';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContentBoardCardProps {
  job: ContentJobWithPendingCount;
  onClick: () => void;
}

const priorityVariantMap: Record<ContentJobPriority, 'neutral' | 'info' | 'attention' | 'strong' | 'muted'> = {
  low: 'muted',
  medium: 'neutral',
  high: 'attention',
  urgent: 'strong',
};

const priorityLabelMap: Record<ContentJobPriority, string> = {
  low: 'Baixa',
  medium: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export function ContentBoardCard({ job, onClick }: ContentBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = job.due_date && isPast(new Date(job.due_date)) && !isToday(new Date(job.due_date));
  const isDueToday = job.due_date && isToday(new Date(job.due_date));

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
                {job.client?.name || 'Cliente não encontrado'}
              </CardTitle>
            </div>
            {job.priority !== 'medium' && (
              <Badge variant={priorityVariantMap[job.priority]} className="text-xs shrink-0">
                {priorityLabelMap[job.priority]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 space-y-2">
          {/* Assignee */}
          {job.assignee && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MemberAvatar name={job.assignee.name} photoPath={null} size="sm" />
              <span className="truncate">{job.assignee.name}</span>
            </div>
          )}

          {/* Due date */}
          {job.due_date && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs',
                isOverdue && 'text-destructive font-medium',
                isDueToday && 'text-orange-600 font-medium',
                !isOverdue && !isDueToday && 'text-muted-foreground'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(job.due_date), "dd 'de' MMM", { locale: ptBR })}
                {isOverdue && ' (Atrasado)'}
                {isDueToday && ' (Hoje)'}
              </span>
            </div>
          )}

          {/* Status label */}
          {job.status_label && (
            <Badge variant="info" className="text-xs">
              {job.status_label}
            </Badge>
          )}

          {/* Pending count */}
          {job.pending_count > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 text-orange-500" />
              <span>{job.pending_count} pendência{job.pending_count > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Month ref badge */}
          <div className="pt-1">
            <Badge variant="muted" className="text-xs">
              {job.month_ref}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
