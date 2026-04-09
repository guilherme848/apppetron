import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Star, 
  TrendingDown, 
  DollarSign,
  Timer,
  XCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { KPIData, MetricMode } from '@/types/commandCenter';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  data: KPIData;
  metricMode: MetricMode;
  onCardClick: (type: string) => void;
}

function DeltaBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return null;
  
  const isPositive = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  
  return (
    <Badge 
      variant={isPositive ? 'default' : 'destructive'} 
      className={cn(
        'text-xs font-normal',
        isPositive && 'bg-success/10 text-success hover:bg-success/20'
      )}
    >
      <Icon className="h-3 w-3 mr-0.5" />
      {Math.abs(value)}%
    </Badge>
  );
}

export function KPICards({ data, metricMode, onCardClick }: KPICardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Active Clients */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('active')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{data.activeClients}</div>
            <DeltaBadge value={data.activeClientsDelta} />
          </div>
        </CardContent>
      </Card>

      {/* Onboarding */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('onboarding')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Onboarding</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.onboardingClients}</div>
          <p className="text-xs text-muted-foreground">
            {data.onboardingOnTime} no prazo ({data.onboardingClients > 0 ? Math.round((data.onboardingOnTime / data.onboardingClients) * 100) : 0}%)
          </p>
        </CardContent>
      </Card>

      {/* At Risk */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('at_risk')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Risco</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-destructive">{data.atRiskClients}</div>
            <DeltaBadge value={data.atRiskDelta} invert />
          </div>
        </CardContent>
      </Card>

      {/* NPS */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('nps')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">NPS Médio</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{data.avgNps.toFixed(1)}</div>
            <DeltaBadge value={data.npsDelta} />
          </div>
        </CardContent>
      </Card>

      {/* Churn - Clients or MRR */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('churn')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {metricMode === 'mrr' ? 'MRR Perdido' : 'Churn (Clientes)'}
          </CardTitle>
          {metricMode === 'mrr' ? (
            <DollarSign className="h-4 w-4 text-destructive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-destructive">
              {metricMode === 'mrr' ? formatCurrency(data.churnMrr) : data.churnCount}
            </div>
            <DeltaBadge value={data.churnDelta} invert />
          </div>
        </CardContent>
      </Card>

      {/* MRR Lost (only if clients mode) */}
      {metricMode === 'clients' && data.churnMrr > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('churn_mrr')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Perdido</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(data.churnMrr)}</div>
          </CardContent>
        </Card>
      )}

      {/* Avg Onboarding Time */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('onboarding_time')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo Médio Onboarding</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avgOnboardingDays} dias</div>
        </CardContent>
      </Card>

      {/* Avg Time to Churn */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick('time_to_churn')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo até Churn</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avgTimeToChurn} dias</div>
        </CardContent>
      </Card>
    </div>
  );
}
