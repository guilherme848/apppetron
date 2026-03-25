import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Filter, FileText, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useExtraRequests } from '@/hooks/useExtraRequests';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  EXTRA_REQUEST_STATUS_LABELS,
  EXTRA_REQUEST_PRIORITY_LABELS,
  EXTRA_REQUESTED_BY_ROLE_LABELS,
  EXTRA_RESPONSIBLE_ROLE_LABELS,
  ExtraRequestStatus,
  ExtraRequestPriority,
  ExtraResponsibleRole,
} from '@/types/extraRequests';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FORMAT_OPTIONS } from '@/types/contentProduction';

export default function ExtraRequestsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requests, loading, deleteRequest } = useExtraRequests();
  const { accounts } = useCrmData();
  const { members } = useTeamMembers();

  const handleDelete = async (requestId: string) => {
    // Delete associated files from storage first
    const { data: files } = await supabase
      .from('content_extra_request_files')
      .select('storage_path')
      .eq('request_id', requestId);
    
    if (files && files.length > 0) {
      const paths = files.map(f => f.storage_path);
      await supabase.storage.from('content-production').remove(paths);
    }
    
    const result = await deleteRequest(requestId);
    if (result.success) {
      toast({ title: 'Solicitação extra apagada', description: 'A solicitação foi excluída com sucesso.' });
    } else {
      toast({ title: 'Erro', description: result.error || 'Não foi possível apagar', variant: 'destructive' });
    }
  };

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterResponsibleRole, setFilterResponsibleRole] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterOnlyOpen, setFilterOnlyOpen] = useState(false);

  // Get unique months from requests
  const availableMonths = useMemo(() => {
    const months = new Set(requests.map(r => r.month_ref));
    return Array.from(months).sort().reverse();
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filterMonth && r.month_ref !== filterMonth) return false;
      if (filterClient && r.client_id !== filterClient) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterPriority && r.priority !== filterPriority) return false;
      if (filterResponsibleRole && r.responsible_role_key !== filterResponsibleRole) return false;
      if (filterAssignee && r.assignee_id !== filterAssignee) return false;
      if (filterOnlyOpen && (r.status === 'done' || r.status === 'canceled')) return false;
      return true;
    });
  }, [requests, filterMonth, filterClient, filterStatus, filterPriority, filterResponsibleRole, filterAssignee, filterOnlyOpen]);

  const getStatusVariant = (status: ExtraRequestStatus) => {
    switch (status) {
      case 'done': return 'default';
      case 'in_progress': return 'secondary';
      case 'canceled': return 'outline';
      default: return 'destructive';
    }
  };

  const getPriorityVariant = (priority: ExtraRequestPriority) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  const clearFilters = () => {
    setFilterMonth('');
    setFilterClient('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterResponsibleRole('');
    setFilterAssignee('');
    setFilterOnlyOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Solicitações Extras</h1>
            <p className="text-muted-foreground">Demandas avulsas fora do planejamento</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/content/extra-requests/new">
            <Plus className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Select value={filterMonth || "all"} onValueChange={(v) => setFilterMonth(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClient || "all"} onValueChange={(v) => setFilterClient(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(EXTRA_REQUEST_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority || "all"} onValueChange={(v) => setFilterPriority(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(EXTRA_REQUEST_PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResponsibleRole || "all"} onValueChange={(v) => setFilterResponsibleRole(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Cargo Resp." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {Object.entries(EXTRA_RESPONSIBLE_ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAssignee || "all"} onValueChange={(v) => setFilterAssignee(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.filter(m => m.active).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Título</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Cliente</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Formato</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Mês</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Solicitante</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Cargo Resp.</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Responsável</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Prioridade</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Vencimento</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50">Criado em</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/50 w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link to={`/content/extra-requests/${r.id}`} className="font-medium hover:underline">
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell>{r.client_name}</TableCell>
                    <TableCell>
                      {r.format ? (() => {
                        const opt = FORMAT_OPTIONS.find(o => o.value === r.format);
                        return opt ? opt.label : r.format;
                      })() : '-'}
                    </TableCell>
                    <TableCell>{r.month_ref}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {EXTRA_REQUESTED_BY_ROLE_LABELS[r.requested_by_role_key]}
                      </span>
                      {r.requested_by_member_name && (
                        <span className="block text-sm">{r.requested_by_member_name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.responsible_role_key && EXTRA_RESPONSIBLE_ROLE_LABELS[r.responsible_role_key]}
                    </TableCell>
                    <TableCell>{r.assignee_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(r.status)}>
                        {EXTRA_REQUEST_STATUS_LABELS[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(r.priority)}>
                        {EXTRA_REQUEST_PRIORITY_LABELS[r.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.due_date ? format(new Date(r.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ConfirmDeleteDialog
                            itemName={r.title}
                            description="Tem certeza que deseja apagar esta solicitação extra? Esta ação não poderá ser desfeita."
                            onConfirm={() => handleDelete(r.id)}
                          >
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir solicitação
                            </DropdownMenuItem>
                          </ConfirmDeleteDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
