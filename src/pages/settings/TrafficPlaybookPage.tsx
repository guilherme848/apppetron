 import { useState } from 'react';
 import { useSettings } from '@/contexts/SettingsContext';
 import { useTrafficPlaybook } from '@/hooks/useTrafficPlaybook';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Switch } from '@/components/ui/switch';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Plus, Pencil, Trash2, GripVertical, Calendar, Clock, Repeat } from 'lucide-react';
 import { toast } from 'sonner';
 import { TrafficCadence, TrafficPlaybookTemplate, CADENCE_OPTIONS, PRIORITY_OPTIONS, WEEKDAY_OPTIONS } from '@/types/trafficPlaybook';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
 
 const CADENCE_TABS: { value: TrafficCadence; label: string; icon: React.ReactNode }[] = [
   { value: 'daily', label: 'Diária', icon: <Calendar className="h-4 w-4" /> },
   { value: 'weekly', label: 'Semanal', icon: <Repeat className="h-4 w-4" /> },
   { value: 'biweekly', label: 'Quinzenal', icon: <Repeat className="h-4 w-4" /> },
   { value: 'monthly', label: 'Mensal', icon: <Clock className="h-4 w-4" /> },
   { value: 'quarterly', label: 'Trimestral', icon: <Clock className="h-4 w-4" /> },
 ];
 
 export default function TrafficPlaybookPage() {
   const { services } = useSettings();
   const { templates, addTemplate, updateTemplate, deleteTemplate, toggleTemplateActive, loading } = useTrafficPlaybook();
   
   const [selectedServiceId, setSelectedServiceId] = useState<string>('');
   const [selectedCadence, setSelectedCadence] = useState<TrafficCadence>('daily');
   const [formOpen, setFormOpen] = useState(false);
   const [editingTemplate, setEditingTemplate] = useState<TrafficPlaybookTemplate | null>(null);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [templateToDelete, setTemplateToDelete] = useState<TrafficPlaybookTemplate | null>(null);
 
   // Form state
   const [formName, setFormName] = useState('');
   const [formDescription, setFormDescription] = useState('');
   const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
   const [formAnchorDayOfWeek, setFormAnchorDayOfWeek] = useState<number | null>(1);
   const [formAnchorDayOfMonth, setFormAnchorDayOfMonth] = useState<number | null>(1);
   const [formOffsetDays, setFormOffsetDays] = useState(0);
   const [formDefaultOwnerRole, setFormDefaultOwnerRole] = useState('traffic');
 
   // Filter services that have traffic
   const trafficServices = services.filter(s => s.has_traffic && s.active);
 
   // Filter templates by selected service and cadence
   const filteredTemplates = templates.filter(t => {
     const matchesService = !selectedServiceId || t.service_id === selectedServiceId;
     const matchesCadence = t.cadence === selectedCadence;
     return matchesService && matchesCadence;
   });
 
   const handleOpenAdd = () => {
     if (!selectedServiceId) {
       toast.error('Selecione um plano primeiro');
       return;
     }
     setEditingTemplate(null);
     setFormName('');
     setFormDescription('');
     setFormPriority('medium');
     setFormAnchorDayOfWeek(1);
     setFormAnchorDayOfMonth(1);
     setFormOffsetDays(0);
     setFormDefaultOwnerRole('traffic');
     setFormOpen(true);
   };
 
   const handleOpenEdit = (template: TrafficPlaybookTemplate) => {
     setEditingTemplate(template);
     setFormName(template.name);
     setFormDescription(template.description || '');
     setFormPriority(template.priority);
     setFormAnchorDayOfWeek(template.anchor_day_of_week);
     setFormAnchorDayOfMonth(template.anchor_day_of_month);
     setFormOffsetDays(template.offset_days);
     setFormDefaultOwnerRole(template.default_owner_role);
     setFormOpen(true);
   };
 
   const handleSave = async () => {
     if (!formName.trim()) {
       toast.error('Nome é obrigatório');
       return;
     }
 
     // Determine anchor rule based on cadence
     let anchorRule: 'weekday' | 'biweekly_days' | 'month_day' | 'quarter_day' | null = null;
     if (selectedCadence === 'weekly') anchorRule = 'weekday';
     else if (selectedCadence === 'biweekly') anchorRule = 'biweekly_days';
     else if (selectedCadence === 'monthly') anchorRule = 'month_day';
     else if (selectedCadence === 'quarterly') anchorRule = 'quarter_day';
 
     const templateData = {
       service_id: editingTemplate?.service_id || selectedServiceId,
       name: formName.trim(),
       description: formDescription.trim() || null,
       cadence: selectedCadence,
       priority: formPriority,
       anchor_rule: anchorRule,
       anchor_day_of_week: selectedCadence === 'weekly' ? formAnchorDayOfWeek : null,
       anchor_day_of_month: ['biweekly', 'monthly', 'quarterly'].includes(selectedCadence) ? formAnchorDayOfMonth : null,
       offset_days: formOffsetDays,
       default_owner_role: formDefaultOwnerRole,
       checklist: [],
       sort_order: editingTemplate?.sort_order ?? filteredTemplates.length,
       active: editingTemplate?.active ?? true,
     };
 
     if (editingTemplate) {
       await updateTemplate(editingTemplate.id, templateData);
     } else {
       await addTemplate(templateData);
     }
 
     setFormOpen(false);
   };
 
   const handleConfirmDelete = async () => {
     if (!templateToDelete) return;
     await deleteTemplate(templateToDelete.id);
     setDeleteDialogOpen(false);
     setTemplateToDelete(null);
   };
 
   const getServiceName = (serviceId: string) => {
     return services.find(s => s.id === serviceId)?.name || 'Plano desconhecido';
   };
 
   if (loading) {
     return <div className="p-6">Carregando...</div>;
   }
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold">Playbook de Tráfego</h1>
         <p className="text-muted-foreground">
           Gerencie os templates de tarefas recorrentes por plano e cadência.
         </p>
       </div>
 
       {/* Service Selector */}
       <Card>
         <CardHeader>
           <CardTitle className="text-base">Selecione o Plano</CardTitle>
           <CardDescription>
             Os templates são organizados por plano. Selecione um plano para gerenciar seus templates.
           </CardDescription>
         </CardHeader>
         <CardContent>
           <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
             <SelectTrigger className="w-full md:w-[300px]">
               <SelectValue placeholder="Selecione um plano..." />
             </SelectTrigger>
             <SelectContent>
               {trafficServices.length === 0 ? (
                 <SelectItem value="_none" disabled>
                   Nenhum plano com tráfego configurado
                 </SelectItem>
               ) : (
                 trafficServices.map(service => (
                   <SelectItem key={service.id} value={service.id}>
                     {service.name}
                   </SelectItem>
                 ))
               )}
             </SelectContent>
           </Select>
         </CardContent>
       </Card>
 
       {/* Cadence Tabs */}
       {selectedServiceId && (
         <Card>
           <CardHeader className="flex-row items-center justify-between space-y-0">
             <div>
               <CardTitle className="text-base">Templates por Cadência</CardTitle>
               <CardDescription>
                 Organize as tarefas recorrentes por frequência de execução.
               </CardDescription>
             </div>
             <Button onClick={handleOpenAdd} size="sm">
               <Plus className="h-4 w-4 mr-2" />
               Novo Template
             </Button>
           </CardHeader>
           <CardContent>
             <Tabs value={selectedCadence} onValueChange={(v) => setSelectedCadence(v as TrafficCadence)}>
               <TabsList className="grid w-full grid-cols-5">
                 {CADENCE_TABS.map(tab => (
                   <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1">
                     {tab.icon}
                     <span className="hidden sm:inline">{tab.label}</span>
                   </TabsTrigger>
                 ))}
               </TabsList>
 
               {CADENCE_TABS.map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-4">
                   {filteredTemplates.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground">
                       <p>Nenhum template cadastrado para esta cadência.</p>
                       <Button variant="outline" className="mt-4" onClick={handleOpenAdd}>
                         <Plus className="h-4 w-4 mr-2" />
                         Criar primeiro template
                       </Button>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       {filteredTemplates.map((template) => (
                         <div
                           key={template.id}
                           className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                         >
                           <div className="flex items-center gap-3">
                             <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                             <div>
                               <div className="flex items-center gap-2">
                                 <span className="font-medium">{template.name}</span>
                                 <Badge variant={template.active ? 'default' : 'secondary'}>
                                   {template.active ? 'Ativo' : 'Inativo'}
                                 </Badge>
                                 <Badge variant="outline" className={PRIORITY_OPTIONS.find(p => p.value === template.priority)?.color}>
                                   {PRIORITY_OPTIONS.find(p => p.value === template.priority)?.label}
                                 </Badge>
                               </div>
                               {template.description && (
                                 <p className="text-sm text-muted-foreground line-clamp-1">
                                   {template.description}
                                 </p>
                               )}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <Switch
                               checked={template.active}
                               onCheckedChange={() => toggleTemplateActive(template.id)}
                             />
                             <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(template)}>
                               <Pencil className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="text-destructive hover:text-destructive"
                               onClick={() => {
                                 setTemplateToDelete(template);
                                 setDeleteDialogOpen(true);
                               }}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </TabsContent>
               ))}
             </Tabs>
           </CardContent>
         </Card>
       )}
 
       {/* Template Form Dialog */}
       <Dialog open={formOpen} onOpenChange={setFormOpen}>
         <DialogContent className="max-w-lg">
           <DialogHeader>
             <DialogTitle>
               {editingTemplate ? 'Editar Template' : 'Novo Template'}
             </DialogTitle>
             <DialogDescription>
               {editingTemplate
                 ? `Editando template para ${getServiceName(editingTemplate.service_id)}`
                 : `Criando template ${CADENCE_OPTIONS.find(c => c.value === selectedCadence)?.label.toLowerCase()} para ${getServiceName(selectedServiceId)}`}
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="name">Nome *</Label>
               <Input
                 id="name"
                 value={formName}
                 onChange={(e) => setFormName(e.target.value)}
                 placeholder="Ex: Análise de Métricas"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="description">Descrição</Label>
               <Textarea
                 id="description"
                 value={formDescription}
                 onChange={(e) => setFormDescription(e.target.value)}
                 placeholder="Instruções detalhadas para a tarefa..."
                 rows={3}
               />
             </div>
 
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Prioridade</Label>
                 <Select value={formPriority} onValueChange={(v) => setFormPriority(v as 'low' | 'medium' | 'high')}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {PRIORITY_OPTIONS.map(opt => (
                       <SelectItem key={opt.value} value={opt.value}>
                         {opt.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-2">
                 <Label>Responsável Padrão</Label>
                 <Select value={formDefaultOwnerRole} onValueChange={setFormDefaultOwnerRole}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="traffic">Gestor de Tráfego</SelectItem>
                     <SelectItem value="designer">Designer</SelectItem>
                     <SelectItem value="social">Social Media</SelectItem>
                     <SelectItem value="cs">Customer Success</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             {/* Anchor fields based on cadence */}
             {selectedCadence === 'weekly' && (
               <div className="space-y-2">
                 <Label>Dia da Semana</Label>
                 <Select
                   value={formAnchorDayOfWeek?.toString() || '1'}
                   onValueChange={(v) => setFormAnchorDayOfWeek(parseInt(v))}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {WEEKDAY_OPTIONS.map(opt => (
                       <SelectItem key={opt.value} value={opt.value.toString()}>
                         {opt.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             )}
 
             {['monthly', 'quarterly'].includes(selectedCadence) && (
               <div className="space-y-2">
                 <Label>Dia do Mês (1-28)</Label>
                 <Input
                   type="number"
                   min={1}
                   max={28}
                   value={formAnchorDayOfMonth || 1}
                   onChange={(e) => setFormAnchorDayOfMonth(parseInt(e.target.value) || 1)}
                 />
               </div>
             )}
 
             <div className="space-y-2">
               <Label>Offset (dias)</Label>
               <Input
                 type="number"
                 value={formOffsetDays}
                 onChange={(e) => setFormOffsetDays(parseInt(e.target.value) || 0)}
               />
               <p className="text-xs text-muted-foreground">
                 Adiciona dias ao vencimento padrão. Use valores negativos para antecipar.
               </p>
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setFormOpen(false)}>
               Cancelar
             </Button>
             <Button onClick={handleSave}>
               {editingTemplate ? 'Salvar' : 'Criar'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Delete Confirmation */}
       <ConfirmDeleteDialog
         open={deleteDialogOpen}
         onOpenChange={setDeleteDialogOpen}
         onConfirm={handleConfirmDelete}
         title="Excluir Template"
         description={`Tem certeza que deseja excluir o template "${templateToDelete?.name}"? Esta ação não pode ser desfeita.`}
      >
        <span className="hidden" />
      </ConfirmDeleteDialog>
     </div>
   );
 }