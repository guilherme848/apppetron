import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCrmAutomations, TRIGGER_TYPES, ACTION_TYPES, CrmAutomation } from '@/hooks/useCrmAutomations';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { DC } from '@/lib/dashboardColors';
import { Zap, Plus, Trash2, Edit, Play, History, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ActionForm {
  type: string;
  config: Record<string, any>;
}

export default function SalesAutomationsPage() {
  const { automations, logs, loading, create, update, remove, toggle } = useCrmAutomations();
  const { funnels, stages, getStagesByFunnel } = useSalesCrmData();
  const { members } = useTeamMembers();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CrmAutomation | null>(null);
  const [form, setForm] = useState({
    name: '',
    trigger_type: '',
    trigger_config: {} as Record<string, any>,
    conditions: [] as any[],
    actions: [] as ActionForm[],
    active: true,
  });

  const handleNew = () => {
    setEditing(null);
    setForm({ name: '', trigger_type: '', trigger_config: {}, conditions: [], actions: [], active: true });
    setShowDialog(true);
  };

  const handleEdit = (a: CrmAutomation) => {
    setEditing(a);
    setForm({
      name: a.name,
      trigger_type: a.trigger_type,
      trigger_config: a.trigger_config,
      conditions: a.conditions,
      actions: a.actions,
      active: a.active,
    });
    setShowDialog(true);
  };

  const addAction = () => {
    setForm(f => ({ ...f, actions: [...f.actions, { type: '', config: {} }] }));
  };

  const removeAction = (idx: number) => {
    setForm(f => ({ ...f, actions: f.actions.filter((_, i) => i !== idx) }));
  };

  const updateAction = (idx: number, key: string, value: any) => {
    setForm(f => ({
      ...f,
      actions: f.actions.map((a, i) => i === idx
        ? key === 'type' ? { type: value, config: {} } : { ...a, config: { ...a.config, [key]: value } }
        : a
      ),
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.trigger_type) return;
    const payload = {
      name: form.name,
      trigger_type: form.trigger_type,
      trigger_config: form.trigger_config,
      conditions: form.conditions,
      actions: form.actions,
      active: form.active,
    };
    const ok = editing ? await update(editing.id, payload) : await create(payload);
    if (ok) {
      toast.success(editing ? 'Automação atualizada!' : 'Automação criada!');
      setShowDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6" style={{ color: DC.orange }} />
          <h1 className="text-xl font-bold text-foreground">Automações</h1>
        </div>
        <Button size="sm" onClick={handleNew} style={{ backgroundColor: DC.orange }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Automação
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Automações</p>
            <p className="text-2xl font-bold text-foreground">{automations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="text-2xl font-bold" style={{ color: DC.teal }}>{automations.filter(a => a.active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Execuções Totais</p>
            <p className="text-2xl font-bold" style={{ color: DC.orange }}>
              {automations.reduce((s, a) => s + a.executions_count, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Automações</TabsTrigger>
          <TabsTrigger value="logs">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead className="text-center">Execuções</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automations.map(a => {
                    const triggerLabel = TRIGGER_TYPES.find(t => t.value === a.trigger_type)?.label || a.trigger_type;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-foreground">{a.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{triggerLabel}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {a.actions.map((act: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {ACTION_TYPES.find(t => t.value === act.type)?.label || act.type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{a.executions_count}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={a.active} onCheckedChange={v => toggle(a.id, v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { remove(a.id); toast.success('Automação excluída'); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {automations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma automação criada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Automação</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Ações Executadas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => {
                    const automation = automations.find(a => a.id === log.automation_id);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.executed_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{automation?.name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.trigger_event || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {log.actions_executed.map((act: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{act.type || act}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className="text-white"
                            style={{ backgroundColor: log.status === 'success' ? DC.teal : '#EF4444' }}
                          >
                            {log.status === 'success' ? 'Sucesso' : 'Erro'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma execução registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Nome da Automação</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Boas-vindas ao Inbound" />
            </div>

            {/* Trigger */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" style={{ color: DC.orange }} /> Gatilho
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v, trigger_config: {} }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gatilho" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.trigger_type === 'deal_stage_changed' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Funil</Label>
                      <Select value={form.trigger_config.funnel_id || ''} onValueChange={v => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, funnel_id: v } }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Etapa destino</Label>
                      <Select value={form.trigger_config.stage_id || ''} onValueChange={v => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, stage_id: v } }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {(form.trigger_config.funnel_id ? getStagesByFunnel(form.trigger_config.funnel_id) : stages).map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {(form.trigger_type === 'deal_no_activity' || form.trigger_type === 'activity_overdue' || form.trigger_type === 'deal_stale') && (
                  <div>
                    <Label className="text-xs">Número de dias</Label>
                    <Input
                      type="number"
                      value={form.trigger_config.days || ''}
                      onChange={e => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, days: parseInt(e.target.value) } }))}
                      placeholder="5"
                    />
                  </div>
                )}
                {form.trigger_type === 'score_reached' && (
                  <div>
                    <Label className="text-xs">Score mínimo</Label>
                    <Input
                      type="number"
                      value={form.trigger_config.min_score || ''}
                      onChange={e => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, min_score: parseInt(e.target.value) } }))}
                      placeholder="70"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" style={{ color: DC.teal }} /> Ações
                  </span>
                  <Button variant="outline" size="sm" onClick={addAction}>
                    <Plus className="h-3 w-3 mr-1" /> Ação
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.actions.map((action, idx) => (
                  <div key={idx} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">#{idx + 1}</Badge>
                      <Select value={action.type} onValueChange={v => updateAction(idx, 'type', v)}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione a ação" /></SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => removeAction(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {action.type === 'create_activity' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Título da atividade"
                          value={action.config.title || ''}
                          onChange={e => updateAction(idx, 'title', e.target.value)}
                        />
                        <Select value={action.config.activity_type || ''} onValueChange={v => updateAction(idx, 'activity_type', v)}>
                          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Ligação</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="meeting">Reunião</SelectItem>
                            <SelectItem value="task">Tarefa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {action.type === 'add_tag' && (
                      <Input
                        placeholder="Nome da tag"
                        value={action.config.tag || ''}
                        onChange={e => updateAction(idx, 'tag', e.target.value)}
                      />
                    )}
                    {action.type === 'notify' && (
                      <Input
                        placeholder="Mensagem da notificação"
                        value={action.config.message || ''}
                        onChange={e => updateAction(idx, 'message', e.target.value)}
                      />
                    )}
                    {action.type === 'change_score' && (
                      <Input
                        type="number"
                        placeholder="Pontos (+/-)"
                        value={action.config.points || ''}
                        onChange={e => updateAction(idx, 'points', parseInt(e.target.value))}
                      />
                    )}
                  </div>
                ))}
                {form.actions.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">Adicione pelo menos uma ação</p>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Ativada</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} style={{ backgroundColor: DC.orange }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
