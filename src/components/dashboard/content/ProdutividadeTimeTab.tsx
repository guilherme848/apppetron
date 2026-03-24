import { useMemo, useState } from 'react';
import { format, startOfDay, getDate, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Settings, TrendingUp, TrendingDown, Minus, CheckCircle, Trophy,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/dashboardColors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProdutividadeTimeTabProps {
  data: any;
}

const ROLE_COLORS: Record<string, string> = {
  designer: '#6366f1',
  videomaker: '#8b5cf6',
  social: '#10b981',
};

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
                type="number" min={0} max={20}
                value={values[f.key]}
                onChange={e => setValues(v => ({ ...v, [f.key]: parseInt(e.target.value) || 0 }))}
                className="h-[42px] font-mono" placeholder="Ex: 3"
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

export function ProdutividadeTimeTab({ data }: ProdutividadeTimeTabProps) {
  const { productivityByProfessional, metasMap, refetch } = data;
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
    const meta = metasMap[role] || 3;
    const color = ROLE_COLORS[role] || '#6366f1';
    if (count === 0) return {};
    const pct = count / meta;
    if (pct >= 1) return { backgroundColor: color, color: 'white', boxShadow: `0 0 8px ${color}30` };
    if (pct >= 0.5) return { backgroundColor: `${color}80`, color: 'white' };
    return { backgroundColor: `${color}33`, color };
  };

  const roleButtons = [
    { key: 'all', label: 'Todos', color: '#F97316' },
    { key: 'designer', label: 'Designers', color: '#6366f1' },
    { key: 'videomaker', label: 'Videomakers', color: '#8b5cf6' },
    { key: 'social', label: 'Social Media', color: '#10b981' },
  ];

  // Avg production time across team for comparison
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
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium border transition-all duration-150 ${
              roleFilter === rb.key
                ? 'font-semibold'
                : 'text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/40 bg-transparent'
            }`}
            style={roleFilter === rb.key ? {
              backgroundColor: `${rb.color}1f`,
              borderColor: `${rb.color}4d`,
              color: rb.color,
            } : {}}
          >
            {rb.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setGoalsOpen(true)}
          title="Configurar metas diárias"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <GoalsModal open={goalsOpen} onOpenChange={setGoalsOpen} metas={metasMap} onSave={refetch} />

      {/* Performance cards */}
      {filtered.length === 0 ? (
        <Card className="border border-border rounded-2xl">
          <CardContent className="py-16 text-center">
            <p className="text-base font-semibold text-foreground">Sem dados de produtividade</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[360px] mx-auto">Ajuste os filtros ou aguarde entregas no período selecionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((prof: any) => {
            const metaPct = prof.meta > 0 ? (prof.avgPerDay / prof.meta) * 100 : 0;
            const isAboveMeta = metaPct >= 100;
            const isBelowThreshold = metaPct < 70 && prof.meta > 0;
            const progressColor = metaPct >= 100 ? 'bg-emerald-500' : metaPct >= 70 ? 'bg-amber-500' : 'bg-red-500';
            const borderColor = ROLE_COLORS[prof.role] || '#6366f1';

            const occupancyBarColor = prof.occupancyPct <= 50 ? '#10b981' : prof.occupancyPct <= 80 ? '#6366f1' : prof.occupancyPct <= 90 ? '#f59e0b' : '#ef4444';
            const punctualityColor = prof.punctuality >= 90 ? 'text-emerald-500' : prof.punctuality >= 70 ? 'text-amber-500' : 'text-red-500';
            const prodTimeColor = prof.avgProdTime <= 3 ? 'text-emerald-500' : prof.avgProdTime <= 5 ? 'text-amber-500' : 'text-red-500';

            return (
              <Card
                key={`${prof.id}-${prof.role}`}
                className="border border-border rounded-2xl transition-all duration-150 hover:border-primary/40 relative overflow-hidden border-l-[3px]"
                style={{
                  borderLeftColor: borderColor,
                  boxShadow: isBelowThreshold ? '0 0 24px rgba(239,68,68,0.07)' : isAboveMeta ? '0 0 24px rgba(16,185,129,0.07)' : undefined,
                }}
              >
                {isBelowThreshold && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}

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

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-border/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{
                          width: `${Math.min(metaPct, 100)}%`,
                          boxShadow: isAboveMeta ? '0 0 12px rgba(16,185,129,0.3)' : undefined,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">Meta: {prof.meta}/dia</p>
                  </div>

                  {/* BLOCK 2: Volume metrics */}
                  <div className="flex items-center divide-x divide-border">
                    <div className="flex-1 text-center pr-2">
                      <p className="text-lg font-bold font-mono text-emerald-500">{prof.completedInPeriod}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Entregas</p>
                    </div>
                    <div className="flex-1 text-center px-2">
                      <p className="text-lg font-bold font-mono text-blue-500">{prof.wip}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Em Andamento</p>
                    </div>
                    <div className="flex-1 text-center px-2">
                      <p className={`text-lg font-bold font-mono ${prof.overdue > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>{prof.overdue}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Atrasados</p>
                    </div>
                    <div className="flex-1 text-center pl-2">
                      <p className={`text-lg font-bold font-mono ${prof.completedToday > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{prof.completedToday}</p>
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
                        <p className={`text-lg font-bold font-mono ${prodTimeColor}`}>{prof.avgProdTime}d</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Tempo Médio</p>
                        <p className="text-[10px] text-muted-foreground/70">equipe: {teamAvgProdTime}d</p>
                      </div>
                      <div className="flex-1 text-center pl-3">
                        <p className={`text-lg font-bold font-mono ${punctualityColor}`}>{prof.punctuality}%</p>
                        <p className="text-[10px] uppercase text-muted-foreground">Pontualidade</p>
                        <p className="text-[10px] text-muted-foreground/70">no prazo</p>
                      </div>
                    </div>
                  </div>

                  {/* BLOCK 4: Capacity */}
                  <div className="bg-muted/40 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold font-mono text-muted-foreground mb-1.5">Ocupação: {prof.occupancyPct}%</p>
                        <div className="h-3 rounded-full bg-border/50 overflow-hidden w-full">
                          <div
                            className={`h-full rounded-full transition-all ${prof.occupancyPct > 90 ? 'animate-pulse' : ''}`}
                            style={{ width: `${Math.min(prof.occupancyPct, 100)}%`, backgroundColor: occupancyBarColor }}
                          />
                        </div>
                      </div>
                      <div className="text-right text-[12px] space-y-0.5 shrink-0">
                        <p className="text-muted-foreground">Capacidade: <span className="font-mono">{prof.capacityMonthly}</span>/mês</p>
                        <p className="text-muted-foreground">Comprometido: <span className="font-mono">{prof.committed}</span></p>
                        <p className="text-foreground font-bold">Disponível: <span className="font-mono">{prof.availableCapacity}</span></p>
                      </div>
                    </div>
                    {prof.occupancyPct > 90 && (
                      <Badge className="mt-2 bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Capacidade Esgotada</Badge>
                    )}
                    {prof.occupancyPct < 40 && (
                      <Badge className="mt-2 bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Capacidade Ociosa</Badge>
                    )}
                  </div>

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
                              className={`w-[26px] h-[26px] rounded flex items-center justify-center text-[8px] font-mono font-medium transition-all shrink-0 ${
                                count === 0 && !isFuture ? 'bg-muted' : ''
                              } ${isCurrentDay && count === 0 ? 'ring-2 ring-primary' : ''} ${isCurrentDay ? 'font-bold' : ''}`}
                              style={style}
                              title={`${prof.name} — dia ${day}: ${count} entregas (meta: ${prof.meta})`}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Trend */}
                    <div className="flex items-center gap-1.5 mt-2">
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ RANKING TABLE ═══ */}
      {filtered.length > 0 && (
        <Card className="border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ranking de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-auto rounded-lg border border-border">
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
                    <TableHead className="text-right text-[11px] uppercase font-semibold">% Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].sort((a: any, b: any) => b.netDeliveries - a.netDeliveries).map((s: any, i: number) => {
                    const metaPct = s.meta > 0 ? Math.round((s.avgPerDay / s.meta) * 100) : 0;
                    const isFirst = i === 0;
                    const isLast = i === filtered.length - 1 && filtered.length > 1;
                    return (
                      <TableRow
                        key={`${s.id}-${s.role}`}
                        className={`h-14 transition-colors ${
                          isFirst ? 'bg-emerald-500/5' : isLast ? 'bg-destructive/5' : ''
                        } hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent`}
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
                        <TableCell className="text-right font-mono font-semibold text-red-500">{s.postsWithChanges}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">{s.netDeliveries}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{s.avgProdTime}d</TableCell>
                        <TableCell className="text-right font-mono text-sm">{s.punctuality}%</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] ${
                              metaPct >= 100 ? 'border-emerald-500/30 text-emerald-500' :
                              metaPct >= 70 ? 'border-amber-500/30 text-amber-500' :
                              'border-red-500/30 text-red-500'
                            }`}
                          >
                            {metaPct}%
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
    </div>
  );
}
