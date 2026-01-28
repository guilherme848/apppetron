import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, HelpCircle, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { useBaseHealthScore } from '@/hooks/useBaseHealthScore';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getStatusColor(status: string) {
  switch (status) {
    case 'healthy':
      return 'bg-primary';
    case 'attention':
      return 'bg-secondary';
    case 'risk':
      return 'bg-destructive';
    default:
      return 'bg-muted';
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'healthy':
      return 'default';
    case 'attention':
      return 'secondary';
    case 'risk':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function BaseHealthScoreCard() {
  const { loading, totalScore, components, status, statusLabel, history, config } = useBaseHealthScore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Score de Saúde da Base</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Find previous score from history
  const previousScore = history.length > 1 ? history[history.length - 2]?.score_value : null;
  const scoreDiff = previousScore !== null ? totalScore - previousScore : null;

  const historyChartData = history.map((h) => ({
    date: format(parseISO(h.period_start), 'MMM/yy', { locale: ptBR }),
    score: Number(h.score_value),
  }));

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Score de Saúde da Base</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Score consolidado (0-100) que avalia a saúde da base de clientes, considerando
                  churn, lifetime, retenção de cohort e distribuição.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="ghost" className="w-full p-0 h-auto hover:bg-transparent">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  {/* Score Circle */}
                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl ${getStatusColor(
                        status
                      )}`}
                    >
                      {totalScore}
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="text-left">
                    <Badge variant={getStatusBadgeVariant(status)} className="mb-1">
                      {statusLabel}
                    </Badge>
                    {scoreDiff !== null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {scoreDiff > 0 ? (
                          <>
                            <TrendingUp className="h-3 w-3 text-primary" />
                            <span className="text-primary">+{scoreDiff.toFixed(0)}</span>
                          </>
                        ) : scoreDiff < 0 ? (
                          <>
                            <TrendingDown className="h-3 w-3 text-destructive" />
                            <span className="text-destructive">{scoreDiff.toFixed(0)}</span>
                          </>
                        ) : (
                          <>
                            <Minus className="h-3 w-3" />
                            <span>sem variação</span>
                          </>
                        )}
                        <span className="ml-1">vs mês anterior</span>
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Button>
          </DrawerTrigger>

          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Detalhamento do Score de Saúde</DrawerTitle>
              <DrawerDescription>
                Breakdown dos componentes que formam o score de {totalScore} pontos
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-6">
              {/* Components Breakdown */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Componentes do Score</h4>
                {components.map((comp) => (
                  <div key={comp.key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{comp.label}</span>
                      <span className="text-muted-foreground">
                        {comp.normalizedScore.toFixed(0)}/100 ({comp.weight}%)
                      </span>
                    </div>
                    <Progress value={comp.normalizedScore} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Contribuição: {comp.weightedScore.toFixed(1)} pts</span>
                      <span>
                        Valor bruto:{' '}
                        {comp.key === 'churn_rate'
                          ? `${comp.rawValue.toFixed(1)}%`
                          : comp.key === 'avg_lt_active'
                          ? `${comp.rawValue.toFixed(1)} meses`
                          : comp.key === 'cohort_retention'
                          ? `${comp.rawValue.toFixed(1)}%`
                          : `${comp.rawValue.toFixed(0)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Thresholds */}
              {config && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Faixas de Classificação</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span>≥ {config.green_threshold}: Saudável</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-secondary" />
                      <span>{config.yellow_threshold}-{config.green_threshold - 1}: Atenção</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span>&lt; {config.yellow_threshold}: Risco</span>
                    </div>
                  </div>
                </div>
              )}

              {/* History Chart */}
              {historyChartData.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Evolução Mensal</h4>
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <RechartsTooltip
                          formatter={(value: number) => [`${value} pts`, 'Score']}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Fechar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </CardContent>
    </Card>
  );
}
