import { useMemo, useState } from 'react';
import { format, startOfDay, getDate, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, Minus, CheckCircle, Trophy, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/dashboardColors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface ProdutividadeTimeTabProps {
  data: any;
}

const ROLE_COLORS: Record<string, string> = {
  designer: '#6366f1',
  videomaker: '#8b5cf6',
  social: '#10b981',
};

const CLIENT_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#F97316', '#f43f5e', '#ef4444', '#64748b'];

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || '#64748b';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border"
      style={{ backgroundColor: `${color}1f`, color, borderColor: `${color}40` }}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[role] || '#6366f1'}, ${ROLE_COLORS[role] || '#6366f1'}cc)` }}
    >
      {initials}
    </div>
  );
}

function GoalsModal({ open, onOpenChange, metas, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  metas: Record<string, number>; onSave: () => void;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Metas Diárias</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                {f.label}
              </Label>
              <Input
                type="number" min={0} max={20}
                value={values[f.key]}
                onChange={e => setValues(v => ({ ...v, [f.key]: parseInt(e.target.value) || 0 }))}
                className="h-10 font-mono" placeholder="Ex: 3"
              />
              <p className="text-[11px] text-muted-foreground">Quantidade de conteúdos esperados por profissional por dia útil</p>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Metas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ SPARKLINE BLOCK ═══ */
function SparklineBlock({ prof }: { prof: any }) {
  const color = ROLE_COLORS[prof.role] || '#6366f1';
  const { monthlyHistory, sparklineTrend, monthsWithData, meta } = prof;

  if (monthsWithData < 2) {
    const firstMonth = monthlyHistory.find((m: any) => m.avgPerDay > 0);
    return (
      <div className="py-2">
        <p className="text-[11px] text-muted-foreground italic text-center">
          Histórico insuficiente{firstMonth ? ` — disponível a partir de ${firstMonth.label}` : ''}
        </p>
      </div>
    );
  }

  const maxVal = Math.max(...monthlyHistory.map((m: any) => m.avgPerDay), meta || 1);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-[48px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyHistory} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="label" hide />
            <YAxis hide domain={[0, maxVal * 1.2]} />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-md px-2 py-1 text-[11px] font-mono shadow-lg">
                    {d.label}: {d.avgPerDay}/dia
                  </div>
                );
              }}
            />
            <Line
              type="monotone" dataKey="avgPerDay" stroke={color} strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, index } = props;
                const isLast = index === monthlyHistory.length - 1;
                return (
                  <circle
                    key={index} cx={cx} cy={cy}
                    r={isLast ? 4 : 2.5}
                    fill={color}
                    stroke={isLast ? 'hsl(var(--card))' : 'none'}
                    strokeWidth={isLast ? 2 : 0}
                  />
                );
              }}
              activeDot={{ r: 4, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-between px-1">
          <span className="text-[9px] font-mono text-muted-foreground">{monthlyHistory[0]?.label}</span>
          <span className="text-[9px] font-mono text-muted-foreground">{monthlyHistory[monthlyHistory.length - 1]?.label}</span>
        </div>
      </div>
      <div className="text-center shrink-0 w-14">
        {Math.abs(sparklineTrend) < 5 ? (
          <span className="text-[12px] font-mono text-muted-foreground">—</span>
        ) : sparklineTrend > 0 ? (
          <div className="flex flex-col items-center">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[12px] font-bold font-mono text-emerald-500">{sparklineTrend}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[12px] font-bold font-mono text-destructive">{Math.abs(sparklineTrend)}%</span>
          </div>
        )}
        <p className="text-[9px] uppercase text-muted-foreground">tendência</p>
      </div>
    </div>
  );
}

/* ═══ PROJECTION BLOCK ═══ */
function ProjectionBlock({ prof }: { prof: any }) {
  const color = ROLE_COLORS[prof.role] || '#6366f1';
  const {
    deliveriesThisMonth, projectedTotal, monthlyGoal,
    elapsedBizDays, isCurrentMonth,
  } = prof;

  if (!isCurrentMonth) {
    return (
      <div className="bg-muted/40 rounded-xl p-4">
        <p className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
          <TrendingUp className="h-3.5 w-3.5" /> Resultado do Mês
        </p>
        <p className="text-[13px] text-muted-foreground">
          <span className="font-mono font-bold text-foreground">{prof.completedInPeriod}</span> entregas no período
        </p>
      </div>
    );
  }

  if (elapsedBizDays <= 1 && deliveriesThisMonth === 0) {
    return (
      <div className="bg-muted/40 rounded-xl p-4">
        <p className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> Projeção do Mês
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">Dados insuficientes para projeção</p>
      </div>
    );
  }

  const donePct = monthlyGoal > 0 ? Math.min((deliveriesThisMonth / monthlyGoal) * 100, 100) : 0;
  const projPct = monthlyGoal > 0 ? Math.min(((projectedTotal - deliveriesThisMonth) / monthlyGoal) * 100, 100 - donePct) : 0;

  return (
    <div className="bg-muted/40 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[12px] font-semibold text-muted-foreground">Projeção do Mês</p>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <div className="relative h-3 rounded-full bg-border/50 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-500"
              style={{ width: `${donePct}%`, backgroundColor: color }}
            />
            <div
              className="absolute inset-y-0 rounded-r-full transition-all duration-500"
              style={{
                left: `${donePct}%`,
                width: `${Math.max(projPct, 0)}%`,
                background: `repeating-linear-gradient(45deg, ${color}66, ${color}66 3px, ${color}26 3px, ${color}26 6px)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground font-mono">{deliveriesThisMonth} feitos</span>
            <span className="text-[9px] text-muted-foreground font-mono">Projeção: {projectedTotal}</span>
          </div>
        </div>
        <div className="space-y-0.5 shrink-0">
          <p className="text-[13px] text-muted-foreground">
            Projeção: <span className="font-mono font-bold text-foreground">{projectedTotal}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══ CLIENT DISTRIBUTION BLOCK ═══ */
