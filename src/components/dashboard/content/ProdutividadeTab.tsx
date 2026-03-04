import { useMemo, useState } from 'react';
import { format, parseISO, isBefore, startOfDay, getDate, getDaysInMonth, startOfWeek, endOfWeek, isWithinInterval, addWeeks, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DC, tooltipStyle, ROLE_CHIP_COLORS, ROLE_LABELS, PRODUCTION_ROLES } from '@/lib/dashboardColors';

interface ProdutividadeTabProps {
  data: any;
}

interface ProfessionalStats {
  id: string;
  name: string;
  role: string;
  completed: number;
  wip: number;
  overdue: number;
  changeRate: number;
  postsWithChanges: number;
  completedToday: number;
  bestDay: { day: number; count: number };
  dailyCounts: Record<number, number>;
}

function RoleChip({ role }: { role: string }) {
  const bg = ROLE_CHIP_COLORS[role] || DC.dark;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: bg }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export function ProdutividadeTab({ data }: ProdutividadeTabProps) {
  const { posts: filteredPosts, changeRequests, teamMembers, filters } = data;
  const [view, setView] = useState<'role' | 'overview'>('role');

  const today = startOfDay(new Date());
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = getDaysInMonth(today);

  // Build professional stats grouped by role
  const { byRole, allStats } = useMemo(() => {
    const statsMap: Record<string, ProfessionalStats> = {};
    const changePostIds = new Set(changeRequests.map((cr: any) => cr.post_id));

    // Initialize from filtered posts
    filteredPosts.forEach((p: any) => {
      if (!p.assignee_id || !p.responsible_role_key) return;
      if (!PRODUCTION_ROLES.includes(p.responsible_role_key as any)) return;

      const key = `${p.assignee_id}-${p.responsible_role_key}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          id: p.assignee_id,
          name: p.assignee?.name || 'Desconhecido',
          role: p.responsible_role_key,
          completed: 0,
          wip: 0,
          overdue: 0,
          changeRate: 0,
          postsWithChanges: 0,
          completedToday: 0,
          bestDay: { day: 0, count: 0 },
          dailyCounts: {},
        };
      }
      const s = statsMap[key];

      if (p.status === 'done' && p.completed_at) {
        const cd = parseISO(p.completed_at);
        if (!isBefore(cd, filters.dateRange.from) && !isBefore(filters.dateRange.to, cd)) {
          s.completed++;
          if (changePostIds.has(p.id)) s.postsWithChanges++;
          if (format(cd, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) s.completedToday++;

          // Daily counts for heatmap (current month)
          if (cd.getMonth() === currentMonth && cd.getFullYear() === currentYear) {
            const day = getDate(cd);
            s.dailyCounts[day] = (s.dailyCounts[day] || 0) + 1;
          }
        }
      } else {
        s.wip++;
        const d = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
        if (d && isBefore(d, today)) s.overdue++;
      }
    });

    // Compute derived fields
    Object.values(statsMap).forEach(s => {
      s.changeRate = s.completed > 0 ? Math.round((s.postsWithChanges / s.completed) * 100) : 0;
      // Best day
      let best = { day: 0, count: 0 };
      Object.entries(s.dailyCounts).forEach(([d, c]) => {
        if (c > best.count) best = { day: Number(d), count: c };
      });
      s.bestDay = best;
    });

    const allStats = Object.values(statsMap).filter(s => s.completed > 0 || s.wip > 0);

    const byRole: Record<string, ProfessionalStats[]> = {};
    PRODUCTION_ROLES.forEach(r => {
      byRole[r] = allStats.filter(s => s.role === r).sort((a, b) => b.completed - a.completed);
    });

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
          if (p.status !== 'done' || !p.completed_at) return;
          const cd = parseISO(p.completed_at);
          if (isWithinInterval(cd, { start: w.start, end: w.end })) count++;
        });
        row[`${s.name}_${s.role}`] = count;
      });
      return row;
    });
  }, [allStats, filteredPosts, today]);

  // Averages per role for alerts
  const roleAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    PRODUCTION_ROLES.forEach(r => {
      const profs = byRole[r] || [];
      if (profs.length === 0) { avgs[r] = 0; return; }
      avgs[r] = Math.round(profs.reduce((s, p) => s + p.completed, 0) / profs.length);
    });
    return avgs;
  }, [byRole]);

  // Overloaded professionals
  const overloaded = useMemo(() => {
    return allStats.filter(s => {
      const avg = roleAverages[s.role] || 0;
      return s.wip > avg && s.overdue > 5;
    });
  }, [allStats, roleAverages]);

  // Low production
  const lowProd = useMemo(() => {
    return allStats.filter(s => {
      const avg = roleAverages[s.role] || 0;
      return avg > 0 && s.completed < avg * 0.5;
    });
  }, [allStats, roleAverages]);

  const cardShadow = '0 1px 3px rgba(0,0,0,0.08)';
  const todayDate = getDate(today);

  const roleEmoji: Record<string, string> = { designer: '🎨', social: '📱', videomaker: '🎬' };

  const heatColor = (count: number) => {
    if (count === 0) return DC.border;
    if (count <= 2) return DC.teal20;
    if (count <= 5) return DC.teal60;
    return DC.teal;
  };

  const changeRateColor = (rate: number) => rate <= 10 ? DC.teal : rate <= 20 ? DC.orange : DC.red;

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === 'role' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('role')}
          style={view === 'role' ? { backgroundColor: DC.orange, color: 'white' } : {}}
        >
          👤 Por Cargo
        </Button>
        <Button
          variant={view === 'overview' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('overview')}
          style={view === 'overview' ? { backgroundColor: DC.orange, color: 'white' } : {}}
        >
          📋 Visão Geral
        </Button>
      </div>

      {view === 'role' ? (
        <>
          {/* ═══ VISÃO POR CARGO ═══ */}
          {PRODUCTION_ROLES.map(role => {
            const profs = byRole[role] || [];
            if (profs.length === 0) return null;
            const topCompleted = Math.max(...profs.map(p => p.completed));
            const topChangeRate = Math.max(...profs.map(p => p.changeRate));
            const totalCompleted = profs.reduce((s, p) => s + p.completed, 0);
            const avgChange = profs.length > 0 ? Math.round(profs.reduce((s, p) => s + p.changeRate, 0) / profs.length) : 0;

            return (
              <div key={role} className="space-y-4">
                {/* Role header */}
                <div className="flex items-center gap-3 border-b pb-2" style={{ borderColor: DC.border }}>
                  <span className="text-xl">{roleEmoji[role]}</span>
                  <h3 className="text-lg font-semibold" style={{ color: DC.textPrimary }}>{ROLE_LABELS[role]}</h3>
                  <span className="text-sm" style={{ color: DC.textSecondary }}>
                    Total: {totalCompleted} concluídos · Taxa média: {avgChange}%
                  </span>
                </div>

                {/* Professional cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profs.map(p => {
                    const isTop = p.completed === topCompleted && p.completed > 0;
                    const isHighChange = p.changeRate === topChangeRate && p.changeRate > 20;
                    return (
                      <Card
                        key={`${p.id}-${p.role}`}
                        style={{
                          boxShadow: cardShadow,
                          borderRadius: 8,
                          borderTop: isTop ? `3px solid ${DC.orange}` : undefined,
                        }}
                      >
                        <CardContent className="pt-4 pb-3 space-y-3">
                          {/* Name + badges */}
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: ROLE_CHIP_COLORS[role] }}
                            >
                              {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <span className="font-semibold text-sm" style={{ color: DC.textPrimary }}>{p.name}</span>
                            {isTop && <Badge className="text-[9px] px-1 text-white" style={{ backgroundColor: DC.orange }}>🏆 Top</Badge>}
                            {isHighChange && <Badge className="text-[9px] px-1 text-white" style={{ backgroundColor: DC.red }}>⚠️ Alto retrabalho</Badge>}
                          </div>

                          {/* Metrics row */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold" style={{ color: DC.teal }}>{p.completed}</p>
                              <p className="text-[10px]" style={{ color: DC.textSecondary }}>Concluídos</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold" style={{ color: DC.orange }}>{p.wip}</p>
                              <p className="text-[10px]" style={{ color: DC.textSecondary }}>WIP</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold" style={{ color: p.overdue > 0 ? DC.red : DC.textSecondary }}>{p.overdue}</p>
                              <p className="text-[10px]" style={{ color: DC.textSecondary }}>Atrasados</p>
                            </div>
                          </div>

                          {/* Change rate bar */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px]" style={{ color: DC.textSecondary }}>Taxa de Alteração</span>
                              <span className="text-xs font-bold" style={{ color: changeRateColor(p.changeRate) }}>{p.changeRate}%</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ backgroundColor: DC.border }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(p.changeRate, 100)}%`, backgroundColor: changeRateColor(p.changeRate) }} />
                            </div>
                          </div>

                          {/* Today + best day */}
                          <p className="text-[10px]" style={{ color: DC.textSecondary }}>
                            Hoje: {p.completedToday} | Melhor dia: {p.bestDay.count > 0 ? `${p.bestDay.count} (d.${p.bestDay.day})` : '-'}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Heatmap */}
                <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Produção diária — {format(today, 'MMMM yyyy', { locale: ptBR })}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${daysInMonth}, 1fr)` }}>
                        {/* Header row */}
                        <div className="text-[9px] font-medium" style={{ color: DC.textSecondary }}></div>
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <div
                            key={i}
                            className="text-center text-[9px] font-medium"
                            style={{
                              color: i + 1 === todayDate ? DC.orange : DC.textSecondary,
                              fontWeight: i + 1 === todayDate ? 700 : 400,
                            }}
                          >
                            {i + 1}
                          </div>
                        ))}

                        {/* Professional rows */}
                        {profs.map(p => (
                          <div key={`${p.id}-${p.role}`} className="contents">
                            <div className="text-[10px] truncate pr-2" style={{ color: DC.textPrimary }}>{p.name}</div>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const day = i + 1;
                              const count = p.dailyCounts[day] || 0;
                              const isToday = day === todayDate;
                              return (
                                <div
                                  key={day}
                                  className="w-full aspect-square rounded-sm flex items-center justify-center text-[8px] font-medium"
                                  style={{
                                    backgroundColor: heatColor(count),
                                    border: isToday ? `2px solid ${DC.orange}` : 'none',
                                    color: count > 2 ? 'white' : DC.textSecondary,
                                  }}
                                  title={`${p.name} — dia ${day}: ${count} concluídos`}
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
            <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
              <CardHeader><CardTitle className="text-base">Concluídos por Semana</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DC.border} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: DC.textSecondary }} />
                      <YAxis tick={{ fontSize: 10, fill: DC.textSecondary }} />
                      <ReTooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {allStats.slice(0, 8).map((s, i) => {
                        const colors = [DC.orange, DC.teal, DC.dark, DC.orange60, DC.teal60, DC.orange40, DC.teal40, '#94a3b8'];
                        return (
                          <Bar
                            key={`${s.id}-${s.role}`}
                            dataKey={`${s.name}_${s.role}`}
                            name={s.name}
                            fill={colors[i % colors.length]}
                            radius={[2, 2, 0, 0]}
                          />
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
        /* ═══ VISÃO GERAL ═══ */
        <Card style={{ boxShadow: cardShadow, borderRadius: 8 }}>
          <CardHeader><CardTitle className="text-base">Ranking Unificado</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-auto rounded-lg border" style={{ borderColor: DC.border }}>
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Concluídos</TableHead>
                    <TableHead className="text-right">WIP</TableHead>
                    <TableHead className="text-right">Atrasados</TableHead>
                    <TableHead className="text-right">Alterações</TableHead>
                    <TableHead className="text-right">Taxa Alt.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStats.map((s, i) => {
                    const maxCompleted = allStats[0]?.completed || 1;
                    return (
                      <TableRow key={`${s.id}-${s.role}`}>
                        <TableCell className="text-sm font-medium" style={{ color: DC.textSecondary }}>{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell><RoleChip role={s.role} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-20 h-2 rounded-full" style={{ backgroundColor: DC.border }}>
                              <div className="h-full rounded-full" style={{ width: `${(s.completed / maxCompleted) * 100}%`, backgroundColor: DC.orange }} />
                            </div>
                            <span className="text-sm font-semibold w-6 text-right">{s.completed}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{s.wip}</TableCell>
                        <TableCell className="text-right">
                          {s.overdue > 0
                            ? <span className="font-bold" style={{ color: DC.red }}>{s.overdue}</span>
                            : <span style={{ color: DC.textSecondary }}>0</span>}
                        </TableCell>
                        <TableCell className="text-right">{s.postsWithChanges}</TableCell>
                        <TableCell className="text-right">
                          <Badge className="text-[10px] text-white" style={{ backgroundColor: changeRateColor(s.changeRate) }}>
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

      {/* ═══ ALERTAS AUTOMÁTICOS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sobrecarregados */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8, backgroundColor: overloaded.length > 0 ? DC.redBg : undefined, borderColor: overloaded.length > 0 ? DC.red : DC.border, borderWidth: overloaded.length > 0 ? 1 : undefined }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: DC.red }}>🔴 Sobrecarregados</CardTitle>
          </CardHeader>
          <CardContent>
            {overloaded.length === 0 ? (
              <p className="text-sm" style={{ color: DC.textSecondary }}>Nenhum profissional sobrecarregado</p>
            ) : (
              <div className="space-y-2">
                {overloaded.map(s => (
                  <div key={`${s.id}-${s.role}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{s.name}</span>
                      <RoleChip role={s.role} />
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span>WIP: {s.wip}</span>
                      <span style={{ color: DC.red }}>Atrasados: {s.overdue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Baixa Produção */}
        <Card style={{ boxShadow: cardShadow, borderRadius: 8, backgroundColor: lowProd.length > 0 ? DC.orangeBg : undefined, borderColor: lowProd.length > 0 ? DC.orange : DC.border, borderWidth: lowProd.length > 0 ? 1 : undefined }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ color: DC.orange }}>🟠 Baixa Produção</CardTitle>
          </CardHeader>
          <CardContent>
            {lowProd.length === 0 ? (
              <p className="text-sm" style={{ color: DC.textSecondary }}>Todos dentro da média</p>
            ) : (
              <div className="space-y-2">
                {lowProd.map(s => (
                  <div key={`${s.id}-${s.role}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{s.name}</span>
                      <RoleChip role={s.role} />
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span>Concluídos: {s.completed}</span>
                      <span style={{ color: DC.textSecondary }}>Média: {roleAverages[s.role]}</span>
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
