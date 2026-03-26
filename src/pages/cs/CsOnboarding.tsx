import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, Check, Trash2, MoreHorizontal, Clock, AlertCircle, AlertTriangle, User,
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
  DropdownMenuSeparator,
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
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function getPlanBadgeClass(planName?: string): string {
  if (!planName) return 'bg-muted text-muted-foreground border-border';
  const lower = planName.toLowerCase();
  if (lower.includes('start')) return 'bg-[hsl(215_16%_43%/0.12)] text-[hsl(215,16%,43%)] border-[hsl(215,16%,43%,0.25)]';
  if (lower.includes('performance')) return 'bg-[hsl(239,84%,67%,0.12)] text-[hsl(239,84%,67%)] border-[hsl(239,84%,67%,0.25)]';
  if (lower.includes('escala')) return 'bg-[hsl(25,95%,53%,0.12)] text-[hsl(25,95%,53%)] border-[hsl(25,95%,53%,0.25)]';
  if (lower.includes('growth')) return 'bg-[hsl(258,90%,66%,0.12)] text-[hsl(258,90%,66%)] border-[hsl(258,90%,66%,0.25)]';
  return 'bg-muted text-muted-foreground border-border';
}

// CS Owner Avatar with gradient
function CsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #F97316, #f43f5e)' }}
    >
      {initials}
    </div>
  );
}

// Day counter component
function DayCounter({ dataInicio }: { dataInicio: string }) {
  const days = differenceInDays(new Date(), new Date(dataInicio));
  const isWarning = days >= 8 && days <= 9;
  const isDanger = days >= 10;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium font-mono',
        isDanger ? 'text-destructive' : isWarning ? 'text-[#f59e0b]' : 'text-muted-foreground'
      )}
    >
      {isDanger && <AlertCircle className="h-3 w-3 animate-pulse" />}
      {isWarning && !isDanger && <Clock className="h-3 w-3" />}
      {days} {days === 1 ? 'dia' : 'dias'} em onboarding
    </span>
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

  // Filters — default to "em_andamento"
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('em_andamento');
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

  const hasActiveFilters = search || statusFilter !== 'em_andamento' || csFilter !== 'all' || planFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('em_andamento');
    setCsFilter('all');
    setPlanFilter('all');
  };

  // Subtitle text
  const subtitleText = useMemo(() => {
    const count = filtered.length;
    if (statusFilter === 'em_andamento') return `${count} onboarding${count !== 1 ? 's' : ''} em andamento`;
    if (statusFilter === 'concluido') return `${count} onboarding${count !== 1 ? 's' : ''} concluído${count !== 1 ? 's' : ''}`;
    return `${count} onboarding${count !== 1 ? 's' : ''}`;
  }, [filtered.length, statusFilter]);

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
            {subtitleText}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
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
          <Button onClick={() => setShowCreate(true)} className="gap-2 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
            const hasNoActivities = ob.atividades_total === 0;

            return (
              <div
                key={ob.id}
                onClick={() => navigate(`/cs/onboarding/${ob.id}`)}
                className={cn(
                  'group relative bg-card rounded-2xl p-5 border cursor-pointer transition-all duration-200',
                  'hover:-translate-y-0.5 hover:border-[hsl(25,95%,53%,0.4)]',
                  isConcluido ? 'border-[#10b98130] opacity-60' : 'border-border'
                )}
                style={{
                  animation: `fade-in 280ms cubic-bezier(0.16, 1, 0.3, 1) ${idx * 40}ms both`,
                }}
              >
                {/* Menu ⋯ — visible on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="h-7 w-7 rounded-lg bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-[180px] rounded-[10px] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isConcluido && (
                        <>
                          <DropdownMenuItem onClick={() => setCompleteTarget(ob)} className="gap-2 rounded-lg">
                            <Check className="h-4 w-4 text-[hsl(160,84%,39%)]" />
                            Concluir Onboarding
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => setDeleteTarget(ob)} className="gap-2 rounded-lg text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Excluir Onboarding
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Client name + status badge */}
                <div className="flex items-center gap-2 flex-wrap mb-3 pr-8">
                  <span className="text-[15px] font-semibold truncate">{ob.client_name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                      isConcluido
                        ? 'bg-[hsl(160,84%,39%,0.12)] text-[hsl(160,84%,39%)] border-[hsl(160,84%,39%,0.25)]'
                        : 'bg-[hsl(25,95%,53%,0.12)] text-[hsl(25,95%,53%)] border-[hsl(25,95%,53%,0.25)]'
                    )}
                  >
                    {ONBOARDING_STATUS_LABELS[ob.status as keyof typeof ONBOARDING_STATUS_LABELS]}
                  </Badge>
                </div>

                {/* Plan badge */}
                {ob.client_service_name && (
                  <Badge
                    variant="outline"
                    className={cn('text-[11px] font-semibold px-2 py-[3px] rounded-md border mb-3', getPlanBadgeClass(ob.client_service_name))}
                  >
                    {ob.client_service_name}
                  </Badge>
                )}

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="w-full h-1.5 rounded-[4px] bg-border overflow-hidden" style={{ minHeight: '6px' }}>
                    {!hasNoActivities && (
                      <div
                        className="h-full rounded-[4px] transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, #F97316, #f43f5e)',
                        }}
                      />
                    )}
                  </div>
                  {hasNoActivities ? (
                    <p className="text-[11px] text-[#f59e0b] mt-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Atividades não configuradas
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {ob.atividades_concluidas} de {ob.atividades_total} atividades concluídas
                    </p>
                  )}
                </div>

                {/* CS owner + day counter / date */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                  {ob.cs_owner_name ? (
                    <div className="flex items-center gap-1.5">
                      <CsAvatar name={ob.cs_owner_name} />
                      <span className="text-xs text-muted-foreground">{ob.cs_owner_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-[11px] text-muted-foreground">Sem responsável CS</span>
                    </div>
                  )}
                  {isConcluido ? (
                    ob.data_conclusao && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Concluído em {format(new Date(ob.data_conclusao), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )
                  ) : (
                    ob.data_inicio && <DayCounter dataInicio={ob.data_inicio} />
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
            <Button onClick={handleCreate} disabled={!createClientId || createOnboarding.isPending} className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
            <AlertDialogAction onClick={handleComplete} disabled={completeOnboarding.isPending} className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-destructive text-lg font-bold">Excluir onboarding?</AlertDialogTitle>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {deleteOnboarding.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
