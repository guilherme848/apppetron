 import { Card, CardContent } from '@/components/ui/card';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Button } from '@/components/ui/button';
 import { RefreshCw } from 'lucide-react';
 import { Filters } from '@/hooks/useTrafficOperationalDashboard';
 import { 
   PERIOD_OPTIONS, CADENCE_OPTIONS, TASK_STATUS_OPTIONS, CAMPAIGN_STATUS_OPTIONS 
 } from '@/types/trafficPlaybook';
 
 interface DashboardFiltersProps {
   filters: Filters;
   setFilters: (filters: Filters) => void;
   managers: { id: string; name: string }[];
   services: { id: string; name: string }[];
   onRefresh: () => void;
   loading: boolean;
 }
 
 export default function DashboardFilters({
   filters, setFilters, managers, services, onRefresh, loading
 }: DashboardFiltersProps) {
   const updateFilter = (key: keyof Filters, value: string) => {
     setFilters({ ...filters, [key]: value });
   };
 
   return (
     <Card>
       <CardContent className="pt-4">
         <div className="flex flex-wrap gap-3 items-center">
           <Select value={filters.period} onValueChange={v => updateFilter('period', v)}>
             <SelectTrigger className="w-[140px]">
               <SelectValue placeholder="Período" />
             </SelectTrigger>
             <SelectContent>
               {PERIOD_OPTIONS.map(opt => (
                 <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
               ))}
             </SelectContent>
           </Select>
 
           <Select value={filters.managerId} onValueChange={v => updateFilter('managerId', v)}>
             <SelectTrigger className="w-[160px]">
               <SelectValue placeholder="Gestor" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos os Gestores</SelectItem>
               {managers.map(m => (
                 <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
               ))}
             </SelectContent>
           </Select>
 
           <Select value={filters.serviceId} onValueChange={v => updateFilter('serviceId', v)}>
             <SelectTrigger className="w-[140px]">
               <SelectValue placeholder="Plano" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos os Planos</SelectItem>
               {services.map(s => (
                 <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
               ))}
             </SelectContent>
           </Select>
 
           <Select value={filters.campaignStatus} onValueChange={v => updateFilter('campaignStatus', v)}>
             <SelectTrigger className="w-[160px]">
               <SelectValue placeholder="Status Cliente" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos os Status</SelectItem>
               {CAMPAIGN_STATUS_OPTIONS.map(opt => (
                 <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
               ))}
             </SelectContent>
           </Select>
 
           <Select value={filters.cadence} onValueChange={v => updateFilter('cadence', v)}>
             <SelectTrigger className="w-[130px]">
               <SelectValue placeholder="Cadência" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todas</SelectItem>
               {CADENCE_OPTIONS.map(opt => (
                 <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
               ))}
             </SelectContent>
           </Select>
 
           <Select value={filters.taskStatus} onValueChange={v => updateFilter('taskStatus', v)}>
             <SelectTrigger className="w-[130px]">
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
 
           <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
             <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }