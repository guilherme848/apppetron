import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DC } from '@/lib/dashboardColors';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ArrowRightLeft, CheckCircle2, PlusCircle, Phone, Zap, UserCheck, Edit3, Target, History
} from 'lucide-react';
import type { DealEvent } from '@/hooks/useDealDetail';

const EVENT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  stage_changed: { icon: ArrowRightLeft, color: DC.orange },
  activity_completed: { icon: CheckCircle2, color: DC.teal },
  activity_created: { icon: PlusCircle, color: '#64748B' },
  call_made: { icon: Phone, color: DC.orange },
  field_changed: { icon: Edit3, color: '#64748B' },
  responsible_changed: { icon: UserCheck, color: DC.teal },
  score_changed: { icon: Target, color: '#F97316' },
  automation_executed: { icon: Zap, color: '#EF4444' },
  cadence_started: { icon: History, color: DC.teal },
  note_added: { icon: Edit3, color: '#64748B' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'activity_completed', label: 'Atividades' },
  { value: 'call_made', label: 'Ligações' },
  { value: 'stage_changed', label: 'Mudanças de etapa' },
  { value: 'field_changed', label: 'Sistema' },
];

interface Props {
  events: DealEvent[];
  stages: any[];
}

export function DealHistoryTab({ events, stages }: Props) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Histórico</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-8">Nenhum evento registrado</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {filtered.map(event => {
              const config = EVENT_ICONS[event.event_type] || { icon: History, color: '#64748B' };
              const Icon = config.icon;
              const meta = event.metadata || {};
              const fromStage = meta.from_stage_id ? stages.find(s => s.id === meta.from_stage_id) : null;
              const toStage = meta.to_stage_id ? stages.find(s => s.id === meta.to_stage_id) : null;

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Icon circle */}
                  <div
                    className="absolute left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon className="h-3 w-3" style={{ color: config.color }} />
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                    )}
                    {fromStage && toStage && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1.5">{fromStage.name}</Badge>
                        <span>→</span>
                        <Badge variant="outline" className="text-[10px] px-1.5">{toStage.name}</Badge>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
