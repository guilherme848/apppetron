import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AccountStatusBadge, ContractStatusBadge, TaskStatusBadge } from '@/components/crm/StatusBadge';
import { ContractForm } from '@/components/crm/ContractForm';
import { TaskForm } from '@/components/crm/TaskForm';
import { useCrm } from '@/contexts/CrmContext';

export default function CrmDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    accounts,
    getAccountById,
    getContractsByAccount,
    getTasksByAccount,
    addContract,
    updateContract,
    deleteContract,
    addTask,
    updateTask,
    deleteTask,
  } = useCrm();

  const account = getAccountById(id!);
  const contracts = getContractsByAccount(id!);
  const tasks = getTasksByAccount(id!);

  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<typeof contracts[0] | undefined>();
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | undefined>();

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="link" onClick={() => navigate('/crm')}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleContractSubmit = (data: any) => {
    if (editingContract) {
      updateContract(editingContract.id, data);
    } else {
      addContract(data);
    }
    setEditingContract(undefined);
  };

  const handleTaskSubmit = (data: any) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask({ ...data, account_id: id });
    }
    setEditingTask(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{account.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <AccountStatusBadge status={account.status} />
            <span className="text-sm text-muted-foreground">
              Cliente desde {new Date(account.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contratos</CardTitle>
            <Button size="sm" onClick={() => setContractFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum contrato</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MRR</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{formatCurrency(contract.mrr)}</TableCell>
                      <TableCell>{new Date(contract.start_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <ContractStatusBadge status={contract.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingContract(contract);
                              setContractFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteContract(contract.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tarefas</CardTitle>
            <Button size="sm" onClick={() => setTaskFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma tarefa</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTask(task);
                              setTaskFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ContractForm
        open={contractFormOpen}
        onClose={() => {
          setContractFormOpen(false);
          setEditingContract(undefined);
        }}
        onSubmit={handleContractSubmit}
        contract={editingContract}
        accountId={id!}
      />

      <TaskForm
        open={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setEditingTask(undefined);
        }}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        accounts={accounts}
      />
    </div>
  );
}
