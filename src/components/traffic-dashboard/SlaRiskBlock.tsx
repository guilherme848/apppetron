 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { AlertTriangle, CheckCircle2 } from 'lucide-react';
 import { format, parseISO } from 'date-fns';
 import { TrafficPlaybookTask, CADENCE_OPTIONS } from '@/types/trafficPlaybook';
 
 interface SlaRiskBlockProps {
   atRisk: TrafficPlaybookTask[];
   completionByCadence: Record<string, { total: number; onTime: number }>;
   getClientName: (id: string) => string;
 }
 
 export default function SlaRiskBlock({ atRisk, completionByCadence, getClientName }: SlaRiskBlockProps) {
   const getCadenceLabel = (cadence: string) => {
     return CADENCE_OPTIONS.find(c => c.value === cadence)?.label || cadence;
   };
 
   return (
     <Card>
       <CardHeader className="pb-3">
         <div className="flex items-center gap-2">
           <AlertTriangle className="h-5 w-5 text-yellow-600" />
           <div>
             <CardTitle className="text-lg">SLA e Risco</CardTitle>
             <CardDescription>Tarefas em risco e cumprimento de prazos</CardDescription>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <div className="grid md:grid-cols-2 gap-4">
           {/* At Risk */}
           <div className="space-y-2">
             <div className="flex items-center justify-between">
               <h4 className="text-sm font-medium">Em Risco (próx. 48h)</h4>
               <Badge variant={atRisk.length > 0 ? 'destructive' : 'secondary'}>
                 {atRisk.length}
               </Badge>
             </div>
             <ScrollArea className="h-[120px]">
               {atRisk.length === 0 ? (
                 <p className="text-center text-muted-foreground py-4 flex items-center justify-center gap-2">
                   <CheckCircle2 className="h-4 w-4 text-green-600" />
                   Nenhuma tarefa em risco
                 </p>
               ) : (
                 <div className="space-y-1">
                   {atRisk.map(task => (
                     <div key={task.id} className="p-2 border rounded text-sm">
                       <div className="font-medium truncate">{task.title}</div>
                       <div className="flex items-center justify-between text-xs text-muted-foreground">
                         <span>{getClientName(task.client_id)}</span>
                         <span>Vence: {format(parseISO(task.due_date), 'dd/MM')}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </ScrollArea>
           </div>
 
           {/* Completion by Cadence */}
           <div className="space-y-2">
             <h4 className="text-sm font-medium">% Concluídas no Prazo</h4>
             <div className="space-y-3">
               {Object.entries(completionByCadence).map(([cadence, stats]) => {
                 const pct = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0;
                 return (
                   <div key={cadence} className="space-y-1">
                     <div className="flex items-center justify-between text-sm">
                       <span>{getCadenceLabel(cadence)}</span>
                       <span className="text-muted-foreground">
                         {stats.onTime}/{stats.total} ({pct}%)
                       </span>
                     </div>
                     <Progress 
                       value={pct} 
                       className={`h-2 ${pct >= 80 ? '[&>div]:bg-green-500' : pct >= 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`}
                     />
                   </div>
                 );
               })}
               {Object.keys(completionByCadence).length === 0 && (
                 <p className="text-center text-muted-foreground py-4">Sem dados de conclusão</p>
               )}
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }