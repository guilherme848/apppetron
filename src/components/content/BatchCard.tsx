import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, Plus, User, AlertTriangle } from 'lucide-react';
import { ContentBatch, BATCH_STATUS_OPTIONS, BatchStatus } from '@/types/contentProduction';
import { getBatchStatusVariant } from '@/lib/badgeMaps';

interface BatchCardProps {
  batch: ContentBatch;
  clientName: string;
  postCount: number;
  doneCount: number;
  stageRoleName: string | null;
  isVariableStage: boolean;
  isOverdue: boolean;
  isDuplicate?: boolean;
  onView: (id: string) => void;
  onStatusChange: (id: string, status: BatchStatus) => void;
  onAddPost: (batchId: string) => void;
}

export function BatchCard({ 
  batch, 
  clientName, 
  postCount, 
  doneCount,
  stageRoleName, 
  isVariableStage, 
  isOverdue,
  isDuplicate = false,
  onView, 
  onStatusChange, 
  onAddPost 
}: BatchCardProps) {
  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const progress = postCount > 0 ? Math.round((doneCount / postCount) * 100) : 0;

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-destructive/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{clientName}</CardTitle>
             {isOverdue && (
                <Badge variant="attention" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  ATRASADO
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-muted-foreground">{formatMonthRef(batch.month_ref)}</p>
              {isDuplicate && (
                <Badge variant="attention" className="text-[10px] px-1.5 py-0">
                  2+ pacotes
                </Badge>
              )}
            </div>
          </div>
          <Badge variant="info">{doneCount}/{postCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{progress}% concluído</p>
        </div>

        <Select
          value={batch.status}
          onValueChange={(value) => onStatusChange(batch.id, value as BatchStatus)}
        >
          <SelectTrigger className="w-full bg-background">
            <Badge variant={getBatchStatusVariant(batch.status)} className="text-xs w-full justify-center">
              {BATCH_STATUS_OPTIONS.find(o => o.value === batch.status)?.label || batch.status}
            </Badge>
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {BATCH_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <Badge variant={getBatchStatusVariant(option.value)} className="text-xs">
                  {option.label}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {isVariableStage ? (
            <span>Por item (design/vídeo)</span>
          ) : stageRoleName ? (
            <span>{stageRoleName}</span>
          ) : (
            <span className="italic">Sem responsável</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(batch.id)}>
            <Eye className="h-4 w-4 mr-1" />
            Abrir
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddPost(batch.id)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
