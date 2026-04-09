 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { User, AlertTriangle, Clock, Ban } from 'lucide-react';
 import { ManagerWorkload } from '@/hooks/useTrafficOperationalDashboard';
 
 interface ManagerLoadBlockProps {
   workloads: ManagerWorkload[];
 }
 
 export default function ManagerLoadBlock({ workloads }: ManagerLoadBlockProps) {
   // Calculate max score for relative progress bars
   const maxScore = Math.max(...workloads.map(m => m.workloadScore), 1);
 
   return (
     <Card>
       <CardHeader className="pb-3">
         <CardTitle className="text-lg">Carga por Gestor</CardTitle>
         <CardDescription>{workloads.length} gestor(es) de tráfego</CardDescription>
       </CardHeader>
       <CardContent>
         {workloads.length === 0 ? (
           <p className="text-center text-muted-foreground py-4">Nenhum gestor encontrado</p>
         ) : (
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {workloads.map(manager => (
               <div key={manager.id} className="border rounded-lg p-4 space-y-3">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                       <User className="h-4 w-4 text-primary" />
                     </div>
                     <span className="font-medium truncate">{manager.name}</span>
                   </div>
                   <Badge variant={manager.overdueTasks > 0 ? 'destructive' : 'secondary'}>
                     Score: {manager.workloadScore}
                   </Badge>
                 </div>
 
                 <Progress value={(manager.workloadScore / maxScore) * 100} className="h-2" />
 
                 <div className="grid grid-cols-2 gap-2 text-sm">
                   <div className="flex items-center gap-1.5 text-muted-foreground">
                     <Clock className="h-3 w-3" />
                     <span>Abertas: <strong className="text-foreground">{manager.openTasks}</strong></span>
                   </div>
                   <div className="flex items-center gap-1.5 text-muted-foreground">
                     <AlertTriangle className="h-3 w-3 text-destructive" />
                     <span>Atrasadas: <strong className="text-destructive">{manager.overdueTasks}</strong></span>
                   </div>
                   <div className="flex items-center gap-1.5 text-muted-foreground">
                     <Clock className="h-3 w-3 text-warning" />
                     <span>Hoje: <strong className="text-warning">{manager.todayTasks}</strong></span>
                   </div>
                   <div className="flex items-center gap-1.5 text-muted-foreground">
                     <Ban className="h-3 w-3 text-destructive" />
                     <span>Bloqueadas: <strong className="text-destructive">{manager.blockedTasks}</strong></span>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         )}
       </CardContent>
     </Card>
   );
 }