import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyTask } from '@/hooks/useMyTasks';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskQueueProps {
  tasks: MyTask[];
  title: string;
  emptyMessage?: string;
  maxItems?: number;
  showViewAll?: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  content: 'Conteúdo',
  traffic: 'Tráfego',
  cs: 'CS',
};

const SOURCE_LABELS: Record<string, string> = {
  content_posts: 'Post',
  content_extra_requests: 'Solicitação',
  traffic_tasks: 'Tarefa',
  traffic_creative_requests: 'Criativo',
  cs_client_onboarding_tasks: 'Onboarding',
  cs_meeting_actions: 'Ação Reunião',
  cs_risk_action_items: 'Ação Risco',
};

function getTaskRoute(task: MyTask): string {
  switch (task.source) {
    case 'content_posts':
      return `/content/posts/${task.id}`;
    case 'content_extra_requests':
      return `/content/extras/${task.id}`;
    case 'traffic_creative_requests':
      return `/traffic/creatives/${task.id}`;
    case 'traffic_tasks':
      return `/traffic/tasks`;
    case 'cs_client_onboarding_tasks':
      return `/cs/onboarding`;
    case 'cs_meeting_actions':
      return `/cs/meetings`;
    case 'cs_risk_action_items':
      return `/cs/risk`;
    default:
      return '/me';
  }
}

export function TaskQueue({ 
  tasks, 
  title, 
  emptyMessage = 'Nenhuma tarefa encontrada.',
  maxItems = 5,
  showViewAll = false,
}: TaskQueueProps) {
  const navigate = useNavigate();
  const displayTasks = tasks.slice(0, maxItems);
  const hasMore = tasks.length > maxItems;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="font-medium">
              {tasks.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {displayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-2">
            {displayTasks.map(task => (
              <div
                key={`${task.source}-${task.id}`}
                onClick={() => navigate(getTaskRoute(task))}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                  "hover:bg-accent",
                  task.isOverdue && "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {SOURCE_LABELS[task.source] || task.source}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className="text-xs shrink-0 bg-muted"
                    >
                      {MODULE_LABELS[task.module]}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.clientName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {task.clientName}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {task.dueDate && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      task.isOverdue ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {task.isOverdue ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      <span>
                        {format(parseISO(task.dueDate), "dd/MM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
            
            {hasMore && showViewAll && (
              <Button 
                variant="ghost" 
                className="w-full mt-2 text-sm"
                onClick={() => {/* Could navigate to full list */}}
              >
                Ver todas ({tasks.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
