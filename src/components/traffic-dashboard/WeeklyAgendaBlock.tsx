 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { RefreshCw } from 'lucide-react';
 import { format, parseISO, isToday } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
import { DaySchedule } from '@/hooks/useTrafficOperationalDashboard';
import { RebalanceParams, RebalanceResult } from '@/types/trafficPlaybook';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 interface WeeklyAgendaBlockProps {
   schedule: DaySchedule[];
   getManagerName: (id: string | null) => string;
   onRefresh: () => void;
 }
 
 export default function WeeklyAgendaBlock({ schedule, getManagerName, onRefresh }: WeeklyAgendaBlockProps) {
   const [showRebalance, setShowRebalance] = useState(false);
   const [rebalancing, setRebalancing] = useState(false);
   const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);
   const [params, setParams] = useState<RebalanceParams>({
     max_moves: 5,
     cooldown_days: 7,
     threshold_percent: 20,
     dry_run: true,
   });
 
   const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
 
   const handleRebalance = async () => {
     setRebalancing(true);
     try {
       const { data, error } = await supabase.functions.invoke('rebalance-weekly-workdays', {
         body: params,
       });
 
       if (error) throw error;
       setRebalanceResult(data);
 
       if (!params.dry_run && data.moves?.length > 0) {
         toast.success(`${data.moves.length} cliente(s) movido(s)`);
         onRefresh();
       }
     } catch (err) {
       console.error('Rebalance error:', err);
       toast.error('Erro ao rebalancear');
     } finally {
       setRebalancing(false);
     }
   };
 
   return (
     <>
       <Card>
         <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="text-lg">Agenda Semanal</CardTitle>
               <CardDescription>Segunda a Sexta</CardDescription>
             </div>
             <Button variant="outline" size="sm" onClick={() => setShowRebalance(true)}>
               <RefreshCw className="h-4 w-4 mr-2" />
               Rebalancear
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-5 gap-2">
             {schedule.map((day, idx) => (
               <div 
                 key={day.date} 
                 className={`border rounded-lg p-3 space-y-2 ${isToday(parseISO(day.date)) ? 'border-primary bg-primary/5' : ''}`}
               >
                 <div className="text-center">
                   <div className="font-medium">{WEEKDAY_LABELS[idx]}</div>
                   <div className="text-xs text-muted-foreground">
                     {format(parseISO(day.date), 'dd/MM')}
                   </div>
                 </div>
                 
                 <div className="flex items-center justify-center gap-1">
                   <Badge variant="secondary" className="text-xs">
                     {day.tasks.length} tarefas
                   </Badge>
                   <Badge variant="outline" className="text-xs">
                     Score: {day.totalScore}
                   </Badge>
                 </div>
 
                 <ScrollArea className="h-[100px]">
                   <div className="space-y-1">
                     {Object.entries(day.byManager).map(([managerId, managerTasks]) => (
                       <div key={managerId} className="text-xs p-1 bg-muted rounded">
                         <div className="font-medium truncate">
                           {getManagerName(managerId === 'unassigned' ? null : managerId)}
                         </div>
                         <div className="text-muted-foreground">
                           {managerTasks.length} tarefa(s)
                         </div>
                       </div>
                     ))}
                     {day.tasks.length === 0 && (
                       <p className="text-xs text-muted-foreground text-center py-2">Livre</p>
                     )}
                   </div>
                 </ScrollArea>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
 
       {/* Rebalance Dialog */}
       <Dialog open={showRebalance} onOpenChange={setShowRebalance}>
         <DialogContent className="max-w-lg">
           <DialogHeader>
             <DialogTitle>Rebalancear Dias Semanais</DialogTitle>
             <DialogDescription>
               Redistribui clientes entre os dias da semana para equalizar a carga.
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4">
             <div className="grid grid-cols-3 gap-3">
               <div className="space-y-1.5">
                 <Label className="text-xs">Máx. movimentos</Label>
                 <Input 
                   type="number" 
                   value={params.max_moves}
                   onChange={e => setParams(p => ({ ...p, max_moves: parseInt(e.target.value) || 5 }))}
                 />
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs">Cooldown (dias)</Label>
                 <Input 
                   type="number" 
                   value={params.cooldown_days}
                   onChange={e => setParams(p => ({ ...p, cooldown_days: parseInt(e.target.value) || 7 }))}
                 />
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs">Threshold (%)</Label>
                 <Input 
                   type="number" 
                   value={params.threshold_percent}
                   onChange={e => setParams(p => ({ ...p, threshold_percent: parseInt(e.target.value) || 20 }))}
                 />
               </div>
             </div>
 
             {rebalanceResult && (
               <div className="border rounded-lg p-3 space-y-2 bg-muted/50">
                 <div className="text-sm font-medium">
                   {params.dry_run ? 'Simulação' : 'Resultado'}
                 </div>
                 {rebalanceResult.skipped_reason ? (
                   <p className="text-sm text-muted-foreground">{rebalanceResult.skipped_reason}</p>
                 ) : rebalanceResult.moves?.length === 0 ? (
                   <p className="text-sm text-muted-foreground">Nenhum movimento necessário.</p>
                 ) : (
                   <div className="space-y-2">
                     <div className="text-xs text-muted-foreground">
                       {rebalanceResult.moves?.length || 0} cliente(s) {params.dry_run ? 'seriam movidos' : 'movidos'}
                     </div>
                     <ScrollArea className="h-[100px]">
                       <div className="space-y-1">
                         {rebalanceResult.moves?.map((move, idx) => (
                           <div key={idx} className="text-xs p-1.5 bg-background rounded">
                             <strong>{move.client_name}</strong>: {WEEKDAY_LABELS[move.old_workday - 1]} → {WEEKDAY_LABELS[move.new_workday - 1]}
                           </div>
                         ))}
                       </div>
                     </ScrollArea>
                   </div>
                 )}
               </div>
             )}
           </div>
 
           <DialogFooter className="gap-2">
             <Button 
               variant="outline" 
               onClick={() => {
                 setParams(p => ({ ...p, dry_run: true }));
                 handleRebalance();
               }}
               disabled={rebalancing}
             >
               {rebalancing && params.dry_run ? 'Simulando...' : 'Simular'}
             </Button>
             <Button 
               onClick={() => {
                 setParams(p => ({ ...p, dry_run: false }));
                 setTimeout(handleRebalance, 0);
               }}
               disabled={rebalancing}
             >
               {rebalancing && !params.dry_run ? 'Executando...' : 'Executar'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 }