import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Bell, Plus, Pencil, Trash2, Clock, Check, Play, Pause, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTrafficAlerts, type TrafficAlert } from '@/hooks/useTrafficAlerts';
import { useAlertRules, snoozeAlert, type AlertRule } from '@/hooks/useAlertRules';

function severityBadge(sev: TrafficAlert['severity']) {
  switch (sev) {
    case 'critical': return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
    case 'attention': return <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 border-amber-500/30">Atenção</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">Info</Badge>;
  }
}

function SnoozeDialog({ alert, open, onOpenChange, onSnoozed }: {
  alert: TrafficAlert | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSnoozed: () => void;
}) {
  const [hours, setHours] = useState<number>(24);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  if (!alert) return null;

  const save = async () => {
    setSaving(true);
    try {
      await snoozeAlert({
        rule_id: alert.rule_id,
        client_id: alert.client_id,
        ad_account_id: alert.ad_account_id,
        kind: alert.kind,
        hours,
        reason,
      });
      toast.success(`Alerta silenciado por ${hours}h`);
      onOpenChange(false);
      onSnoozed();
    } catch (e: any) {
      toast.error(`Erro: ${e?.message}`);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Silenciar alerta</DialogTitle>
          <DialogDescription>
            {alert.client_name || alert.ad_account_id} · {alert.message}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Por quanto tempo?</Label>
            <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 horas</SelectItem>
                <SelectItem value="12">12 horas</SelectItem>
                <SelectItem value="24">1 dia</SelectItem>
                <SelectItem value="72">3 dias</SelectItem>
                <SelectItem value="168">7 dias</SelectItem>
                <SelectItem value="720">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Motivo (opcional)</Label>
            <Input className="mt-1" placeholder="Ex: cliente de folga, ajuste programado" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Silenciar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({ rule, catalog, open, onOpenChange, onSaved }: {
  rule: AlertRule | null;
  catalog: ReturnType<typeof useAlertRules>['catalog'];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: (id: string | null, patch: Partial<AlertRule>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<AlertRule>>({});
  const [saving, setSaving] = useState(false);

  useState(() => {
    if (rule) setForm(rule);
    else setForm({ severity: 'attention', condition: 'gt', window_days: 7, is_active: true });
    return undefined;
  });

  const handleOpen = (o: boolean) => {
    onOpenChange(o);
    if (o) {
      if (rule) setForm(rule);
      else setForm({ severity: 'attention', condition: 'gt', window_days: 7, is_active: true });
    }
  };

  const save = async () => {
    if (!form.name || !form.metric_slug || form.threshold == null || !form.message) {
      toast.error('Preencha nome, métrica, threshold e mensagem');
      return;
    }
    setSaving(true);
    try {
      await onSaved(rule?.id ?? null, form);
      toast.success(rule ? 'Regra atualizada' : 'Regra criada');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message}`);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar regra' : 'Nova regra de alerta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-auto">
          <div>
            <Label className="text-xs">Nome da regra</Label>
            <Input className="mt-1" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Métrica</Label>
            <Select value={form.metric_slug || ''} onValueChange={(v) => setForm(f => ({ ...f, metric_slug: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {catalog.map(m => (
                  <SelectItem key={m.slug} value={m.slug}>{m.name} ({m.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quando valor é</Label>
              <Select value={form.condition || 'gt'} onValueChange={(v) => setForm(f => ({ ...f, condition: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">Maior que</SelectItem>
                  <SelectItem value="gte">Maior ou igual</SelectItem>
                  <SelectItem value="lt">Menor que</SelectItem>
                  <SelectItem value="lte">Menor ou igual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Threshold</Label>
              <Input className="mt-1" type="number" step="any" value={form.threshold ?? ''} onChange={e => setForm(f => ({ ...f, threshold: e.target.value === '' ? null : Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Janela (dias)</Label>
              <Input className="mt-1" type="number" value={form.window_days ?? 7} onChange={e => setForm(f => ({ ...f, window_days: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Severidade</Label>
              <Select value={form.severity || 'attention'} onValueChange={(v) => setForm(f => ({ ...f, severity: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="attention">Atenção</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Mensagem mostrada no alerta</Label>
            <Input className="mt-1" value={form.message || ''} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Ex: CPL acima do esperado" />
          </div>
          <div>
            <Label className="text-xs">Sugestão de ação (opcional)</Label>
            <Input className="mt-1" value={form.action_hint || ''} onChange={e => setForm(f => ({ ...f, action_hint: e.target.value }))} placeholder="Ex: Trocar criativo, revisar audiência" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label className="text-xs">Regra ativa</Label>
            <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TrafficAlerts() {
  const { alerts, loading: alertsLoading, acknowledge, refresh: refreshAlerts } = useTrafficAlerts();
  const { rules, catalog, loading: rulesLoading, saveRule, deleteRule, toggleActive } = useAlertRules();
  const [snoozingAlert, setSnoozingAlert] = useState<TrafficAlert | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [newRuleOpen, setNewRuleOpen] = useState(false);

  const { member } = useAuth();
  const { roleKey } = useRouteAccess();
  const { trafficManagers } = useTeamMembers();
  const isTrafficManager = roleKey === 'gestor de tráfego';
  const [trafficManagerFilter, setTrafficManagerFilter] = useState<string>('__pending__');

  useEffect(() => {
    if (trafficManagerFilter !== '__pending__') return;
    if (isTrafficManager && member?.id) setTrafficManagerFilter(member.id);
    else if (roleKey) setTrafficManagerFilter('all');
  }, [isTrafficManager, member?.id, roleKey, trafficManagerFilter]);

  const filteredAlerts = useMemo(() => {
    if (trafficManagerFilter === 'all' || trafficManagerFilter === '__pending__') return alerts;
    return alerts.filter(a => a.traffic_member_id === trafficManagerFilter);
  }, [alerts, trafficManagerFilter]);

  const critical = filteredAlerts.filter(a => a.severity === 'critical').length;
  const attention = filteredAlerts.filter(a => a.severity === 'attention').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alertas de Tráfego</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Motor automático roda a cada 15 minutos verificando todas as regras ativas.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Alertas ativos</p><p className="text-xl font-bold">{filteredAlerts.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" />Críticos</p><p className="text-xl font-bold text-red-600">{critical}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Atenção</p><p className="text-xl font-bold text-amber-600">{attention}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Regras ativas</p><p className="text-xl font-bold">{rules.filter(r => r.is_active).length}/{rules.length}</p></CardContent></Card>
      </div>

      {!isTrafficManager && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Gestor:</span>
          <Select
            value={trafficManagerFilter === '__pending__' ? 'all' : trafficManagerFilter}
            onValueChange={setTrafficManagerFilter}
          >
            <SelectTrigger className="w-[240px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os gestores</SelectItem>
              {trafficManagers.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed"><Bell className="h-4 w-4 mr-2" />Alertas ativos</TabsTrigger>
          <TabsTrigger value="rules"><Settings className="h-4 w-4 mr-2" />Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-2">
          {alertsLoading && filteredAlerts.length === 0 ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : filteredAlerts.length === 0 ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="py-8 text-center">
                <Check className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">Nenhum alerta ativo</p>
                <p className="text-xs text-muted-foreground mt-1">Tudo sob controle.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map(a => (
              <Card key={a.id} className={cn(
                a.severity === 'critical' && 'border-red-500/50',
                a.severity === 'attention' && 'border-amber-500/50',
              )}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Bell className={cn('h-4 w-4 mt-0.5 flex-shrink-0',
                    a.severity === 'critical' ? 'text-red-600' :
                    a.severity === 'attention' ? 'text-amber-600' : 'text-muted-foreground'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {severityBadge(a.severity)}
                      <span className="text-sm font-medium truncate">{a.client_name || a.ad_account_id}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                        {formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{a.message}</p>
                    {a.action_hint && (
                      <p className="text-[11px] text-muted-foreground mt-1 italic">→ {a.action_hint}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSnoozingAlert(a)} title="Silenciar">
                      <Clock className="h-3 w-3 mr-1" />Silenciar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => acknowledge(a.id)} title="Marcar como resolvido">
                      <Check className="h-3 w-3 mr-1" />Resolver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-2">
          <div className="flex justify-end">
            <Button onClick={() => setNewRuleOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Nova regra
            </Button>
          </div>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Janela</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesLoading && rules.length === 0 ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : rules.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhuma regra. Crie a primeira.</TableCell></TableRow>
                ) : rules.map(r => (
                  <TableRow key={r.id} className={cn(!r.is_active && 'opacity-50')}>
                    <TableCell className="font-medium text-sm">{r.name}</TableCell>
                    <TableCell className="text-xs">
                      <code className="bg-muted px-1 py-0.5 rounded">{r.metric_slug}</code>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.condition} {r.threshold}
                    </TableCell>
                    <TableCell className="text-xs">{r.window_days}d</TableCell>
                    <TableCell>{severityBadge(r.severity)}</TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive(r.id, v)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingRule(r)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => {
                          if (!confirm(`Excluir regra "${r.name}"?`)) return;
                          try { await deleteRule(r.id); toast.success('Regra removida'); }
                          catch (e: any) { toast.error(`Erro: ${e?.message}`); }
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <SnoozeDialog
        alert={snoozingAlert}
        open={!!snoozingAlert}
        onOpenChange={(o) => !o && setSnoozingAlert(null)}
        onSnoozed={refreshAlerts}
      />

      <RuleDialog
        rule={editingRule}
        catalog={catalog}
        open={!!editingRule || newRuleOpen}
        onOpenChange={(o) => { if (!o) { setEditingRule(null); setNewRuleOpen(false); } }}
        onSaved={saveRule}
      />
    </div>
  );
}
