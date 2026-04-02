import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, Clock, AlertTriangle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TrafficContactRow } from '@/components/traffic/contacts/TrafficContactRow';
import { TrafficContactMonthlyChart } from '@/components/traffic/contacts/TrafficContactMonthlyChart';
import {
  useClientLastContacts,
  useTodayContacts,
  useMonthlyContactCounts,
  useContactReasons,
  useContactChannels,
  useContactSettings,
  useCreateContact,
  useToggleContactCompleted,
} from '@/hooks/useTrafficContacts';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function TrafficContacts() {
  const { member, isAdmin } = useAuth();
  const { roleKey } = useRouteAccess();
  const memberId = member?.id || null;
  const qc = useQueryClient();
  const showAll = isAdmin || roleKey === 'cs';

  const { data: clients, isLoading: clientsLoading } = useClientLastContacts(memberId, showAll);
  const { data: todayContacts, isLoading: todayLoading } = useTodayContacts(memberId, showAll);
  const { data: monthlyCounts, isLoading: monthlyLoading } = useMonthlyContactCounts(memberId, showAll);
  const { data: reasons, isLoading: reasonsLoading } = useContactReasons();
  const { data: channels } = useContactChannels();
  const { data: settings } = useContactSettings();

  const createContact = useCreateContact();
  const toggleCompleted = useToggleContactCompleted();

  const freq = settings?.frequency_days ?? 7;
  const warn = settings?.warning_threshold_days ?? 5;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  // Map today contacts by client_id
  const todayMap = useMemo(() => {
    const map = new Map<string, any>();
    todayContacts?.forEach((c: any) => map.set(c.client_id, c));
    return map;
  }, [todayContacts]);

  // Sort clients by urgency
  const sortedClients = useMemo(() => {
    if (!clients) return [];
    return [...clients].sort((a, b) => {
      const urgA = a.days_since_contact === null ? 4 : a.days_since_contact >= freq ? 3 : a.days_since_contact >= warn ? 2 : 1;
      const urgB = b.days_since_contact === null ? 4 : b.days_since_contact >= freq ? 3 : b.days_since_contact >= warn ? 2 : 1;
      if (urgB !== urgA) return urgB - urgA;
      return (a.client_name || '').localeCompare(b.client_name || '');
    });
  }, [clients, freq, warn]);

  // KPI calculations
  const totalClients = clients?.length ?? 0;
  const completedToday = todayContacts?.filter((c: any) => c.completed).length ?? 0;
  const pendingToday = totalClients - completedToday;
  const overdueCount = useMemo(() => {
    if (!clients) return 0;
    return clients.filter((c: any) => c.days_since_contact === null || c.days_since_contact >= freq).length;
  }, [clients, freq]);

  const handleCreateAndToggle = useCallback(async (clientId: string, checked: boolean, existingId?: string) => {
    try {
      if (!memberId) return;
      if (existingId) {
        await toggleCompleted.mutateAsync({ id: existingId, completed: checked });
      } else if (checked) {
        await createContact.mutateAsync({
          client_id: clientId,
          member_id: memberId,
          completed: true,
        });
      }
    } catch {
      toast.error('Erro ao atualizar contato');
    }
  }, [memberId, toggleCompleted, createContact]);

  const handleUpdateField = useCallback(async (contactId: string, field: string, value: string | null) => {
    try {
      const { error } = await supabase
        .from('traffic_contacts')
        .update({ [field]: value })
        .eq('id', contactId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['traffic-contacts-today'] });
    } catch {
      toast.error('Erro ao atualizar campo');
    }
  }, [qc]);

  // Ensure today contacts exist for all clients (create empty ones for the ones without)
  const handleEnsureTodayContact = useCallback(async (clientId: string) => {
    if (!memberId || todayMap.has(clientId)) return todayMap.get(clientId);
    const result = await createContact.mutateAsync({
      client_id: clientId,
      member_id: memberId,
    });
    return result;
  }, [memberId, todayMap, createContact]);

  // Combined handler: ensure contact exists then update field
  const handleFieldChange = useCallback(async (clientId: string, contactId: string | undefined, field: string, value: string | null) => {
    try {
      if (!contactId && memberId) {
        const newContact = await createContact.mutateAsync({
          client_id: clientId,
          member_id: memberId,
        });
        if (newContact) {
          await supabase.from('traffic_contacts').update({ [field]: value }).eq('id', newContact.id);
          qc.invalidateQueries({ queryKey: ['traffic-contacts-today'] });
        }
      } else if (contactId) {
        await handleUpdateField(contactId, field, value);
      }
    } catch {
      toast.error('Erro ao atualizar');
    }
  }, [memberId, createContact, handleUpdateField, qc]);

  const isLoading = clientsLoading || todayLoading || reasonsLoading;

  if (!memberId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <MessageCircle className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Faça login para ver seus contatos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pontos de Contato</h1>
          <p className="text-sm text-muted-foreground">Gerencie os contatos diários com seus clientes</p>
        </div>
        <Badge variant="outline" className="text-xs capitalize">
          {todayLabel}
        </Badge>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard title="Clientes" value={totalClients} icon={Users} />
          <StatsCard title="Contatos hoje" value={completedToday} icon={CheckCircle2} description={`de ${totalClients}`} />
          <StatsCard title="Pendentes hoje" value={pendingToday} icon={Clock} />
          <StatsCard title="Em atraso" value={overdueCount} icon={AlertTriangle} description={`>${freq} dias sem contato`} />
        </div>
      )}

      {/* Monthly Chart */}
      <TrafficContactMonthlyChart counts={monthlyCounts} loading={monthlyLoading} />

      {/* Client Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Clientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-12 px-4 py-2 border-b border-border">
            {['Cliente', 'Último contato', 'Motivo', 'Resultado', 'Canal', 'Check', 'Ações'].map((h, i) => (
              <div
                key={h}
                className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${
                  i === 0 ? 'col-span-3' : i <= 2 ? 'col-span-2' : 'col-span-1'
                } ${i >= 5 ? 'text-center' : ''}`}
              >
                {h}
              </div>
            ))}
          </div>

          {isLoading ? (
            <Skeleton className="h-96 mx-4 my-4 rounded-xl" />
          ) : sortedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum cliente vinculado a você</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedClients.map((client: any) => {
                const tc = todayMap.get(client.client_id);
                return (
                  <TrafficContactRow
                    key={client.client_id}
                    client={client}
                    todayContact={tc}
                    reasons={reasons || []}
                    channels={channels || []}
                    frequencyDays={freq}
                    warningDays={warn}
                    currentMemberId={memberId}
                    onCreateAndToggle={handleCreateAndToggle}
                    onUpdateField={(contactId, field, value) => {
                      if (contactId) {
                        handleUpdateField(contactId, field, value);
                      } else {
                        handleFieldChange(client.client_id, undefined, field, value);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
