import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User, Calendar, Star, AlertTriangle, FileText, Clock, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  useCsClientOnboarding, 
  useCsClientTasks, 
  useCsMeetings, 
  useCsNps, 
  useCsRiskCases, 
  useCsCancellations,
  useCsAuditLog 
} from '@/hooks/useCsData';
import { 
  CS_ONBOARDING_STATUS_LABELS, 
  CS_MEETING_STATUS_LABELS, 
  CS_MEETING_TYPE_LABELS,
  CS_NPS_CLASSIFICATION_LABELS,
  CS_RISK_LEVEL_LABELS,
  CS_RISK_STATUS_LABELS,
  CS_TASK_STATUS_LABELS
} from '@/types/cs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SalesBriefingSection } from '@/components/cs/SalesBriefingSection';
import { Skeleton } from '@/components/ui/skeleton';

interface Account {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  service_id: string | null;
  niche_id: string | null;
  monthly_value: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export default function CsClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [client, setClient] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentBatches, setContentBatches] = useState<any[]>([]);
  const [contentPosts, setContentPosts] = useState<any[]>([]);

  const { onboardings, getByClientId } = useCsClientOnboarding();
  const clientOnboarding = clientId ? getByClientId(clientId) : undefined;
  const { tasks: onboardingTasks } = useCsClientTasks(clientOnboarding?.id || null);

  // Also check new onboarding system
  const [newOnboardingProgress, setNewOnboardingProgress] = useState(0);
  const [hasNewOnboarding, setHasNewOnboarding] = useState(false);
  useEffect(() => {
    if (!clientId) return;
    supabase
      .from('onboardings')
      .select('id, status')
      .eq('cliente_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: onb }) => {
        if (!onb) return;
        setHasNewOnboarding(true);
        supabase
          .from('onboarding_atividades')
          .select('id, status')
          .eq('onboarding_id', onb.id)
          .then(({ data: atividades }) => {
            if (!atividades || atividades.length === 0) return;
            const done = atividades.filter(a => a.status === 'concluida').length;
            setNewOnboardingProgress(Math.round((done / atividades.length) * 100));
          });
      });
  }, [clientId]);
  const { meetings, getMeetingsByClient } = useCsMeetings();
  const clientMeetings = clientId ? getMeetingsByClient(clientId) : [];
  const { responses } = useCsNps();
  const clientNps = responses.filter(r => r.client_id === clientId);
  const { cases, getCasesByClient } = useCsRiskCases();
  const clientRisks = clientId ? getCasesByClient(clientId) : [];
  const { cancellations } = useCsCancellations();
  const clientCancellations = cancellations.filter(c => c.client_id === clientId);
  const { logs } = useCsAuditLog(clientId);

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', clientId)
      .single();
    if (!error && data) {
      setClient(data);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  // Fetch content data for this client
  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      supabase.from('content_batches').select('id, month_ref, status, planning_due_date, delivery_date')
        .eq('client_id', clientId).or('archived.is.null,archived.eq.false').order('month_ref', { ascending: false }).limit(6),
      supabase.from('content_posts').select('id, title, status, batch_id, due_date, completed_at')
        .or('archived.is.null,archived.eq.false'),
    ]).then(([batchRes, postsRes]) => {
      const batches = batchRes.data || [];
      setContentBatches(batches);
      const batchIds = new Set(batches.map((b: any) => b.id));
      setContentPosts((postsRes.data || []).filter((p: any) => batchIds.has(p.batch_id)));
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Link to="/cs" className="text-primary hover:underline mt-2 inline-block">
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (clientCancellations.length > 0) {
      return <Badge variant="muted">Cancelado</Badge>;
    }
    if (clientRisks.some(r => r.status !== 'resolved')) {
      return <Badge variant="attention">Em Risco</Badge>;
    }
    if (hasNewOnboarding && newOnboardingProgress < 100) {
      return <Badge variant="info">Em Onboarding</Badge>;
    }
    if (clientOnboarding && clientOnboarding.status !== 'completed' && clientOnboarding.status !== 'concluido') {
      return <Badge variant="info">Em Onboarding</Badge>;
    }
    return <Badge variant="strong">Ativo</Badge>;
  };

  // Timeline events
  const timelineEvents = [
    ...clientMeetings.map(m => ({
      date: new Date(m.meeting_date),
      type: 'meeting' as const,
      title: CS_MEETING_TYPE_LABELS[m.type],
      subtitle: CS_MEETING_STATUS_LABELS[m.status],
      icon: Calendar,
    })),
    ...clientNps.map(n => ({
      date: new Date(n.created_at),
      type: 'nps' as const,
      title: `NPS: ${n.score}`,
      subtitle: CS_NPS_CLASSIFICATION_LABELS[n.classification],
      icon: Star,
    })),
    ...clientRisks.map(r => ({
      date: new Date(r.created_at),
      type: 'risk' as const,
      title: `Risco ${CS_RISK_LEVEL_LABELS[r.level]}`,
      subtitle: CS_RISK_STATUS_LABELS[r.status],
      icon: AlertTriangle,
    })),
    ...clientCancellations.map(c => ({
      date: new Date(c.effective_cancel_date),
      type: 'cancellation' as const,
      title: 'Cancelamento',
      subtitle: `Efetivo em ${format(new Date(c.effective_cancel_date), 'dd/MM/yyyy', { locale: ptBR })}`,
      icon: XCircle,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const onboardingProgress = hasNewOnboarding
    ? newOnboardingProgress
    : (onboardingTasks.length > 0
      ? Math.round((onboardingTasks.filter(t => t.status === 'done').length / onboardingTasks.length) * 100)
      : 0);

  const avgNps = clientNps.length > 0 
    ? clientNps.reduce((sum, n) => sum + n.score, 0) / clientNps.length 
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-muted-foreground">
            Cliente desde {client.start_date ? format(new Date(client.start_date), 'MMMM yyyy', { locale: ptBR }) : 'N/A'}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            {clientOnboarding ? (
              <>
                <div className="text-2xl font-bold">{onboardingProgress}%</div>
                <p className="text-xs text-muted-foreground">
                  {CS_ONBOARDING_STATUS_LABELS[clientOnboarding.status]}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NPS Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgNps?.toFixed(1) || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{clientNps.length} respostas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Total realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Casos de Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientRisks.length}</div>
            <p className="text-xs text-muted-foreground">
              {clientRisks.filter(r => r.status !== 'resolved').length} abertos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="meetings">Reuniões</TabsTrigger>
          <TabsTrigger value="nps">NPS</TabsTrigger>
          <TabsTrigger value="risk">Risco</TabsTrigger>
          <TabsTrigger value="audit">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline do Cliente</CardTitle>
              <CardDescription>Histórico de interações e eventos</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineEvents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum evento registrado</p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {timelineEvents.map((event, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <event.icon className="h-4 w-4" />
                          </div>
                          {idx < timelineEvents.length - 1 && (
                            <div className="w-px h-full bg-border flex-1 my-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Produção de Conteúdo</CardTitle>
              <CardDescription>Últimos pacotes e posts do cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {contentBatches.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum pacote de conteúdo encontrado</p>
              ) : (
                <div className="space-y-4">
                  {contentBatches.map((batch: any) => {
                    const batchPosts = contentPosts.filter((p: any) => p.batch_id === batch.id);
                    const done = batchPosts.filter((p: any) => p.status === 'done').length;
                    const total = batchPosts.length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const statusLabels: Record<string, string> = {
                      planning: 'Planejamento', production: 'Produção', review: 'Revisão',
                      pdf: 'PDF', to_deliver: 'A Entregar', delivered: 'Entregue',
                      changes: 'Alterações', scheduling: 'Agendamento',
                    };
                    return (
                      <div key={batch.id} className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/content/production/${batch.id}`)}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{batch.month_ref}</p>
                          <Badge variant="outline">{statusLabels[batch.status] || batch.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{done}/{total} posts concluídos ({pct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas de Onboarding</CardTitle>
              {clientOnboarding && (
                <CardDescription>
                  Fluxo: {clientOnboarding.flow_name} • {onboardingProgress}% concluído
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!clientOnboarding ? (
                <p className="text-center py-8 text-muted-foreground">Onboarding não iniciado</p>
              ) : onboardingTasks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma tarefa</p>
              ) : (
                <div className="space-y-2">
                  {onboardingTasks.map((task) => (
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
                        {task.due_at && (
                          <p className="text-xs text-muted-foreground">
                            Prazo: {format(new Date(task.due_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{CS_TASK_STATUS_LABELS[task.status]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <CardTitle>Reuniões</CardTitle>
              <CardDescription>{clientMeetings.length} reuniões registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {clientMeetings.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma reunião registrada</p>
              ) : (
                <div className="space-y-3">
                  {clientMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{CS_MEETING_TYPE_LABELS[meeting.type]}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(meeting.meeting_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline">{CS_MEETING_STATUS_LABELS[meeting.status]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nps">
          <Card>
            <CardHeader>
              <CardTitle>Respostas NPS</CardTitle>
              <CardDescription>Média: {avgNps?.toFixed(1) || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent>
              {clientNps.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma resposta NPS</p>
              ) : (
                <div className="space-y-3">
                  {clientNps.map((nps) => (
                    <div key={nps.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        nps.classification === 'promoter' ? 'bg-green-500' : 
                        nps.classification === 'passive' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {nps.score}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(nps.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline">{CS_NPS_CLASSIFICATION_LABELS[nps.classification]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Casos de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              {clientRisks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum caso de risco</p>
              ) : (
                <div className="space-y-3">
                  {clientRisks.map((risk) => (
                    <div key={risk.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={risk.level === 'critical' ? 'destructive' : 'secondary'}>
                          {CS_RISK_LEVEL_LABELS[risk.level]}
                        </Badge>
                        <Badge variant="outline">{CS_RISK_STATUS_LABELS[risk.status]}</Badge>
                      </div>
                      {risk.owner_member_name && (
                        <p className="text-sm text-muted-foreground">
                          Responsável: {risk.owner_member_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
              <CardDescription>Log de auditoria do cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum registro</p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-2 text-sm border-b">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p>
                            <span className="font-medium">{log.action}</span> em {log.entity_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
