import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, Check, Trash2, MoreHorizontal, ClipboardList,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  useOnboardingsList,
  useCreateOnboarding,
  useCompleteOnboarding,
  useDeleteOnboarding,
  ONBOARDING_STATUS_LABELS,
  type Onboarding,
} from '@/hooks/useOnboardings';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function getPlanBadgeClass(planName?: string): string {
  if (!planName) return 'bg-muted text-muted-foreground border-border';
  const lower = planName.toLowerCase();
  if (lower.includes('start')) return 'bg-secondary text-secondary-foreground border-border';
  if (lower.includes('performance')) return 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]';
  if (lower.includes('escala')) return 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.25)]';
  if (lower.includes('growth')) return 'bg-[hsl(258,90%,66%,0.12)] text-[hsl(258,90%,66%)] border-[hsl(258,90%,66%,0.25)]';
  return 'bg-muted text-muted-foreground border-border';
}

// Avatar with initials
function MiniAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
      {initials}
    </div>
  );
}

export default function CsOnboarding() {
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useCrmData();
  const { members, loading: membersLoading } = useTeamMembers();
  const { member } = useAuth();

  const { data: onboardings, isLoading: listLoading } = useOnboardingsList();
  const createOnboarding = useCreateOnboarding();
  const completeOnboarding = useCompleteOnboarding();
  const deleteOnboarding = useDeleteOnboarding();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [csFilter, setCsFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createClientId, setCreateClientId] = useState('');
  const [createCsId, setCreateCsId] = useState('');
  const [createTrafficId, setCreateTrafficId] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Action dialogs
  const [completeTarget, setCompleteTarget] = useState<Onboarding | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Onboarding | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const activeClients = useMemo(() => accounts.filter(a => a.status === 'active'), [accounts]);
  const filteredCreateClients = useMemo(() => {
    if (!clientSearch) return activeClients;
    const t = clientSearch.toLowerCase();
    return activeClients.filter(c => c.name.toLowerCase().includes(t));
  }, [activeClients, clientSearch]);

  const csTeam = useMemo(() => members.filter(m => m.active), [members]);
  const trafficTeam = useMemo(() => members.filter(m => m.active), [members]);

  // Get unique plan names for filter
  const planNames = useMemo(() => {
    const names = new Set<string>();
    onboardings?.forEach(o => {
      if (o.client_service_name) names.add(o.client_service_name);
    });
    return Array.from(names).sort();
  }, [onboardings]);

  // CS members for filter
  const csFilterMembers = useMemo(() => {
    const ids = new Set<string>();
    const result: { id: string; name: string }[] = [];
    onboardings?.forEach(o => {
      if (o.cs_owner_id && o.cs_owner_name && !ids.has(o.cs_owner_id)) {
        ids.add(o.cs_owner_id);
        result.push({ id: o.cs_owner_id, name: o.cs_owner_name });
      }
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [onboardings]);

  // Apply filters
  const filtered = useMemo(() => {
    if (!onboardings) return [];
    return onboardings.filter(o => {
      if (search) {
        const t = search.toLowerCase();
        if (!o.client_name?.toLowerCase().includes(t)) return false;
      }
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (csFilter !== 'all' && o.cs_owner_id !== csFilter) return false;
      if (planFilter !== 'all' && o.client_service_name !== planFilter) return false;
      return true;
    });
  }, [onboardings, search, statusFilter, csFilter, planFilter]);

  const hasActiveFilters = search || statusFilter !== 'all' || csFilter !== 'all' || planFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCsFilter('all');
    setPlanFilter('all');
  };

  const handleCreate = async () => {
    if (!createClientId) return;
    const result = await createOnboarding.mutateAsync({
      clientId: createClientId,
      csOwnerId: createCsId || undefined,
      trafficOwnerId: createTrafficId || undefined,
    });
    setShowCreate(false);
    setCreateClientId('');
    setCreateCsId('');
    setCreateTrafficId('');
    setClientSearch('');
    if (result?.onboarding?.id) {
      navigate(`/cs/onboarding/${result.onboarding.id}`);
    }
  };

  const handleComplete = async () => {
    if (!completeTarget) return;
    await completeOnboarding.mutateAsync({
      onboardingId: completeTarget.id,
      clientName: completeTarget.client_name || '',
    });
    setCompleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteOnboarding.mutateAsync({
      onboardingId: deleteTarget.id,
      clientName: deleteTarget.client_name || '',
    });
    setDeleteTarget(null);
    setDeleteConfirmName('');
  };

  const isLoading = accountsLoading || membersLoading || listLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} onboarding{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Onboarding
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={csFilter} onValueChange={setCsFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Responsável CS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {csFilterMembers.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {planNames.map(n => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-6 opacity-40">
            <rect x="20" y="16" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
            <line x1="28" y1="28" x2="52" y2="28" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
            <line x1="28" y1="36" x2="52" y2="36" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
            <line x1="28" y1="44" x2="44" y2="44" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
            <circle cx="28" cy="52" r="3" fill="currentColor" className="text-primary/50" />
            <circle cx="28" cy="60" r="3" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
          </svg>
          <h3 className="text-lg font-semibold mb-1">Nenhum onboarding em andamento</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Clientes recém-chegados aparecerão aqui assim que o onboarding for iniciado.
          </p>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Iniciar Onboarding
          </Button>
        </div>
      ) : (
        /* Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ob, idx) => {
            const isConcluido = ob.status === 'concluido';
            const progress = ob.atividades_total ? (ob.atividades_concluidas! / ob.atividades_total) * 100 : 0;

            return (
              <div
                key={ob.id}
                onClick={() => navigate(`/cs/onboarding/${ob.id}`)}
                className={cn(
                  'group relative bg-card rounded-2xl p-5 border cursor-pointer transition-all duration-200',
                  'hover:-translate-y-0.5 hover:border-primary/40',
                  isConcluido ? 'border-[#10b98130] opacity-70' : 'border-border'
                )}
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
              >
                {/* Menu */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {!isConcluido && (
                        <DropdownMenuItem onClick={() => setCompleteTarget(ob)}>
                          <Check className="h-4 w-4 mr-2 text-[hsl(var(--success))]" />
                          Concluir Onboarding
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setDeleteTarget(ob)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Onboarding
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Client name + badges */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-[15px] font-semibold truncate">{ob.client_name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                      isConcluido
                        ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]'
                        : 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.25)]'
                    )}
                  >
                    {ONBOARDING_STATUS_LABELS[ob.status as keyof typeof ONBOARDING_STATUS_LABELS]}
                  </Badge>
                </div>

                {/* Plan badge */}
                {ob.client_service_name && (
                  <Badge
                    variant="outline"
                    className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md border mb-3', getPlanBadgeClass(ob.client_service_name))}
                  >
                    {ob.client_service_name}
                  </Badge>
                )}

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #F97316, #f43f5e)',
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {ob.atividades_concluidas} de {ob.atividades_total} atividades concluídas
                  </p>
                </div>

                {/* CS owner + date */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                  {ob.cs_owner_name ? (
                    <div className="flex items-center gap-1.5">
                      <MiniAvatar name={ob.cs_owner_name} />
                      <span>{ob.cs_owner_name}</span>
                    </div>
                  ) : (
                    <span>Sem responsável CS</span>
                  )}
                  {ob.data_inicio && (
                    <span className="text-[11px]">
                      {format(new Date(ob.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) { setCreateClientId(''); setCreateCsId(''); setCreateTrafficId(''); setClientSearch(''); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Onboarding</DialogTitle>
            <DialogDescription>Selecione o cliente e os responsáveis para iniciar o onboarding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={createClientId} onValueChange={setCreateClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCreateClients.length === 0 ? (
                    <div className="py-4 px-2 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                  ) : (
                    filteredCreateClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável CS</Label>
              <Select value={createCsId || '_none_'} onValueChange={(v) => setCreateCsId(v === '_none_' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Nenhum</SelectItem>
                  {csTeam.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável Tráfego</Label>
              <Select value={createTrafficId || '_none_'} onValueChange={(v) => setCreateTrafficId(v === '_none_' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Nenhum</SelectItem>
                  {trafficTeam.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!createClientId || createOnboarding.isPending}>
              {createOnboarding.isPending ? 'Criando...' : 'Criar Onboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <AlertDialog open={!!completeTarget} onOpenChange={(open) => { if (!open) setCompleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as atividades pendentes serão marcadas como concluídas automaticamente e o onboarding será encerrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={completeOnboarding.isPending}>
              {completeOnboarding.isPending ? 'Concluindo...' : 'Concluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmName(''); } }}>
        <AlertDialogContent className="border-destructive/30">
          <AlertDialogHeader>
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-destructive text-lg">Excluir onboarding?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Esta ação é irreversível. Todas as atividades, respostas e a transcrição vinculadas serão permanentemente removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm text-muted-foreground">
              Digite <span className="font-semibold text-foreground">{deleteTarget?.client_name}</span> para confirmar:
            </label>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget?.client_name || ''}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmName.trim().toLowerCase() !== (deleteTarget?.client_name || '').toLowerCase() || deleteOnboarding.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOnboarding.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
