import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrafficAnalytics } from '@/hooks/useTrafficAnalytics';
import { useCrm } from '@/contexts/CrmContext';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '—';
  
  switch (unit) {
    case 'BRL':
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    case 'PERCENT':
      return `${value.toFixed(2)}%`;
    default:
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}

export default function TrafficAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const { accounts } = useCrm();
  const { adAccounts } = useMetaAds();
  const { getMemberById } = useTeamMembers();
  const { performanceRows, activeMetrics, loading } = useTrafficAnalytics();

  // Find the account row
  const accountRow = performanceRows.find(r => r.adAccountId === id);
  const adAccount = adAccounts.find(a => a.ad_account_id === id);
  const client = accounts.find(a => a.id === accountRow?.clientId);
  const manager = getMemberById(client?.traffic_member_id || null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!accountRow || !adAccount) {
    return (
      <div className="space-y-4">
        <Link to="/traffic/overview">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Conta de anúncio não encontrada ou sem dados disponíveis.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link to="/traffic/overview">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Painel
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{accountRow.clientName}</h1>
          <p className="text-muted-foreground">{adAccount.name}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{adAccount.ad_account_id}</Badge>
            <Badge variant="outline">{adAccount.currency || 'BRL'}</Badge>
            {manager && (
              <Badge variant="secondary">Gestor: {manager.name}</Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Score</div>
          <div className={cn(
            "text-4xl font-bold",
            accountRow.healthStatus === 'green' && "text-success",
            accountRow.healthStatus === 'yellow' && "text-warning",
            accountRow.healthStatus === 'red' && "text-destructive",
          )}>
            {accountRow.score ?? '—'}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {accountRow.alerts.length > 0 && (
        <Card className="border-warning border-l-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accountRow.alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    {alert.actionHint && (
                      <p className="text-sm text-muted-foreground">{alert.actionHint}</p>
                    )}
                  </div>
                  <Badge variant={
                    alert.severity === 'critical' ? 'destructive' : 
                    alert.severity === 'attention' ? 'secondary' : 'outline'
                  }>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {activeMetrics.map(metric => {
          const value = accountRow.metrics[metric.slug];
          
          return (
            <Card key={metric.slug}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetricValue(value, metric.unit)}
                </div>
                {metric.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholder for charts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução Temporal
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Gráficos de evolução serão exibidos aqui quando houver dados históricos disponíveis.
        </CardContent>
      </Card>

      {/* Link to client */}
      <div className="flex gap-2">
        <Link to={`/crm/${accountRow.clientId}`}>
          <Button variant="outline">
            Ver Cadastro do Cliente
          </Button>
        </Link>
        <Link to={`/traffic/clients/${accountRow.clientId}`}>
          <Button variant="outline">
            Ver Tarefas de Tráfego
          </Button>
        </Link>
      </div>
    </div>
  );
}
