import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Playbook, PLAYBOOK_TYPE_LABELS, PlaybookType } from '@/types/commandCenter';
import { ClipboardList, ExternalLink, Clock } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface PlaybooksCardProps {
  playbooks: Playbook[];
  onPlaybookClick: (playbook: Playbook) => void;
  onCreatePlaybook: () => void;
}

export function PlaybooksCard({ playbooks, onPlaybookClick, onCreatePlaybook }: PlaybooksCardProps) {
  const groupedPlaybooks = playbooks.reduce((acc, pb) => {
    if (!acc[pb.type]) {
      acc[pb.type] = [];
    }
    acc[pb.type].push(pb);
    return acc;
  }, {} as Record<string, Playbook[]>);

  if (playbooks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Playbooks em Andamento
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onCreatePlaybook}>
              Criar Playbook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum playbook ativo no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Playbooks em Andamento
            <Badge variant="secondary">{playbooks.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onCreatePlaybook}>
            Criar Playbook
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedPlaybooks).map(([type, pbs]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{PLAYBOOK_TYPE_LABELS[type as PlaybookType] || type}</Badge>
                <span className="text-sm text-muted-foreground">({pbs.length})</span>
              </div>
              
              <div className="space-y-2">
                {pbs.slice(0, 3).map((pb) => {
                  const isOverdue = pb.dueAt && isPast(parseISO(pb.dueAt));
                  
                  return (
                    <div 
                      key={pb.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onPlaybookClick(pb)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{pb.clientName}</span>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {pb.responsibleName && (
                            <span>Resp: {pb.responsibleName}</span>
                          )}
                          {pb.dueAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(pb.dueAt), 'dd/MM', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{pb.tasksDone}/{pb.tasksTotal}</span>
                            <span>{pb.progress}%</span>
                          </div>
                          <Progress value={pb.progress} className="h-1.5" />
                        </div>
                        
                        <Link to={`/cs/client/${pb.clientId}`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
                
                {pbs.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full">
                    Ver mais {pbs.length - 3}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
