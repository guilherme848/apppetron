import { useState, useMemo, useCallback } from 'react';
import {
  CheckCircle, Clock, Zap, Activity, Plus, Calendar, ShieldCheck,
  ChevronRight, X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { TrafficOptimization, WeeklyCycleEntry, OptimizationInput, PLATFORM_OPTIONS, TASK_TYPE_OPTIONS } from '@/hooks/useTrafficOptimizations';

const TRAFFIC_MANAGER_ROLE_ID = '29521693-8a2e-46fe-81a5-8b78059ad879';

interface Account {
  id: string;
  name: string;
  niche?: string | null;
  niche_id?: string | null;
  traffic_member_id?: string | null;
}

interface Member {
  id: string;
  name: string;
  role_id?: string | null;
  active?: boolean;
}

interface Props {
  accounts: Account[];
  teamMembers: Member[];
  todayCheckins: TrafficOptimization[];
  todayHighComplexity: WeeklyCycleEntry[];
  openMediumTasks: TrafficOptimization[];
  currentMemberId: string | null;
  isAdmin?: boolean;
  todayStr: string;
  optimizations: TrafficOptimization[];
  loading?: boolean;
  onNewOptimization: () => void;
  addOptimization: (input: OptimizationInput) => Promise<any>;
}

export function OptimizationMyDayTab({
  accounts,
  teamMembers,
  todayCheckins,
  todayHighComplexity,
  openMediumTasks,
  currentMemberId,
  isAdmin = false,
  todayStr,
  optimizations,
  loading = false,
  addOptimization,
  onNewOptimization,
}: Props) {
  const [selectedManagerId, setSelectedManagerId] = useState<string>('__self__');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClientId, setModalClientId] = useState('');
  const [modalTaskType, setModalTaskType] = useState('checkin');

  const trafficManagers = useMemo(
    () => teamMembers.filter((m) => m.role_id === TRAFFIC_MANAGER_ROLE_ID && m.active !== false),
    [teamMembers],
  );

  // Effective manager filter
  const effectiveManagerId = useMemo(() => {
    if (!isAdmin) return currentMemberId;
    if (selectedManagerId === '__all__') return null;
    if (selectedManagerId === '__self__') return currentMemberId;
    return selectedManagerId;
  }, [isAdmin, selectedManagerId, currentMemberId]);

  const showTeamPanel = isAdmin && effectiveManagerId === null;

  // Clients for current view
  const myClients = useMemo(() => {
    if (!effectiveManagerId) return accounts;
    return accounts.filter((a) => a.traffic_member_id === effectiveManagerId);
  }, [accounts, effectiveManagerId]);

  const getClientName = (id: string) => accounts.find((a) => a.id === id)?.name || 'Cliente';
  const getClientNiche = (id: string) => accounts.find((a) => a.id === id)?.niche || null;

  // Filter optimizations for effective manager
  const filteredCheckins = useMemo(() => {
    if (!effectiveManagerId) return todayCheckins;
    return todayCheckins.filter((o) => o.member_id === effectiveManagerId);
  }, [todayCheckins, effectiveManagerId]);

  const filteredHighComplexity = useMemo(() => {
    if (!effectiveManagerId) return todayHighComplexity;
    return todayHighComplexity.filter((w) => w.manager_member_id === effectiveManagerId);
  }, [todayHighComplexity, effectiveManagerId]);

  const filteredMediumTasks = useMemo(() => {
    if (!effectiveManagerId) return openMediumTasks;
    return openMediumTasks.filter((o) => o.member_id === effectiveManagerId);
  }, [openMediumTasks, effectiveManagerId]);

  // Completed alta for today
  const altaDoneIds = useMemo(() => {
    const filtered = effectiveManagerId
      ? optimizations.filter((o) => o.optimization_date === todayStr && o.task_type === 'alta' && o.member_id === effectiveManagerId)
      : optimizations.filter((o) => o.optimization_date === todayStr && o.task_type === 'alta');
    return new Set(filtered.map((o) => o.client_id));
  }, [optimizations, todayStr, effectiveManagerId]);

  // Checked-in client IDs
  const checkedInIds = useMemo(() => new Set(filteredCheckins.map((c) => c.client_id)), [filteredCheckins]);

  // Pending check-ins
  const pendingCheckins = useMemo(() => myClients.filter((c) => !checkedInIds.has(c.id)), [myClients, checkedInIds]);

  // Cycle client IDs for today
  const todayCycleClientIds = useMemo(
    () => new Set(filteredHighComplexity.map((w) => w.client_id)),
    [filteredHighComplexity],
  );

  // Subgroup split for check-ins
  const pendingFromCycle = useMemo(
    () => pendingCheckins.filter((c) => todayCycleClientIds.has(c.id)),
    [pendingCheckins, todayCycleClientIds],
  );
  const pendingOther = useMemo(
    () => pendingCheckins.filter((c) => !todayCycleClientIds.has(c.id)),
    [pendingCheckins, todayCycleClientIds],
  );

  // Alta completion timestamps
  const altaTimestamps = useMemo(() => {
    const map: Record<string, string> = {};
    optimizations.forEach((o) => {
      if (o.optimization_date === todayStr && o.task_type === 'alta') {
        map[o.client_id] = o.created_at;
      }
    });
    return map;
  }, [optimizations, todayStr]);

  // Last check-in per client
  const lastCheckinMap = useMemo(() => {
    const map: Record<string, string> = {};
    optimizations.forEach((o) => {
      if (o.task_type === 'checkin') {
        if (!map[o.client_id] || o.optimization_date > map[o.client_id]) {
          map[o.client_id] = o.optimization_date;
        }
      }
    });
    return map;
  }, [optimizations]);

  // Progress metrics
  const totalAltaToday = filteredHighComplexity.length;
  const completedAlta = [...altaDoneIds].filter((id) => todayCycleClientIds.has(id)).length;
  const totalCheckins = myClients.length;
  const completedCheckins = checkedInIds.size;
  const totalMedium = filteredMediumTasks.length;

  const totalTasks = totalAltaToday + totalCheckins + totalMedium;
  const completedTasks = completedAlta + completedCheckins;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const progressColor = progressPercent >= 100
    ? 'text-success'
    : progressPercent >= 80
      ? 'text-primary'
      : progressPercent >= 50
        ? 'text-yellow-500'
        : 'text-destructive';

  const checkinColor = completedCheckins === totalCheckins && totalCheckins > 0
    ? 'text-success'
    : completedCheckins > 0
      ? 'text-yellow-500'
      : 'text-destructive';

  // Open registration modal
  const openModal = useCallback((clientId: string, taskType: string) => {
    setModalClientId(clientId);
    setModalTaskType(taskType);
    setModalOpen(true);
  }, []);

  // ── Skeleton loading ──
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Manager selector for admin */}
      {isAdmin && (
        <div className="flex justify-end">
          <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Todos os gestores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os gestores</SelectItem>
              <SelectItem value="__self__">Meu dia</SelectItem>
              {trafficManagers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showTeamPanel ? (
        <TeamPanel
          trafficManagers={trafficManagers}
          accounts={accounts}
          optimizations={optimizations}
          todayStr={todayStr}
          todayHighComplexity={todayHighComplexity}
          openMediumTasks={openMediumTasks}
          onSelectManager={(id) => setSelectedManagerId(id)}
        />
      ) : (
        <>
          {/* Progress header */}
          <Card className="border border-border rounded-2xl">
            <CardContent className="flex flex-col md:flex-row items-center gap-6 p-5">
              {/* Left - percentage */}
              <div className="flex flex-col items-center md:items-start shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Progresso do Dia
                </span>
                <span className={`text-[32px] font-extrabold font-mono leading-tight ${progressColor}`}>
                  {progressPercent}%
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {completedTasks} de {totalTasks} tarefas concluídas
                </span>
              </div>

              {/* Center - progress bar */}
              <div className="flex-1 max-w-[500px] w-full">
                <div className="h-[10px] rounded-md bg-border overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-600 ease-out"
                    style={{
                      width: `${Math.min(progressPercent, 100)}%`,
                      background: progressPercent >= 100
                        ? 'hsl(var(--success))'
                        : 'linear-gradient(90deg, #F97316, #f43f5e)',
                    }}
                  />
                </div>
              </div>

              {/* Right - mini KPIs */}
              <div className="flex items-center gap-4 shrink-0">
                <MiniKpi
                  icon={<CheckCircle className="h-3.5 w-3.5" />}
                  label="Check-ins"
                  value={`${completedCheckins}/${totalCheckins}`}
                  colorClass={checkinColor}
                />
                <div className="w-px h-8 bg-border" />
                <MiniKpi
                  icon={<Zap className="h-3.5 w-3.5" />}
                  label="Alta"
                  value={`${completedAlta}/${totalAltaToday}`}
                  colorClass={completedAlta === totalAltaToday && totalAltaToday > 0 ? 'text-success' : 'text-primary'}
                />
                <div className="w-px h-8 bg-border" />
                <MiniKpi
                  icon={<Activity className="h-3.5 w-3.5" />}
                  label="Média"
                  value={`${totalMedium} abertas`}
                  colorClass={totalMedium > 0 ? 'text-info' : 'text-muted-foreground'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Block 1 - Alta Complexidade */}
          <Card className="border border-border rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardContent className="p-5 space-y-4">
              <BlockHeader
                icon={<Zap className="h-4 w-4 text-primary" />}
                title="Alta Complexidade"
                badge={`${totalAltaToday} clientes · ~1h cada`}
                badgeColor="bg-primary/10 text-primary"
                subtitle="Clientes do ciclo semanal de hoje"
              />
              {totalAltaToday === 0 ? (
                <EmptyState icon={<Calendar className="h-5 w-5 text-muted-foreground" />} text="Nenhuma alta complexidade hoje" />
              ) : (
                <div className="space-y-2">
                  {filteredHighComplexity.map((entry) => {
                    const done = altaDoneIds.has(entry.client_id);
                    const ts = altaTimestamps[entry.client_id];
                    return (
                      <ClientRow
                        key={entry.id}
                        name={getClientName(entry.client_id)}
                        niche={getClientNiche(entry.client_id)}
                        done={done}
                        doneTime={ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined}
                        badgeText="~1h"
                        onAction={() => openModal(entry.client_id, 'alta')}
                        actionLabel="Registrar"
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Block 2 - Check-ins Pendentes */}
          <Card className="border border-border rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '40ms' }}>
            <CardContent className="p-5 space-y-4">
              <BlockHeader
                icon={<Clock className="h-4 w-4 text-yellow-500" />}
                title="Check-ins Pendentes"
                badge={`${pendingCheckins.length} pendentes · ~5min cada`}
                badgeColor="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                subtitle={pendingCheckins.length > 0 ? `~${pendingCheckins.length * 5}min restantes` : undefined}
              />
              {pendingCheckins.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <ShieldCheck className="h-6 w-6 text-success" />
                  <p className="text-sm font-semibold text-success">Todos em dia!</p>
                  <p className="text-[13px] text-muted-foreground">Todos os check-ins foram realizados hoje.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingFromCycle.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Do Ciclo de Hoje
                      </span>
                      {pendingFromCycle.map((c) => (
                        <ClientRow
                          key={c.id}
                          name={c.name}
                          niche={c.niche}
                          highlight
                          subtitle={lastCheckinMap[c.id] ? `Último: ${formatDate(lastCheckinMap[c.id])}` : 'Nunca'}
                          onAction={() => openModal(c.id, 'checkin')}
                          actionLabel="Check-in"
                          actionVariant="checkin"
                        />
                      ))}
                    </div>
                  )}
                  {pendingFromCycle.length > 0 && pendingOther.length > 0 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  )}
                  {pendingOther.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Demais Clientes
                      </span>
                      {pendingOther.map((c) => (
                        <ClientRow
                          key={c.id}
                          name={c.name}
                          niche={c.niche}
                          subtitle={lastCheckinMap[c.id] ? `Último: ${formatDate(lastCheckinMap[c.id])}` : 'Nunca'}
                          onAction={() => openModal(c.id, 'checkin')}
                          actionLabel="Check-in"
                          actionVariant="checkin"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Block 3 - Média Complexidade */}
          <Card className="border border-border rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '80ms' }}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <BlockHeader
                  icon={<Activity className="h-4 w-4 text-info" />}
                  title="Média Complexidade"
                  badge={`${totalMedium} abertas · ~30min cada`}
                  badgeColor="bg-info/10 text-info"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-md h-7 px-3"
                  onClick={onNewOptimization}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nova Tarefa
                </Button>
              </div>
              {totalMedium === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <p className="text-[13px] text-muted-foreground">Nenhuma tarefa média aberta</p>
                  <Button variant="link" size="sm" className="text-primary text-xs" onClick={onNewOptimization}>
                    + Adicionar tarefa média
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMediumTasks.slice(0, 15).map((task) => (
                    <ClientRow
                      key={task.id}
                      name={getClientName(task.client_id)}
                      niche={getClientNiche(task.client_id)}
                      subtitle={task.description || undefined}
                      badgeText={`${task.tempo_gasto_minutos}min`}
                      meta={formatDate(task.optimization_date)}
                      onAction={() => openModal(task.client_id, 'media')}
                      actionLabel="Registrar"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clientId={modalClientId}
        clientName={getClientName(modalClientId)}
        taskType={modalTaskType}
        currentMemberId={effectiveManagerId || currentMemberId}
        onSubmit={addOptimization}
        todayStr={todayStr}
      />
    </div>
  );
}

/* ── Sub-components ── */

function MiniKpi({ icon, label, value, colorClass }: {
  icon: React.ReactNode; label: string; value: string; colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className={`flex items-center gap-1 text-[13px] font-semibold font-mono ${colorClass}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}

function BlockHeader({ icon, title, badge, badgeColor, subtitle }: {
  icon: React.ReactNode; title: string; badge: string; badgeColor: string; subtitle?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${badgeColor}`}>{badge}</span>
      </div>
      {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center py-6 gap-2">
      {icon}
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}

function ClientRow({ name, niche, done, doneTime, badgeText, subtitle, highlight, meta, onAction, actionLabel, actionVariant }: {
  name: string; niche?: string | null; done?: boolean; doneTime?: string;
  badgeText?: string; subtitle?: string; highlight?: boolean; meta?: string;
  onAction?: () => void; actionLabel?: string; actionVariant?: 'checkin' | 'default';
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl p-3.5 border transition-all duration-150
        ${highlight ? 'border-l-2 border-l-primary border-border' : 'border-border'}
        bg-secondary/30 hover:bg-secondary/60 hover:border-foreground/10`}
    >
      {/* Avatar */}
      <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, #F97316, #f43f5e)' }}>
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        {niche && <p className="text-xs text-muted-foreground">{niche}</p>}
        {subtitle && <p className="text-xs text-muted-foreground truncate max-w-[400px]">{subtitle}</p>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {meta && <span className="text-[11px] text-muted-foreground font-mono">{meta}</span>}
        {badgeText && !done && (
          <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">{badgeText}</span>
        )}
        {done ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="text-xs text-success">Concluída</span>
            {doneTime && <span className="text-[11px] text-muted-foreground font-mono">{doneTime}</span>}
          </div>
        ) : onAction ? (
          <Button
            size="sm"
            className={`text-[13px] rounded-lg h-8 px-4 transition-transform active:scale-[0.98] hover:scale-[1.02]
              ${actionVariant === 'checkin'
                ? 'bg-transparent border border-success/40 text-success hover:bg-success/10'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            onClick={(e) => { e.stopPropagation(); onAction(); }}
          >
            {actionVariant === 'checkin' ? <CheckCircle className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Registration Modal ── */

function RegistrationModal({ open, onOpenChange, clientId, clientName, taskType, currentMemberId, onSubmit, todayStr }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  clientId: string; clientName: string; taskType: string;
  currentMemberId: string | null;
  onSubmit: (input: OptimizationInput) => Promise<any>;
  todayStr: string;
}) {
  const typeInfo = TASK_TYPE_OPTIONS.find((t) => t.value === taskType);
  const [form, setForm] = useState({
    task_type: taskType,
    platform: 'meta_ads',
    optimization_date: todayStr,
    tempo_gasto_minutos: typeInfo?.minutes || 5,
    description: '',
    checkin_saldo_ok: false,
    checkin_campanhas_rodando: false,
    checkin_alertas: false,
  });
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      const info = TASK_TYPE_OPTIONS.find((t) => t.value === taskType);
      setForm({
        task_type: taskType,
        platform: 'meta_ads',
        optimization_date: todayStr,
        tempo_gasto_minutos: info?.minutes || 5,
        description: '',
        checkin_saldo_ok: false,
        checkin_campanhas_rodando: false,
        checkin_alertas: false,
      });
    }
    onOpenChange(v);
  };

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    await onSubmit({
      client_id: clientId,
      platform: form.platform,
      task_type: form.task_type,
      description: form.description || undefined,
      tempo_gasto_minutos: form.tempo_gasto_minutos,
      member_id: currentMemberId,
      optimization_date: form.optimization_date,
      checkin_saldo_ok: form.task_type === 'checkin' ? form.checkin_saldo_ok : undefined,
      checkin_campanhas_rodando: form.task_type === 'checkin' ? form.checkin_campanhas_rodando : undefined,
      checkin_alertas: form.task_type === 'checkin' ? form.checkin_alertas : undefined,
    });
    setSaving(false);
    onOpenChange(false);
  };

  const selectedType = TASK_TYPE_OPTIONS.find((t) => t.value === form.task_type);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border border-border bg-card backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Registrar Otimização</DialogTitle>
          <p className="text-sm text-muted-foreground">{clientName}</p>
        </DialogHeader>
        <div className="space-y-4">
          {/* Task Type - visual radio */}
          <div>
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {TASK_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, task_type: t.value, tempo_gasto_minutos: t.minutes }))}
                  className={`p-3 rounded-lg border text-center transition-all text-sm
                    ${form.task_type === t.value
                      ? 'bg-primary/10 border-primary/60 font-semibold'
                      : 'border-border hover:border-foreground/20'}`}
                >
                  <div className="font-medium text-xs">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground">~{t.minutes}min</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                className="h-[42px] rounded-lg mt-1"
                value={form.optimization_date}
                onChange={(e) => setForm((f) => ({ ...f, optimization_date: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger className="h-[42px] rounded-lg mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Tempo gasto (min) *</Label>
            <Input
              type="number"
              min={1}
              className="h-[42px] rounded-lg mt-1"
              value={form.tempo_gasto_minutos}
              placeholder="ex: 60"
              onChange={(e) => setForm((f) => ({ ...f, tempo_gasto_minutos: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Leve: 5min · Média: 30min · Alta: 60min+</p>
          </div>

          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              className="rounded-lg mt-1 min-h-[80px]"
              placeholder="Descreva o que foi feito..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Checklist for check-in */}
          {form.task_type === 'checkin' && (
            <div className="rounded-xl border border-border p-4 space-y-3 bg-secondary/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist</p>
              {[
                { key: 'checkin_saldo_ok' as const, label: 'Saldo OK?' },
                { key: 'checkin_campanhas_rodando' as const, label: 'Campanhas rodando?' },
                { key: 'checkin_alertas' as const, label: 'Algum alerta?' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2.5">
                  <Checkbox
                    checked={form[item.key]}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, [item.key]: !!v }))}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || form.tempo_gasto_minutos <= 0}
            className="rounded-lg bg-primary text-primary-foreground"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Team Panel ── */

function TeamPanel({ trafficManagers, accounts, optimizations, todayStr, todayHighComplexity, openMediumTasks, onSelectManager }: {
  trafficManagers: Member[];
  accounts: Account[];
  optimizations: TrafficOptimization[];
  todayStr: string;
  todayHighComplexity: WeeklyCycleEntry[];
  openMediumTasks: TrafficOptimization[];
  onSelectManager: (id: string) => void;
}) {
  const managerStats = useMemo(() => {
    return trafficManagers.map((m) => {
      const mClients = accounts.filter((a) => a.traffic_member_id === m.id);
      const mCheckins = optimizations.filter((o) => o.optimization_date === todayStr && o.task_type === 'checkin' && o.member_id === m.id);
      const mAlta = todayHighComplexity.filter((w) => w.manager_member_id === m.id);
      const mAltaDone = optimizations.filter((o) => o.optimization_date === todayStr && o.task_type === 'alta' && o.member_id === m.id);
      const mMedium = openMediumTasks.filter((o) => o.member_id === m.id);
      const total = mClients.length + mAlta.length + mMedium.length;
      const done = mCheckins.length + mAltaDone.length;
      return {
        id: m.id,
        name: m.name,
        clients: mClients.length,
        checkinsTotal: mClients.length,
        checkinsDone: mCheckins.length,
        altaTotal: mAlta.length,
        altaDone: mAltaDone.length,
        medium: mMedium.length,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  }, [trafficManagers, accounts, optimizations, todayStr, todayHighComplexity, openMediumTasks]);

  const totals = useMemo(() => ({
    clients: managerStats.reduce((s, m) => s + m.clients, 0),
    checkinsDone: managerStats.reduce((s, m) => s + m.checkinsDone, 0),
    checkinsTotal: managerStats.reduce((s, m) => s + m.checkinsTotal, 0),
    altaDone: managerStats.reduce((s, m) => s + m.altaDone, 0),
    altaTotal: managerStats.reduce((s, m) => s + m.altaTotal, 0),
    medium: managerStats.reduce((s, m) => s + m.medium, 0),
  }), [managerStats]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Totals card */}
      <Card className="border border-primary/30 rounded-2xl bg-secondary/50">
        <CardContent className="p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total da Equipe</span>
          <div className="grid grid-cols-3 gap-6 mt-3">
            <div>
              <p className="text-2xl font-extrabold font-mono">{totals.checkinsDone}/{totals.checkinsTotal}</p>
              <p className="text-xs text-muted-foreground">check-ins</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold font-mono text-primary">{totals.altaDone}/{totals.altaTotal}</p>
              <p className="text-xs text-muted-foreground">alta complexidade</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold font-mono text-info">{totals.medium}</p>
              <p className="text-xs text-muted-foreground">tarefas médias</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {managerStats.map((ms) => {
          const pColor = ms.progress >= 100 ? 'text-success' : ms.progress >= 50 ? 'text-primary' : 'text-destructive';
          const cColor = ms.checkinsDone === ms.checkinsTotal && ms.checkinsTotal > 0
            ? 'text-success' : ms.checkinsDone > 0 ? 'text-yellow-500' : 'text-destructive';
          return (
            <Card key={ms.id} className="border border-border rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #F97316, #f43f5e)' }}>
                    {ms.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate">{ms.name}</p>
                    <p className="text-xs text-muted-foreground">Gestor de Tráfego</p>
                  </div>
                  <span className={`text-[13px] font-semibold font-mono ${pColor}`}>{ms.progress}%</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded bg-border overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${Math.min(ms.progress, 100)}%`,
                      background: ms.progress >= 100 ? 'hsl(var(--success))' : 'linear-gradient(90deg, #F97316, #f43f5e)',
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className={`text-sm font-semibold font-mono ${cColor}`}>{ms.checkinsDone}/{ms.checkinsTotal}</p>
                    <p className="text-[10px] text-muted-foreground">check-ins</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-mono text-primary">{ms.altaDone}/{ms.altaTotal}</p>
                    <p className="text-[10px] text-muted-foreground">alta complexidade</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-mono text-info">{ms.medium}</p>
                    <p className="text-[10px] text-muted-foreground">tarefas médias</p>
                  </div>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary text-[13px] p-0 h-auto"
                  onClick={() => onSelectManager(ms.id)}
                >
                  Ver detalhes <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
}
