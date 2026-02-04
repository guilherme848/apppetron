import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ContentBatch, BatchStatus, BATCH_STATUS_OPTIONS } from '@/types/contentProduction';
import { Clock, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { isPast, isToday } from 'date-fns';

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

interface BoardOverviewStatsProps {
  stages: BoardStage[];
  batchesByStage: Record<BatchStatus, BatchWithDetails[]>;
}

export function BoardOverviewStats({ stages, batchesByStage }: BoardOverviewStatsProps) {
  const stats = useMemo(() => {
    const allBatches = Object.values(batchesByStage).flat();
    
    const totalClients = allBatches.length;
    const totalPending = allBatches.reduce((sum, b) => sum + b.pending_count, 0);
    
    const overdue = allBatches.filter((b) => {
      const dueDate = b.planning_due_date || b.delivery_date;
      return dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
    }).length;
    
    const delivered = (batchesByStage['delivered']?.length || 0) + (batchesByStage['scheduling']?.length || 0);
    
    return { totalClients, totalPending, overdue, delivered };
  }, [batchesByStage]);

  const stageDistribution = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      count: batchesByStage[stage.id]?.length || 0,
    }));
  }, [stages, batchesByStage]);

  return (
    <div className="space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border-l-2 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-2 border-l-accent">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-foreground" />
              <div>
                <p className="text-xl font-bold">{stats.totalPending}</p>
                <p className="text-xs text-muted-foreground">Pendências</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-2 border-l-destructive">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-2 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Finalizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Distribution Bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {stageDistribution.map((stage) => {
          if (stage.count === 0) return null;
          const percentage = stats.totalClients > 0 
            ? (stage.count / stats.totalClients) * 100 
            : 0;
          return (
            <div
              key={stage.id}
              className="h-full transition-all"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: getStageColor(stage.color),
              }}
              title={`${stage.name}: ${stage.count}`}
            />
          );
        })}
      </div>

      {/* Stage Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {stageDistribution.filter((s) => s.count > 0).map((stage) => (
          <div key={stage.id} className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: getStageColor(stage.color) }}
            />
            <span>{stage.name}</span>
            <span className="font-medium text-foreground">{stage.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStageColor(color: string): string {
  const colors: Record<string, string> = {
    blue: 'hsl(217, 91%, 60%)',
    purple: 'hsl(262, 83%, 58%)',
    orange: 'hsl(25, 95%, 53%)',
    gray: 'hsl(220, 9%, 46%)',
    yellow: 'hsl(45, 93%, 47%)',
    green: 'hsl(142, 71%, 45%)',
    red: 'hsl(0, 84%, 60%)',
    teal: 'hsl(175, 77%, 40%)',
  };
  return colors[color] || colors.blue;
}
