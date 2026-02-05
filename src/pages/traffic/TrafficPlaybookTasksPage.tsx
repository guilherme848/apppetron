 import { useState, useMemo, useEffect } from 'react';
 import { useTrafficPlaybook } from '@/hooks/useTrafficPlaybook';
 import { useCrm } from '@/contexts/CrmContext';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { 
   Search, Filter, Calendar, Clock, CheckCircle2, Circle, AlertCircle, 
  Play, RotateCcw, RefreshCw, ChevronDown, ChevronUp, User, CalendarDays
 } from 'lucide-react';
 import { format, isToday, isPast, isFuture, parseISO } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
import { TrafficPlaybookTask, TrafficTaskStatus, TASK_STATUS_OPTIONS, CADENCE_OPTIONS, CAMPAIGN_STATUS_OPTIONS, WORKDAY_OPTIONS } from '@/types/trafficPlaybook';
 import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 
 export default function TrafficPlaybookTasksPage() {
  const { tasks, updateTaskStatus, generateTasks, clientStatuses, upsertClientStatus, updateClientWeeklyWorkday, loading, refetch } = useTrafficPlaybook();
   const { accounts } = useCrm();
 
   // Fetch team members directly
   const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
   useEffect(() => {
     supabase.from('team_members').select('id, name').then(({ data }) => {
       if (data) setTeamMembers(data);
     });
   }, []);
 
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState<string>('pending');
   const [cadenceFilter, setCadenceFilter] = useState<string>('all');
   const [clientFilter, setClientFilter] = useState<string>('all');
   const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [weekdayFilter, setWeekdayFilter] = useState<string>('all');
   const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
   const [generating, setGenerating] = useState(false);
 
   // Task detail modal
   const [selectedTask, setSelectedTask] = useState<TrafficPlaybookTask | null>(null);
   const [taskNotes, setTaskNotes] = useState('');
  
  // Client workday edit modal
  const [editingClientWorkday, setEditingClientWorkday] = useState<string | null>(null);
  const [pendingWorkday, setPendingWorkday] = useState<number>(2);
 
   // Filtered and sorted tasks
   const filteredTasks = useMemo(() => {
     return tasks.filter(task => {
       // Search filter
       if (search) {
         const client = accounts.find(a => a.id === task.client_id);
         const searchLower = search.toLowerCase();
         if (!task.title.toLowerCase().includes(searchLower) && 
             !client?.name.toLowerCase().includes(searchLower)) {
           return false;
         }
       }
 
       // Status filter
       if (statusFilter === 'pending' && (task.status === 'done' || task.status === 'skipped')) {
         return false;
       } else if (statusFilter !== 'all' && statusFilter !== 'pending' && task.status !== statusFilter) {
         return false;
       }
 
       // Cadence filter
       if (cadenceFilter !== 'all' && task.cadence !== cadenceFilter) {
         return false;
       }
 
       // Client filter
       if (clientFilter !== 'all' && task.client_id !== clientFilter) {
         return false;
       }
 
       // Assignee filter
       if (assigneeFilter !== 'all' && task.assigned_to !== assigneeFilter) {
         return false;
       }
 
      // Weekday filter (for due_date)
      if (weekdayFilter !== 'all') {
        const dueDate = parseISO(task.due_date);
        const dayOfWeek = dueDate.getDay();
        // Convert JS day (0=Sunday, 1=Monday...) to our format (1=Monday...5=Friday)
        const ourDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        if (ourDay !== parseInt(weekdayFilter)) {
          return false;
        }
      }

       return true;
     }).sort((a, b) => {
       const priorityOrder = { high: 0, medium: 1, low: 2 };
      // Sort by due date, then by priority
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      return priorityOrder[a.priority] - priorityOrder[b.priority];
     });
  }, [tasks, search, statusFilter, cadenceFilter, clientFilter, assigneeFilter, weekdayFilter, accounts]);
 
   // Group tasks by date
   const groupedTasks = useMemo(() => {
     const groups: Record<string, TrafficPlaybookTask[]> = {};
     filteredTasks.forEach(task => {
       const date = task.due_date;
       if (!groups[date]) groups[date] = [];
       groups[date].push(task);
     });
     return groups;
   }, [filteredTasks]);
 
   // Metrics
   const overdueTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped' && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
   const todayTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped' && isToday(parseISO(t.due_date)));
   const upcomingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped' && isFuture(parseISO(t.due_date)));
 
   const handleGenerateTasks = async () => {
     setGenerating(true);
     try {
       await generateTasks(30);
     } finally {
       setGenerating(false);
     }
   };
 
   const handleStatusChange = async (taskId: string, newStatus: TrafficTaskStatus) => {
     await updateTaskStatus(taskId, newStatus);
   };
 
   const toggleTaskExpanded = (taskId: string) => {
     setExpandedTasks(prev => {
       const next = new Set(prev);
       if (next.has(taskId)) next.delete(taskId);
       else next.add(taskId);
       return next;
     });
   };
 
   const getClientName = (clientId: string) => {
     return accounts.find(a => a.id === clientId)?.name || 'Cliente desconhecido';
   };
 
   const getAssigneeName = (assigneeId: string | null) => {
     if (!assigneeId) return 'Não atribuído';
     const member = teamMembers.find(m => m.id === assigneeId);
     return member?.name || 'Usuário desconhecido';
   };
 
   const getClientStatus = (clientId: string) => {
     return clientStatuses.find(s => s.client_id === clientId);
   };

  const getClientWeeklyWorkday = (clientId: string): number => {
    const status = clientStatuses.find(s => s.client_id === clientId);
    return status?.weekly_workday ?? 2;
  };

  const handleEditClientWorkday = (clientId: string) => {
    const currentDay = getClientWeeklyWorkday(clientId);
    setPendingWorkday(currentDay);
    setEditingClientWorkday(clientId);
  };

  const handleSaveClientWorkday = async () => {
    if (!editingClientWorkday) return;
    await updateClientWeeklyWorkday(editingClientWorkday, pendingWorkday);
    setEditingClientWorkday(null);
  };
 
   const getDateLabel = (dateStr: string) => {
     const date = parseISO(dateStr);
     if (isToday(date)) return 'Hoje';
     if (isPast(date)) return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
     return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
   };
 
   const getDateBadgeVariant = (dateStr: string) => {
     const date = parseISO(dateStr);
     if (isToday(date)) return 'default';
     if (isPast(date)) return 'destructive';
     return 'secondary';
   };
 
   // Unique clients and assignees for filters
   const uniqueClients = useMemo(() => {
     const clientIds = [...new Set(tasks.map(t => t.client_id))];
     return clientIds.map(id => ({ id, name: getClientName(id) })).sort((a, b) => a.name.localeCompare(b.name));
   }, [tasks, accounts]);
 
   const uniqueAssignees = useMemo(() => {
     const assigneeIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))] as string[];
     return assigneeIds.map(id => ({ id, name: getAssigneeName(id) })).sort((a, b) => a.name.localeCompare(b.name));
   }, [tasks, teamMembers]);
 
   if (loading) {
     return <div className="p-6">Carregando...</div>;
   }
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
           <h1 className="text-2xl font-bold">Tarefas de Tráfego</h1>
           <p className="text-muted-foreground">
             Gerencie as tarefas operacionais do time de tráfego.
           </p>
         </div>
         <div className="flex gap-2">
           <Button variant="outline" onClick={() => refetch()}>
             <RefreshCw className="h-4 w-4 mr-2" />
             Atualizar
           </Button>
           <Button onClick={handleGenerateTasks} disabled={generating}>
             <RotateCcw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
             Gerar Próximos 30 dias
           </Button>
         </div>
       </div>
 
       {/* Metrics Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="border-l-4 border-l-red-500">
           <CardHeader className="pb-2">
             <CardDescription>Atrasadas</CardDescription>
             <CardTitle className="text-2xl text-red-600">{overdueTasks.length}</CardTitle>
           </CardHeader>
         </Card>
         <Card className="border-l-4 border-l-yellow-500">
           <CardHeader className="pb-2">
             <CardDescription>Para Hoje</CardDescription>
             <CardTitle className="text-2xl text-yellow-600">{todayTasks.length}</CardTitle>
           </CardHeader>
         </Card>
         <Card className="border-l-4 border-l-blue-500">
           <CardHeader className="pb-2">
             <CardDescription>Próximas</CardDescription>
             <CardTitle className="text-2xl text-blue-600">{upcomingTasks.length}</CardTitle>
           </CardHeader>
         </Card>
       </div>
 
       {/* Filters */}
       <Card>
         <CardContent className="pt-6">
           <div className="flex flex-wrap gap-4">
             <div className="flex-1 min-w-[200px]">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Buscar por tarefa ou cliente..."
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="pl-10"
                 />
               </div>
             </div>
 
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-[150px]">
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos</SelectItem>
                 <SelectItem value="pending">Pendentes</SelectItem>
                 {TASK_STATUS_OPTIONS.map(opt => (
                   <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
 
             <Select value={cadenceFilter} onValueChange={setCadenceFilter}>
               <SelectTrigger className="w-[150px]">
                 <SelectValue placeholder="Cadência" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todas</SelectItem>
                 {CADENCE_OPTIONS.map(opt => (
                   <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
 
             <Select value={clientFilter} onValueChange={setClientFilter}>
               <SelectTrigger className="w-[180px]">
                 <SelectValue placeholder="Cliente" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os clientes</SelectItem>
                 {uniqueClients.map(client => (
                   <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
 
             <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
               <SelectTrigger className="w-[180px]">
                 <SelectValue placeholder="Responsável" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos</SelectItem>
                 {uniqueAssignees.map(assignee => (
                   <SelectItem key={assignee.id} value={assignee.id}>{assignee.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>

              <Select value={weekdayFilter} onValueChange={setWeekdayFilter}>
                <SelectTrigger className="w-[140px]">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dias</SelectItem>
                  {WORKDAY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
         </CardContent>
       </Card>
 
       {/* Task List */}
       {Object.keys(groupedTasks).length === 0 ? (
         <Card>
           <CardContent className="py-12 text-center">
             <p className="text-muted-foreground mb-4">Nenhuma tarefa encontrada.</p>
             <Button variant="outline" onClick={handleGenerateTasks} disabled={generating}>
               <RotateCcw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
               Gerar Tarefas
             </Button>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-6">
           {Object.entries(groupedTasks).map(([date, dateTasks]) => (
             <div key={date}>
               <div className="flex items-center gap-2 mb-3">
                 <Badge variant={getDateBadgeVariant(date)} className="capitalize">
                   {getDateLabel(date)}
                 </Badge>
                 <span className="text-sm text-muted-foreground">
                   {dateTasks.length} tarefa{dateTasks.length !== 1 ? 's' : ''}
                 </span>
               </div>
 
               <div className="space-y-2">
                 {dateTasks.map(task => {
                   const isExpanded = expandedTasks.has(task.id);
                   const clientStatus = getClientStatus(task.client_id);
                   const statusOption = CAMPAIGN_STATUS_OPTIONS.find(o => o.value === clientStatus?.campaign_status);
 
                   return (
                     <Card key={task.id} className={`transition-all ${task.status === 'done' ? 'opacity-60' : ''}`}>
                       <CardContent className="p-4">
                         <div className="flex items-start gap-3">
                           {/* Status Checkbox */}
                           <div className="pt-0.5">
                             {task.status === 'done' ? (
                               <CheckCircle2 
                                 className="h-5 w-5 text-green-600 cursor-pointer"
                                 onClick={() => handleStatusChange(task.id, 'todo')}
                               />
                             ) : task.status === 'doing' ? (
                               <Play 
                                 className="h-5 w-5 text-blue-600 cursor-pointer"
                                 onClick={() => handleStatusChange(task.id, 'done')}
                               />
                             ) : task.status === 'blocked' ? (
                               <AlertCircle 
                                 className="h-5 w-5 text-red-600 cursor-pointer"
                                 onClick={() => handleStatusChange(task.id, 'doing')}
                               />
                             ) : (
                               <Circle 
                                 className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-primary"
                                 onClick={() => handleStatusChange(task.id, 'doing')}
                               />
                             )}
                           </div>
 
                           {/* Task Content */}
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 flex-wrap">
                               <span className={`font-medium ${task.status === 'done' ? 'line-through' : ''}`}>
                                 {task.title}
                               </span>
                               <Badge variant="outline" className="text-xs">
                                 {CADENCE_OPTIONS.find(c => c.value === task.cadence)?.label || task.cadence}
                               </Badge>
                               <Badge 
                                 variant="outline" 
                                 className={`text-xs ${task.priority === 'high' ? 'border-red-500 text-red-700' : task.priority === 'low' ? 'border-gray-400 text-gray-600' : ''}`}
                               >
                                 {task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baixa' : 'Média'}
                               </Badge>
                             </div>
 
                             <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                               <span className="font-medium text-foreground">{getClientName(task.client_id)}</span>
                               {statusOption && (
                                 <Badge variant="secondary" className={statusOption.color}>
                                   {statusOption.label}
                                 </Badge>
                               )}
                               <span className="flex items-center gap-1">
                                 <User className="h-3 w-3" />
                                 {getAssigneeName(task.assigned_to)}
                               </span>
                              {task.cadence === 'weekly' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClientWorkday(task.client_id);
                                  }}
                                >
                                  <CalendarDays className="h-3 w-3 mr-1" />
                                  {WORKDAY_OPTIONS.find(o => o.value === getClientWeeklyWorkday(task.client_id))?.short || 'Ter'}
                                </Button>
                              )}
                             </div>
 
                             {/* Expanded content */}
                             {isExpanded && task.description && (
                               <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                                 {task.description}
                               </div>
                             )}
                           </div>
 
                           {/* Actions */}
                           <div className="flex items-center gap-2">
                             <Select 
                               value={task.status} 
                               onValueChange={(v) => handleStatusChange(task.id, v as TrafficTaskStatus)}
                             >
                               <SelectTrigger className="w-[130px] h-8 text-xs">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 {TASK_STATUS_OPTIONS.map(opt => (
                                   <SelectItem key={opt.value} value={opt.value}>
                                     {opt.label}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
 
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8"
                               onClick={() => toggleTaskExpanded(task.id)}
                             >
                               {isExpanded ? (
                                 <ChevronUp className="h-4 w-4" />
                               ) : (
                                 <ChevronDown className="h-4 w-4" />
                               )}
                             </Button>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   );
                 })}
               </div>
             </div>
           ))}
         </div>
       )}

      {/* Client Workday Edit Dialog */}
      <Dialog open={!!editingClientWorkday} onOpenChange={(open) => !open && setEditingClientWorkday(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dia Semanal do Cliente</DialogTitle>
            <DialogDescription>
              Defina o dia fixo da semana para as tarefas semanais de {editingClientWorkday ? getClientName(editingClientWorkday) : ''}
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup
            value={pendingWorkday.toString()}
            onValueChange={(v) => setPendingWorkday(parseInt(v))}
            className="grid grid-cols-5 gap-2"
          >
            {WORKDAY_OPTIONS.map(opt => (
              <div key={opt.value} className="flex flex-col items-center">
                <RadioGroupItem 
                  value={opt.value.toString()} 
                  id={`day-${opt.value}`}
                  className="sr-only"
                />
                <Label 
                  htmlFor={`day-${opt.value}`}
                  className={`cursor-pointer px-3 py-2 rounded-md border text-center w-full transition-colors ${
                    pendingWorkday === opt.value 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'hover:bg-muted'
                  }`}
                >
                  {opt.short}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClientWorkday(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveClientWorkday}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
     </div>
   );
 }