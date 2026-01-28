import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AccountStatusBadge } from '@/components/crm/StatusBadge';
import { AccountForm } from '@/components/crm/AccountForm';
import { useCrm } from '@/contexts/CrmContext';

export default function CrmList() {
  const navigate = useNavigate();
  const { accounts, addAccount, updateAccount, deleteAccount, loading } = useCrm();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<typeof accounts[0] | undefined>();

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (data: Partial<typeof accounts[0]>) => {
    // IMPORTANT:
    // In edit mode, AccountForm autosave calls onSubmit frequently.
    // We must NOT clear `editingAccount` here, otherwise the dialog flips to "Novo Cliente".
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
    // Only clear after creating (or when closing)
    setEditingAccount(undefined);
  };

  const handleEdit = (account: typeof accounts[0]) => {
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

  const handleDelete = async (id: string) => {
    await deleteAccount(id);
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
              <TableHead>Nome</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    {account.service_name ? (
                      <Badge variant="secondary">{account.service_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AccountStatusBadge status={account.status} />
                  </TableCell>
                  <TableCell>{new Date(account.created_at).toLocaleDateString('pt-BR')}</TableCell>
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
                        onClick={() => handleDelete(account.id)}
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
    </div>
  );
}
