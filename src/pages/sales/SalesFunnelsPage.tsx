import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { Plus, User, Clock, AlertTriangle, List, LayoutGrid, Trash2, Check, X, Phone } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';
import type { SalesDeal, SalesActivity, ACTIVITY_TYPE_COLORS } from '@/types/sales';

/* ───── Stage Column (Kanban) ───── */
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
    <div className="flex flex-col min-w-[280px] max-w-[320px] rounded-lg bg-muted/50">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-sm font-semibold text-foreground">{stage.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs">{deals.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {stageValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)]">
        {deals.map(deal => {
          const daysInStage = differenceInDays(now, new Date(deal.created_at));
          return (
            <Card
              key={deal.id}
              className="cursor-pointer hover:shadow-md transition-shadow border"
              onClick={() => onDealClick(deal)}
            >
              <CardContent className="p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{deal.title}</p>
                  {deal.contact?.company && (
                    <p className="text-xs text-muted-foreground">{deal.contact.company}</p>
                  )}
                </div>
                <p className="text-sm font-bold" style={{ color: DC.orange }}>
                  {Number(deal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {deal.responsible && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{deal.responsible.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{daysInStage}d</span>
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

      <div className="p-2 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={onAddDeal}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar negócio
        </Button>
      </div>
    </div>
  );
}


/* ───── Main Page ───── */
export default function SalesFunnelsPage() {
  const {
    funnels, stages, deals, contacts, activities, loading,
    getStagesByFunnel, getDealsByStage, getDealsByFunnel,
    refetchDeals,
  } = useSalesCrmData();
  const { members: teamMembers } = useTeamMembers();
  const navigate = useNavigate();

  const [activeFunnelId, setActiveFunnelId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [newDealStageId, setNewDealStageId] = useState('');
  const [newDealForm, setNewDealForm] = useState({ title: '', value: '', contact_id: '', responsible_id: '' });

  // Auto-select first funnel
  const currentFunnelId = activeFunnelId || funnels[0]?.id || '';
  const currentFunnel = funnels.find(f => f.id === currentFunnelId);
  const funnelStages = getStagesByFunnel(currentFunnelId);
  const funnelDeals = getDealsByFunnel(currentFunnelId);

  const handleAddDeal = (stageId: string) => {
    setNewDealStageId(stageId);
    setNewDealForm({ title: '', value: '', contact_id: '', responsible_id: '' });
    setShowNewDealDialog(true);
  };

  const handleSaveDeal = async () => {
    if (!newDealForm.title || !currentFunnelId) return;
    const { error } = await supabase.from('crm_deals').insert({
      funnel_id: currentFunnelId,
      stage_id: newDealStageId,
      title: newDealForm.title,
      value: parseFloat(newDealForm.value) || 0,
      contact_id: newDealForm.contact_id || null,
      responsible_id: newDealForm.responsible_id || null,
    } as any);
    if (error) {
      toast.error('Erro ao criar negócio');
    } else {
      toast.success('Negócio criado!');
      setShowNewDealDialog(false);
      refetchDeals();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-72" />)}
        </div>
      </div>
    );
  }

  if (funnels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Nenhum funil criado ainda.</p>
        <p className="text-sm text-muted-foreground">Acesse Configurações → Funis e Etapas para criar seu primeiro funil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Funnel Selector + View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Funis de Vendas</h1>
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

      {/* Funnel tabs */}
      <Tabs value={currentFunnelId} onValueChange={setActiveFunnelId}>
        <TabsList className="h-auto flex-wrap">
          {funnels.map(f => (
            <TabsTrigger key={f.id} value={f.id} className="gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
              {f.name}
              <Badge variant="secondary" className="text-[10px] ml-1 px-1.5">
                {getDealsByFunnel(f.id).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {funnels.map(f => (
          <TabsContent key={f.id} value={f.id} className="mt-4">
            {/* Summary bar */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">Negócios: </span>
                <span className="font-semibold text-foreground">{getDealsByFunnel(f.id).length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valor total: </span>
                <span className="font-semibold" style={{ color: DC.orange }}>
                  {getDealsByFunnel(f.id).reduce((s, d) => s + Number(d.value || 0), 0)
                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Etapas: </span>
                <span className="font-semibold text-foreground">{getStagesByFunnel(f.id).length}</span>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Kanban / List content */}
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
                onDealClick={(deal) => navigate(`/sales/deals/${deal.id}`)}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Dias na Etapa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnelDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum negócio neste funil
                    </TableCell>
                  </TableRow>
                ) : (
                  funnelDeals.map(deal => {
                    const stage = stages.find(s => s.id === deal.stage_id);
                    const daysInStage = differenceInDays(new Date(), new Date(deal.created_at));
                    return (
                      <TableRow key={deal.id} className="cursor-pointer" onClick={() => navigate(`/sales/deals/${deal.id}`)}>
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
                        <TableCell className="text-right">
                          <Badge variant="secondary">{daysInStage}d</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
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
            <DialogDescription>Adicione um novo negócio ao funil</DialogDescription>
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
              <Select value={newDealForm.contact_id} onValueChange={v => setNewDealForm(p => ({ ...p, contact_id: v }))}>
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
              <Select value={newDealForm.responsible_id} onValueChange={v => setNewDealForm(p => ({ ...p, responsible_id: v }))}>
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

    </div>
  );
}
