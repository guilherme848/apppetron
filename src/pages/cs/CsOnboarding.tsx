import { useState } from 'react';
import { Loader2, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCsClientOnboarding, useCsClientTasks } from '@/hooks/useCsData';
import { CS_ONBOARDING_STATUS_LABELS } from '@/types/cs';
import { Link } from 'react-router-dom';
import { SalesBriefingSection } from '@/components/cs/SalesBriefingSection';

export default function CsOnboarding() {
  const { onboardings, loading } = useCsClientOnboarding();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { tasks } = useCsClientTasks(selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'attention':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-secondary" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProgress = (onboardingId: string) => {
    if (selectedId !== onboardingId) return 0;
    const done = tasks.filter(t => t.status === 'done').length;
    return tasks.length > 0 ? (done / tasks.length) * 100 : 0;
  };

  const handleSelectClient = (value: string) => {
    if (value === '_none_') {
      setSelectedId(null);
      setSelectedClientId(null);
      return;
    }
    const onboarding = onboardings.find(o => o.client_id === value);
    if (onboarding) {
      setSelectedId(onboarding.id);
      setSelectedClientId(onboarding.client_id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Onboarding</h1>
            <p className="text-muted-foreground">Acompanhamento de onboarding de clientes</p>
          </div>
        </div>

        {/* Select de cliente */}
        <div className="w-full sm:w-72">
          <Select value={selectedClientId || '_none_'} onValueChange={handleSelectClient}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none_">Nenhum cliente selecionado</SelectItem>
              {onboardings.map((o) => (
                <SelectItem key={o.client_id} value={o.client_id}>
                  {o.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Briefing/Tarefas sempre visíveis (com estado vazio quando nada selecionado) */}
      <Tabs defaultValue="briefing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="briefing">Briefing da Venda</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="briefing">
          {selectedClientId ? (
            <SalesBriefingSection clientId={selectedClientId} />
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Selecione um cliente abaixo para ver o Briefing da Venda.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tarefas de Onboarding</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedId ? (
                <p className="text-center py-4 text-muted-foreground">
                  Selecione um cliente abaixo para ver as tarefas.
                </p>
              ) : tasks.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Nenhuma tarefa</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {task.status === 'done' ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="h-5 w-5 text-secondary" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2" />
                      )}
                      <div className="flex-1">
                        <p className={task.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                          {task.title}
                        </p>
                      </div>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {onboardings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum onboarding em andamento
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {onboardings.map((onboarding) => (
            <Card 
              key={onboarding.id} 
              className={`cursor-pointer transition-colors ${selectedId === onboarding.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => handleSelectClient(onboarding.client_id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(onboarding.status)}
                    <CardTitle className="text-base">
                      <Link 
                        to={`/cs/client/${onboarding.client_id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onboarding.client_name}
                      </Link>
                    </CardTitle>
                  </div>
                  <Badge variant="outline">
                    {CS_ONBOARDING_STATUS_LABELS[onboarding.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  Fluxo: {onboarding.flow_name}
                </div>
                {selectedId === onboarding.id && (
                  <div className="mt-4 space-y-2">
                    <Progress value={getProgress(onboarding.id)} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {tasks.filter(t => t.status === 'done').length} de {tasks.length} tarefas concluídas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
