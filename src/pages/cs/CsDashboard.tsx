import { Loader2, Users, AlertTriangle, XCircle, TrendingUp, Clock, Star, HeartHandshake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCsDashboardMetrics } from '@/hooks/useCsData';
import { Link } from 'react-router-dom';

export default function CsDashboard() {
  const { metrics, alerts, loading } = useCsDashboardMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const alertTypeLabels = {
    onboarding_delayed: 'Onboarding Atrasado',
    no_meeting: 'Sem Reunião',
    detractor_no_followup: 'Detrator sem Follow-up',
    renewal_soon: 'Renovação Próxima',
  };

  const alertTypeColors = {
    onboarding_delayed: 'bg-yellow-500',
    no_meeting: 'bg-orange-500',
    detractor_no_followup: 'bg-red-500',
    renewal_soon: 'bg-blue-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HeartHandshake className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Customer Success</h1>
          <p className="text-muted-foreground">Visão geral de saúde e engajamento dos clientes</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Onboarding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.clientsInOnboarding || 0}</div>
            {metrics?.avgOnboardingDays ? (
              <p className="text-xs text-muted-foreground">
                Média: {metrics.avgOnboardingDays.toFixed(0)} dias
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes em Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics?.clientsAtRisk || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS Médio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.averageNps || 0).toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Churn Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelamentos no Mês</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cancellationsThisMonth || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.churnRate || 0).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
          <CardDescription>Clientes que precisam de atenção</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum alerta no momento 🎉</p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${alertTypeColors[alert.type]}`} />
                    <div>
                      <Link 
                        to={`/cs/client/${alert.clientId}`}
                        className="font-medium hover:underline"
                      >
                        {alert.clientName}
                      </Link>
                      <p className="text-sm text-muted-foreground">{alert.details}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{alertTypeLabels[alert.type]}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
