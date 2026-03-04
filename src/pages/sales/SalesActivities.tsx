import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { supabase } from '@/integrations/supabase/client';
import { DC } from '@/lib/dashboardColors';
import { ACTIVITY_TYPE_COLORS, ACTIVITY_TYPE_LABELS } from '@/types/sales';
import { format } from 'date-fns';
import { Calendar, List, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function SalesActivities() {
  const { activities, funnels, stages, loading, refetchActivities } = useSalesCrmData();
  const [viewMode, setViewMode] = useState<'list' | 'agenda'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const now = new Date().toISOString();

  const filtered = activities.filter(a => {
    if (statusFilter === 'overdue') return a.status === 'pending' && a.scheduled_at && a.scheduled_at < now;
    if (statusFilter === 'pending') return a.status === 'pending';
    if (statusFilter === 'completed') return a.status === 'completed';
    return true;
  }).filter(a => {
    if (typeFilter !== 'all') return a.type === typeFilter;
    return true;
  }).sort((a, b) => {
    // Overdue first, then by date
    const aOverdue = a.status === 'pending' && a.scheduled_at && a.scheduled_at < now;
    const bOverdue = b.status === 'pending' && b.scheduled_at && b.scheduled_at < now;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return (a.scheduled_at || '').localeCompare(b.scheduled_at || '');
  });

  const handleComplete = async (id: string) => {
    const { error } = await supabase.from('crm_activities').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (error) toast.error('Erro');
    else {
      toast.success('Atividade concluída');
      refetchActivities();
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" style={{ backgroundColor: DC.bgPage }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: DC.textPrimary }}>Atividades</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            style={viewMode === 'list' ? { backgroundColor: DC.orange } : {}}
          >
            <List className="h-4 w-4 mr-1" /> Lista
          </Button>
          <Button
            variant={viewMode === 'agenda' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('agenda')}
            style={viewMode === 'agenda' ? { backgroundColor: DC.orange } : {}}
          >
            <Calendar className="h-4 w-4 mr-1" /> Agenda
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="call">Ligação</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="meeting">Reunião</SelectItem>
            <SelectItem value="task">Tarefa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: 8 }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Negócio</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8" style={{ color: DC.textSecondary }}>
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(act => {
                  const isOverdue = act.status === 'pending' && act.scheduled_at && act.scheduled_at < now;
                  return (
                    <TableRow
                      key={act.id}
                      style={{ backgroundColor: isOverdue ? DC.redBg : undefined }}
                    >
                      <TableCell>
                        {act.status !== 'completed' && (
                          <Checkbox onCheckedChange={() => handleComplete(act.id)} />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{act.title}</TableCell>
                      <TableCell>
                        <Badge style={{
                          backgroundColor: ACTIVITY_TYPE_COLORS[act.type] || DC.textSecondary,
                          color: '#fff',
                        }}>
                          {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge style={{
                          backgroundColor: act.status === 'completed' ? DC.teal
                            : isOverdue ? DC.red : DC.textSecondary,
                          color: '#fff',
                        }}>
                          {act.status === 'completed' ? 'Concluída' : isOverdue ? 'Atrasada' : 'No prazo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {act.scheduled_at ? format(new Date(act.scheduled_at), 'dd/MM/yyyy HH:mm') : '—'}
                      </TableCell>
                      <TableCell>{act.contact?.name || '—'}</TableCell>
                      <TableCell>{act.deal?.title || '—'}</TableCell>
                      <TableCell>{act.responsible?.name || '—'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
