import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS } from '@/types/sales';
import { Phone, MessageCircle, Mail, Calendar, CheckSquare, Plus, Pencil, Info, Copy } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SalesActivity } from '@/types/sales';
import type { CrmTemplate } from '@/hooks/useCrmTemplates';

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
};

interface Props {
  deal: any;
  activities: SalesActivity[];
  stages: any[];
  templates: CrmTemplate[];
  getTemplatesForContext: (funnelId?: string, stageId?: string, type?: string) => CrmTemplate[];
  replaceVariables: (content: string, vars: Record<string, string>) => string;
  templateVars: Record<string, string>;
  refetchActivities: () => void;
  refetchEvents: () => void;
}

export function DealActivitiesTab({ deal, activities, stages, templates, getTemplatesForContext, replaceVariables, templateVars, refetchActivities, refetchEvents }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<SalesActivity | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({ type: 'call', title: '', scheduled_at: '' });

  // Group activities by day offset
  const grouped = activities.reduce((acc, act) => {
    const day = act.scheduled_at ? format(new Date(act.scheduled_at), 'dd/MM') : 'Sem data';
    if (!acc[day]) acc[day] = [];
    acc[day].push(act);
    return acc;
  }, {} as Record<string, SalesActivity[]>);

  const handleToggleComplete = async (activity: SalesActivity) => {
    const newStatus = activity.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('crm_activities').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    } as any).eq('id', activity.id);

    if (newStatus === 'completed') {
      await supabase.from('crm_deal_events').insert({
        deal_id: deal.id,
        event_type: 'activity_completed',
        title: `Atividade concluída: ${activity.title}`,
        description: `Tipo: ${ACTIVITY_TYPE_LABELS[activity.type] || activity.type}`,
        metadata: { activity_id: activity.id, type: activity.type },
      } as any);
    }
    refetchActivities();
    refetchEvents();
    toast.success(newStatus === 'completed' ? 'Atividade concluída!' : 'Atividade reaberta');
  };

  const handleCreateActivity = async () => {
    if (!newForm.title) return;
    await supabase.from('crm_activities').insert({
      deal_id: deal.id,
      contact_id: deal.contact_id,
      type: newForm.type,
      title: newForm.title,
      scheduled_at: newForm.scheduled_at || null,
      status: 'pending',
    } as any);
    await supabase.from('crm_deal_events').insert({
      deal_id: deal.id,
      event_type: 'activity_created',
      title: `Atividade criada: ${newForm.title}`,
      metadata: { type: newForm.type },
    } as any);
    refetchActivities();
    refetchEvents();
    setShowNewDialog(false);
    setNewForm({ type: 'call', title: '', scheduled_at: '' });
    toast.success('Atividade criada!');
  };

  // Template for selected activity
  const selectedTemplate = selectedActivity
    ? getTemplatesForContext(deal.funnel_id, deal.stage_id, selectedActivity.type)[0] || null
    : null;
  const renderedContent = selectedTemplate
    ? replaceVariables(selectedTemplate.content, templateVars)
    : null;

  const handleCopyTemplate = () => {
    if (renderedContent) {
      navigator.clipboard.writeText(renderedContent);
      toast.success('Copiado!');
    }
  };

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Left column — Activity list */}
      <div className="w-[340px] border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between text-xs font-medium text-muted-foreground">
          <div className="flex gap-8">
            <span>Dias</span>
            <span>Próximas atividades</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">Nenhuma atividade</p>
          ) : (
            Object.entries(grouped).map(([day, acts]) => (
              <div key={day}>
                {acts.map(act => {
                  const Icon = TYPE_ICONS[act.type] || CheckSquare;
                  const isOverdue = act.status === 'pending' && act.scheduled_at && isPast(new Date(act.scheduled_at)) && !isToday(new Date(act.scheduled_at));
                  const isCompleted = act.status === 'completed';
                  const isSelected = selectedActivity?.id === act.id;

                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b transition-colors",
                        isSelected && "border-l-2 bg-[var(--activity-selected-bg)]",
                        isOverdue && !isSelected && "bg-destructive/5",
                        !isSelected && !isOverdue && "hover:bg-muted/50"
                      )}
                      style={{
                        borderLeftColor: isSelected ? DC.orange : 'transparent',
                        ['--activity-selected-bg' as any]: DC.orangeBg,
                      }}
                    >
                      <span className={cn("text-xs w-12 shrink-0", isOverdue && "text-destructive font-medium")}>
                        {day}
                      </span>
                      <Icon className="h-4 w-4 shrink-0" style={{ color: ACTIVITY_TYPE_COLORS[act.type] || DC.textSecondary }} />
                      <span className={cn("flex-1 text-sm truncate", isCompleted && "line-through text-muted-foreground")}>
                        {act.title}
                      </span>
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleComplete(act)}
                        className="shrink-0"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-3 w-3 mr-1" /> Nova atividade
          </Button>
        </div>
      </div>

      {/* Right column — Template viewer */}
      <div className="flex-1 flex flex-col">
        {!selectedActivity ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione uma atividade para ver o template
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => { const I = TYPE_ICONS[selectedActivity.type] || CheckSquare; return <I className="h-4 w-4" style={{ color: ACTIVITY_TYPE_COLORS[selectedActivity.type] }} />; })()}
                <span className="font-medium text-foreground">{selectedActivity.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedTemplate ? (
                <>
                  <h3 className="text-sm font-bold uppercase text-muted-foreground mb-3">{selectedTemplate.name}</h3>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {renderedContent}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum template vinculado a esta atividade.
                  <br />
                  <span className="text-xs">Configure templates em Configurações → Templates</span>
                </p>
              )}
            </div>
            <div className="p-3 border-t flex items-center gap-2">
              {selectedActivity.type === 'call' && deal.contact?.phone && (
                <Button size="sm" style={{ backgroundColor: DC.orange }} onClick={() => window.open(`tel:${deal.contact.phone}`)}>
                  <Phone className="h-4 w-4 mr-1" /> Ligar para {deal.contact?.name?.split(' ')[0]}
                </Button>
              )}
              {selectedActivity.type === 'whatsapp' && deal.contact?.phone && (
                <Button size="sm" style={{ backgroundColor: DC.teal }} className="text-white"
                  onClick={() => {
                    const msg = renderedContent ? encodeURIComponent(renderedContent) : '';
                    window.open(`https://wa.me/${deal.contact.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                  }}>
                  <MessageCircle className="h-4 w-4 mr-1" /> Abrir WhatsApp
                </Button>
              )}
              {renderedContent && (
                <Button variant="outline" size="sm" onClick={handleCopyTemplate}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* New Activity Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
            <DialogDescription>Adicione uma atividade ao deal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={newForm.type} onValueChange={v => setNewForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Ligação 1" />
            </div>
            <div>
              <Label>Data/Hora</Label>
              <Input type="datetime-local" value={newForm.scheduled_at} onChange={e => setNewForm(f => ({ ...f, scheduled_at: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateActivity} style={{ backgroundColor: DC.orange }} disabled={!newForm.title}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
