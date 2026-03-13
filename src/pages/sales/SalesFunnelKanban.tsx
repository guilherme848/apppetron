import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { DndContext, DragEndEvent, closestCorners, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { Plus, User, Clock, AlertTriangle, ArrowLeft, List, LayoutGrid } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';

// Droppable column
function StageColumn({
  stage,
  deals,
  stageValue,
  onAddDeal,
  onDealClick,
}: {
  stage: any;
  deals: any[];
  stageValue: number;
  onAddDeal: () => void;
  onDealClick: (deal: any) => void;
}) {
  const now = new Date();

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[320px] rounded-lg bg-muted/50"
      data-stage-id={stage.id}
    >
      <div className="p-3 border-b" style={{ borderColor: DC.border }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-sm font-semibold" style={{ color: DC.textPrimary }}>{stage.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs">{deals.length}</Badge>
        </div>
        <p className="text-xs" style={{ color: DC.textSecondary }}>
          {stageValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {deals.map(deal => {
          const daysInStage = differenceInDays(now, new Date(deal.created_at));
          const hasOverdue = false; // simplified

          return (
            <Card
              key={deal.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              onClick={() => onDealClick(deal)}
              draggable
              data-deal-id={deal.id}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: DC.textPrimary }}>{deal.title}</p>
                    {deal.contact?.company && (
                      <p className="text-xs" style={{ color: DC.textSecondary }}>{deal.contact.company}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold" style={{ color: DC.orange }}>
                  {Number(deal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {deal.responsible && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" style={{ color: DC.textSecondary }} />
                        <span className="text-xs" style={{ color: DC.textSecondary }}>{deal.responsible.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" style={{ color: DC.textSecondary }} />
                    <span className="text-xs" style={{ color: DC.textSecondary }}>{daysInStage}d</span>
                  </div>
                </div>
                {deal.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {deal.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-2 border-t" style={{ borderColor: DC.border }}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          style={{ color: DC.textSecondary }}
          onClick={onAddDeal}
        >
          <Plus className="h-3 w-3 mr-1" /> Adicionar negócio
        </Button>
      </div>
    </div>
  );
}

export default function SalesFunnelKanban() {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const {
    funnels, stages, deals, contacts, activities, loading,
    getStagesByFunnel, getDealsByStage, refetchDeals,
  } = useSalesCrmData();
  const { members: teamMembers } = useTeamMembers();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [newDealStageId, setNewDealStageId] = useState('');
  const [newDealForm, setNewDealForm] = useState({ title: '', value: '', contact_id: '', responsible_id: '' });

  const funnel = funnels.find(f => f.id === funnelId);
  const funnelStages = getStagesByFunnel(funnelId || '');

  const handleAddDeal = (stageId: string) => {
    setNewDealStageId(stageId);
    setNewDealForm({ title: '', value: '', contact_id: '', responsible_id: '' });
    setShowNewDealDialog(true);
  };

  const handleSaveDeal = async () => {
    if (!newDealForm.title || !funnelId) return;
    const { error } = await supabase.from('crm_deals').insert({
      funnel_id: funnelId,
      stage_id: newDealStageId,
      title: newDealForm.title,
      value: parseFloat(newDealForm.value) || 0,
      contact_id: newDealForm.contact_id || null,
      responsible_id: newDealForm.responsible_id || null,
    } as any);
    if (error) {
      toast.error('Erro ao criar negócio');
      console.error(error);
    } else {
      toast.success('Negócio criado!');
      setShowNewDealDialog(false);
      refetchDeals();
    }
  };

  const handleMoveDeal = async (dealId: string, newStageId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    const { error } = await supabase.from('crm_deals').update({ stage_id: newStageId } as any).eq('id', dealId);
    if (error) {
      toast.error('Erro ao mover negócio');
      return;
    }
    // Record history
    await supabase.from('crm_deal_stage_history').insert({
      deal_id: dealId,
      from_stage_id: deal.stage_id,
      to_stage_id: newStageId,
    } as any);
    toast.success('Negócio movido!');
    refetchDeals();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-72" />)}
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="p-6">
        <p style={{ color: DC.textSecondary }}>Funil não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/sales')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" style={{ backgroundColor: DC.bgPage }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: funnel.color }} />
          <h1 className="text-xl font-bold" style={{ color: DC.textPrimary }}>{funnel.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            style={viewMode === 'kanban' ? { backgroundColor: DC.orange } : {}}
          >
            <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            style={viewMode === 'list' ? { backgroundColor: DC.orange } : {}}
          >
            <List className="h-4 w-4 mr-1" /> Lista
          </Button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {funnelStages.map(stage => {
            const stageDeals = getDealsByStage(stage.id);
            const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={stageDeals}
                stageValue={stageValue}
                onAddDeal={() => handleAddDeal(stage.id)}
                onDealClick={setSelectedDeal}
              />
            );
          })}
        </div>
      ) : (
        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.filter(d => d.funnel_id === funnelId && d.status === 'open').map(deal => {
                  const stage = stages.find(s => s.id === deal.stage_id);
                  return (
                    <TableRow key={deal.id} className="cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell>{deal.contact?.company || '—'}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: stage?.color || DC.border, color: '#fff' }}>
                          {stage?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(deal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>{deal.responsible?.name || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Deal Dialog */}
      <Dialog open={showNewDealDialog} onOpenChange={setShowNewDealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Negócio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={newDealForm.title}
                onChange={e => setNewDealForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Nome do negócio"
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={newDealForm.value}
                onChange={e => setNewDealForm(p => ({ ...p, value: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Contato</Label>
              <Select
                value={newDealForm.contact_id}
                onValueChange={v => setNewDealForm(p => ({ ...p, contact_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select
                value={newDealForm.responsible_id}
                onValueChange={v => setNewDealForm(p => ({ ...p, responsible_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDealDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveDeal} style={{ backgroundColor: DC.orange }} disabled={!newDealForm.title}>
              Criar Negócio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Detail Sheet */}
      <Sheet open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          {selectedDeal && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle style={{ color: DC.textPrimary }}>{selectedDeal.title}</SheetTitle>
                {selectedDeal.contact?.company && (
                  <p className="text-sm" style={{ color: DC.textSecondary }}>{selectedDeal.contact.company}</p>
                )}
              </SheetHeader>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs" style={{ color: DC.textSecondary }}>Valor</p>
                  <p className="text-lg font-bold" style={{ color: DC.orange }}>
                    {Number(selectedDeal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: DC.textSecondary }}>Probabilidade</p>
                  <p className="text-lg font-bold">{selectedDeal.probability || 0}%</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: DC.textSecondary }}>Responsável</p>
                  <p className="text-sm">{selectedDeal.responsible?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: DC.textSecondary }}>Etapa</p>
                  <p className="text-sm">{stages.find(s => s.id === selectedDeal.stage_id)?.name || '—'}</p>
                </div>
              </div>

              <Tabs defaultValue="activities">
                <TabsList className="w-full">
                  <TabsTrigger value="activities" className="flex-1">Atividades</TabsTrigger>
                  <TabsTrigger value="cadence" className="flex-1">Cadência</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
                </TabsList>
                <TabsContent value="activities" className="space-y-3 mt-4">
                  {activities.filter(a => a.deal_id === selectedDeal.id).length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: DC.textSecondary }}>
                      Nenhuma atividade vinculada
                    </p>
                  ) : (
                    activities.filter(a => a.deal_id === selectedDeal.id).map(act => (
                      <div
                        key={act.id}
                        className="p-3 rounded-lg border"
                        style={{
                          borderColor: DC.border,
                          backgroundColor: act.status === 'pending' && act.scheduled_at && act.scheduled_at < new Date().toISOString()
                            ? DC.redBg : DC.bgCard,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{act.title}</p>
                          <Badge variant={act.status === 'completed' ? 'default' : 'secondary'}>
                            {act.status === 'completed' ? 'Concluída' : 'Pendente'}
                          </Badge>
                        </div>
                        {act.scheduled_at && (
                          <p className="text-xs mt-1" style={{ color: DC.textSecondary }}>
                            {format(new Date(act.scheduled_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="cadence" className="mt-4">
                  <p className="text-sm text-center py-8" style={{ color: DC.textSecondary }}>
                    Nenhuma cadência vinculada
                  </p>
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                  <p className="text-sm text-center py-8" style={{ color: DC.textSecondary }}>
                    Histórico de mudanças de etapa
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
