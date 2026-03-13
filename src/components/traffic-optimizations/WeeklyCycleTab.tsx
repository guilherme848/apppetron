import { useMemo, useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WeeklyCycleEntry } from '@/hooks/useTrafficOptimizations';

const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
];

interface Props {
  accounts: { id: string; name: string; traffic_member_id?: string | null }[];
  teamMembers: { id: string; name: string }[];
  weeklyCycle: WeeklyCycleEntry[];
  currentMemberId: string | null;
  addWeeklyCycleEntry: (clientId: string, weekday: number) => Promise<any>;
  removeWeeklyCycleEntry: (id: string) => Promise<any>;
  moveWeeklyCycleEntry: (id: string, newWeekday: number) => Promise<any>;
}

export function OptimizationWeeklyCycleTab({
  accounts,
  weeklyCycle,
  currentMemberId,
  addWeeklyCycleEntry,
  removeWeeklyCycleEntry,
  moveWeeklyCycleEntry,
}: Props) {
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState('');

  const getClientName = (id: string) => accounts.find((a) => a.id === id)?.name || 'Cliente';

  const myClients = useMemo(() => {
    return accounts.filter((a) => a.traffic_member_id === currentMemberId);
  }, [accounts, currentMemberId]);

  const myCycle = useMemo(() => {
    return weeklyCycle.filter((w) => w.manager_member_id === currentMemberId);
  }, [weeklyCycle, currentMemberId]);

  const assignedClientIds = useMemo(() => new Set(myCycle.map((w) => w.client_id)), [myCycle]);
  const availableClients = useMemo(() => myClients.filter((c) => !assignedClientIds.has(c.id)), [myClients, assignedClientIds]);

  const handleAdd = async (weekday: number) => {
    if (!selectedClient) return;
    await addWeeklyCycleEntry(selectedClient, weekday);
    setSelectedClient('');
    setAddingDay(null);
  };

  const totalAssigned = myCycle.length;
  const suggestedPerDay = totalAssigned > 0 ? Math.ceil(totalAssigned / 5) : 5;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {totalAssigned} clientes distribuídos · Meta sugerida: ~{suggestedPerDay}/dia · {availableClients.length} disponíveis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {WEEKDAYS.map((day) => {
          const dayEntries = myCycle.filter((w) => w.weekday === day.value);
          return (
            <Card key={day.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  {day.label}
                  <Badge variant="outline" className="ml-2">{dayEntries.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded border text-sm bg-muted/30 group"
                  >
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      <span className="truncate max-w-[120px]">{getClientName(entry.client_id)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select
                        value={String(entry.weekday)}
                        onValueChange={(v) => moveWeeklyCycleEntry(entry.id, parseInt(v))}
                      >
                        <SelectTrigger className="h-6 w-16 text-xs border-0 bg-transparent p-0 opacity-0 group-hover:opacity-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((d) => (
                            <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={() => removeWeeklyCycleEntry(entry.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {addingDay === day.value ? (
                  <div className="space-y-2">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleAdd(day.value)} disabled={!selectedClient}>
                        Adicionar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingDay(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground"
                    onClick={() => { setAddingDay(day.value); setSelectedClient(''); }}
                    disabled={availableClients.length === 0}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
