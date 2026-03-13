import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTrafficOverview } from '@/hooks/useTrafficOverview';
import { TASK_TYPE_OPTIONS } from '@/hooks/useTrafficOptimizations';
import { cn } from '@/lib/utils';

export default function TrafficDashboard() {
  const navigate = useNavigate();
  const {
    loading,
    totalActiveClients,
    lowBalanceClients,
    todayCheckins,
    clientsWithoutCheckin,
    weekOptimizations,
    pendingCreatives,
    recentOptimizations,
    getClientName,
    getClientBalance,
  } = useTrafficOverview();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const taskTypeLabel = (type: string) =>
    TASK_TYPE_OPTIONS.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Visão Geral — Tráfego Pago</h1>
        <p className="text-muted-foreground">
          Painel operacional do gestor de tráfego
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
            </div>
            <p className="text-2xl font-bold">{totalActiveClients}</p>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:border-destructive/50 transition-colors border-l-4 border-l-destructive"
          onClick={() => navigate('/traffic/balances')}
        >
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Baixo</CardTitle>
            </div>
            <p className="text-2xl font-bold text-destructive">{lowBalanceClients.length}</p>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Hoje</CardTitle>
            </div>
            <p className="text-2xl font-bold text-green-600">{todayCheckins.length}</p>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:border-yellow-500/50 transition-colors border-l-4 border-l-yellow-500"
          onClick={() => navigate('/traffic/optimizations')}
        >
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Sem Check-in</CardTitle>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{clientsWithoutCheckin.length}</p>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Otimizações (Semana)</CardTitle>
            </div>
            <p className="text-2xl font-bold">{weekOptimizations.length}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Alerts Section */}
      {(lowBalanceClients.length > 0 || pendingCreatives.length > 0 || clientsWithoutCheckin.length > 0) && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Low Balance */}
          {lowBalanceClients.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Clientes com Saldo Baixo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {lowBalanceClients.map(c => {
                  const bal = getClientBalance(c.id);
                  return (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{c.name}</span>
                      <Badge variant="destructive" className="text-xs shrink-0 ml-2">
                        {bal !== null
                          ? bal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </Badge>
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-destructive"
                  onClick={() => navigate('/traffic/balances')}
                >
                  Ver todos <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pending Creatives */}
          {pendingCreatives.length > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Criativos Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {pendingCreatives.slice(0, 8).map(cr => (
                  <div key={cr.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{cr.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {getClientName(cr.client_id)}
                    </span>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-yellow-600"
                  onClick={() => navigate('/traffic/creative-requests')}
                >
                  Ver todos <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Without Check-in */}
          {clientsWithoutCheckin.length > 0 && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Sem Check-in Hoje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {clientsWithoutCheckin.slice(0, 10).map(c => (
                  <div key={c.id} className="text-sm">{c.name}</div>
                ))}
                {clientsWithoutCheckin.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    +{clientsWithoutCheckin.length - 10} clientes
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-orange-600"
                  onClick={() => navigate('/traffic/optimizations')}
                >
                  Ir para Meu Dia <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Optimizations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Otimizações Recentes (Semana Atual)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/traffic/optimizations')}>
              Ver tudo <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOptimizations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma otimização registrada esta semana.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOptimizations.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(o.optimization_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{o.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {taskTypeLabel(o.task_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {o.description || '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {o.tempo_gasto_minutos} min
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
