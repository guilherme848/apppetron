import { useMemo, useState } from 'react';
import { format, parseISO, isBefore, startOfDay, getDate, getDaysInMonth, startOfWeek, endOfWeek, isWithinInterval, addWeeks, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { Settings, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle } from 'lucide-react';
import { DC, tooltipStyle, ROLE_CHIP_COLORS, ROLE_LABELS, PRODUCTION_ROLES, ROLE_COLORS, ROLE_BORDER_COLORS } from '@/lib/dashboardColors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProdutividadeTabProps {
  data: any;
}

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || 'hsl(var(--muted-foreground))';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color, borderColor: `color-mix(in srgb, ${color} 25%, transparent)` }}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[role] || 'hsl(var(--info))'}, color-mix(in srgb, ${ROLE_COLORS[role] || 'hsl(var(--info))'} 80%, transparent))` }}
    >
      {initials}
    </div>
  );
}

// ─── Goals Modal ───
function GoalsModal({ open, onOpenChange, metas, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  metas: Record<string, number>;
  onSave: () => void;
}) {
  const [values, setValues] = useState<Record<string, number>>({
    designer: metas.designer || 3,
    videomaker: metas.videomaker || 2,
    social: metas.social || 3,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    for (const [cargo, meta_diaria] of Object.entries(values)) {
      await supabase
        .from('metas_producao_diaria')
        .upsert({ cargo, meta_diaria, ativo: true, updated_at: new Date().toISOString() } as any, { onConflict: 'cargo' });
    }
    setSaving(false);
    toast.success('Metas atualizadas com sucesso');
    onSave();
    onOpenChange(false);
  };

  const fields = [
    { key: 'designer', label: 'Meta diária — Designer', color: ROLE_COLORS.designer },
    { key: 'videomaker', label: 'Meta diária — Videomaker', color: ROLE_COLORS.videomaker },
    { key: 'social', label: 'Meta diária — Social Media', color: ROLE_COLORS.social },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">Configurar Metas Diárias</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                {f.label}
              </Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={values[f.key]}
                onChange={e => setValues(v => ({ ...v, [f.key]: parseInt(e.target.value) || 0 }))}
                className="h-[42px] font-mono"
                placeholder="Ex: 3"
              />
              <p className="text-[11px] text-muted-foreground">Quantidade de conteúdos esperados por profissional por dia útil</p>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? 'Salvando...' : 'Salvar Metas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProdutividadeTab({ data }: ProdutividadeTabProps) {
  const { posts: filteredPosts, changeRequests, teamMembers, filters, dailyProductivityStats, metasMap, refetch } = data;
  const [view, setView] = useState<'role' | 'overview'>('role');
  const [goalsOpen, setGoalsOpen] = useState(false);

  const today = startOfDay(new Date());
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = getDaysInMonth(today);
  const todayDate = getDate(today);

  // Build professional stats grouped by role
  const { byRole, allStats } = useMemo(() => {
    const statsMap: Record<string, {
      id: string; name: string; role: string;
      completed: number; wip: number; overdue: number;
      changeRate: number; postsWithChanges: number;
      completedToday: number; bestDay: { day: number; count: number };
      dailyCounts: Record<number, number>;
    }> = {};
    const changePostIds = new Set(changeRequests.map((cr: any) => cr.post_id));

    filteredPosts.forEach((p: any) => {
      if (!p.assignee_id || !p.responsible_role_key) return;
      if (!PRODUCTION_ROLES.includes(p.responsible_role_key as any)) return;

      const key = `${p.assignee_id}-${p.responsible_role_key}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          id: p.assignee_id, name: p.assignee?.name || 'Desconhecido', role: p.responsible_role_key,
          completed: 0, wip: 0, overdue: 0, changeRate: 0, postsWithChanges: 0,
          completedToday: 0, bestDay: { day: 0, count: 0 }, dailyCounts: {},
        };
      }
      const s = statsMap[key];

      if (p.status === 'done') {
        const dateStr = p.data_conclusao || p.completed_at;
        if (dateStr) {
          const cd = parseISO(dateStr);
          if (!isBefore(cd, filters.dateRange.from) && !isBefore(filters.dateRange.to, cd)) {
            s.completed++;
            if (changePostIds.has(p.id)) s.postsWithChanges++;
            if (format(cd, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) s.completedToday++;
            if (cd.getMonth() === currentMonth && cd.getFullYear() === currentYear) {
              const day = getDate(cd);
              s.dailyCounts[day] = (s.dailyCounts[day] || 0) + 1;
            }
          }
        }
      } else {
        s.wip++;
        const d = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
        if (d && isBefore(d, today)) s.overdue++;
      }
    });

    Object.values(statsMap).forEach(s => {
      s.changeRate = s.completed > 0 ? Math.round((s.postsWithChanges / s.completed) * 100) : 0;
      let best = { day: 0, count: 0 };
      Object.entries(s.dailyCounts).forEach(([d, c]) => { if (c > best.count) best = { day: Number(d), count: c }; });
      s.bestDay = best;
    });

    const allStats = Object.values(statsMap).filter(s => s.completed > 0 || s.wip > 0);
    const byRole: Record<string, typeof allStats> = {};
    PRODUCTION_ROLES.forEach(r => { byRole[r] = allStats.filter(s => s.role === r).sort((a, b) => b.completed - a.completed); });
    return { byRole, allStats: allStats.sort((a, b) => b.completed - a.completed) };
  }, [filteredPosts, changeRequests, filters.dateRange, today, currentMonth, currentYear]);

  // Weekly data for grouped bar chart
  const weeklyData = useMemo(() => {
    const monthStart = startOfMonth(today);
    const weeks: { label: string; start: Date; end: Date }[] = [];
    let ws = startOfWeek(monthStart, { locale: ptBR });
    for (let i = 0; i < 5; i++) {
      const we = endOfWeek(ws, { locale: ptBR });
      weeks.push({ label: `Sem ${i + 1}`, start: ws, end: we });
      ws = addWeeks(ws, 1);
    }
    return weeks.map(w => {
      const row: any = { week: w.label };
      allStats.forEach(s => {
        let count = 0;
        filteredPosts.forEach((p: any) => {
          if (p.assignee_id !== s.id || p.responsible_role_key !== s.role) return;
          if (p.status !== 'done') return;
          const dateStr = p.data_conclusao || p.completed_at;
          if (!dateStr) return;
          const cd = parseISO(dateStr);
          if (isWithinInterval(cd, { start: w.start, end: w.end })) count++;
        });
        row[`${s.name}_${s.role}`] = count;
      });
      return row;
    });
  }, [allStats, filteredPosts, today]);

  // Role averages for alerts
  const roleAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    PRODUCTION_ROLES.forEach(r => {
      const profs = byRole[r] || [];
      avgs[r] = profs.length > 0 ? Math.round(profs.reduce((s, p) => s + p.completed, 0) / profs.length) : 0;
    });
    return avgs;
  }, [byRole]);

  const overloaded = useMemo(() => allStats.filter(s => s.wip > (roleAverages[s.role] || 0) && s.overdue > 5), [allStats, roleAverages]);

  // Low production: using meta-based threshold (< 70%)
  const lowProd = useMemo(() => {
    return dailyProductivityStats.filter((s: any) => s.meta > 0 && s.avgPerDay < s.meta * 0.7);
  }, [dailyProductivityStats]);

  const changeRateColor = (rate: number) => rate <= 10 ? 'text-emerald-500' : rate <= 20 ? 'text-amber-500' : 'text-red-500';
  const changeRateBg = (rate: number) => rate <= 10 ? 'bg-emerald-500' : rate <= 20 ? 'bg-amber-500' : 'bg-red-500';

  // Heatmap color based on meta
  const heatColor = (count: number, role: string) => {
    const meta = metasMap[role] || 3;
    if (count === 0) return 'bg-muted border border-border/50';
    const pct = count / meta;
    const color = ROLE_COLORS[role] || 'hsl(var(--info))';
    if (pct >= 1) return '';
    if (pct >= 0.5) return '';
    return '';
  };

  const heatStyle = (count: number, role: string) => {
    const meta = metasMap[role] || 3;
    const color = ROLE_COLORS[role] || 'hsl(var(--info))';
    if (count === 0) return {};
    const pct = count / meta;
    if (pct >= 1) return { backgroundColor: color, color: 'white', boxShadow: `0 0 8px ${color}30` };
    if (pct >= 0.5) return { backgroundColor: `${color}80`, color: 'white' };
    return { backgroundColor: `${color}33`, color };
  };

  // Weekly meta line for chart
  const weeklyMeta = useMemo(() => {
    if (allStats.length === 0) return 0;
    const avgMeta = allStats.reduce((sum, s) => sum + (metasMap[s.role] || 0), 0) / allStats.length;
    return Math.round(avgMeta * 5);
  }, [allStats, metasMap]);

  return (
    <div className="space-y-6">
      {/* Sub-tabs toggle */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView('role')}
          className={`rounded-md text-xs font-medium transition-all ${
            view === 'role'
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          👤 Por Cargo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView('overview')}
          className={`rounded-md text-xs font-medium transition-all ${
            view === 'overview'
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Visão Geral
        </Button>
      </div>

      {/* ═══ NEW: DAILY PRODUCTIVITY PANEL ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Produtividade Diária
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setGoalsOpen(true)}
            title="Configurar metas diárias"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {dailyProductivityStats.length === 0 ? (
          <Card className="border border-border rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-sm font-semibold text-foreground">Sem dados de produtividade</p>
              <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros ou aguarde entregas no período</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dailyProductivityStats.map((prof: any) => {
              const metaPct = prof.meta > 0 ? (prof.avgPerDay / prof.meta) * 100 : 0;
              const isAboveMeta = metaPct >= 100;
              const isBelowThreshold = metaPct < 70 && prof.meta > 0;
              const progressColor = metaPct >= 100 ? 'bg-emerald-500' : metaPct >= 70 ? 'bg-amber-500' : 'bg-red-500';
              const borderColor = ROLE_COLORS[prof.role] || 'hsl(var(--info))';

              return (
                <Card
                  key={`${prof.id}-${prof.role}`}
                  className={`border border-border rounded-2xl transition-all duration-150 hover:border-primary/40 relative overflow-hidden border-l-[3px]`}
                  style={{ borderLeftColor: borderColor }}
                >
                  {/* Danger/success glow */}
                  {isBelowThreshold && (
                    <>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 24px rgba(239,68,68,0.05)' }} />
                    </>
                  )}
                  {isAboveMeta && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 24px rgba(16,185,129,0.05)' }} />
                  )}

                  <CardContent className="p-5 space-y-4">
                    {/* Identity */}
                    <div className="flex items-center gap-3">
                      <Avatar name={prof.name} role={prof.role} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{prof.name}</p>
                        <RoleChip role={prof.role} />
                      </div>
                    </div>

                    {/* Hero metric */}
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[42px] font-extrabold font-mono leading-none text-foreground">{prof.avgPerDay}</span>
                        <span className="text-base text-muted-foreground">/dia</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 space-y-1">
                        <div className="h-2 rounded-full bg-border/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{
                              width: `${Math.min(metaPct, 100)}%`,
                              boxShadow: isAboveMeta ? `0 0 12px rgba(16,185,129,0.3)` : undefined,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Meta: {prof.meta}/dia
                        </p>
                      </div>
                    </div>

                    {/* Secondary metrics */}
                    <div className="flex items-center divide-x divide-border">
                      <div className="flex-1 text-center pr-3">
                        <p className={`text-lg font-bold font-mono ${prof.todayCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {prof.todayCount}
                        </p>
                        <p className="text-[10px] uppercase text-muted-foreground">Hoje</p>
                      </div>
                      <div className="flex-1 text-center px-3">
                        <p className="text-lg font-bold font-mono text-foreground">{prof.thisWeekCount}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Semana</p>
                      </div>
                      <div className="flex-1 text-center pl-3">
                        <p className="text-lg font-bold font-mono text-foreground">{prof.thisMonthCount}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Mês</p>
                      </div>
                    </div>

                    {/* Trend */}
                    <div className="flex items-center gap-1.5">
                      {prof.trendPct > 0 ? (
                        <>
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[11px] text-emerald-500">{prof.trendPct}% vs semana anterior</span>
                        </>
                      ) : prof.trendPct < 0 ? (
                        <>
                          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-[11px] text-red-500">{Math.abs(prof.trendPct)}% vs semana anterior</span>
                        </>
                      ) : (
                        <>
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">Estável</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Goals Modal */}
      <GoalsModal open={goalsOpen} onOpenChange={setGoalsOpen} metas={metasMap} onSave={refetch} />

      {view === 'role' ? (
        <>
          {/* ═══ BY ROLE VIEW ═══ */}
          {PRODUCTION_ROLES.map(role => {
            const profs = byRole[role] || [];
            if (profs.length === 0) return null;
            const totalCompleted = profs.reduce((s, p) => s + p.completed, 0);
            const avgChange = profs.length > 0 ? Math.round(profs.reduce((s, p) => s + p.changeRate, 0) / profs.length) : 0;

            return (
              <div key={role} className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                {/* Role header */}
                <div className="flex items-center gap-3 border-b border-border pb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[role] }} />
                  <h3 className="text-base font-semibold text-foreground">{ROLE_LABELS[role]}</h3>
                  <span className="text-xs text-muted-foreground">
                    Total: {totalCompleted} concluídos · Taxa média: {avgChange}%
                  </span>
                </div>

                {/* Professional cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profs.map(p => (
                    <Card
                      key={`${p.id}-${p.role}`}
                      className="border border-border rounded-2xl transition-all duration-150 hover:border-primary/40 border-l-[3px]"
                      style={{ borderLeftColor: ROLE_COLORS[role] }}
                    >
                      <CardContent className="pt-4 pb-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={p.name} role={p.role} />
                          <span className="font-semibold text-sm text-foreground">{p.name}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xl font-extrabold font-mono text-emerald-500">{p.completed}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">Concluídos</p>
                          </div>
                          <div>
                            <p className="text-xl font-extrabold font-mono text-blue-500">{p.wip}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">WIP</p>
                          </div>
                          <div>
                            <p className={`text-xl font-extrabold font-mono ${p.overdue > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>{p.overdue}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">Atrasados</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground">Taxa de Alteração</span>
                            <span className={`text-xs font-bold font-mono ${changeRateColor(p.changeRate)}`}>{p.changeRate}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-border">
                            <div className={`h-full rounded-full transition-all ${changeRateBg(p.changeRate)}`} style={{ width: `${Math.min(p.changeRate, 100)}%` }} />
                          </div>
                          {p.changeRate > 10 && (
                            <Badge variant="outline" className="text-[9px] mt-1 border-amber-500/30 text-amber-500">Atenção</Badge>
                          )}
                        </div>

                        <p className="text-[10px] text-muted-foreground font-mono">
                          Hoje: {p.completedToday} | Melhor dia: {p.bestDay.count > 0 ? `${p.bestDay.count} (d.${p.bestDay.day})` : '-'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Heatmap */}
                <Card className="border border-border rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Produção diária — {format(today, 'MMMM yyyy', { locale: ptBR })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="grid gap-0.5" style={{ gridTemplateColumns: `120px repeat(${daysInMonth}, 1fr)` }}>
                        <div />
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <div
                            key={i}
                            className={`text-center text-[9px] font-mono ${
                              i + 1 === todayDate ? 'font-bold text-primary underline' : 'text-muted-foreground'
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                        {profs.map(p => (
                          <div key={`${p.id}-${p.role}`} className="contents">
                            <div className="text-[10px] truncate pr-2 text-foreground font-medium">{p.name}</div>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const day = i + 1;
                              const count = p.dailyCounts[day] || 0;
                              const isCurrentDay = day === todayDate;
                              const isFuture = day > todayDate;
                              const style = isFuture ? { opacity: 0.4 } : heatStyle(count, role);

                              return (
                                <div
                                  key={day}
                                  className={`w-full aspect-square rounded flex items-center justify-center text-[8px] font-mono font-medium transition-all ${
                                    count === 0 && !isFuture ? 'bg-muted' : ''
                                  } ${isCurrentDay && count === 0 ? 'ring-2 ring-primary' : ''}`}
                                  style={style}
                                  title={`${p.name} — dia ${day}: ${count} entregas (meta: ${metasMap[role] || 0})`}
                                >
                                  {count > 0 ? count : ''}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Weekly chart */}
          {allStats.length > 0 && (
            <Card className="border border-border rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground">Concluídos por Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <ReTooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {weeklyMeta > 0 && (
                        <ReferenceLine
                          y={weeklyMeta}
                          stroke="hsl(var(--primary))"
                          strokeDasharray="5 5"
                          strokeOpacity={0.6}
                          label={{ value: `Meta semanal`, position: 'right', fill: 'hsl(var(--primary))', fontSize: 10 }}
                        />
                      )}
                      {allStats.slice(0, 8).map((s, i) => {
                        const colors = [ROLE_COLORS.designer, ROLE_COLORS.social, ROLE_COLORS.videomaker, 'hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))', 'hsl(var(--info))', 'hsl(var(--purple))'];
                        return (
                          <Bar key={`${s.id}-${s.role}`} dataKey={`${s.name}_${s.role}`} name={s.name} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* ═══ OVERVIEW TABLE ═══ */
        <Card className="border border-border rounded-2xl">
          <CardHeader><CardTitle className="text-sm font-semibold text-foreground">Ranking Unificado</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="w-8 text-[11px] uppercase font-semibold">#</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold">Profissional</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold">Cargo</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Concluídos</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">WIP</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Atrasados</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Alterações</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Taxa Alt.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStats.map((s, i) => {
                    const maxCompleted = allStats[0]?.completed || 1;
                    return (
                      <TableRow key={`${s.id}-${s.role}`} className="h-12 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-colors">
                        <TableCell className="text-sm font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-foreground">{s.name}</TableCell>
                        <TableCell><RoleChip role={s.role} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 rounded-full bg-border">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${(s.completed / maxCompleted) * 100}%` }} />
                            </div>
                            <span className="text-sm font-semibold font-mono w-6 text-right">{s.completed}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{s.wip}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono text-sm ${s.overdue > 0 ? 'font-bold text-red-500' : 'text-muted-foreground'}`}>{s.overdue}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{s.postsWithChanges}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-[10px] font-mono ${changeRateColor(s.changeRate)} border-current/30`}>
                            {s.changeRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ ALERT CARDS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overloaded */}
        <Card className={`border rounded-2xl border-l-[3px] transition-all ${
          overloaded.length > 0 ? 'border-l-red-500 shadow-[0_0_24px_rgba(239,68,68,0.06)]' : 'border-l-border'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {overloaded.length > 0 && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              <span className={overloaded.length > 0 ? 'text-red-500' : 'text-muted-foreground'}>Sobrecarregados</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overloaded.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Nenhum profissional sobrecarregado
              </p>
            ) : (
              <div className="space-y-2">
                {overloaded.map(s => (
                  <div key={`${s.id}-${s.role}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} role={s.role} />
                      <span className="text-foreground font-medium">{s.name}</span>
                      <RoleChip role={s.role} />
                    </div>
                    <div className="flex gap-3 text-xs font-mono">
                      <span className="text-blue-500">WIP: {s.wip}</span>
                      <span className="text-red-500">Atrasados: {s.overdue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Production */}
        <Card className={`border rounded-2xl border-l-[3px] transition-all ${
          lowProd.length > 0 ? 'border-l-amber-500' : 'border-l-border'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {lowProd.length > 0 && <div className="w-2 h-2 rounded-full bg-amber-500" />}
              <span className={lowProd.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}>Baixa Produção</span>
              {lowProd.length > 0 && <span className="text-[10px] text-muted-foreground font-normal">(&lt; 70% da meta)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowProd.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Todos dentro da média
              </p>
            ) : (
              <div className="space-y-2">
                {lowProd.map((s: any) => (
                  <div key={`${s.id}-${s.role}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} role={s.role} />
                      <span className="text-foreground font-medium">{s.name}</span>
                      <RoleChip role={s.role} />
                    </div>
                    <div className="flex gap-3 text-xs font-mono">
                      <span className="text-foreground">{s.avgPerDay}/dia</span>
                      <span className="text-muted-foreground">Meta: {s.meta}/dia</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
