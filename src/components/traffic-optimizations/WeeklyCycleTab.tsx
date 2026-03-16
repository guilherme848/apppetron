import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, X, Sparkles, Trash2,
  AlertCircle, Calendar, ShieldCheck, Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyCycleEntry, TrafficOptimization, OptimizationInput } from '@/hooks/useTrafficOptimizations';
import { InlineOptimizationModal } from './InlineOptimizationModal';
import { cn } from '@/lib/utils';

/* ── Constants ────────────────────────────────────────────── */
const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
];
const TARGET_PER_DAY = 5;

/* ── Types ────────────────────────────────────────────────── */
interface Account {
  id: string;
  name: string;
  traffic_member_id?: string | null;
  niche?: string | null;
  midias_ativas?: string[] | null;
}

interface Props {
  accounts: Account[];
  teamMembers: { id: string; name: string }[];
  weeklyCycle: WeeklyCycleEntry[];
  optimizations: TrafficOptimization[];
  currentMemberId: string | null;
  isAdmin?: boolean;
  loading?: boolean;
  addWeeklyCycleEntry: (clientId: string, weekday: number) => Promise<any>;
  removeWeeklyCycleEntry: (id: string) => Promise<any>;
  moveWeeklyCycleEntry: (id: string, newWeekday: number) => Promise<any>;
  clearWeeklyCycle: (managerId?: string) => Promise<any>;
  replaceWeeklyCycle: (
    entries: { client_id: string; weekday: number }[],
    managerId?: string,
  ) => Promise<any>;
  addOptimization: (input: OptimizationInput) => Promise<any>;
  onClientClick?: (clientId: string) => void;
}

/* ── Draggable Client Card ────────────────────────────────── */
function DraggableClientCard({
  entryId,
  clientName,
  clientNiche,
  isOptimizedToday,
  isHighComplexity,
  onRemove,
  onClick,
}: {
  entryId: string;
  clientName: string;
  clientNiche: string | null;
  isOptimizedToday: boolean;
  isHighComplexity: boolean;
  onRemove: () => void;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entryId,
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-2 rounded-[10px] border bg-card px-3 py-2.5 mb-1.5 transition-all duration-150',
        isOptimizedToday && 'border-l-2 border-l-emerald-500/40',
        isDragging
          ? 'opacity-40 scale-[1.02] shadow-lg'
          : 'hover:bg-muted/50 hover:border-border',
        !isDragging && !isOptimizedToday && 'border-border/60',
      )}
    >
      {/* Drag handle zone */}
      <div
        {...listeners}
        {...attributes}
        className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-muted/60 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>

      {/* Clickable content zone */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => { if (!isDragging) onClick?.(); }}
      >
        <div className="flex items-center gap-1.5">
          {/* Status dot */}
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full shrink-0 transition-colors duration-300',
              isOptimizedToday
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-muted-foreground/30',
            )}
          />
          <p className="text-[13px] font-semibold text-foreground truncate">{clientName}</p>
          {isHighComplexity && (
            <Badge className="text-[10px] font-semibold px-1.5 py-0 h-4 bg-primary/12 text-primary border-0 rounded shrink-0">
              Alta
            </Badge>
          )}
        </div>
        {clientNiche && (
          <span className="inline-block mt-0.5 ml-3.5 text-[10px] text-muted-foreground bg-muted/60 border border-border/40 rounded px-1.5 py-0.5">
            {clientNiche}
          </span>
        )}
        {isOptimizedToday && (
          <span className="block ml-3.5 mt-0.5 text-[10px] text-emerald-500 font-medium">
            ✓ Otimizado hoje
          </span>
        )}
      </div>

      {/* Hover plus icon with tooltip */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); if (!isDragging) onClick?.(); }}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 p-0.5 rounded hover:bg-primary/10"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Registrar otimização
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

