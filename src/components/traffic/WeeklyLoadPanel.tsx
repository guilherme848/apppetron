 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Slider } from '@/components/ui/slider';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { BarChart3, Scale, Clock, ArrowRight, History } from 'lucide-react';
 import { format, parseISO } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { WeeklyLoadByDay, RebalanceLogEntry, RebalanceParams, RebalanceResult, WORKDAY_OPTIONS } from '@/types/trafficPlaybook';
 
 interface WeeklyLoadPanelProps {
   weeklyLoads: WeeklyLoadByDay[];
   rebalanceLogs: RebalanceLogEntry[];
   onRebalance: (params: RebalanceParams) => Promise<RebalanceResult>;
   clients?: { id: string; name: string }[];
 }
 
 export default function WeeklyLoadPanel({ 
   weeklyLoads, 
   rebalanceLogs, 
   onRebalance,
   clients = [] 
 }: WeeklyLoadPanelProps) {
   const [showRebalanceDialog, setShowRebalanceDialog] = useState(false);
   const [showLogsDialog, setShowLogsDialog] = useState(false);
   const [rebalancing, setRebalancing] = useState(false);
   const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);
   
   // Rebalance params
   const [maxMoves, setMaxMoves] = useState(5);
   const [cooldownDays, setCooldownDays] = useState(30);
   const [thresholdPercent, setThresholdPercent] = useState(20);
 
   // Ensure all days are present (1-5)
   const allDays = [1, 2, 3, 4, 5].map(day => {
     const existing = weeklyLoads.find(l => l.weekday === day);
     return existing || { weekday: day, total_load: 0, client_count: 0 };
   });
 
   const maxLoad = Math.max(...allDays.map(d => d.total_load), 1);
   const totalLoad = allDays.reduce((sum, d) => sum + d.total_load, 0);
   const totalClients = allDays.reduce((sum, d) => sum + d.client_count, 0);
 
   const handleRebalance = async (dryRun = false) => {
     setRebalancing(true);
     try {
       const result = await onRebalance({
         max_moves: maxMoves,
         cooldown_days: cooldownDays,
         threshold_percent: thresholdPercent,
         dry_run: dryRun,
       });
       setRebalanceResult(result);
       if (!dryRun && result.success && result.moves.length > 0) {
         setShowRebalanceDialog(false);
       }
     } finally {
       setRebalancing(false);
     }
   };
 
   const getClientName = (clientId: string) => {
     return clients.find(c => c.id === clientId)?.name || 'Cliente desconhecido';
   };
 
   const getWeekdayLabel = (day: number) => {
     return WORKDAY_OPTIONS.find(o => o.value === day)?.label || `Dia ${day}`;
   };
 
   return (
     <Card>
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between">
           <div>
             <CardTitle className="text-base flex items-center gap-2">
               <BarChart3 className="h-4 w-4" />
               Carga por Dia da Semana
             </CardTitle>
             <CardDescription>
               {totalClients} clientes • {totalLoad} tarefas semanais
             </CardDescription>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={() => setShowLogsDialog(true)}>
               <History className="h-4 w-4 mr-1" />
               Histórico
             </Button>
             <Button variant="default" size="sm" onClick={() => setShowRebalanceDialog(true)}>
               <Scale className="h-4 w-4 mr-1" />
               Rebalancear
             </Button>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <div className="space-y-3">
           {allDays.map(day => {
             const widthPercent = maxLoad > 0 ? (day.total_load / maxLoad) * 100 : 0;
             const dayLabel = WORKDAY_OPTIONS.find(o => o.value === day.weekday);
             
             return (
               <div key={day.weekday} className="flex items-center gap-3">
                 <span className="w-16 text-sm font-medium">{dayLabel?.label}</span>
                 <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden relative">
                   <div 
                     className="h-full bg-primary/80 transition-all duration-300"
                     style={{ width: `${widthPercent}%` }}
                   />
                   <div className="absolute inset-0 flex items-center px-2">
                     <span className="text-xs font-medium">
                       {day.total_load} tarefas • {day.client_count} clientes
                     </span>
                   </div>
                 </div>
               </div>
             );
           })}
         </div>
       </CardContent>
 
       {/* Rebalance Dialog */}
       <Dialog open={showRebalanceDialog} onOpenChange={setShowRebalanceDialog}>
         <DialogContent className="max-w-lg">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Scale className="h-5 w-5" />
               Rebalancear Dias Semanais
             </DialogTitle>
             <DialogDescription>
               Move clientes entre dias para equalizar a carga de trabalho.
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-6 py-4">
             <div className="space-y-3">
               <Label>Máximo de movimentações: {maxMoves}</Label>
               <Slider
                 value={[maxMoves]}
                 onValueChange={([v]) => setMaxMoves(v)}
                 min={1}
                 max={20}
                 step={1}
               />
             </div>
 
             <div className="space-y-3">
               <Label>Período de cooldown: {cooldownDays} dias</Label>
               <Slider
                 value={[cooldownDays]}
                 onValueChange={([v]) => setCooldownDays(v)}
                 min={7}
                 max={90}
                 step={1}
               />
               <p className="text-xs text-muted-foreground">
                 Clientes movidos recentemente não serão movidos novamente.
               </p>
             </div>
 
             <div className="space-y-3">
               <Label>Limiar de desequilíbrio: {thresholdPercent}%</Label>
               <Slider
                 value={[thresholdPercent]}
                 onValueChange={([v]) => setThresholdPercent(v)}
                 min={5}
                 max={50}
                 step={5}
               />
               <p className="text-xs text-muted-foreground">
                 Só rebalanceia se a diferença entre dias exceder este valor.
               </p>
             </div>
 
             {rebalanceResult && (
               <div className="p-3 rounded-md bg-muted space-y-2">
                 {rebalanceResult.skipped_reason ? (
                   <p className="text-sm text-muted-foreground">{rebalanceResult.skipped_reason}</p>
                 ) : rebalanceResult.error ? (
                   <p className="text-sm text-destructive">{rebalanceResult.error}</p>
                 ) : rebalanceResult.moves.length === 0 ? (
                   <p className="text-sm text-muted-foreground">Nenhuma movimentação necessária.</p>
                 ) : (
                   <>
                     <p className="text-sm font-medium">
                       {rebalanceResult.moves.length} movimentação(ões):
                     </p>
                     <ul className="text-sm space-y-1">
                       {rebalanceResult.moves.map((move, i) => (
                         <li key={i} className="flex items-center gap-2">
                           <span>{move.client_name}</span>
                           <Badge variant="outline" className="text-xs">
                             {getWeekdayLabel(move.old_workday)}
                           </Badge>
                           <ArrowRight className="h-3 w-3" />
                           <Badge variant="default" className="text-xs">
                             {getWeekdayLabel(move.new_workday)}
                           </Badge>
                         </li>
                       ))}
                     </ul>
                   </>
                 )}
               </div>
             )}
           </div>
 
           <DialogFooter className="flex gap-2">
             <Button
               variant="outline"
               onClick={() => handleRebalance(true)}
               disabled={rebalancing}
             >
               
               Simular
             </Button>
             <Button
               onClick={() => handleRebalance(false)}
               disabled={rebalancing}
             >
               
               Executar
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Logs Dialog */}
       <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
         <DialogContent className="max-w-lg">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <History className="h-5 w-5" />
               Histórico de Rebalanceamento
             </DialogTitle>
           </DialogHeader>
 
           <ScrollArea className="h-[400px] pr-4">
             {rebalanceLogs.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-8">
                 Nenhum registro de rebalanceamento.
               </p>
             ) : (
               <div className="space-y-3">
                 {rebalanceLogs.map(log => (
                   <div key={log.id} className="p-3 rounded-md border">
                     <div className="flex items-center justify-between mb-2">
                       <span className="font-medium text-sm">{getClientName(log.client_id)}</span>
                       <span className="text-xs text-muted-foreground">
                         {format(parseISO(log.moved_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                       </span>
                     </div>
                     <div className="flex items-center gap-2 text-sm">
                       <Badge variant="outline">{getWeekdayLabel(log.old_workday)}</Badge>
                       <ArrowRight className="h-3 w-3" />
                       <Badge variant="default">{getWeekdayLabel(log.new_workday)}</Badge>
                       {log.moved_by === 'auto' && (
                         <Badge variant="secondary" className="text-xs ml-2">Auto</Badge>
                       )}
                     </div>
                     {log.reason && (
                       <p className="text-xs text-muted-foreground mt-2">{log.reason}</p>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </ScrollArea>
         </DialogContent>
       </Dialog>
     </Card>
   );
 }