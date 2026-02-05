 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Ban, Clock } from 'lucide-react';
import { BLOCKED_REASON_OPTIONS } from '@/types/trafficPlaybook';
import { BlockedBreakdown } from '@/hooks/useTrafficOperationalDashboard';
 
 interface BottlenecksBlockProps {
   breakdown: BlockedBreakdown[];
 }
 
 export default function BottlenecksBlock({ breakdown }: BottlenecksBlockProps) {
   const totalBlocked = breakdown.reduce((sum, b) => sum + b.count, 0);
 
   const getReasonLabel = (reason: string) => {
     return BLOCKED_REASON_OPTIONS.find(r => r.value === reason)?.label || reason;
   };
 
   return (
     <Card>
       <CardHeader className="pb-3">
         <div className="flex items-center gap-2">
           <Ban className="h-5 w-5 text-destructive" />
           <div>
             <CardTitle className="text-lg">Gargalos</CardTitle>
             <CardDescription>{totalBlocked} tarefa(s) bloqueada(s)</CardDescription>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         {breakdown.length === 0 ? (
           <p className="text-center text-muted-foreground py-4">Nenhuma tarefa bloqueada 🎉</p>
         ) : (
           <div className="grid md:grid-cols-2 gap-4">
             {/* Breakdown by reason */}
             <div className="space-y-2">
               <h4 className="text-sm font-medium">Por Motivo</h4>
               <div className="space-y-2">
                 {breakdown.map(b => (
                   <div key={b.reason} className="flex items-center justify-between p-2 border rounded">
                     <span className="text-sm">{getReasonLabel(b.reason)}</span>
                     <Badge variant="destructive">{b.count}</Badge>
                   </div>
                 ))}
               </div>
             </div>
 
             {/* Top blocked clients */}
             <div className="space-y-2">
               <h4 className="text-sm font-medium flex items-center gap-1">
                 <Clock className="h-4 w-4" />
                 Clientes Mais Tempo Bloqueados
               </h4>
               <ScrollArea className="h-[150px]">
                 <div className="space-y-1">
                   {breakdown
                     .flatMap(b => b.clients.map(c => ({ ...c, reason: b.reason })))
                     .sort((a, b) => b.days - a.days)
                     .slice(0, 10)
                     .map((client, idx) => (
                       <div key={`${client.id}-${idx}`} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                         <span className="truncate">{client.name}</span>
                         <div className="flex items-center gap-2 shrink-0">
                           <Badge variant="outline" className="text-xs">
                             {getReasonLabel(client.reason)}
                           </Badge>
                           <Badge variant="destructive" className="text-xs">
                             {client.days}d
                           </Badge>
                         </div>
                       </div>
                     ))}
                   {breakdown.flatMap(b => b.clients).length === 0 && (
                     <p className="text-center text-muted-foreground py-4">Nenhum cliente bloqueado</p>
                   )}
                 </div>
               </ScrollArea>
             </div>
           </div>
         )}
       </CardContent>
     </Card>
   );
 }