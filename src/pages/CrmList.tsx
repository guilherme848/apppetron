import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Lock, AlertTriangle, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountForm } from '@/components/crm/AccountForm';
import { AccountRemoveDialog, RemovalType } from '@/components/crm/AccountRemoveDialog';
import { useCrm } from '@/contexts/CrmContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { toast } from '@/hooks/use-toast';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Account } from '@/types/crm';

type SortKey = 'name' | 'plan' | 'start_date' | 'monthly_value' | 'niche';
type SortDirection = 'asc' | 'desc';
interface SortConfig { key: SortKey; direction: SortDirection; }

const SORT_STORAGE_KEY = 'petron_crm_sort';
const ITEMS_PER_PAGE = 20;

const getStoredSort = (): SortConfig => {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (['name', 'plan', 'start_date', 'monthly_value', 'niche'].includes(parsed.key) && ['asc', 'desc'].includes(parsed.direction)) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return { key: 'name', direction: 'asc' };
};

const getInitials = (name: string) => {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
};

const getPlanBadgeStyle = (planName: string | null | undefined) => {
  if (!planName) return null;
  const lower = planName.toLowerCase();
  if (lower.includes('start')) return 'bg-secondary/80 text-secondary-foreground border-border';
  if (lower.includes('performance')) return 'bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)]';
  if (lower.includes('escala')) return 'bg-primary/12 text-primary border-primary/25';
  if (lower.includes('growth')) return 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/25';
  return 'bg-muted text-muted-foreground border-border';
};

const getCheckupBadge = (classificacao: string | null | undefined) => {
  if (!classificacao) return null;
  const colorMap: Record<string, string> = {
    A: 'bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/.25)]',
    B: 'bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)]',
    C: 'bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/.25)]',
    D: 'bg-destructive/12 text-destructive border-destructive/25',
  };
  return colorMap[classificacao] || '';
};

