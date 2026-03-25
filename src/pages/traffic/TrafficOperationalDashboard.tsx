 import { useTrafficOperationalDashboard } from '@/hooks/useTrafficOperationalDashboard';
 import DashboardFilters from '@/components/traffic-dashboard/DashboardFilters';
 import WorkQueueBlock from '@/components/traffic-dashboard/WorkQueueBlock';
 import ManagerLoadBlock from '@/components/traffic-dashboard/ManagerLoadBlock';
 import WeeklyAgendaBlock from '@/components/traffic-dashboard/WeeklyAgendaBlock';
 import BottlenecksBlock from '@/components/traffic-dashboard/BottlenecksBlock';
 import SlaRiskBlock from '@/components/traffic-dashboard/SlaRiskBlock';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { AlertTriangle, Clock, CheckCircle2, ListTodo } from 'lucide-react';
 
 export default function TrafficOperationalDashboard() {
   const {
     loading,
     filters,
     setFilters,
     workQueue,
     managerWorkloads,
     weeklySchedule,
     blockedBreakdown,
     slaMetrics,
     getClientName,
     getManagerName,
     updateTask,
     refetch,
     services,
     trafficManagers,
   } = useTrafficOperationalDashboard();
 
   // Quick stats
   const today = new Date().toISOString().split('T')[0];
   const overdueTasks = workQueue.filter(t => t.status !== 'done' && t.status !== 'skipped' && t.due_date < today);
   const todayTasks = workQueue.filter(t => t.due_date === today && t.status !== 'done' && t.status !== 'skipped');
   const blockedTasks = workQueue.filter(t => t.status === 'blocked');
   const openTasks = workQueue.filter(t => t.status !== 'done' && t.status !== 'skipped');
 
   if (loading) {
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 mt-2" /></div>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
         </div>
         <div className="grid lg:grid-cols-2 gap-6">
           <Skeleton className="h-64 rounded-2xl" />
           <Skeleton className="h-64 rounded-2xl" />
         </div>
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div>
         <h1 className="text-2xl font-bold">Dashboard Operacional de Tráfego</h1>
         <p className="text-muted-foreground">
           Gestão de execução: tarefas, demandas e carga de trabalho
         </p>
       </div>
 
       {/* Filters */}
       <DashboardFilters
         filters={filters}
         setFilters={setFilters}
         managers={trafficManagers}
         services={services}
         onRefresh={refetch}
         loading={loading}
       />
 
       {/* Quick Stats */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card className="border-l-4 border-l-destructive">
           <CardHeader className="pb-2 pt-4">
             <div className="flex items-center gap-2">
               <AlertTriangle className="h-4 w-4 text-destructive" />
               <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
             </div>
             <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
           </CardHeader>
         </Card>
 
         <Card className="border-l-4 border-l-yellow-500">
           <CardHeader className="pb-2 pt-4">
             <div className="flex items-center gap-2">
               <Clock className="h-4 w-4 text-yellow-600" />
               <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
             </div>
             <p className="text-2xl font-bold text-yellow-600">{todayTasks.length}</p>
           </CardHeader>
         </Card>
 
         <Card className="border-l-4 border-l-red-500">
           <CardHeader className="pb-2 pt-4">
             <div className="flex items-center gap-2">
               <AlertTriangle className="h-4 w-4 text-red-500" />
               <CardTitle className="text-sm font-medium text-muted-foreground">Bloqueadas</CardTitle>
             </div>
             <p className="text-2xl font-bold text-red-500">{blockedTasks.length}</p>
           </CardHeader>
         </Card>
 
         <Card className="border-l-4 border-l-primary">
           <CardHeader className="pb-2 pt-4">
             <div className="flex items-center gap-2">
               <ListTodo className="h-4 w-4 text-primary" />
               <CardTitle className="text-sm font-medium text-muted-foreground">Abertas</CardTitle>
             </div>
             <p className="text-2xl font-bold">{openTasks.length}</p>
           </CardHeader>
         </Card>
       </div>
 
       {/* Work Queue + Manager Load */}
       <div className="grid lg:grid-cols-2 gap-6">
         <WorkQueueBlock
           tasks={workQueue}
           getClientName={getClientName}
           getManagerName={getManagerName}
           managers={trafficManagers}
           onUpdateTask={updateTask}
         />
         <ManagerLoadBlock workloads={managerWorkloads} />
       </div>
 
       {/* Weekly Agenda */}
       <WeeklyAgendaBlock
         schedule={weeklySchedule}
         getManagerName={getManagerName}
         onRefresh={refetch}
       />
 
       {/* Bottlenecks + SLA */}
       <div className="grid lg:grid-cols-2 gap-6">
         <BottlenecksBlock breakdown={blockedBreakdown} />
         <SlaRiskBlock
           atRisk={slaMetrics.atRisk}
           completionByCadence={slaMetrics.completionByCadence}
           getClientName={getClientName}
         />
       </div>
     </div>
   );
 }