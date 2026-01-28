import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AccountStatusBadge } from '@/components/crm/StatusBadge';
import { AccountForm } from '@/components/crm/AccountForm';
import { AccountRemoveDialog, RemovalType } from '@/components/crm/AccountRemoveDialog';
import { useCrm } from '@/contexts/CrmContext';
import { toast } from '@/hooks/use-toast';
import type { Account } from '@/types/crm';

type SortKey = 'name' | 'plan' | 'monthly_value' | 'niche';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const SORT_STORAGE_KEY = 'petron_crm_sort';

const getStoredSort = (): SortConfig => {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (['name', 'plan', 'monthly_value', 'niche'].includes(parsed.key) && ['asc', 'desc'].includes(parsed.direction)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { key: 'name', direction: 'asc' };
};

export default function CrmList() {
  const navigate = useNavigate();
  const { accounts, addAccount, updateAccount, softDeleteAccount, churnAccount, loading } = useCrm();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [sortConfig, setSortConfig] = useState<SortConfig>(getStoredSort);
  
  // Remove dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortConfig));
  }, [sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedAndFilteredAccounts = useMemo(() => {
    // Filter first - also exclude archived accounts from the list
    const filtered = accounts.filter((account) =>
      account.name.toLowerCase().includes(search.toLowerCase()) &&
      account.status !== 'archived'
    );

    // Then sort
    return [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (key) {
        case 'name': {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB, 'pt-BR') * multiplier;
        }
        case 'plan': {
          const planA = (a.service_name || '').toLowerCase();
          const planB = (b.service_name || '').toLowerCase();
          // Empty plans go to the end
          if (!planA && planB) return 1;
          if (planA && !planB) return -1;
          return planA.localeCompare(planB, 'pt-BR') * multiplier;
        }
        case 'monthly_value': {
          const valA = a.monthly_value ?? 0;
          const valB = b.monthly_value ?? 0;
          return (valA - valB) * multiplier;
        }
        case 'niche': {
          const nicheA = (a.niche || '').toLowerCase();
          const nicheB = (b.niche || '').toLowerCase();
          if (!nicheA && nicheB) return 1;
          if (nicheA && !nicheB) return -1;
          return nicheA.localeCompare(nicheB, 'pt-BR') * multiplier;
        }
        default:
          return 0;
      }
    });
  }, [accounts, search, sortConfig]);

  const handleSubmit = async (data: Partial<Account>) => {
    if (editingAccount) {
      if (import.meta.env.DEV) {
        console.debug('[CRM] AccountForm submit (EDIT)', {
          editingAccountId: editingAccount.id,
          formOpen,
          keys: Object.keys(data),
        });
      }
      await updateAccount(editingAccount.id, data);
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('[CRM] AccountForm submit (CREATE)', {
        formOpen,
        keys: Object.keys(data),
      });
    }
    await addAccount(data as { name: string; status: 'lead' | 'active' | 'churned' });
    setEditingAccount(undefined);
  };

  const handleEdit = (account: Account) => {
    if (import.meta.env.DEV) {
      console.debug('[CRM] Open AccountForm (EDIT)', { accountId: account.id });
    }
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleClose = () => {
    if (import.meta.env.DEV) {
      console.debug('[CRM] Close AccountForm', { wasEditing: !!editingAccount, editingAccountId: editingAccount?.id });
    }
    setFormOpen(false);
    setEditingAccount(undefined);
  };

  const handleRemoveClick = (account: Account) => {
    setAccountToRemove(account);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = async (type: RemovalType, churnDate?: string) => {
    if (!accountToRemove) return;

    if (type === 'churn' && churnDate) {
      const result = await churnAccount(accountToRemove.id, churnDate);
      if (result.success) {
        toast({
          title: 'Cliente marcado como Churned',
          description: `${accountToRemove.name} foi marcado como cancelado.`,
        });
      } else {
        toast({
          title: 'Erro ao registrar churn',
          description: 'Não foi possível registrar o cancelamento.',
          variant: 'destructive',
        });
      }
    } else if (type === 'delete') {
      const result = await softDeleteAccount(accountToRemove.id);
      if (result.success) {
        toast({
          title: 'Cliente arquivado',
          description: `${accountToRemove.name} foi removido da listagem.`,
        });
      } else {
        toast({
          title: 'Erro ao arquivar cliente',
          description: 'Não foi possível remover o cliente.',
          variant: 'destructive',
        });
      }
    }

    setAccountToRemove(null);
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Nome
                  <SortIcon columnKey="name" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('plan')}
              >
                <div className="flex items-center">
                  Serviço Contratado
                  <SortIcon columnKey="plan" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('monthly_value')}
              >
                <div className="flex items-center">
                  Valor Mensal
                  <SortIcon columnKey="monthly_value" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('niche')}
              >
                <div className="flex items-center">
                  Nicho
                  <SortIcon columnKey="niche" />
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    {account.service_name ? (
                      <Badge variant="secondary">{account.service_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(account.monthly_value)}
                  </TableCell>
                  <TableCell>
                    {account.niche ? (
                      <span className="text-sm">{account.niche}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AccountStatusBadge status={account.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/crm/${account.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(account)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveClick(account)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AccountForm
        open={formOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        account={editingAccount}
      />

      <AccountRemoveDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        account={accountToRemove}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}
