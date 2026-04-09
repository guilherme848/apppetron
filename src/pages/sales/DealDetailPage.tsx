import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useDealDetail } from '@/hooks/useDealDetail';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCrmTemplates } from '@/hooks/useCrmTemplates';
import { DC } from '@/lib/dashboardColors';
import { ChevronLeft, ChevronRight, Phone, MessageCircle, Mail, CalendarPlus, Paperclip, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DealActivitiesTab } from '@/components/sales/deal-tabs/DealActivitiesTab';
import { DealContactTab } from '@/components/sales/deal-tabs/DealContactTab';
import { DealCompanyTab } from '@/components/sales/deal-tabs/DealCompanyTab';
import { DealBusinessTab } from '@/components/sales/deal-tabs/DealBusinessTab';
import { DealConversationsTab } from '@/components/sales/deal-tabs/DealConversationsTab';
import { DealFilesTab } from '@/components/sales/deal-tabs/DealFilesTab';
import { DealHistoryTab } from '@/components/sales/deal-tabs/DealHistoryTab';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const {
    deal, activities, events, files, stages, funnel, adjacentDeals, loading,
    changeStage, updateDealField, updateContact, uploadFile, deleteFile,
    refetchActivities, refetchEvents,
  } = useDealDetail(id);
  const { members: teamMembers } = useTeamMembers();
  const { templates, getTemplatesForContext, replaceVariables } = useCrmTemplates();
  const [stageConfirm, setStageConfirm] = useState<string | null>(null);
  const [changingStage, setChangingStage] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Negócio não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/sales/funnels')}>
          Voltar
        </Button>
      </div>
    );
  }

  const contact = deal.contact;
  const contactInitials = contact?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const currentStageIdx = stages.findIndex(s => s.id === deal.stage_id);
  const phone = contact?.phone;
  const whatsappUrl = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : null;

  const handleStageClick = (stageId: string) => {
    if (stageId === deal.stage_id) return;
    setStageConfirm(stageId);
  };

  const confirmStageChange = async () => {
    if (!stageConfirm) return;
    setChangingStage(true);
    const ok = await changeStage(stageConfirm);
    setChangingStage(false);
    if (ok) toast.success('Etapa atualizada!');
    setStageConfirm(null);
  };

  const handleReassign = async (memberId: string) => {
    await updateDealField('responsible_id', memberId, 'Responsável');
    toast.success('Responsável alterado');
  };

  const templateVars: Record<string, string> = {
    nome_contato: contact?.name || '',
    empresa: contact?.company || '',
    responsavel: deal.responsible?.name || '',
    telefone: contact?.phone || '',
    instagram: contact?.instagram || '',
    etapa_atual: stages.find(s => s.id === deal.stage_id)?.name || '',
    valor_deal: Number(deal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    data_hoje: new Date().toLocaleDateString('pt-BR'),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/sales/funnels')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="cursor-pointer hover:underline" onClick={() => navigate('/sales/funnels')}>{funnel?.name || 'Funil'}</span>
        <span>›</span>
        <span className="text-foreground font-medium">{deal.title}</span>
        
        {/* Adjacent navigation */}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={!adjacentDeals.prev}
            onClick={() => adjacentDeals.prev && navigate(`/sales/deals/${adjacentDeals.prev}`)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={!adjacentDeals.next}
            onClick={() => adjacentDeals.next && navigate(`/sales/deals/${adjacentDeals.next}`)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="px-6 pb-4 flex items-center gap-4 flex-wrap border-b">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="text-sm font-bold" style={{ backgroundColor: DC.orange20, color: DC.orange }}>
            {contactInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {contact?.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
          <h1 className="text-lg font-bold text-foreground truncate">{contact?.name || deal.title}</h1>
        </div>

        {/* Quick action icons */}
        <div className="flex items-center gap-1">
          {phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`tel:${phone}`)}>
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ligar</TooltipContent>
            </Tooltip>
          )}
          {whatsappUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(whatsappUrl, '_blank')}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
          )}
          {contact?.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`mailto:${contact.email}`)}>
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>E-mail</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Responsible */}
        <div className="flex items-center gap-2">
          <Select value={deal.responsible_id || ''} onValueChange={handleReassign}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value */}
        <Badge variant="outline" className="text-sm font-bold" style={{ borderColor: DC.orange, color: DC.orange }}>
          {Number(deal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Badge>
      </div>

      {/* Funnel Progress Bar */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-1 overflow-x-auto">
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            const isFuture = idx > currentStageIdx;

            return (
              <div key={stage.id} className="flex items-center">
                {idx > 0 && (
                  <div className={cn("h-0.5 w-6 mx-1", isCompleted || isCurrent ? "bg-primary" : "bg-border")}
                    style={isCompleted ? { backgroundColor: DC.teal } : isCurrent ? { backgroundColor: DC.orange } : {}}
                  />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleStageClick(stage.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                        isCompleted && "text-white",
                        isCurrent && "text-white ring-2 ring-offset-1",
                        isFuture && "text-muted-foreground bg-muted hover:bg-accent"
                      )}
                      style={
                        isCompleted ? { backgroundColor: DC.teal }
                        : isCurrent ? { backgroundColor: DC.orange }
                        : {}
                      }
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{idx + 1}</span>}
                      {stage.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{stage.name}</TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7 Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="activities" className="flex flex-col h-full">
          <div className="px-6 pt-3 border-b">
            <TabsList className="h-auto overflow-x-auto flex-nowrap">
              <TabsTrigger value="activities">Atividades</TabsTrigger>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="company">Empresa</TabsTrigger>
              <TabsTrigger value="deal">Negócio</TabsTrigger>
              <TabsTrigger value="conversations">Conversas</TabsTrigger>
              <TabsTrigger value="files">Arquivos</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="activities" className="mt-0 h-full">
              <DealActivitiesTab
                deal={deal}
                activities={activities}
                stages={stages}
                templates={templates}
                getTemplatesForContext={getTemplatesForContext}
                replaceVariables={replaceVariables}
                templateVars={templateVars}
                refetchActivities={refetchActivities}
                refetchEvents={refetchEvents}
              />
            </TabsContent>
            <TabsContent value="contact" className="mt-0 p-6">
              <DealContactTab deal={deal} updateContact={updateContact} />
            </TabsContent>
            <TabsContent value="company" className="mt-0 p-6">
              <DealCompanyTab deal={deal} updateContact={updateContact} />
            </TabsContent>
            <TabsContent value="deal" className="mt-0 p-6">
              <DealBusinessTab deal={deal} updateDealField={updateDealField} />
            </TabsContent>
            <TabsContent value="conversations" className="mt-0 p-6">
              <DealConversationsTab dealId={id} />
            </TabsContent>
            <TabsContent value="files" className="mt-0 p-6">
              <DealFilesTab files={files} uploadFile={uploadFile} deleteFile={deleteFile} />
            </TabsContent>
            <TabsContent value="history" className="mt-0 p-6">
              <DealHistoryTab events={events} stages={stages} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Stage confirm dialog */}
      <Dialog open={!!stageConfirm} onOpenChange={() => setStageConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover para etapa</DialogTitle>
            <DialogDescription>
              Confirma a mudança para "{stages.find(s => s.id === stageConfirm)?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageConfirm(null)} disabled={changingStage}>Cancelar</Button>
            <Button onClick={confirmStageChange} disabled={changingStage} style={{ backgroundColor: DC.orange }}>
              {changingStage ? 'Movendo...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
