import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ExternalLink,
  Loader2,
  ShieldCheck,
  CircleDollarSign,
  Image,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTrafficOverview } from '@/hooks/useTrafficOverview';
import { TASK_TYPE_OPTIONS } from '@/hooks/useTrafficOptimizations';
import { cn } from '@/lib/utils';

const COMPLEXITY_COLORS: Record<string, string> = {
  Leve: 'bg-muted text-muted-foreground',
  Média: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

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
    TASK_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;
  const taskTypeComplexity = (type: string) =>
    TASK_TYPE_OPTIONS.find((t) => t.value === type)?.complexity || 'Leve';

  const kpis = [
    {
      label: 'Clientes Ativos',
      value: totalActiveClients,
      icon: Users,
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-500',
      valueColor: 'text-foreground',
      onClick: undefined,
    },
    {
      label: 'Saldo Baixo',
      value: lowBalanceClients.length,
      icon: AlertTriangle,
      borderColor: 'border-l-destructive',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
      onClick: () => navigate('/traffic/balances'),
    },
    {
      label: 'Check-ins Hoje',
      value: todayCheckins.length,
      icon: CheckCircle2,
      borderColor: 'border-l-emerald-500',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
      onClick: undefined,
    },
    {
      label: 'Sem Check-in',
      value: clientsWithoutCheckin.length,
      icon: Clock,
      borderColor: 'border-l-yellow-500',
      iconColor: 'text-yellow-600',
      valueColor: 'text-yellow-600',
      onClick: () => navigate('/traffic/optimizations'),
    },
    {
      label: 'Otimizações (Semana)',
      value: weekOptimizations.length,
      icon: Zap,
      borderColor: 'border-l-purple-500',
      iconColor: 'text-purple-600',
      valueColor: 'text-foreground',
      onClick: undefined,
    },
  ];

  const hasNoAlerts =
    clientsWithoutCheckin.length === 0 &&
    lowBalanceClients.length === 0 &&
    pendingCreatives.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Visão Geral — Tráfego Pago
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Painel operacional do gestor de tráfego
        </p>
      </div>

      {/* ───────── KPI CARDS ───────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className={cn(
                'border-l-4 bg-card shadow-sm transition-all',
                kpi.borderColor,
                kpi.onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
              )}
              onClick={kpi.onClick}
            >
              <CardContent className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', kpi.iconColor)} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {kpi.label}
                  </span>
                </div>
                <p className={cn('text-3xl font-bold leading-none mt-1', kpi.valueColor)}>
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ───────── ALERTS SECTION ───────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left — Sem Check-in */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b bg-yellow-50/60 dark:bg-yellow-900/10 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <CardTitle className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
                Sem Check-in Hoje
              </CardTitle>
              {clientsWithoutCheckin.length > 0 && (
                <Badge variant="attention" className="ml-auto text-xs">
                  {clientsWithoutCheckin.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {clientsWithoutCheckin.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Todos os check-ins realizados hoje!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {clientsWithoutCheckin.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-7 w-7 text-xs">
                        <AvatarFallback className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 text-[10px] font-semibold">
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{c.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary shrink-0"
                      onClick={() => navigate('/traffic/optimizations')}
                    >
                      Fazer Check-in
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right — Alertas Críticos */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b bg-red-50/60 dark:bg-red-900/10 rounded-t-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm font-semibold text-red-800 dark:text-red-400">
                Alertas Críticos
              </CardTitle>
              {(lowBalanceClients.length + pendingCreatives.length > 0) && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {lowBalanceClients.length + pendingCreatives.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {lowBalanceClients.length === 0 && pendingCreatives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Nenhum alerta no momento
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {/* Saldo Baixo */}
                {lowBalanceClients.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <CircleDollarSign className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Saldo Baixo
                        </span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-destructive"
                        onClick={() => navigate('/traffic/balances')}
                      >
                        Ver todos <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    {lowBalanceClients.slice(0, 5).map((c) => {
                      const bal = getClientBalance(c.id);
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-7 w-7 text-xs">
                              <AvatarFallback className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-[10px] font-semibold">
                                {getInitials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">{c.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-destructive shrink-0 ml-2">
                            {bal !== null
                              ? bal.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })
                              : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Separator */}
                {lowBalanceClients.length > 0 && pendingCreatives.length > 0 && (
                  <div className="border-t" />
                )}

                {/* Criativos Pendentes */}
                {pendingCreatives.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Image className="h-3.5 w-3.5 text-yellow-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Criativos Pendentes
                        </span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-yellow-600"
                        onClick={() => navigate('/traffic/creative-requests')}
                      >
                        Ver todos <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    {pendingCreatives.slice(0, 5).map((cr) => (
                      <div
                        key={cr.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate(`/traffic/creative-requests/${cr.id}`)
                        }
                      >
                        <span className="text-sm truncate">{cr.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {getClientName(cr.client_id)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ───────── RECENT OPTIMIZATIONS ───────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Otimizações Recentes — Semana Atual
            </CardTitle>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => navigate('/traffic/optimizations')}
            >
              Ver tudo <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOptimizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <Zap className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma otimização registrada esta semana.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold">Data</TableHead>
                    <TableHead className="text-xs font-semibold">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold">Tipo</TableHead>
                    <TableHead className="text-xs font-semibold">Descrição</TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Tempo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOptimizations.map((o, idx) => {
                    const complexity = taskTypeComplexity(o.task_type);
                    return (
                      <TableRow
                        key={o.id}
                        className={cn(
                          idx % 2 === 0
                            ? 'bg-card'
                            : 'bg-muted/20',
                          'hover:bg-muted/40 transition-colors',
                        )}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(
                            o.optimization_date + 'T12:00:00',
                          ).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {o.clientName}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              COMPLEXITY_COLORS[complexity] ||
                                'bg-muted text-muted-foreground',
                            )}
                          >
                            {taskTypeLabel(o.task_type)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                          {o.description || '—'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm tabular-nums">
                          {o.tempo_gasto_minutos} min
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
