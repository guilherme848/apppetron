import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { TrafficContactComments } from './TrafficContactComments';
import { cn } from '@/lib/utils';

interface ClientRow {
  client_id: string;
  client_name: string;
  days_since_contact: number | null;
  last_contact_date: string | null;
}

interface TodayContact {
  id: string;
  client_id: string;
  reason_id: string | null;
  channel_id: string | null;
  result: string | null;
  notes: string | null;
  completed: boolean;
}

interface Reason {
  id: string;
  name: string;
  color: string;
}

interface Channel {
  id: string;
  name: string;
  icon: string | null;
}

interface Props {
  client: ClientRow;
  todayContact: TodayContact | undefined;
  reasons: Reason[];
  channels: Channel[];
  frequencyDays: number;
  warningDays: number;
  currentMemberId: string;
  onCreateAndToggle: (clientId: string, completed: boolean, existingId?: string) => void;
  onUpdateField: (contactId: string, field: string, value: string | null) => void;
}

type Urgency = 'danger' | 'warning' | 'success' | 'never';

function getUrgency(daysSince: number | null, freq: number, warn: number): Urgency {
  if (daysSince === null) return 'never';
  if (daysSince >= freq) return 'danger';
  if (daysSince >= warn) return 'warning';
  return 'success';
}

export function TrafficContactRow({
  client,
  todayContact,
  reasons,
  channels,
  frequencyDays,
  warningDays,
  currentMemberId,
  onCreateAndToggle,
  onUpdateField,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const urgency = getUrgency(client.days_since_contact, frequencyDays, warningDays);
  const completed = todayContact?.completed ?? false;
  const reasonSelected = !!todayContact?.reason_id;

  const borderColor = {
    danger: 'border-l-destructive',
    warning: 'border-l-warning',
    success: 'border-l-success',
    never: 'border-l-destructive',
  }[urgency];

  const bgTint = {
    danger: 'bg-destructive/5',
    warning: 'bg-warning/5',
    success: '',
    never: 'bg-destructive/5',
  }[urgency];

  const UrgencyIcon = {
    danger: AlertTriangle,
    warning: Clock,
    success: CheckCircle2,
    never: AlertTriangle,
  }[urgency];

  const urgencyTextColor = {
    danger: 'text-destructive',
    warning: 'text-warning',
    success: 'text-success',
    never: 'text-destructive',
  }[urgency];

  const daysText = client.days_since_contact !== null
    ? `${client.days_since_contact}d atrás`
    : 'Nunca';

  const dateText = client.last_contact_date
    ? new Date(client.last_contact_date + 'T00:00:00').toLocaleDateString('pt-BR')
    : '—';

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-12 items-center min-h-[48px] px-4 border-l-2 transition-colors hover:bg-gradient-to-r hover:from-primary/[0.03] hover:to-transparent',
          borderColor,
          bgTint,
          completed && 'opacity-70'
        )}
      >
        {/* Cliente */}
        <div className="col-span-3 flex items-center gap-2">
          <UrgencyIcon className={cn('h-4 w-4 shrink-0', urgencyTextColor)} />
          <span className="text-sm font-medium truncate">{client.client_name}</span>
        </div>

        {/* Último contato */}
        <div className="col-span-2">
          <span className={cn('text-sm font-mono font-medium', urgencyTextColor)}>{daysText}</span>
          <p className="text-[10px] text-muted-foreground">{dateText}</p>
        </div>

        {/* Motivo */}
        <div className="col-span-2">
          <Select
            value={todayContact?.reason_id || ''}
            onValueChange={(v) => {
              onUpdateField(todayContact?.id ?? '', 'reason_id', v);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Motivo" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resultado */}
        <div className="col-span-2">
          <Select
            value={todayContact?.result || ''}
            onValueChange={(v) => {
              onUpdateField(todayContact?.id ?? '', 'result', v);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positivo">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Positivo
                </span>
              </SelectItem>
              <SelectItem value="neutro">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Neutro
                </span>
              </SelectItem>
              <SelectItem value="negativo">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  Negativo
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Canal */}
        <div className="col-span-1">
          <Select
            value={todayContact?.channel_id || ''}
            onValueChange={(v) => {
              if (todayContact) {
                onUpdateField(todayContact.id, 'channel_id', v);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs px-1.5">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Check */}
        <div className="col-span-1 flex justify-center">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Checkbox
                    checked={completed}
                    disabled={!reasonSelected && !completed}
                    onCheckedChange={(checked) => {
                      onCreateAndToggle(client.client_id, !!checked, todayContact?.id);
                    }}
                    className={cn(completed && 'data-[state=checked]:bg-success data-[state=checked]:border-success')}
                  />
                </div>
              </TooltipTrigger>
              {!reasonSelected && !completed && (
                <TooltipContent side="top" className="text-xs">
                  Selecione um motivo primeiro
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Ações */}
        <div className="col-span-1 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded(!expanded)}
            disabled={!todayContact}
          >
            <MessageSquare className={cn('h-4 w-4', expanded && 'text-primary')} />
          </Button>
        </div>
      </div>

      {expanded && todayContact && (
        <TrafficContactComments
          contactId={todayContact.id}
          contactNotes={todayContact.notes}
          currentMemberId={currentMemberId}
        />
      )}
    </>
  );
}
