import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, Search, AlertCircle, ExternalLink, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { POST_STATUS_OPTIONS, ITEM_TYPE_OPTIONS, BATCH_STATUS_OPTIONS, PostStatus, ItemType } from '@/types/contentProduction';
import { RESPONSIBLE_ROLE_OPTIONS, ResponsibleRoleKey } from '@/types/crm';
import { EXTRA_REQUEST_STATUS_LABELS, ExtraRequestStatus } from '@/types/extraRequests';
import { format, isBefore, startOfDay } from 'date-fns';

type TaskType = 'post' | 'extra';

interface ConsolidatedTask {
  id: string;
  type: TaskType;
  title: string;
  status: string;
  item_type: ItemType | null;
  responsible_role_key: ResponsibleRoleKey | null;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  client_id: string | null;
  client_name: string;
  month_ref: string;
  batch_status: string;
  batch_id: string | null;
}

interface AccountOption {
  id: string;
  name: string;
}

export default function ContentTasks() {
  const navigate = useNavigate();
  const { members, loading: loadingMembers, getActiveMembers, getMemberById } = useTeamMembers();

  const [tasks, setTasks] = useState<ConsolidatedTask[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterItemType, setFilterItemType] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterRoleKey, setFilterRoleKey] = useState<string>('all');
  const [filterTaskType, setFilterTaskType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    
    // Fetch posts with batch and client data using LEFT JOINs
    const { data: postsData, error: postsError } = await supabase
      .from('content_posts')
      .select(`
        id,
        title,
        status,
        item_type,
        responsible_role_key,
        assignee_id,
        batch_id,
        content_batches!left (
          id,
          month_ref,
          status,
          planning_due_date,
          client_id,
          accounts!left (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Fetch extra requests
    const { data: extrasData, error: extrasError } = await supabase
      .from('content_extra_requests')
      .select(`
        id,
        title,
        status,
        responsible_role_key,
        assignee_id,
        due_date,
        month_ref,
        client_id,
        accounts:client_id (name)
      `)
      .order('created_at', { ascending: false });

    if (postsError || extrasError) {
      console.error('Error fetching tasks:', postsError || extrasError);
      setLoading(false);
      return;
    }

    // Transform posts into consolidated tasks
    const postTasks: ConsolidatedTask[] = (postsData || []).map((post: any) => {
      const batch = post.content_batches;
      const client = batch?.accounts;
      
      return {
        id: post.id,
        type: 'post' as TaskType,
        title: post.title,
        status: post.status,
        item_type: post.item_type as ItemType | null,
        responsible_role_key: post.responsible_role_key as ResponsibleRoleKey | null,
        assignee_id: post.assignee_id,
        assignee_name: null,
        due_date: batch?.planning_due_date || null,
        client_id: batch?.client_id || null,
        client_name: client?.name || 'Sem cliente',
        month_ref: batch?.month_ref || '',
        batch_status: batch?.status || '',
        batch_id: post.batch_id,
      };
    });

    // Transform extras into consolidated tasks
    const extraTasks: ConsolidatedTask[] = (extrasData || []).map((extra: any) => ({
      id: extra.id,
      type: 'extra' as TaskType,
      title: extra.title,
      status: extra.status,
      item_type: null,
      responsible_role_key: extra.responsible_role_key as ResponsibleRoleKey | null,
      assignee_id: extra.assignee_id,
      assignee_name: null,
      due_date: extra.due_date || null,
      client_id: extra.client_id,
      client_name: extra.accounts?.name || 'Sem cliente',
      month_ref: extra.month_ref || '',
      batch_status: '',
      batch_id: null,
    }));

    setTasks([...postTasks, ...extraTasks]);

    // Fetch unique accounts for filter
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name', { ascending: true });

    setAccounts(accountsData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Add assignee names from team members
  const tasksWithAssignees = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      assignee_name: task.assignee_id ? getMemberById(task.assignee_id)?.name || null : null,
    }));
  }, [tasks, getMemberById]);

  const filteredTasks = useMemo(() => {
    let result = tasksWithAssignees;

    // Filter by task type
    if (filterTaskType !== 'all') {
      result = result.filter((t) => t.type === filterTaskType);
    }

    // Filter by assignee
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned') {
        result = result.filter((t) => !t.assignee_id);
      } else {
        result = result.filter((t) => t.assignee_id === filterAssignee);
      }
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus);
    }

    // Filter by item type (only for posts)
    if (filterItemType !== 'all') {
      result = result.filter((t) => t.item_type === filterItemType);
    }

    // Filter by client
    if (filterClient !== 'all') {
      result = result.filter((t) => t.client_id === filterClient);
    }

    // Filter by role key
    if (filterRoleKey !== 'all') {
      result = result.filter((t) => t.responsible_role_key === filterRoleKey);
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(searchLower));
    }

    // Sort: due_date ascending (nulls last), then status (todo first)
    return result.sort((a, b) => {
      // First by due date
      if (a.due_date && b.due_date) {
        const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (diff !== 0) return diff;
      } else if (a.due_date) {
        return -1;
      } else if (b.due_date) {
        return 1;
      }

      // Then by status priority (todo/open > doing/in_progress > done)
      const statusOrder: Record<string, number> = { todo: 0, open: 0, doing: 1, in_progress: 1, done: 2, canceled: 3 };
      return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    });
  }, [tasksWithAssignees, filterAssignee, filterStatus, filterItemType, filterClient, filterRoleKey, filterTaskType, search]);

  const getRoleLabel = (roleKey: ResponsibleRoleKey | null) => {
    if (!roleKey) return null;
    return RESPONSIBLE_ROLE_OPTIONS.find(o => o.value === roleKey)?.label || roleKey;
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'done') return false;
    return isBefore(new Date(dueDate), startOfDay(new Date()));
  };

  const formatMonthRef = (monthRef: string) => {
    if (!monthRef) return '-';
    const [year, month] = monthRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  const getStatusBadge = (status: string, type: TaskType) => {
    if (type === 'extra') {
      const label = EXTRA_REQUEST_STATUS_LABELS[status as ExtraRequestStatus] || status;
      const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
        open: 'secondary',
        in_progress: 'default',
        done: 'outline',
        canceled: 'outline',
      };
      return <Badge variant={variants[status] || 'secondary'}>{label}</Badge>;
    }
    const variants: Record<PostStatus, 'default' | 'secondary' | 'outline'> = {
      todo: 'secondary',
      doing: 'default',
      done: 'outline',
    };
    const label = POST_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
    return <Badge variant={variants[status as PostStatus] || 'secondary'}>{label}</Badge>;
  };

  const getBatchStatusLabel = (status: string) => {
    return BATCH_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
  };

  const handleOpenTask = (task: ConsolidatedTask) => {
    if (task.type === 'extra') {
      navigate(`/content/extra-requests/${task.id}`);
    } else {
      navigate(`/content/production/${task.batch_id}/posts/${task.id}`);
    }
  };

  if (loading || loadingMembers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListTodo className="h-6 w-6" />
          Tarefas de Conteúdo
        </h1>
        <p className="text-muted-foreground">Posts e Solicitações Extras</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={filterTaskType} onValueChange={setFilterTaskType}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="post">Posts</SelectItem>
                  <SelectItem value="extra">Extras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cargo</label>
              <Select value={filterRoleKey} onValueChange={setFilterRoleKey}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  {RESPONSIBLE_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {getActiveMembers().map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  {POST_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={filterItemType} onValueChange={setFilterItemType}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  {ITEM_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cliente</label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Busca</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tasks.length === 0 
                ? 'Nenhuma tarefa encontrada. Crie posts ou solicitações extras.'
                : 'Nenhuma tarefa encontrada com os filtros aplicados.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const overdue = isOverdue(task.due_date, task.status);
                    return (
                      <TableRow key={`${task.type}-${task.id}`} className={overdue ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <Badge variant={task.type === 'extra' ? 'default' : 'outline'} className="text-xs">
                            {task.type === 'extra' ? 'Extra' : 'Post'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.title}</span>
                            {task.item_type && (
                              <Badge variant="outline" className="text-xs">
                                {ITEM_TYPE_OPTIONS.find((o) => o.value === task.item_type)?.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{task.client_name}</TableCell>
                        <TableCell>{formatMonthRef(task.month_ref)}</TableCell>
                        <TableCell>
                          {task.batch_status ? (
                            <Badge variant="secondary">{getBatchStatusLabel(task.batch_status)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.due_date ? (
                              <>
                                <span className={overdue ? 'text-destructive font-medium' : ''}>
                                  {format(new Date(task.due_date), 'dd/MM/yyyy')}
                                </span>
                                {overdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    ATRASADO
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleLabel(task.responsible_role_key) || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.assignee_name || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status, task.type)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenTask(task)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
