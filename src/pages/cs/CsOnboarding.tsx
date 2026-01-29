import { useState } from 'react';
import { Loader2, Users, CheckCircle, Clock, AlertTriangle, Plus, FileText, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCsClientOnboarding, useCsClientTasks } from '@/hooks/useCsData';
import { useOnboardingMeetings } from '@/hooks/useOnboardingMeeting';
import { CS_ONBOARDING_STATUS_LABELS } from '@/types/cs';
import { CS_MEETING_STATUS_LABELS, CS_RISK_LEVEL_LABELS, CS_RISK_LEVEL_COLORS } from '@/types/onboardingMeeting';
import { Link, useNavigate } from 'react-router-dom';
import { SalesBriefingSection } from '@/components/cs/SalesBriefingSection';
import { CreateOnboardingMeetingDialog } from '@/components/cs/CreateOnboardingMeetingDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CsOnboarding() {
  const { onboardings, loading } = useCsClientOnboarding();
  const { data: meetings, isLoading: meetingsLoading } = useOnboardingMeetings();
  const navigate = useNavigate();
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

        <div className="flex items-center gap-3">
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

          {/* Create Meeting Button */}
          <CreateOnboardingMeetingDialog />
        </div>
      </div>

      {/* Tabs: Briefing, Tarefas, Reuniões */}
      <Tabs defaultValue="briefing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="briefing">
            <FileText className="h-4 w-4 mr-2" />
            Briefing da Venda
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckCircle className="h-4 w-4 mr-2" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <CalendarDays className="h-4 w-4 mr-2" />
            Reuniões de Onboarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="briefing">
          {selectedClientId ? (
            <SalesBriefingSection clientId={selectedClientId} />
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Selecione um cliente acima para ver o Briefing da Venda.
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
                  Selecione um cliente acima para ver as tarefas.
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

        <TabsContent value="meetings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Reuniões de Onboarding</CardTitle>
              <CreateOnboardingMeetingDialog 
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Reunião
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              {meetingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !meetings || meetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma reunião de onboarding registrada</p>
                  <p className="text-sm">Clique em "Nova Reunião" para criar uma</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/cs/onboarding/meeting/${meeting.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{meeting.client_name}</span>
                          <Badge variant={meeting.status === 'completed' ? 'default' : 'outline'}>
                            {CS_MEETING_STATUS_LABELS[meeting.status]}
                          </Badge>
                          {meeting.risk_level && (
                            <Badge className={CS_RISK_LEVEL_COLORS[meeting.risk_level]}>
                              Risco: {CS_RISK_LEVEL_LABELS[meeting.risk_level]}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span>Data: {format(new Date(meeting.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                          {meeting.cs_owner_name && (
                            <span className="ml-4">• CS: {meeting.cs_owner_name}</span>
                          )}
                          {meeting.overall_quality_score !== null && (
                            <span className="ml-4">• Score: {meeting.overall_quality_score}%</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Ver Reunião
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Onboarding Cards */}
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
