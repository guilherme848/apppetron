import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, ExternalLink, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AccountStatusBadge, ContractStatusBadge, TaskStatusBadge } from '@/components/crm/StatusBadge';
import { ContractForm } from '@/components/crm/ContractForm';
import { TaskForm } from '@/components/crm/TaskForm';
import { AccountForm } from '@/components/crm/AccountForm';
import { ClientDeliverables } from '@/components/crm/ClientDeliverables';
import { useCrm } from '@/contexts/CrmContext';
import { Contract, Task, ContractStatus, TaskStatus, Account } from '@/types/crm';
export default function CrmDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    accounts,
    loading,
    getAccountById,
    getContractsByAccount,
    getTasksByAccount,
    updateAccount,
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
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getFullAddress = () => {
    const parts = [
      account.street,
      account.street_number,
      account.address_complement,
      account.neighborhood,
      account.city,
      account.state,
      account.postal_code,
      account.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const handleAccountSubmit = async (data: Partial<Account>) => {
    await updateAccount(id!, data);
  };

  const handleContractSubmit = async (data: { mrr: number; start_date: string; status: ContractStatus; account_id: string }) => {
    if (editingContract) {
      await updateContract(editingContract.id, data);
    } else {
      await addContract(data);
    }
    setEditingContract(undefined);
  };

  const handleTaskSubmit = async (data: { title: string; status: TaskStatus; account_id: string | null; due_date: string | null }) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask({ ...data, account_id: id! });
    }
    setEditingTask(undefined);
  };

  const handleDeleteContract = async (contractId: string) => {
    await deleteContract(contractId);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <AccountStatusBadge status={account.status} />
              {account.niche && <span className="text-sm text-muted-foreground">• {account.niche}</span>}
              <span className="text-sm text-muted-foreground">
                • Cliente desde {formatDate(account.created_at)}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={() => setAccountFormOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Contrato */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="font-medium">{account.service_contracted || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Mensal</p>
              <p className="font-medium text-lg">{formatCurrency(account.monthly_value)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data de Entrada</p>
              <p className="font-medium">{formatDate(account.start_date)}</p>
            </div>
            {account.cpf_cnpj && (
              <div>
                <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                <p className="font-medium">{account.cpf_cnpj}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {account.contact_name && (
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{account.contact_name}</p>
              </div>
            )}
            {account.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${account.contact_phone}`} className="font-medium hover:underline">
                  {account.contact_phone}
                </a>
              </div>
            )}
            {account.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${account.contact_email}`} className="font-medium hover:underline">
                  {account.contact_email}
                </a>
              </div>
            )}
            {account.website && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline text-primary"
                >
                  {account.website}
                </a>
              </div>
            )}
            {!account.contact_name && !account.contact_phone && !account.contact_email && !account.website && (
              <p className="text-muted-foreground text-sm">Nenhum contato cadastrado</p>
            )}
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Endereço</CardTitle>
          </CardHeader>
          <CardContent>
            {getFullAddress() ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="font-medium text-sm">{getFullAddress()}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum endereço cadastrado</p>
            )}
          </CardContent>
        </Card>

        {/* Entregas do Plano */}
        <ClientDeliverables serviceId={account.service_id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contratos (MRR)</CardTitle>
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
                      <TableCell className="font-medium">{formatCurrency(Number(contract.mrr))}</TableCell>
                      <TableCell>{formatDate(contract.start_date)}</TableCell>
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
                            onClick={() => handleDeleteContract(contract.id)}
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
                        {task.due_date ? formatDate(task.due_date) : '-'}
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
                            onClick={() => handleDeleteTask(task.id)}
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

      <AccountForm
        open={accountFormOpen}
        onClose={() => setAccountFormOpen(false)}
        onSubmit={handleAccountSubmit}
        account={account}
      />

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
