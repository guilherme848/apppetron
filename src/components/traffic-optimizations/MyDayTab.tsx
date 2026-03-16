import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrafficOptimization, WeeklyCycleEntry } from '@/hooks/useTrafficOptimizations';

interface Props {
  accounts: { id: string; name: string; traffic_member_id?: string | null }[];
  teamMembers: { id: string; name: string }[];
  todayCheckins: TrafficOptimization[];
  todayHighComplexity: WeeklyCycleEntry[];
  openMediumTasks: TrafficOptimization[];
  currentMemberId: string | null;
  isAdmin?: boolean;
  todayStr: string;
  optimizations: TrafficOptimization[];
  onNewOptimization: () => void;
}

export function OptimizationMyDayTab({
  accounts,
  todayCheckins,
  todayHighComplexity,
  openMediumTasks,
  currentMemberId,
  isAdmin = false,
  todayStr,
  optimizations,
  onNewOptimization,
}: Props) {
  const getClientName = (id: string) => accounts.find((a) => a.id === id)?.name || 'Cliente';

  // Clients assigned to current manager (or all if admin)
  const myClients = useMemo(() => {
    if (isAdmin) return accounts;
    return accounts.filter((a) => a.traffic_member_id === currentMemberId);
  }, [accounts, currentMemberId, isAdmin]);

  const checkedInClientIds = useMemo(() => {
    return new Set(todayCheckins.map((c) => c.client_id));
  }, [todayCheckins]);

  const pendingCheckins = useMemo(() => {
    return myClients.filter((c) => !checkedInClientIds.has(c.id));
  }, [myClients, checkedInClientIds]);

  // Today's alta complexidade entries with completion status
  const todayAltaDone = useMemo(() => {
    return new Set(
      optimizations
        .filter((o) => o.optimization_date === todayStr && o.task_type === 'alta' && o.member_id === currentMemberId)
        .map((o) => o.client_id)
    );
  }, [optimizations, todayStr, currentMemberId]);

  const completedCheckins = checkedInClientIds.size;
  const totalClients = myClients.length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Check-ins Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completedCheckins}/{totalClients}</p>
            <p className="text-xs text-muted-foreground">{pendingCheckins.length} pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Alta Complexidade Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayHighComplexity.length}</p>
            <p className="text-xs text-muted-foreground">{todayAltaDone.size} concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Média Complexidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openMediumTasks.length}</p>
            <p className="text-xs text-muted-foreground">tarefas abertas</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check-ins Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground">✅ Todos os check-ins do dia foram realizados!</p>
          ) : (
            <div className="space-y-2">
              {pendingCheckins.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                  onClick={onNewOptimization}
                >
                  <span className="font-medium text-sm">{client.name}</span>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                    Pendente
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alta Complexidade Today */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alta Complexidade Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {todayHighComplexity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente agendado para alta complexidade hoje.</p>
          ) : (
            <div className="space-y-2">
              {todayHighComplexity.map((entry) => {
                const done = todayAltaDone.has(entry.client_id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                    onClick={!done ? onNewOptimization : undefined}
                  >
                    <span className="font-medium text-sm">{getClientName(entry.client_id)}</span>
                    <Badge variant={done ? 'default' : 'outline'} className={done ? 'bg-emerald-600' : 'text-primary border-primary/30'}>
                      {done ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medium tasks */}
      {openMediumTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas de Média Complexidade Abertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openMediumTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <span className="font-medium text-sm">{getClientName(task.client_id)}</span>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-md">{task.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">{task.tempo_gasto_minutos} min</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
