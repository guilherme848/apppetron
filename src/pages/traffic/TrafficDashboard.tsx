import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Eye,
  CircleDollarSign,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTrafficOverview } from '@/hooks/useTrafficOverview';
import { TASK_TYPE_OPTIONS } from '@/hooks/useTrafficOptimizations';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ── helpers ─────────────────────────────── */

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const taskTypeLabel = (type: string) =>
  TASK_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

const taskTypeComplexity = (type: string) =>
  TASK_TYPE_OPTIONS.find((t) => t.value === type)?.complexity || 'Leve';

const COMPLEXITY_BADGE: Record<string, string> = {
  Leve: 'bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))]',
  Média: 'bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))]',
  Alta: 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]',
};

const todayFormatted = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR });

/* ── Skeleton loader ─────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6 px-2 md:px-0 animate-in fade-in duration-200">
      {/* header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* kpis */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] rounded-2xl" />
        ))}
      </div>
      {/* alerts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-[320px] rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
      {/* table */}
      <Skeleton className="h-[280px] rounded-2xl" />
    </div>
  );
}

/* ── Main ────────────────────────────────── */

export default function TrafficDashboard() {
  const navigate = useNavigate();
  const noCheckinRef = useRef<HTMLDivElement>(null);

  const {
    loading,
    totalActiveClients,
    lowBalanceClients,
    todayCheckins,
    clientsWithoutCheckin,
    weekOptimizations,
    pendingCreatives,
    recentOptimizations,
    getClientName,
    getClientBalance,
  } = useTrafficOverview();

  if (loading) return <DashboardSkeleton />;

  /* ── KPI definitions ───────────────────── */
  const kpis = [
    {
      label: 'CLIENTES ATIVOS',
      value: totalActiveClients,
      sub: 'com tráfego pago ativo',
      icon: Users,
      color: '',
      onClick: undefined as (() => void) | undefined,
      glow: '',
    },
    {
      label: 'SALDO BAIXO',
      value: lowBalanceClients.length,
      sub: 'contas precisam de atenção',
      icon: AlertTriangle,
      color: lowBalanceClients.length > 0 ? 'text-destructive' : '',
      onClick: () => navigate('/traffic/balances'),
      glow: lowBalanceClients.length > 0 ? 'shadow-[0_0_20px_hsl(0_84%_60%/.08)]' : '',
    },
    {
      label: 'CHECK-INS HOJE',
      value: todayCheckins.length,
      sub: `de ${totalActiveClients} clientes`,
      icon: CheckCircle,
      color: todayCheckins.length > 0 ? 'text-[hsl(var(--success))]' : '',
      onClick: undefined as (() => void) | undefined,
      glow: '',
    },
    {
      label: 'SEM CHECK-IN',
      value: clientsWithoutCheckin.length,
      sub: 'aguardando check-in hoje',
      icon: Clock,
      color: clientsWithoutCheckin.length > 0 ? 'text-[hsl(var(--warning))]' : '',
      onClick: () => noCheckinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      glow: clientsWithoutCheckin.length > 0 ? 'shadow-[0_0_20px_hsl(45_93%_47%/.08)]' : '',
    },
    {
      label: 'OTIMIZAÇÕES (SEMANA)',
      value: weekOptimizations.length,
      sub: 'registradas esta semana',
      icon: Zap,
      color: weekOptimizations.length > 0 ? 'text-[hsl(var(--primary))]' : '',
      onClick: undefined as (() => void) | undefined,
      glow: '',
    },
  ];

  const totalAlerts = lowBalanceClients.length + pendingCreatives.length;

  return (
    <div className="relative space-y-6">
      {/* ambient gradient (dark mode) */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] z-0 dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,hsl(25_95%_53%/.04),transparent)]" />

      <div className="relative z-10 space-y-6">

        {/* ═══════ HEADER ═══════ */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '0ms' }}
        >
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tráfego Pago · {todayFormatted}
          </p>
        </div>

        {/* ═══════ KPI CARDS ═══════ */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300"
          style={{ animationDelay: '40ms' }}
        >
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                onClick={kpi.onClick}
                className={cn(
                  'group rounded-2xl border border-border bg-card p-5 transition-all duration-150',
                  kpi.onClick && 'cursor-pointer',
                  kpi.glow,
                  'hover:border-foreground/20',
                )}
              >
                {/* top row */}
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {kpi.label}
                  </span>
                  <Icon className="h-[18px] w-[18px] text-muted-foreground" />
                </div>
                {/* value */}
                <p
                  className={cn(
                    'mt-2 text-[32px] font-extrabold leading-none font-mono',
                    kpi.color || 'text-foreground',
                  )}
                >
                  {kpi.value}
                </p>
                {/* sub */}
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  {kpi.sub}
                </span>
              </div>
            );
          })}
        </div>

        {/* ═══════ ALERTS GRID ═══════ */}
        <div
          ref={noCheckinRef}
          className="grid lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300"
          style={{ animationDelay: '80ms' }}
        >
          {/* ── Left: Sem Check-in Hoje ── */}
          <div className="rounded-2xl border border-border bg-card p-6">
            {/* title bar */}
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Sem Check-in Hoje</span>
              {clientsWithoutCheckin.length > 0 && (
                <span className="ml-auto inline-flex items-center rounded-[10px] bg-[hsl(var(--warning)/.12)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--warning))]">
                  {clientsWithoutCheckin.length}
                </span>
              )}
            </div>

            {clientsWithoutCheckin.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <ShieldCheck className="h-7 w-7 text-[hsl(var(--success))]" />
                <p className="text-sm font-semibold text-[hsl(var(--success))]">
                  Todos em dia!
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Todos os clientes já têm check-in hoje.
                </p>
              </div>
            ) : (
              <>
                <div className="max-h-[320px] overflow-y-auto pr-1 scrollbar-styled space-y-0 divide-y divide-border/60">
                  {clientsWithoutCheckin.slice(0, 15).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 h-[52px] px-2 hover:bg-gradient-to-r hover:from-[hsl(25_95%_53%/.03)] hover:to-transparent transition-colors"
                    >
                      <Avatar className="h-8 w-8 rounded-lg text-xs shrink-0">
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(0_84%_60%)] text-white text-[10px] font-semibold">
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">Nunca fez check-in</p>
                      </div>
                      <button
                        onClick={() => navigate('/traffic/optimizations')}
                        className="flex items-center gap-0.5 text-xs font-semibold text-[hsl(var(--primary))] shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                      >
                        Fazer Check-in
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {clientsWithoutCheckin.length > 15 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground">
                      Mostrando 15 de {clientsWithoutCheckin.length} clientes
                    </span>
                    <button
                      onClick={() => navigate('/traffic/optimizations')}
                      className="text-xs font-semibold text-[hsl(var(--primary))]"
                    >
                      Ver todos
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Right: Alertas Críticos ── */}
          <div className="rounded-2xl border border-border bg-card p-6">
            {/* title bar */}
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Alertas Críticos</span>
              {totalAlerts > 0 && (
                <span className="ml-auto inline-flex items-center rounded-[10px] bg-[hsl(var(--destructive)/.12)] px-2 py-0.5 text-[11px] font-semibold text-destructive">
                  {totalAlerts}
                </span>
              )}
            </div>

            {totalAlerts === 0 ? (
              <div className="relative flex flex-col items-center justify-center py-10 gap-2">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--success)/.04),transparent_70%)]" />
                <ShieldCheck className="h-7 w-7 text-[hsl(var(--success))]" />
                <p className="text-sm font-semibold text-[hsl(var(--success))]">
                  Nenhum alerta no momento
                </p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto pr-1 scrollbar-styled space-y-4">
                {/* Saldo Baixo */}
                {lowBalanceClients.length > 0 && (
                  <div className="space-y-2">
                    {lowBalanceClients.slice(0, 5).map((c) => {
                      const bal = getClientBalance(c.id);
                      return (
                        <div
                          key={c.id}
                          className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gradient-to-r hover:from-[hsl(25_95%_53%/.03)] hover:to-transparent transition-colors"
                        >
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">
                              <span className="font-semibold">{c.name}</span>
                              <span className="text-muted-foreground"> — saldo abaixo de 20%</span>
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              Saldo atual: {bal !== null ? bal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                              {' — '}
                              Verba: {(c.ad_monthly_budget ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate('/traffic/balances')}
                            className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0 mt-1 hover:text-foreground transition-colors"
                          >
                            Ver Saldo
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* separator */}
                {lowBalanceClients.length > 0 && pendingCreatives.length > 0 && (
                  <div className="border-t border-border/60" />
                )}

                {/* Criativos Pendentes */}
                {pendingCreatives.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gradient-to-r hover:from-[hsl(25_95%_53%/.03)] hover:to-transparent transition-colors">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(var(--warning))] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{pendingCreatives.length}</span>
                          <span className="text-muted-foreground"> criativos aguardando revisão</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Solicitações em revisão há mais de 2 dias
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/traffic/creative-requests')}
                        className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0 mt-1 hover:text-foreground transition-colors"
                      >
                        Ver Criativos
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════ RECENT OPTIMIZATIONS TABLE ═══════ */}
        <div
          className="rounded-2xl border border-border bg-card p-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
          style={{ animationDelay: '120ms' }}
        >
          {/* title bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Otimizações Recentes — Semana Atual</span>
            </div>
            <button
              onClick={() => navigate('/traffic/optimizations')}
              className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver tudo
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentOptimizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              {/* minimal SVG zap illustration */}
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                className="text-muted-foreground/30"
              >
                <path
                  d="M26 4L8 28h14l-4 16L38 20H24l2-16z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-center">
                <p className="text-base font-semibold">
                  Nenhuma otimização registrada esta semana
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  As otimizações realizadas aparecerão aqui.
                </p>
              </div>
              <Button
                className="mt-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                onClick={() => navigate('/traffic/optimizations')}
              >
                + Registrar Otimização
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-secondary/50 sticky top-0">
                      Data
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-secondary/50 sticky top-0">
                      Cliente
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-secondary/50 sticky top-0">
                      Tipo
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-secondary/50 sticky top-0">
                      Descrição
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-secondary/50 sticky top-0 text-right">
                      Tempo
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-secondary/50 sticky top-0 w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOptimizations.map((o) => {
                    const complexity = taskTypeComplexity(o.task_type);
                    const dateStr = new Date(o.optimization_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    return (
                      <TableRow
                        key={o.id}
                        className="group h-[52px] border-b border-border/40 hover:bg-gradient-to-r hover:from-[hsl(25_95%_53%/.03)] hover:to-transparent transition-colors"
                      >
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {dateStr}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          {o.clientName}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
                              COMPLEXITY_BADGE[complexity] || COMPLEXITY_BADGE.Leve,
                            )}
                          >
                            {taskTypeLabel(o.task_type)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-[13px] text-muted-foreground truncate">
                          {o.description || '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {o.tempo_gasto_minutos}min
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalhes</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
