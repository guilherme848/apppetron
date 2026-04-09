import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Alert, HealthDistribution, ALERT_TYPE_LABELS } from '@/types/commandCenter';
import { cn } from '@/lib/utils';

interface HealthDistributionCardProps {
  data: HealthDistribution;
  onSegmentClick: (status: 'healthy' | 'attention' | 'critical') => void;
}

export function HealthDistributionCard({ data, onSegmentClick }: HealthDistributionCardProps) {
  const total = data.healthy + data.attention + data.critical;
  
  const getPercentage = (value: number) => total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribuição de Health</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bar visualization */}
        <div className="h-4 rounded-full overflow-hidden flex mb-4">
          <div 
            className="bg-success cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: `${getPercentage(data.healthy)}%` }}
            onClick={() => onSegmentClick('healthy')}
          />
          <div 
            className="bg-warning cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: `${getPercentage(data.attention)}%` }}
            onClick={() => onSegmentClick('attention')}
          />
          <div 
            className="bg-destructive cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: `${getPercentage(data.critical)}%` }}
            onClick={() => onSegmentClick('critical')}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <button 
            className="space-y-1 hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => onSegmentClick('healthy')}
          >
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm font-medium">Saudável</span>
            </div>
            <div className="text-2xl font-bold text-success">{data.healthy}</div>
            <div className="text-xs text-muted-foreground">{getPercentage(data.healthy)}%</div>
          </button>

          <button 
            className="space-y-1 hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => onSegmentClick('attention')}
          >
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm font-medium">Atenção</span>
            </div>
            <div className="text-2xl font-bold text-warning">{data.attention}</div>
            <div className="text-xs text-muted-foreground">{getPercentage(data.attention)}%</div>
          </button>

          <button 
            className="space-y-1 hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => onSegmentClick('critical')}
          >
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-sm font-medium">Crítico</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{data.critical}</div>
            <div className="text-xs text-muted-foreground">{getPercentage(data.critical)}%</div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertsCardProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
  onViewAll: () => void;
}

export function AlertsCard({ alerts, onAlertClick, onViewAll }: AlertsCardProps) {
  const groupedAlerts = alerts.reduce((acc, alert) => {
    if (!acc[alert.type]) {
      acc[alert.type] = [];
    }
    acc[alert.type].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Nenhum alerta no momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Alertas de Hoje
            <Badge variant="destructive">{alerts.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            Ver todos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(groupedAlerts).slice(0, 5).map(([type, typeAlerts]) => (
            <div 
              key={type}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onAlertClick(typeAlerts[0])}
            >
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={cn(
                    'rounded-full',
                    typeAlerts[0].severity === 'high' && 'border-destructive text-destructive',
                    typeAlerts[0].severity === 'medium' && 'border-warning text-warning'
                  )}
                >
                  {typeAlerts.length}
                </Badge>
                <div>
                  <p className={cn('font-medium text-sm', getSeverityColor(typeAlerts[0].severity))}>
                    {ALERT_TYPE_LABELS[type as Alert['type']]}
                  </p>
                  {typeAlerts.length === 1 && (
                    <p className="text-xs text-muted-foreground">{typeAlerts[0].clientName}</p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm">
                Resolver
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
