 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { 
   AlertCircle, Clock, CheckCircle2, Circle, Play, Ban, User, Calendar 
 } from 'lucide-react';
 import { format, parseISO, isToday, isPast } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { 
   TrafficPlaybookTask, TrafficTaskStatus, TrafficBlockedReason,
   TASK_STATUS_OPTIONS, CADENCE_OPTIONS, BLOCKED_REASON_OPTIONS 
 } from '@/types/trafficPlaybook';
 
 interface WorkQueueBlockProps {
   tasks: TrafficPlaybookTask[];
   getClientName: (id: string) => string;
   getManagerName: (id: string | null) => string;
   managers: { id: string; name: string }[];
   onUpdateTask: (id: string, updates: Partial<TrafficPlaybookTask>) => Promise<boolean>;
 }
 
 export default function WorkQueueBlock({ 
   tasks, getClientName, getManagerName, managers, onUpdateTask 
 }: WorkQueueBlockProps) {
   const [blockingTaskId, setBlockingTaskId] = useState<string | null>(null);
   const [blockReason, setBlockReason] = useState<TrafficBlockedReason>('waiting_creatives');
   const [blockNotes, setBlockNotes] = useState('');
 
   const handleStatusChange = async (taskId: string, newStatus: TrafficTaskStatus) => {
     if (newStatus === 'blocked') {
       setBlockingTaskId(taskId);
       return;
     }
     await onUpdateTask(taskId, { status: newStatus });
   };
 
   const handleConfirmBlock = async () => {
     if (!blockingTaskId) return;
     await onUpdateTask(blockingTaskId, { 
       status: 'blocked', 
       blocked_reason: blockReason,
       notes: blockNotes || null,
     });
     setBlockingTaskId(null);
     setBlockNotes('');
   };
 
   const handleAssigneeChange = async (taskId: string, assigneeId: string) => {
     await onUpdateTask(taskId, { assigned_to: assigneeId === 'unassigned' ? null : assigneeId });
   };
 
   const getStatusIcon = (task: TrafficPlaybookTask) => {
     const today = new Date().toISOString().split('T')[0];
     const isOverdue = task.status !== 'done' && task.status !== 'skipped' && task.due_date < today;
 
     if (isOverdue) return <AlertCircle className="h-4 w-4 text-destructive" />;
     if (task.status === 'blocked') return <Ban className="h-4 w-4 text-destructive" />;
     if (task.status === 'doing') return <Play className="h-4 w-4 text-primary" />;
     if (task.status === 'done') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
     if (isToday(parseISO(task.due_date))) return <Clock className="h-4 w-4 text-yellow-600" />;
     return <Circle className="h-4 w-4 text-muted-foreground" />;
   };
 
   const getDueBadge = (task: TrafficPlaybookTask) => {
     const today = new Date().toISOString().split('T')[0];
     const isOverdue = task.status !== 'done' && task.status !== 'skipped' && task.due_date < today;
     const isTodayDue = task.due_date === today;
 
     if (isOverdue) return <Badge variant="destructive">Atrasada</Badge>;
     if (isTodayDue) return <Badge className="bg-yellow-500">Hoje</Badge>;
     return <Badge variant="secondary">{format(parseISO(task.due_date), "dd/MM", { locale: ptBR })}</Badge>;
   };
 
   const getCadenceLabel = (cadence: string | null) => {
     return CADENCE_OPTIONS.find(c => c.value === cadence)?.label || cadence || 'N/A';
   };
 
   return (
     <>
       <Card>
         <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="text-lg">Fila de Trabalho</CardTitle>
               <CardDescription>{tasks.length} tarefa(s)</CardDescription>
             </div>
           </div>
         </CardHeader>
         <CardContent className="p-0">
           <ScrollArea className="h-[400px]">
             <div className="space-y-1 p-4 pt-0">
               {tasks.length === 0 ? (
                 <p className="text-center text-muted-foreground py-8">Nenhuma tarefa encontrada</p>
               ) : (
                 tasks.map(task => (
                   <div 
                     key={task.id} 
                     className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                   >
                     <button 
                       onClick={() => handleStatusChange(task.id, task.status === 'doing' ? 'done' : 'doing')}
                       className="shrink-0"
                     >
                       {getStatusIcon(task)}
                     </button>
                     
                     <div className="flex-1 min-w-0 space-y-1">
                       <div className="flex items-center gap-2 flex-wrap">
                         <span className="font-medium truncate">{task.title}</span>
                         {getDueBadge(task)}
                         <Badge variant="outline" className="text-xs">
                           {getCadenceLabel(task.cadence)}
                         </Badge>
                         {task.status === 'blocked' && task.blocked_reason && (
                           <Badge variant="destructive" className="text-xs">
                             {BLOCKED_REASON_OPTIONS.find(r => r.value === task.blocked_reason)?.label}
                           </Badge>
                         )}
                       </div>
                       <div className="flex items-center gap-3 text-sm text-muted-foreground">
                         <span className="flex items-center gap-1">
                           <Calendar className="h-3 w-3" />
                           {getClientName(task.client_id)}
                         </span>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2 shrink-0">
                       <Select 
                         value={task.assigned_to || 'unassigned'} 
                         onValueChange={(v) => handleAssigneeChange(task.id, v)}
                       >
                         <SelectTrigger className="w-[140px] h-8 text-xs">
                           <User className="h-3 w-3 mr-1" />
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="unassigned">Não atribuído</SelectItem>
                           {managers.map(m => (
                             <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       
                       <Select 
                         value={task.status} 
                         onValueChange={(v) => handleStatusChange(task.id, v as TrafficTaskStatus)}
                       >
                         <SelectTrigger className="w-[110px] h-8 text-xs">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {TASK_STATUS_OPTIONS.map(opt => (
                             <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </ScrollArea>
         </CardContent>
       </Card>
 
       {/* Block Dialog */}
       <Dialog open={!!blockingTaskId} onOpenChange={() => setBlockingTaskId(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Bloquear Tarefa</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Motivo do Bloqueio</Label>
               <Select value={blockReason} onValueChange={(v) => setBlockReason(v as TrafficBlockedReason)}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {BLOCKED_REASON_OPTIONS.map(opt => (
                     <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Observações (opcional)</Label>
               <Textarea 
                 value={blockNotes} 
                 onChange={(e) => setBlockNotes(e.target.value)}
                 placeholder="Detalhes do bloqueio..."
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setBlockingTaskId(null)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleConfirmBlock}>Bloquear</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 }