import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { Plus, Trash2, GripVertical, Pencil, GitMerge, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_TYPE_LABELS } from '@/types/sales';

/* ───── Funnels & Stages Tab ───── */
function FunnelsStagesTab() {
  const { funnels, stages, deals, loading, refetchFunnels, refetchStages } = useSalesCrmData();
  const [showFunnelDialog, setShowFunnelDialog] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<any>(null);
  const [funnelForm, setFunnelForm] = useState({ name: '', description: '', color: 'hsl(var(--primary))' });
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [stageForm, setStageForm] = useState({ name: '', color: '#64748B', probability: '50', funnel_id: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'funnel' | 'stage'; id: string; name: string } | null>(null);

  const openNewFunnel = () => {
    setEditingFunnel(null);
    setFunnelForm({ name: '', description: '', color: 'hsl(var(--primary))' });
    setShowFunnelDialog(true);
  };

  const openEditFunnel = (f: any) => {
    setEditingFunnel(f);
    setFunnelForm({ name: f.name, description: f.description || '', color: f.color });
    setShowFunnelDialog(true);
  };

  const saveFunnel = async () => {
    if (!funnelForm.name) return;
    if (editingFunnel) {
      const { error } = await supabase.from('crm_funnels').update(funnelForm as any).eq('id', editingFunnel.id);
      if (error) toast.error('Erro ao atualizar');
      else { toast.success('Funil atualizado'); refetchFunnels(); }
    } else {
      const { error } = await supabase.from('crm_funnels').insert(funnelForm as any);
      if (error) toast.error('Erro ao criar');
      else { toast.success('Funil criado!'); refetchFunnels(); }
    }
    setShowFunnelDialog(false);
  };

  const openNewStage = (funnelId: string) => {
    const funnelStages = stages.filter(s => s.funnel_id === funnelId);
    setEditingStage(null);
    setStageForm({ name: '', color: '#64748B', probability: '50', funnel_id: funnelId });
    setShowStageDialog(true);
  };

  const openEditStage = (s: any) => {
    setEditingStage(s);
    setStageForm({ name: s.name, color: s.color, probability: String(s.probability), funnel_id: s.funnel_id });
    setShowStageDialog(true);
  };

  const saveStage = async () => {
    if (!stageForm.name || !stageForm.funnel_id) return;
    const payload = {
      name: stageForm.name,
      color: stageForm.color,
      probability: parseInt(stageForm.probability) || 0,
      funnel_id: stageForm.funnel_id,
    };
    if (editingStage) {
      const { error } = await supabase.from('crm_funnel_stages').update(payload as any).eq('id', editingStage.id);
      if (error) toast.error('Erro ao atualizar');
      else { toast.success('Etapa atualizada'); refetchStages(); }
    } else {
      const maxOrder = Math.max(0, ...stages.filter(s => s.funnel_id === stageForm.funnel_id).map(s => s.sort_order));
      const { error } = await supabase.from('crm_funnel_stages').insert({ ...payload, sort_order: maxOrder + 1 } as any);
      if (error) toast.error('Erro ao criar');
      else { toast.success('Etapa criada!'); refetchStages(); }
    }
    setShowStageDialog(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const table = deleteTarget.type === 'funnel' ? 'crm_funnels' : 'crm_funnel_stages';
    const { error } = await supabase.from(table).delete().eq('id', deleteTarget.id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Excluído');
      deleteTarget.type === 'funnel' ? refetchFunnels() : refetchStages();
    }
    setDeleteTarget(null);
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Funis e Etapas</h2>
        <Button onClick={openNewFunnel} size="sm" style={{ backgroundColor: DC.orange }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Funil
        </Button>
      </div>

      {funnels.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum funil criado ainda.</p>
      ) : (
        funnels.map(funnel => {
          const funnelStages = stages.filter(s => s.funnel_id === funnel.id).sort((a, b) => a.sort_order - b.sort_order);
          const funnelDeals = deals.filter(d => d.funnel_id === funnel.id);
          return (
            <Card key={funnel.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: funnel.color }} />
                    <CardTitle className="text-base">{funnel.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{funnelDeals.length} negócios</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFunnel(funnel)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: 'funnel', id: funnel.id, name: funnel.name })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {funnel.description && <p className="text-sm text-muted-foreground mt-1">{funnel.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {funnelStages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-medium text-foreground flex-1">{stage.name}</span>
                      <Badge variant="outline" className="text-xs">{stage.probability}%</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditStage(stage)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'stage', id: stage.id, name: stage.name })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => openNewStage(funnel.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Etapa
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Funnel Dialog */}
      <Dialog open={showFunnelDialog} onOpenChange={setShowFunnelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFunnel ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
            <DialogDescription>Configure o nome e a cor do funil</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={funnelForm.name} onChange={e => setFunnelForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={funnelForm.description} onChange={e => setFunnelForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={funnelForm.color} onChange={e => setFunnelForm(p => ({ ...p, color: e.target.value }))} className="h-10 w-14 rounded border cursor-pointer" />
                <Input value={funnelForm.color} onChange={e => setFunnelForm(p => ({ ...p, color: e.target.value }))} className="w-28" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFunnelDialog(false)}>Cancelar</Button>
            <Button onClick={saveFunnel} style={{ backgroundColor: DC.orange }} disabled={!funnelForm.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>Configure a etapa do funil</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={stageForm.name} onChange={e => setStageForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={stageForm.color} onChange={e => setStageForm(p => ({ ...p, color: e.target.value }))} className="h-10 w-12 rounded border cursor-pointer" />
                  <Input value={stageForm.color} onChange={e => setStageForm(p => ({ ...p, color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Probabilidade (%)</Label>
                <Input type="number" min="0" max="100" value={stageForm.probability} onChange={e => setStageForm(p => ({ ...p, probability: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStageDialog(false)}>Cancelar</Button>
            <Button onClick={saveStage} style={{ backgroundColor: DC.orange }} disabled={!stageForm.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {deleteTarget?.type === 'funnel' ? 'Funil' : 'Etapa'}</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───── Cadences Tab ───── */
function CadencesTab() {
  const { funnels, stages, loading } = useSalesCrmData();
  const [cadences, setCadences] = useState<any[]>([]);
  const [cadenceSteps, setCadenceSteps] = useState<any[]>([]);
  const [loadingCadences, setLoadingCadences] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', funnel_id: '', trigger_stage_id: '' });

  const fetchCadences = async () => {
    setLoadingCadences(true);
    const [{ data: cads }, { data: steps }] = await Promise.all([
      supabase.from('crm_cadences').select('*').order('created_at'),
      supabase.from('crm_cadence_steps').select('*').order('sort_order'),
    ]);
    setCadences((cads as any[]) || []);
    setCadenceSteps((steps as any[]) || []);
    setLoadingCadences(false);
  };

  useState(() => { fetchCadences(); });

  const handleSave = async () => {
    if (!form.name) return;
    const { error } = await supabase.from('crm_cadences').insert({
      name: form.name,
      funnel_id: form.funnel_id || null,
      trigger_stage_id: form.trigger_stage_id || null,
    } as any);
    if (error) toast.error('Erro ao criar cadência');
    else {
      toast.success('Cadência criada!');
      setShowDialog(false);
      setForm({ name: '', funnel_id: '', trigger_stage_id: '' });
      fetchCadences();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('crm_cadences').delete().eq('id', id);
    if (!error) { toast.success('Cadência excluída'); fetchCadences(); }
  };

  if (loading || loadingCadences) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Cadências</h2>
        <Button onClick={() => { setForm({ name: '', funnel_id: '', trigger_stage_id: '' }); setShowDialog(true); }} size="sm" style={{ backgroundColor: DC.orange }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Cadência
        </Button>
      </div>

      {cadences.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma cadência criada ainda.</p>
      ) : (
        cadences.map(cad => {
          const funnel = funnels.find(f => f.id === cad.funnel_id);
          const triggerStage = stages.find(s => s.id === cad.trigger_stage_id);
          const steps = cadenceSteps.filter(s => s.cadence_id === cad.id);
          return (
            <Card key={cad.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{cad.name}</p>
                    <div className="flex gap-2 mt-1">
                      {funnel && <Badge variant="outline" className="text-xs">{funnel.name}</Badge>}
                      {triggerStage && <Badge variant="secondary" className="text-xs">Dispara em: {triggerStage.name}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{steps.length} etapas</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cad.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {steps.length > 0 && (
                  <div className="space-y-1 mt-3">
                    {steps.map(step => (
                      <div key={step.id} className="flex items-center gap-3 text-sm p-2 rounded bg-muted/30">
                        <Badge variant="outline" className="text-[10px] min-w-[40px] justify-center">D+{step.day_offset}</Badge>
                        <Badge style={{ backgroundColor: (ACTIVITY_TYPE_LABELS as any)[step.type] ? DC.teal : DC.textSecondary, color: '#fff' }} className="text-[10px]">
                          {(ACTIVITY_TYPE_LABELS as any)[step.type] || step.type}
                        </Badge>
                        <span className="text-foreground">{step.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Cadência</DialogTitle>
            <DialogDescription>Configure uma cadência automática de atividades</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Funil vinculado</Label>
              <Select value={form.funnel_id} onValueChange={v => setForm(p => ({ ...p, funnel_id: v, trigger_stage_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.funnel_id && (
              <div>
                <Label>Etapa de disparo</Label>
                <Select value={form.trigger_stage_id} onValueChange={v => setForm(p => ({ ...p, trigger_stage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {stages.filter(s => s.funnel_id === form.funnel_id).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} style={{ backgroundColor: DC.orange }} disabled={!form.name}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───── Main Settings Page ───── */
export default function SalesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <Settings2 className="h-6 w-6" />
          Configurações de Vendas
        </h1>
        <p className="text-muted-foreground">Gerencie funis, etapas e cadências do CRM de vendas.</p>
      </div>

      <Tabs defaultValue="funnels">
        <TabsList>
          <TabsTrigger value="funnels" className="gap-2">
            <GitMerge className="h-4 w-4" /> Funis e Etapas
          </TabsTrigger>
          <TabsTrigger value="cadences" className="gap-2">
            <Settings2 className="h-4 w-4" /> Cadências
          </TabsTrigger>
        </TabsList>
        <TabsContent value="funnels" className="mt-6">
          <FunnelsStagesTab />
        </TabsContent>
        <TabsContent value="cadences" className="mt-6">
          <CadencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