/* ── Card content for DragOverlay ─────────────────────────── */
function DragOverlayCard({ name, niche }: { name: string; niche: string | null }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-primary/40 bg-card px-3 py-2.5 shadow-xl scale-[1.03] cursor-grabbing">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate">{name}</p>
        {niche && (
          <span className="inline-block mt-0.5 text-[10px] text-muted-foreground bg-muted/60 border border-border/40 rounded px-1.5 py-0.5">
            {niche}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Droppable Day Column ─────────────────────────────────── */
function DroppableDayColumn({
  weekday,
  label,
  children,
  count,
}: {
  weekday: number;
  label: string;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${weekday}` });
  const progress = Math.min((count / TARGET_PER_DAY) * 100, 100);
  const overTarget = count > TARGET_PER_DAY;

  const badgeClass = count === 0
    ? 'bg-muted-foreground/12 text-muted-foreground'
    : count <= TARGET_PER_DAY
      ? 'bg-success/12 text-success'
      : 'bg-destructive/12 text-destructive';

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'rounded-2xl border transition-all duration-150 min-w-[210px] flex-shrink-0 lg:flex-shrink lg:min-w-0',
        isOver ? 'border-primary/50 bg-primary/[0.03]' : 'border-border',
      )}
    >
      <CardHeader className="pb-2 px-4 pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn('text-[11px] font-semibold border-0 font-mono', badgeClass)}>
                  {count}/{TARGET_PER_DAY}
                </Badge>
              </TooltipTrigger>
              {overTarget && (
                <TooltipContent><p>Meta excedida</p></TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="h-[3px] rounded-full bg-border overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              overTarget ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-[#f43f5e]',
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-1 min-h-[80px]">
        {children}
        {count === 0 && !isOver && (
          <div className="flex items-center justify-center py-6 text-[13px] text-muted-foreground">
            Nenhum cliente
          </div>
        )}
        {isOver && (
          <div className="border-2 border-dashed border-primary/40 rounded-[10px] py-3 text-center text-[13px] text-muted-foreground bg-primary/[0.04] mt-1">
            Soltar aqui
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Add Client Popover ───────────────────────────────────── */
function AddClientPopover({
  availableClients,
  weekday,
  onAdd,
}: {
  availableClients: Account[];
  weekday: number;
  onAdd: (clientId: string, weekday: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return availableClients;
    const q = search.toLowerCase();
    return availableClients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.niche && c.niche.toLowerCase().includes(q)),
    );
  }, [availableClients, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground mt-1"
          disabled={availableClients.length === 0}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-styled">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum cliente encontrado</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors flex items-center justify-between"
                onClick={() => {
                  onAdd(c.id, weekday);
                  setSearch('');
                  setOpen(false);
                }}
              >
                <span className="text-xs font-medium text-foreground truncate">{c.name}</span>
                {c.niche && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 ml-1 shrink-0">
                    {c.niche}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Empty State ──────────────────────────────────────────── */
function EmptyState({
  onAiSuggest,
  onManual,
}: {
  onAiSuggest: () => void;
  onManual: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
      <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-base font-semibold text-foreground mb-1">
        Ciclo semanal não configurado
      </h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        Distribua seus clientes nos dias da semana para organizar sua rotina de otimizações.
      </p>
      <div className="flex items-center gap-3">
        <Button
          className="bg-violet-500/15 border border-violet-500/40 text-violet-500 hover:bg-violet-500/25 hover:shadow-[0_0_16px_rgba(139,92,246,0.19)]"
          variant="outline"
          onClick={onAiSuggest}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Sugerir com IA
        </Button>
        <Button variant="outline" onClick={onManual}>
          Distribuir manualmente
        </Button>
      </div>
    </div>
  );
}

/* ── AI Loading Overlay ───────────────────────────────────── */
function AiLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
      <Sparkles className="h-6 w-6 text-violet-500 animate-pulse mb-3" />
      <p className="text-sm text-muted-foreground">
        Analisando clientes e sugerindo distribuição...
      </p>
    </div>
  );
}

/* ── Niche-grouped entries renderer ───────────────────────── */
function NicheGroupedEntries({
  entries,
  getClient,
  onRemove,
  onClientClick,
  todayOptimizedClientIds,
  highComplexityClientIds,
}: {
  entries: WeeklyCycleEntry[];
  getClient: (id: string) => Account | undefined;
  onRemove: (id: string) => void;
  onClientClick?: (clientId: string) => void;
  todayOptimizedClientIds: Set<string>;
  highComplexityClientIds: Set<string>;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, WeeklyCycleEntry[]>();
    for (const entry of entries) {
      const niche = getClient(entry.client_id)?.niche || '__none__';
      if (!map.has(niche)) map.set(niche, []);
      map.get(niche)!.push(entry);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return a.localeCompare(b);
      })
      .map(([niche, items]) => ({
        niche: niche === '__none__' ? null : niche,
        items,
      }));
  }, [entries, getClient]);

  return (
    <>
      {grouped.map((group, gi) => (
        <div key={group.niche || '__none__'}>
          {gi > 0 && group.niche && (
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 border-t border-dashed border-border/60" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">
                {group.niche}
              </span>
              <div className="flex-1 border-t border-dashed border-border/60" />
            </div>
          )}
          {group.items.map((entry) => {
            const client = getClient(entry.client_id);
            return (
              <DraggableClientCard
                key={entry.id}
                entryId={entry.id}
                clientName={client?.name || 'Cliente'}
                clientNiche={client?.niche || null}
                isOptimizedToday={todayOptimizedClientIds.has(entry.client_id)}
                isHighComplexity={highComplexityClientIds.has(entry.client_id)}
                onRemove={() => onRemove(entry.id)}
                onClick={() => onClientClick?.(entry.client_id)}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export function OptimizationWeeklyCycleTab({
  accounts,
  teamMembers,
  weeklyCycle,
  optimizations,
  currentMemberId,
  isAdmin = false,
  loading = false,
  addWeeklyCycleEntry,
  removeWeeklyCycleEntry,
  moveWeeklyCycleEntry,
  clearWeeklyCycle,
  replaceWeeklyCycle,
  addOptimization,
  onClientClick,
}: Props) {
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showManualGrid, setShowManualGrid] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Inline optimization modal state
  const [inlineModalOpen, setInlineModalOpen] = useState(false);
  const [inlineModalClientId, setInlineModalClientId] = useState<string | null>(null);
  const [inlineModalTaskType, setInlineModalTaskType] = useState<'checkin' | 'media' | 'alta'>('checkin');

  const effectiveManagerId = isAdmin && selectedManagerId ? selectedManagerId : currentMemberId;

  /* ── Derived data ─────────────────────────────────────────── */
  const myClients = useMemo(() => {
    if (isAdmin && !selectedManagerId) return accounts;
    return accounts.filter((a) => a.traffic_member_id === effectiveManagerId);
  }, [accounts, effectiveManagerId, isAdmin, selectedManagerId]);

  const myCycle = useMemo(() => {
    if (isAdmin && !selectedManagerId) return weeklyCycle;
    return weeklyCycle.filter((w) => w.manager_member_id === effectiveManagerId);
  }, [weeklyCycle, effectiveManagerId, isAdmin, selectedManagerId]);

  const assignedClientIds = useMemo(() => new Set(myCycle.map((w) => w.client_id)), [myCycle]);
  const availableClients = useMemo(
    () => myClients.filter((c) => !assignedClientIds.has(c.id)),
    [myClients, assignedClientIds],
  );

  const distributedCount = myCycle.length;
  const availableCount = availableClients.length;

  const trafficManagers = useMemo(() => {
    if (!isAdmin) return [];
    const ids = new Set(accounts.map((a) => a.traffic_member_id).filter(Boolean) as string[]);
    return teamMembers.filter((m) => ids.has(m.id));
  }, [accounts, teamMembers, isAdmin]);

  const getClient = useCallback(
    (id: string) => accounts.find((a) => a.id === id),
    [accounts],
  );

  /* ── Today's status sets ────────────────────────────────── */
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayWeekday = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 1 : d;
  }, []);

  const todayOptimizedClientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of optimizations) {
      if (o.optimization_date === todayStr) ids.add(o.client_id);
    }
    return ids;
  }, [optimizations, todayStr]);

  // High complexity = clients that have "alta" task type entries in the cycle for today's weekday
  // We determine "high complexity" based on context: if the entry is in today's weekday column
  const todayEntryClientIds = useMemo(() => {
    return new Set(myCycle.filter(w => w.weekday === todayWeekday).map(w => w.client_id));
  }, [myCycle, todayWeekday]);

  // For now, mark as high complexity if client is scheduled for today (the user spec says to show badge)
  // We'll use a simple heuristic: empty for now, will be set per-column below
  const highComplexityClientIds = useMemo(() => new Set<string>(), []);

  /* ── Inline modal handlers ──────────────────────────────── */
  const handleOpenInlineModal = useCallback((clientId: string) => {
    setInlineModalClientId(clientId);
    // If client is in today's weekday column, preselect based on context
    const isToday = todayEntryClientIds.has(clientId);
    setInlineModalTaskType(isToday ? 'checkin' : 'checkin');
    setInlineModalOpen(true);
  }, [todayEntryClientIds]);

  const inlineModalClient = useMemo(() => {
    if (!inlineModalClientId) return null;
    return accounts.find(a => a.id === inlineModalClientId) || null;
  }, [inlineModalClientId, accounts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const entryId = active.id as string;
      let targetDay: number | null = null;

      if (typeof over.id === 'string' && over.id.startsWith('day-')) {
        targetDay = parseInt(over.id.replace('day-', ''));
      } else {
        const overEntry = myCycle.find((e) => e.id === over.id);
        if (overEntry) targetDay = overEntry.weekday;
      }

      if (targetDay === null) return;
      const sourceEntry = myCycle.find((e) => e.id === entryId);
      if (!sourceEntry || sourceEntry.weekday === targetDay) return;

      moveWeeklyCycleEntry(entryId, targetDay);
    },
    [myCycle, moveWeeklyCycleEntry],
  );

  const activeEntry = activeId ? myCycle.find((e) => e.id === activeId) : null;

  /* ── AI Suggest ───────────────────────────────────────────── */
  const handleAiSuggest = async () => {
    setShowAiModal(false);
    setIsAiLoading(true);
    try {
      const clientsForAi = myClients.map((c) => ({
        id: c.id,
        name: c.name,
        niche: c.niche || null,
      }));
      const { data, error } = await supabase.functions.invoke('suggest-weekly-cycle', {
        body: { clients: clientsForAi },
      });
      if (error) throw error;
      const distribution = data?.distribution;
      if (!distribution || !Array.isArray(distribution)) throw new Error('Resposta inválida');

      await replaceWeeklyCycle(
        distribution.map((d: any) => ({ client_id: d.client_id, weekday: d.weekday })),
        effectiveManagerId || undefined,
      );
      setShowManualGrid(true);
      toast.success('Distribuição sugerida pela IA aplicada! Ajuste conforme necessário.', {
        style: { borderLeft: '4px solid #8b5cf6' },
      });
    } catch (e) {
      console.error('AI suggestion error:', e);
      toast.error('Não foi possível gerar a sugestão. Tente novamente.');
    } finally {
      setIsAiLoading(false);
    }
  };

  /* ── Clear Cycle ──────────────────────────────────────────── */
  const handleClearCycle = async () => {
    setShowClearModal(false);
    await clearWeeklyCycle(effectiveManagerId || undefined);
    toast.success('Ciclo semanal limpo.');
  };

  /* ── Add handler ──────────────────────────────────────────── */
  const handleAddClient = useCallback(
    (clientId: string, weekday: number) => {
      addWeeklyCycleEntry(clientId, weekday);
    },
    [addWeeklyCycleEntry],
  );

  const isEmpty = myCycle.length === 0 && !showManualGrid;

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl min-w-[210px] flex-shrink-0 lg:min-w-0" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground flex-wrap">
          {isAdmin && trafficManagers.length > 0 && (
            <Select
              value={selectedManagerId || '__all__'}
              onValueChange={(v) => setSelectedManagerId(v === '__all__' ? null : v)}
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Todos os gestores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os gestores</SelectItem>
                {trafficManagers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="font-mono font-semibold text-foreground">{distributedCount}</span>
          <span>clientes distribuídos</span>
          <span className="text-muted-foreground/40">·</span>
          <span>Meta: <span className="font-mono font-semibold">{TARGET_PER_DAY}</span>/dia</span>
          <span className="text-muted-foreground/40">·</span>
          <span className={availableCount > 0 ? 'text-warning font-medium' : ''}>
            <span className="font-mono font-semibold">{availableCount}</span> disponíveis
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-violet-500/15 border-violet-500/40 text-violet-500 hover:bg-violet-500/25 hover:shadow-[0_0_16px_rgba(139,92,246,0.19)] rounded-lg px-3.5"
            onClick={() => setShowAiModal(true)}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Sugerir com IA
          </Button>
          {distributedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={() => setShowClearModal(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Limpar Ciclo
            </Button>
          )}
        </div>
      </div>

      {/* ── Undistributed banner ──────────────────────────── */}
      {availableCount > 0 && distributedCount > 0 && (
        <div className="flex items-center justify-between rounded-[10px] bg-warning/[0.08] border border-warning/20 px-4 py-3 animate-fade-in-up">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-warning shrink-0" />
            <span className="font-mono font-semibold text-warning">{availableCount}</span>
            clientes sem dia atribuído no ciclo.
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-warning text-xs hover:text-warning hover:bg-warning/10"
            onClick={() => setShowAiModal(true)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Distribuir com IA
          </Button>
        </div>
      )}

      {/* ── Empty state or Grid ───────────────────────────── */}
      {isEmpty ? (
        <EmptyState
          onAiSuggest={() => setShowAiModal(true)}
          onManual={() => setShowManualGrid(true)}
        />
      ) : (
        <div className="relative">
          {isAiLoading && <AiLoadingOverlay />}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible scrollbar-styled">
              {WEEKDAYS.map((day, i) => {
                const dayEntries = myCycle
                  .filter((w) => w.weekday === day.value)
                  .sort((a, b) => {
                    const nicheA = getClient(a.client_id)?.niche || 'zzz';
                    const nicheB = getClient(b.client_id)?.niche || 'zzz';
                    if (nicheA !== nicheB) return nicheA.localeCompare(nicheB);
                    return a.sort_order - b.sort_order;
                  });

                return (
                  <div
                    key={day.value}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                  >
                    <DroppableDayColumn
                      weekday={day.value}
                      label={day.label}
                      count={dayEntries.length}
                    >
                      <NicheGroupedEntries
                        entries={dayEntries}
                        getClient={getClient}
                        onRemove={removeWeeklyCycleEntry}
                        onClientClick={handleOpenInlineModal}
                        todayOptimizedClientIds={todayOptimizedClientIds}
                        highComplexityClientIds={day.value === todayWeekday ? todayEntryClientIds : highComplexityClientIds}
                      />
                      <AddClientPopover
                        availableClients={availableClients}
                        weekday={day.value}
                        onAdd={handleAddClient}
                      />
                    </DroppableDayColumn>
                  </div>
                );
              })}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeEntry && (
                <DragOverlayCard
                  name={getClient(activeEntry.client_id)?.name || 'Cliente'}
                  niche={getClient(activeEntry.client_id)?.niche || null}
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* ── AI Confirm Dialog ─────────────────────────────── */}
      <AlertDialog open={showAiModal} onOpenChange={setShowAiModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Sugerir distribuição com IA?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A IA irá redistribuir todos os clientes nos dias da semana,
              agrupando clientes do mesmo nicho no mesmo dia e respeitando
              a meta de {TARGET_PER_DAY} por dia. A distribuição atual será substituída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAiSuggest}
              className="bg-violet-500 hover:bg-violet-600 text-white"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Sugerir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Clear Confirm Dialog ──────────────────────────── */}
      <AlertDialog open={showClearModal} onOpenChange={setShowClearModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar ciclo semanal?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os clientes serão removidos dos dias. O ciclo ficará vazio
              e precisará ser redistribuído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCycle}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