export default function CrmList() {
  const navigate = useNavigate();
  const { accounts, addAccount, updateAccount, softDeleteAccount, churnAccount, loading } = useCrm();
  const { services, niches } = useSettings();
  const { clientLinks, loading: metaLoading } = useMetaAds();
  const { members, getMemberById, trafficManagers } = useTeamMembers();
  const { canViewFinancialValues } = useSensitivePermission();
  const showFinancialValues = canViewFinancialValues();

  // CS members
  const csMembers = useMemo(() => members.filter(m => m.active && m.role_id), [members]);

  const getMissingAdAccountWarning = (account: Account): boolean => {
    if (account.status !== 'active') return false;
    const service = services.find((s) => s.id === account.service_id);
    if (!(service as any)?.has_traffic) return false;
    const hasLinkedAdAccount = clientLinks.some(
      (link) => link.client_id === account.id && link.active
    );
    return !hasLinkedAdAccount;
  };

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [sortConfig, setSortConfig] = useState<SortConfig>(getStoredSort);
  const [showChurned, setShowChurned] = useState(false);
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterTrafficManager, setFilterTrafficManager] = useState('all');
  const [filterCs, setFilterCs] = useState('all');
  const [filterNiche, setFilterNiche] = useState('all');
  const [filterEntryMonth, setFilterEntryMonth] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null);

  const RestrictedValue = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
            <Lock className="h-3 w-3" />
            <span className="text-xs">Restrito</span>
          </span>
        </TooltipTrigger>
        <TooltipContent><p>Restrito ao Administrador</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortConfig));
  }, [sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const hasActiveFilters = search || filterPlan !== 'all' || filterTrafficManager !== 'all' || filterCs !== 'all' || filterNiche !== 'all' || filterEntryMonth !== 'all' || showChurned;

  const clearFilters = () => {
    setSearch('');
    setFilterPlan('all');
    setFilterTrafficManager('all');
    setFilterCs('all');
    setFilterNiche('all');
    setFilterEntryMonth('all');
    setShowChurned(false);
    setCurrentPage(1);
  };

  // Unique niches from accounts
  const uniqueNiches = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach(a => { if (a.niche) set.add(a.niche); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [accounts]);

  // Unique active plans from services
  const activePlans = useMemo(() => services.filter((s: any) => s.active), [services]);

  // Unique entry months (YYYY-MM) from accounts with start_date
  const entryMonthOptions = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach(a => {
      if (a.start_date) {
        const ym = a.start_date.slice(0, 7); // "YYYY-MM"
        if (!map.has(ym)) {
          const [y, m] = ym.split('-');
          const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          map.set(ym, label.charAt(0).toUpperCase() + label.slice(1));
        }
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // newest first
      .map(([value, label]) => ({ value, label }));
  }, [accounts]);

  // CS team members (those assigned as CS on any account)
  const csMembersList = useMemo(() => {
    const csIds = new Set<string>();
    accounts.forEach(a => { if (a.cs_member_id) csIds.add(a.cs_member_id); });
    return Array.from(csIds).map(id => getMemberById(id)).filter(Boolean);
  }, [accounts, getMemberById]);

  const sortedAndFilteredAccounts = useMemo(() => {
    const filtered = accounts.filter((account) => {
      if (account.name.toLowerCase() === 'petron') return false;
      if (account.status === 'archived') return false;
      if (!showChurned && account.status === 'churned') return false;
      if (search && !account.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPlan !== 'all' && account.service_id !== filterPlan) return false;
      if (filterTrafficManager !== 'all' && account.traffic_member_id !== filterTrafficManager) return false;
      if (filterCs !== 'all' && account.cs_member_id !== filterCs) return false;
      if (filterNiche !== 'all' && account.niche !== filterNiche) return false;
      if (filterEntryMonth !== 'all' && (!account.start_date || !account.start_date.startsWith(filterEntryMonth))) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;
      switch (key) {
        case 'name': return (a.name || '').localeCompare(b.name || '', 'pt-BR') * multiplier;
        case 'plan': {
          const pA = a.service_name || ''; const pB = b.service_name || '';
          if (!pA && pB) return 1; if (pA && !pB) return -1;
          return pA.localeCompare(pB, 'pt-BR') * multiplier;
        }
        case 'start_date': {
          const dA = a.start_date || ''; const dB = b.start_date || '';
          if (!dA && dB) return 1; if (dA && !dB) return -1;
          return dA.localeCompare(dB) * multiplier;
        }
        case 'monthly_value': return ((a.monthly_value ?? 0) - (b.monthly_value ?? 0)) * multiplier;
        case 'niche': {
          const nA = a.niche || ''; const nB = b.niche || '';
          if (!nA && nB) return 1; if (nA && !nB) return -1;
          return nA.localeCompare(nB, 'pt-BR') * multiplier;
        }
        default: return 0;
      }
    });
  }, [accounts, search, sortConfig, showChurned, filterPlan, filterTrafficManager, filterCs, filterNiche, filterEntryMonth]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredAccounts.length / ITEMS_PER_PAGE));
  const paginatedAccounts = sortedAndFilteredAccounts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, showChurned, filterPlan, filterTrafficManager, filterCs, filterNiche, filterEntryMonth]);

  const handleSubmit = async (data: Partial<Account>) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
      return;
    }
    await addAccount(data as { name: string; status: 'lead' | 'active' | 'churned' });
    setEditingAccount(undefined);
  };

  const handleEdit = (account: Account) => { setEditingAccount(account); setFormOpen(true); };
  const handleClose = () => { setFormOpen(false); setEditingAccount(undefined); };
  const handleRemoveClick = (account: Account) => { setAccountToRemove(account); setRemoveDialogOpen(true); };

  const handleRemoveConfirm = async (type: RemovalType, churnDate?: string) => {
    if (!accountToRemove) return;
    if (type === 'churn' && churnDate) {
      const result = await churnAccount(accountToRemove.id, churnDate);
      if (result.success) {
        toast({ title: 'Cliente marcado como Churned', description: `${accountToRemove.name} foi marcado como cancelado.` });
      } else {
        toast({ title: 'Erro ao registrar churn', description: result.error?.message || 'Não foi possível registrar o cancelamento.', variant: 'destructive' });
        throw new Error(result.error?.message || 'Churn failed');
      }
    } else if (type === 'delete') {
      const result = await softDeleteAccount(accountToRemove.id);
      if (result.success) {
        toast({ title: 'Cliente arquivado', description: `${accountToRemove.name} foi removido da listagem.` });
      } else {
        toast({ title: 'Erro ao arquivar cliente', description: result.error?.message || 'Não foi possível remover o cliente.', variant: 'destructive' });
        throw new Error(result.error?.message || 'Soft delete failed');
      }
    }
    setAccountToRemove(null);
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const MemberCell = ({ memberId }: { memberId: string | null | undefined }) => {
    if (!memberId) return <span className="text-muted-foreground text-xs">Não atribuído</span>;
    const member = getMemberById(memberId);
    if (!member) return <span className="text-muted-foreground text-xs">—</span>;
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-[hsl(var(--destructive))] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
          {getInitials(member.name)}
        </div>
        <span className="text-[13px] text-muted-foreground truncate max-w-[120px]">{member.name}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-64 mt-2" /></div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2"><Skeleton className="h-10 w-56" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /></div>
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua base de clientes ativos</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-[220px] h-10"
          />
        </div>

        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-[160px] h-10"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            {activePlans.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterTrafficManager} onValueChange={setFilterTrafficManager}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Gestor de Tráfego" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os gestores</SelectItem>
            {trafficManagers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCs} onValueChange={setFilterCs}>
          <SelectTrigger className="w-[170px] h-10"><SelectValue placeholder="Responsável CS" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos CS</SelectItem>
            {csMembersList.map(m => m && <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterNiche} onValueChange={setFilterNiche}>
          <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Nicho" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os nichos</SelectItem>
            {uniqueNiches.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterEntryMonth} onValueChange={setFilterEntryMonth}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Mês de entrada" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {entryMonthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
          <div className="flex items-center gap-2">
            <Switch id="show-churned-toggle" checked={showChurned} onCheckedChange={setShowChurned} />
            <Label htmlFor="show-churned-toggle" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
              Mostrar cancelados
            </Label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                <div className="flex items-center text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Nome<SortIcon columnKey="name" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('plan')}>
                <div className="flex items-center text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Plano<SortIcon columnKey="plan" /></div>
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Gestor Tráfego</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">CS</TableHead>
              {showFinancialValues && (
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('monthly_value')}>
                  <div className="flex items-center text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Valor Mensal<SortIcon columnKey="monthly_value" /></div>
                </TableHead>
              )}
              
              <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Status</TableHead>
              <TableHead className="w-[100px] text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showFinancialValues ? 7 : 6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                      <Search className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhum cliente encontrado</p>
                    <p className="text-xs text-muted-foreground max-w-xs">Tente ajustar os filtros ou adicionar um novo cliente.</p>
                    <Button size="sm" onClick={() => setFormOpen(true)} className="mt-2">
                      <Plus className="h-4 w-4 mr-1" />Novo Cliente
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAccounts.map((account) => {
                const missingAdAccount = getMissingAdAccountWarning(account);
                const planStyle = getPlanBadgeStyle(account.service_name);
                const checkupStyle = getCheckupBadge(account.checkup_classificacao);
                return (
                  <TableRow
                    key={account.id}
                    className="h-14 group cursor-pointer hover:bg-gradient-to-r hover:from-primary/[0.03] hover:to-transparent transition-all duration-150"
                    onClick={() => navigate(`/crm/${account.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--destructive))] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {getInitials(account.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground truncate">{account.name}</span>
                            {missingAdAccount && (
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /></TooltipTrigger><TooltipContent><p>Conta de anúncios não vinculada</p></TooltipContent></Tooltip></TooltipProvider>
                            )}
                            {!account.checkup_classificacao && (
                              <TooltipProvider><Tooltip><TooltipTrigger asChild><div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /></TooltipTrigger><TooltipContent><p>Checkup não realizado</p></TooltipContent></Tooltip></TooltipProvider>
                            )}
                          </div>
                          {account.niche && <p className="text-[11px] text-muted-foreground truncate">{account.niche}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.service_name ? (
                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border ${planStyle}`}>
                          {account.service_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}><MemberCell memberId={account.traffic_member_id} /></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}><MemberCell memberId={account.cs_member_id} /></TableCell>
                    {showFinancialValues && (
                      <TableCell>
                        <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(account.monthly_value)}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                        account.status === 'active' ? 'bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/.25)]' :
                        account.status === 'churned' ? 'bg-destructive/12 text-destructive border-destructive/25' :
                        'bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/.25)]'
                      }`}>
                        {account.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                        {account.status === 'active' ? 'Ativo' : account.status === 'churned' ? 'Inativo' : 'Lead'}
                      </span>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/crm/${account.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemoveClick(account)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {sortedAndFilteredAccounts.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedAndFilteredAccounts.length)} a {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredAccounts.length)} de {sortedAndFilteredAccounts.length} clientes
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
              <span className="text-xs text-muted-foreground">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </div>
      )}

      <AccountForm open={formOpen} onClose={handleClose} onSubmit={handleSubmit} account={editingAccount} />
      <AccountRemoveDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen} account={accountToRemove} onConfirm={handleRemoveConfirm} />
    </div>
  );
}
