import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { ACTIVITY_TYPE_COLORS, ACTIVITY_TYPE_LABELS, DEAL_RESULT_OPTIONS } from '@/types/sales';
import { format } from 'date-fns';
import { Calendar, List, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function SalesActivities() {
  const { activities, contacts, deals, funnels, stages, loading, refetchActivities } = useSalesCrmData();
  const { members: teamMembers } = useTeamMembers();
  const [viewMode, setViewMode] = useState<'list' | 'agenda'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [resultForm, setResultForm] = useState({ result: '', notes: '' });
  const [newForm, setNewForm] = useState({
    type: 'call' as string,
    title: '',
    description: '',
    scheduled_at: '',
    deal_id: '',
    contact_id: '',
    responsible_id: '',
  });

  const now = new Date().toISOString();

  const filtered = activities.filter(a => {
    if (statusFilter === 'overdue') return a.status === 'pending' && a.scheduled_at && a.scheduled_at < now;
    if (statusFilter === 'pending') return a.status === 'pending';
    if (statusFilter === 'completed') return a.status === 'completed';
    return true;
  }).filter(a => {
    if (typeFilter !== 'all') return a.type === typeFilter;
    return true;
  }).sort((a, b) => {
    const aOverdue = a.status === 'pending' && a.scheduled_at && a.scheduled_at < now;
    const bOverdue = b.status === 'pending' && b.scheduled_at && b.scheduled_at < now;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return (a.scheduled_at || '').localeCompare(b.scheduled_at || '');
  });

  const handleComplete = async (id: string) => {
    const { error } = await supabase.from('crm_activities').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (!error) { toast.success('Atividade concluída'); refetchActivities(); }
  };

  const handleExecute = async () => {
    if (!selectedActivity) return;
    const { error } = await supabase.from('crm_activities').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: resultForm.result || null,
      notes: resultForm.notes || null,
    } as any).eq('id', selectedActivity.id);
    if (!error) {
      toast.success('Atividade concluída');
      setSelectedActivity(null);
      setResultForm({ result: '', notes: '' });
      refetchActivities();
    }
  };

  const handleCreate = async () => {
    if (!newForm.title) return;
    const { error } = await supabase.from('crm_activities').insert({
      type: newForm.type,
      title: newForm.title,
      description: newForm.description || null,
      scheduled_at: newForm.scheduled_at || null,
      deal_id: newForm.deal_id || null,
      contact_id: newForm.contact_id || null,
      responsible_id: newForm.responsible_id || null,
    } as any);
    if (error) toast.error('Erro ao criar atividade');
    else {
      toast.success('Atividade criada!');
      setShowNewDialog(false);
      setNewForm({ type: 'call', title: '', description: '', scheduled_at: '', deal_id: '', contact_id: '', responsible_id: '' });
      refetchActivities();
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowNewDialog(true)} size="sm" style={{ backgroundColor: DC.orange }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Atividade
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}
            style={viewMode === 'list' ? { backgroundColor: DC.orange } : {}}>
            <List className="h-4 w-4 mr-1" /> Lista
          </Button>
          <Button variant={viewMode === 'agenda' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('agenda')}
            style={viewMode === 'agenda' ? { backgroundColor: DC.orange } : {}}>
            <Calendar className="h-4 w-4 mr-1" /> Agenda
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="call">Ligação</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="meeting">Reunião</SelectItem>
            <SelectItem value="task">Tarefa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Negócio</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(act => {
                  const isOverdue = act.status === 'pending' && act.scheduled_at && act.scheduled_at < now;
                  return (
                    <TableRow
                      key={act.id}
                      className="cursor-pointer"
                      style={{ backgroundColor: isOverdue ? DC.redBg : undefined }}
                      onClick={() => { setSelectedActivity(act); setResultForm({ result: act.result || '', notes: act.notes || '' }); }}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        {act.status !== 'completed' && (
                          <Checkbox onCheckedChange={() => handleComplete(act.id)} />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{act.title}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: ACTIVITY_TYPE_COLORS[act.type] || DC.textSecondary, color: '#fff' }}>
                          {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge style={{
                          backgroundColor: act.status === 'completed' ? DC.teal : isOverdue ? DC.red : DC.textSecondary,
                          color: '#fff',
                        }}>
                          {act.status === 'completed' ? 'Concluída' : isOverdue ? 'Atrasada' : 'No prazo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {act.scheduled_at ? format(new Date(act.scheduled_at), 'dd/MM/yyyy HH:mm') : '—'}
                      </TableCell>
                      <TableCell>{act.contact?.name || '—'}</TableCell>
                      <TableCell>{act.deal?.title || '—'}</TableCell>
                      <TableCell>{act.responsible?.name || '—'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Execution Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedActivity && (
                <Badge style={{ backgroundColor: ACTIVITY_TYPE_COLORS[selectedActivity.type] || DC.textSecondary, color: '#fff' }}>
                  {ACTIVITY_TYPE_LABELS[selectedActivity.type] || selectedActivity.type}
                </Badge>
              )}
              {selectedActivity?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedActivity?.contact?.name && `Contato: ${selectedActivity.contact.name}`}
              {selectedActivity?.contact?.company && ` — ${selectedActivity.contact.company}`}
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              {selectedActivity.description && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Roteiro / Descrição</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedActivity.description}</p>
                </div>
              )}
              {selectedActivity.deal && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Negócio: </span>
                  <span className="font-medium text-foreground">{selectedActivity.deal.title}</span>
                </div>
              )}
              {selectedActivity.scheduled_at && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Agendada para: </span>
                  <span className="font-medium text-foreground">
                    {format(new Date(selectedActivity.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
              )}

              {selectedActivity.status !== 'completed' ? (
                <>
                  <div>
                    <Label>Resultado</Label>
                    <Select value={resultForm.result} onValueChange={v => setResultForm(p => ({ ...p, result: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione o resultado" /></SelectTrigger>
                      <SelectContent>
                        {DEAL_RESULT_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Anotações</Label>
                    <Textarea value={resultForm.notes} onChange={e => setResultForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações sobre o contato..." rows={3} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedActivity(null)}>Cancelar</Button>
                    <Button onClick={handleExecute} style={{ backgroundColor: DC.teal }}>Concluir Atividade</Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="space-y-2">
                  {selectedActivity.result && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Resultado: </span>
                      <Badge variant="secondary">{DEAL_RESULT_OPTIONS.find(o => o.value === selectedActivity.result)?.label || selectedActivity.result}</Badge>
                    </div>
                  )}
                  {selectedActivity.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Anotações: </span>
                      <span className="text-foreground">{selectedActivity.notes}</span>
                    </div>
                  )}
                  <Badge style={{ backgroundColor: DC.teal, color: '#fff' }}>
                    Concluída {selectedActivity.completed_at && `em ${format(new Date(selectedActivity.completed_at), 'dd/MM/yyyy HH:mm')}`}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Activity Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
            <DialogDescription>Crie uma atividade para um negócio ou contato</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={newForm.type} onValueChange={v => setNewForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data/Hora</Label>
                <Input type="datetime-local" value={newForm.scheduled_at} onChange={e => setNewForm(p => ({ ...p, scheduled_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Ligar para João" />
            </div>
            <div>
              <Label>Descrição / Roteiro</Label>
              <Textarea value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Negócio</Label>
                <Select value={newForm.deal_id} onValueChange={v => setNewForm(p => ({ ...p, deal_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {deals.filter(d => d.status === 'open').map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contato</Label>
                <Select value={newForm.contact_id} onValueChange={v => setNewForm(p => ({ ...p, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={newForm.responsible_id} onValueChange={v => setNewForm(p => ({ ...p, responsible_id: v }))}>
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
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} style={{ backgroundColor: DC.orange }} disabled={!newForm.title}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
