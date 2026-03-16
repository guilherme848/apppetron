import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, ExternalLink, Phone, Mail, MapPin, Lock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AccountStatusBadge, ContractStatusBadge, TaskStatusBadge } from '@/components/crm/StatusBadge';
import { ContractForm } from '@/components/crm/ContractForm';
import { TaskForm } from '@/components/crm/TaskForm';
import { AccountForm } from '@/components/crm/AccountForm';
import { AccountRemoveDialog, RemovalType } from '@/components/crm/AccountRemoveDialog';
import { ClientDeliverables } from '@/components/crm/ClientDeliverables';
import { AccountTeamCard } from '@/components/crm/AccountTeamCard';
import { ClientTrafficSection } from '@/components/crm/ClientTrafficSection';
import { useCrm } from '@/contexts/CrmContext';
import { Contract, Task, ContractStatus, TaskStatus, Account } from '@/types/crm';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { toast } from '@/hooks/use-toast';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    softDeleteAccount,
    churnAccount,
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
  const { canViewFinancialValues } = useSensitivePermission();
  const showFinancialValues = canViewFinancialValues();

  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const RestrictedValue = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
            <Lock className="h-3 w-3" />
            <span className="text-xs">Restrito</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Restrito ao Administrador</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

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

  const handleTeamUpdate = async (field: keyof Account, value: string | null) => {
    await updateAccount(id!, { [field]: value });
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

  const handleRemoveConfirm = async (type: RemovalType, churnDate?: string) => {
    if (!account) return;

    if (type === 'churn' && churnDate) {
      const result = await churnAccount(account.id, churnDate);
      if (result.success) {
        toast({
          title: 'Cliente marcado como Churned',
          description: `${account.name} foi marcado como cancelado.`,
        });
      } else {
        toast({
          title: 'Erro ao registrar churn',
          description: 'Não foi possível registrar o cancelamento.',
          variant: 'destructive',
        });
      }
    } else if (type === 'delete') {
      const result = await softDeleteAccount(account.id);
      if (result.success) {
        toast({
          title: 'Cliente arquivado',
          description: `${account.name} foi removido da listagem.`,
        });
        navigate('/crm');
      } else {
        toast({
          title: 'Erro ao arquivar cliente',
          description: 'Não foi possível remover o cliente.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{account.name}</h1>
              {account.service_name && (
                <Badge variant="default" className="text-sm">
                  {account.service_name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <AccountStatusBadge status={account.status} />
              {account.niche && <span className="text-sm text-muted-foreground">• {account.niche}</span>}
              <span className="text-sm text-muted-foreground">
                • Cliente desde {formatDate(account.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAccountFormOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={() => setRemoveDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Time da Conta */}
        <AccountTeamCard account={account} onUpdate={handleTeamUpdate} />
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
              {showFinancialValues ? (
                <p className="font-medium text-lg">{formatCurrency(account.monthly_value)}</p>
              ) : (
                <RestrictedValue />
              )}
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
        
        {/* Tráfego Pago */}
        <ClientTrafficSection account={account} onUpdate={handleTeamUpdate} />
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
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
                          <ConfirmDeleteDialog
                            itemName={task.title}
                            onConfirm={() => handleDeleteTask(task.id)}
                          >
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ConfirmDeleteDialog>
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

      <AccountRemoveDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        account={account}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}
