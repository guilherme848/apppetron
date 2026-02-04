import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { Calendar, AlertCircle } from 'lucide-react';
import { ContentStage, ContentJobWithPendingCount, STAGE_COLOR_MAP } from '@/types/contentBoard';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContentBoardMobileListProps {
  stages: ContentStage[];
  jobsByStage: Record<string, ContentJobWithPendingCount[]>;
  onCardClick: (job: ContentJobWithPendingCount) => void;
}

export function ContentBoardMobileList({
  stages,
  jobsByStage,
  onCardClick,
}: ContentBoardMobileListProps) {
  return (
    <Accordion type="multiple" defaultValue={stages.map((s) => s.id)} className="space-y-2">
      {stages.map((stage) => {
        const jobs = jobsByStage[stage.id] || [];
        const colorClasses = STAGE_COLOR_MAP[stage.color] || STAGE_COLOR_MAP.blue;

        return (
          <AccordionItem key={stage.id} value={stage.id} className="border-0">
            <AccordionTrigger
              className={cn(
                'px-4 py-3 rounded-lg border-2 hover:no-underline',
                colorClasses
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stage.name}</span>
                <Badge variant="muted" className="text-xs">
                  {jobs.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-0">
              {jobs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhum cliente nesta etapa
                </p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => {
                    const isOverdue =
                      job.due_date &&
                      isPast(new Date(job.due_date)) &&
                      !isToday(new Date(job.due_date));
                    const isDueToday = job.due_date && isToday(new Date(job.due_date));

                    return (
                      <Card
                        key={job.id}
                        className={cn(
                          'cursor-pointer border-l-4',
                          isOverdue && 'border-l-destructive',
                          isDueToday && 'border-l-orange-500',
                          !isOverdue && !isDueToday && 'border-l-primary'
                        )}
                        onClick={() => onCardClick(job)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {job.client?.name || 'Cliente'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {job.assignee && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MemberAvatar name={job.assignee.name} photoPath={null} size="sm" />
                                    <span>{job.assignee.name}</span>
                                  </div>
                                )}
                                {job.due_date && (
                                  <div
                                    className={cn(
                                      'flex items-center gap-1 text-xs',
                                      isOverdue && 'text-destructive',
                                      isDueToday && 'text-orange-600',
                                      !isOverdue && !isDueToday && 'text-muted-foreground'
                                    )}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {format(new Date(job.due_date), 'dd/MM', { locale: ptBR })}
                                    </span>
                                  </div>
                                )}
                                {job.pending_count > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>{job.pending_count}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="muted" className="text-xs shrink-0">
                              {job.month_ref}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