function ClientDistributionBlock({ prof }: { prof: any }) {
  const { clientDistribution, totalClientDeliveries, topClientPct } = prof;
  const [expanded, setExpanded] = useState(false);

  if (clientDistribution.length === 0) {
    return (
      <div className="bg-muted/40 rounded-xl p-4">
        <p className="text-[12px] font-semibold text-muted-foreground mb-2">Distribuição por Cliente</p>
        <p className="text-[12px] text-muted-foreground text-center py-2">Nenhuma entrega registrada no período</p>
      </div>
    );
  }

  const visibleClients = expanded ? clientDistribution : clientDistribution.slice(0, 5);
  const hasMore = clientDistribution.length > 5;

  return (
    <div className="bg-muted/40 rounded-xl p-4">
      <p className="text-[12px] font-semibold text-muted-foreground mb-3">Distribuição por Cliente</p>

      <div className="h-3 rounded-full overflow-hidden flex mb-3">
        {clientDistribution.map((c: any, i: number) => {
          const pct = totalClientDeliveries > 0 ? (c.delivered / totalClientDeliveries) * 100 : 0;
          if (pct < 1) return null;
          return (
            <TooltipProvider key={c.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: CLIENT_COLORS[i % CLIENT_COLORS.length],
                      marginRight: i < clientDistribution.length - 1 ? 1 : 0,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent className="text-[11px]">
                  {c.name}: {c.delivered} entregas ({Math.round(pct)}%)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      <div className="space-y-2">
        {visibleClients.map((c: any, i: number) => {
          const pct = totalClientDeliveries > 0 ? Math.round((c.delivered / totalClientDeliveries) * 100) : 0;
          return (
            <div key={c.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CLIENT_COLORS[i % CLIENT_COLORS.length] }} />
              <span className="text-[13px] font-medium text-foreground truncate flex-1">{c.name}</span>
              <span className="text-[12px] font-mono text-muted-foreground shrink-0">{c.delivered}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">({pct}%)</span>
              {c.pending > 0 && (
                <span className="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  +{c.pending} pendentes
                </span>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-[12px] text-muted-foreground hover:text-primary transition-colors"
        >
          {expanded ? 'Recolher' : `Ver todos (${clientDistribution.length} clientes)`}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}

      <div className="mt-2">
        {topClientPct > 50 ? (
          <p className="text-[11px] text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Produção concentrada em {clientDistribution[0]?.name}</p>
        ) : totalClientDeliveries > 0 ? (
          <p className="text-[11px] text-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Produção bem distribuída</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProdutividadeTimeTab({ data }: ProdutividadeTimeTabProps) {
  const { currentMonthProductivity: productivityByProfessional, metasMap, refetch } = data;
  const [roleFilter, setRoleFilter] = useState('all');
  const [goalsOpen, setGoalsOpen] = useState(false);

  const today = startOfDay(new Date());
  const daysInMonth = getDaysInMonth(today);
  const todayDate = getDate(today);

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return productivityByProfessional;
    return productivityByProfessional.filter((p: any) => p.role === roleFilter);
  }, [productivityByProfessional, roleFilter]);

  const heatStyle = (count: number, role: string) => {
    const color = ROLE_COLORS[role] || '#6366f1';
    if (count === 0) return {};
    if (count >= 5) return { backgroundColor: color, color: 'white', boxShadow: `0 0 8px ${color}30` };
    if (count >= 3) return { backgroundColor: `${color}80`, color: 'white' };
    return { backgroundColor: `${color}33`, color };
  };

  const roleButtons = [
    { key: 'all', label: 'Todos', color: 'hsl(var(--primary))' },
    { key: 'designer', label: 'Designers', color: '#6366f1' },
    { key: 'videomaker', label: 'Videomakers', color: '#8b5cf6' },
    { key: 'social', label: 'Social Media', color: '#10b981' },
  ];

  const teamAvgProdTime = useMemo(() => {
    const times = productivityByProfessional.map((p: any) => p.avgProdTime).filter((t: number) => t > 0);
    return times.length > 0 ? Math.round((times.reduce((a: number, b: number) => a + b, 0) / times.length) * 10) / 10 : 0;
  }, [productivityByProfessional]);

  return (
    <div className="space-y-6">
      {/* Role filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {roleButtons.map(rb => (
          <button
            key={rb.key}
            onClick={() => setRoleFilter(rb.key)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-150',
              roleFilter === rb.key
                ? 'font-semibold'
                : 'text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/40 bg-transparent'
            )}
            style={roleFilter === rb.key ? {
              backgroundColor: `${rb.color}1f`,
              borderColor: `${rb.color}4d`,
              color: rb.color,
            } : {}}
          >
            {rb.label}
          </button>
        ))}
      </div>

      {/* Performance cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-base font-semibold text-foreground">Sem dados de produtividade</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[360px] mx-auto">Ajuste os filtros ou aguarde entregas no período selecionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((prof: any) => {
            const borderColor = ROLE_COLORS[prof.role] || '#6366f1';
            const punctualityColor = prof.punctuality >= 90 ? 'text-emerald-500' : prof.punctuality >= 70 ? 'text-warning' : 'text-destructive';
            const prodTimeColor = prof.avgProdTime <= 3 ? 'text-emerald-500' : prof.avgProdTime <= 5 ? 'text-warning' : 'text-destructive';

            return (
              <Card
                key={`${prof.id}-${prof.role}`}
                className="transition-all duration-150 hover:border-border/80 overflow-hidden"
              >
                <CardContent className="p-5 space-y-5">
                  {/* BLOCK 1: Identity + Hero */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={prof.name} role={prof.role} />
                      <div>
                        <p className="text-base font-semibold text-foreground">{prof.name}</p>
                        <RoleChip role={prof.role} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-[42px] font-extrabold font-mono leading-none text-foreground">{prof.avgPerDay}</span>
                        <span className="text-sm text-muted-foreground">/dia</span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkline */}
                  <SparklineBlock prof={prof} />

                  {/* BLOCK 2: Volume metrics */}
                  <div className="flex items-center divide-x divide-border">
                    <div className="flex-1 text-center pr-2">
                      <p className="text-lg font-bold font-mono text-emerald-500">{prof.completedInPeriod}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Entregas</p>
                    </div>
                    <div className="flex-1 text-center px-2">
                      <p className="text-lg font-bold font-mono text-primary">{prof.wip}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Em Andamento</p>
                    </div>
                    <div className="flex-1 text-center px-2">
                      <p className={cn("text-lg font-bold font-mono", prof.overdue > 0 ? "text-destructive animate-pulse" : "text-muted-foreground")}>{prof.overdue}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Atrasados</p>
                    </div>
                    <div className="flex-1 text-center pl-2">
                      <p className={cn("text-lg font-bold font-mono", prof.completedToday > 0 ? "text-primary" : "text-muted-foreground")}>{prof.completedToday}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Hoje</p>
                    </div>
                  </div>

                  {/* BLOCK 3: Quality & Efficiency */}
                  <div className="bg-muted/40 rounded-xl p-4">
                    <div className="flex items-center divide-x divide-border">
                      <div className="flex-1 text-center pr-3">
                        <p className="text-lg font-bold font-mono text-foreground">{prof.netDeliveries}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Líquidas</p>
                        <p className="text-[10px] text-muted-foreground/70">{prof.completedInPeriod} - {prof.postsWithChanges}</p>
                      </div>
                      <div className="flex-1 text-center px-3">
                        <p className={cn("text-lg font-bold font-mono", prodTimeColor)}>{prof.avgProdTime}d</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Tempo Médio</p>
                        <p className="text-[10px] text-muted-foreground/70">equipe: {teamAvgProdTime}d</p>
                      </div>
                      <div className="flex-1 text-center pl-3">
                        <p className={cn("text-lg font-bold font-mono", punctualityColor)}>{prof.punctuality}%</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Pontualidade</p>
                        <p className="text-[10px] text-muted-foreground/70">no prazo</p>
                      </div>
                    </div>
                  </div>

                  {/* Projection */}
                  <ProjectionBlock prof={prof} />

                  {/* BLOCK 5: Heatmap */}
                  <div>
                    <p className="text-[11px] font-mono text-muted-foreground mb-2">
                      Hoje: {prof.completedToday} | Melhor dia: {prof.bestDay.count > 0 ? `${prof.bestDay.count} (d.${prof.bestDay.day})` : '-'}
                    </p>
                    <div className="overflow-x-auto">
                      <div className="flex gap-0.5">
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const count = prof.dailyCounts[day] || 0;
                          const isCurrentDay = day === todayDate;
                          const isFuture = day > todayDate;
                          const style = isFuture ? { opacity: 0.4 } : heatStyle(count, prof.role);

                          return (
                            <div
                              key={day}
                              className={cn(
                                'w-[26px] h-[26px] rounded flex items-center justify-center text-[8px] font-mono font-medium transition-all shrink-0',
                                count === 0 && !isFuture && 'bg-muted',
                                isCurrentDay && count === 0 && 'ring-2 ring-primary',
                                isCurrentDay && 'font-bold',
                              )}
                              style={style}
                              title={`${prof.name} — dia ${day}: ${count} entregas`}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      {prof.trendPct > 0 ? (
                        <>
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[11px] text-emerald-500">{prof.trendPct}% vs semana anterior</span>
                        </>
                      ) : prof.trendPct < 0 ? (
                        <>
                          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-[11px] text-destructive">{Math.abs(prof.trendPct)}% vs semana anterior</span>
                        </>
                      ) : (
                        <>
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">Estável</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Client Distribution */}
                  <ClientDistributionBlock prof={prof} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ RANKING TABLE ═══ */}
      {filtered.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Ranking de Performance</CardTitle>
            </div>
            <CardDescription>Classificação por entregas líquidas no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="w-12 text-[11px] uppercase font-semibold">#</TableHead>
                    <TableHead className="text-[11px] uppercase font-semibold">Profissional</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Entregas</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Retrabalhos</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Líquidas</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Tempo Médio</TableHead>
                    <TableHead className="text-right text-[11px] uppercase font-semibold">Pontualidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].sort((a: any, b: any) => b.netDeliveries - a.netDeliveries).map((s: any, i: number) => {
                    const isFirst = i === 0;
                    const isLast = i === filtered.length - 1 && filtered.length > 1;
                    return (
                      <TableRow
                        key={`${s.id}-${s.role}`}
                        className={cn(
                          "h-14 transition-colors hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent",
                          isFirst && "bg-emerald-500/5",
                          isLast && "bg-destructive/5",
                        )}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {isFirst ? <Trophy className="h-4 w-4 text-amber-500" /> : i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar name={s.name} role={s.role} />
                            <div>
                              <p className="font-semibold text-foreground text-sm">{s.name}</p>
                              <RoleChip role={s.role} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-500">{s.completedInPeriod}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-destructive">{s.postsWithChanges}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">{s.netDeliveries}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{s.avgProdTime}d</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{s.punctuality}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
