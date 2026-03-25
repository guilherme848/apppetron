import { useState } from 'react';
import { Plus, Pencil, Trash2, ListTodo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TaskStatusBadge } from '@/components/crm/StatusBadge';
import { TaskForm } from '@/components/crm/TaskForm';
import { useCrm } from '@/contexts/CrmContext';
import { TaskStatus } from '@/types/crm';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';

export default function TaskList() {
  const { tasks, accounts, addTask, updateTask, deleteTask, getAccountById, loading } = useCrm();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | undefined>();

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesAccount =
      accountFilter === 'all' ||
      (accountFilter === 'none' && !task.account_id) ||
      task.account_id === accountFilter;
    return matchesStatus && matchesAccount;
  });

  const handleSubmit = async (data: { title: string; status: TaskStatus; account_id: string | null; due_date: string | null }) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask(data);
    }
    setEditingTask(undefined);
  };

  const handleEdit = (task: typeof tasks[0]) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingTask(undefined);
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-48 mt-2" /></div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2"><Skeleton className="h-10 w-44" /><Skeleton className="h-10 w-48" /></div>
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas tarefas</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">A Fazer</SelectItem>
            <SelectItem value="doing">Fazendo</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            <SelectItem value="none">Sem cliente</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Título</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Cliente</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Vencimento</TableHead>
              <TableHead className="w-[100px] text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const account = task.account_id ? getAccountById(task.account_id) : null;
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{account?.name || '-'}</TableCell>
                    <TableCell>
                      <TaskStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          itemName={task.title}
                          onConfirm={() => handleDelete(task.id)}
                        >
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDeleteDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TaskForm
        open={formOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        task={editingTask}
        accounts={accounts}
      />
    </div>
  );
}
