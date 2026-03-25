import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useCrmGoals } from '@/hooks/useCrmGoals';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { DC } from '@/lib/dashboardColors';
import { Trophy, Medal, Target, TrendingUp, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function PodiumCard({ rank, name, valueDone, valuePct, avatarUrl }: { rank: number; name: string; valueDone: number; valuePct: number; avatarUrl?: string | null }) {
  const configs: Record<number, { bg: string; border: string; icon: string; size: string }> = {
    1: { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', border: '#F59E0B', icon: '1º', size: 'h-32' },
    2: { bg: 'linear-gradient(135deg, #9CA3AF, #6B7280)', border: '#9CA3AF', icon: '2º', size: 'h-28' },
    3: { bg: 'linear-gradient(135deg, #B45309, #92400E)', border: '#B45309', icon: '3º', size: 'h-24' },
  };
  const c = configs[rank] || configs[3];

  return (
    <Card className={`${c.size} flex flex-col items-center justify-center text-center relative overflow-hidden`}
      style={{ borderColor: c.border, borderWidth: 2 }}>
      <div className="absolute inset-0 opacity-10" style={{ background: c.bg }} />
      <span className="text-3xl mb-1">{c.emoji}</span>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm mb-1">
        {name?.charAt(0) || '?'}
      </div>
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <p className="text-xs text-primary">
        {valueDone.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      <p className="text-xs text-muted-foreground">{Math.round(valuePct)}% da meta</p>
    </Card>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = pct >= 100 ? DC.teal : pct >= 70 ? DC.orange : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color || barColor }} />
      </div>
      <span className="text-xs font-medium text-foreground w-10 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

export default function SalesGoalsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { goals, achievements, loading, upsertGoal, getRanking } = useCrmGoals(selectedMonth);
  const { members } = useTeamMembers();
  const { user } = useAuth();
  const [editedGoals, setEditedGoals] = useState<Record<string, Partial<any>>>({});
  const [saving, setSaving] = useState(false);

  const ranking = getRanking();

  // Get member name
  const getMemberName = (userId: string) => members.find(m => m.id === userId)?.name || '—';

  // Month nav
  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR });

  const handleSaveGoals = async () => {
    setSaving(true);
    for (const [userId, data] of Object.entries(editedGoals)) {
      await upsertGoal(userId, data);
    }
    setEditedGoals({});
    toast.success('Metas salvas!');
    setSaving(false);
  };

  // My performance
  const currentMember = members.find(m => m.auth_user_id === user?.id);
  const myRank = currentMember ? ranking.find(r => r.user_id === currentMember.id) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Metas e Ranking</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedMonth(m => subMonths(m, 1))}>←</Button>
          <span className="text-sm font-medium capitalize text-foreground min-w-[140px] text-center">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={() => setSelectedMonth(m => addMonths(m, 1))}>→</Button>
        </div>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
          <TabsTrigger value="my">📊 Minha Performance</TabsTrigger>
          <TabsTrigger value="config">⚙️ Configurar Metas</TabsTrigger>
        </TabsList>

        {/* Ranking */}
        <TabsContent value="ranking" className="space-y-6 mt-4">
          {/* Podium */}
          {ranking.length >= 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {ranking.length >= 2 && (
                <PodiumCard rank={2} name={getMemberName(ranking[1].user_id)} valueDone={Number(ranking[1].achievement?.value_done || 0)} valuePct={ranking[1].valuePct} />
              )}
              <PodiumCard rank={1} name={getMemberName(ranking[0].user_id)} valueDone={Number(ranking[0].achievement?.value_done || 0)} valuePct={ranking[0].valuePct} />
              {ranking.length >= 3 && (
                <PodiumCard rank={3} name={getMemberName(ranking[2].user_id)} valueDone={Number(ranking[2].achievement?.value_done || 0)} valuePct={ranking[2].valuePct} />
              )}
            </div>
          )}

          {/* Full table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Deals Fechados</TableHead>
                    <TableHead>% Meta Deals</TableHead>
                    <TableHead>Valor Fechado</TableHead>
                    <TableHead>% Meta Valor</TableHead>
                    <TableHead>Atividades</TableHead>
                    <TableHead>Ligações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r, idx) => {
                    const ach = r.achievement;
                    return (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-bold">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{getMemberName(r.user_id)}</TableCell>
                        <TableCell>{ach?.deals_done || 0} / {r.goal.deals_target}</TableCell>
                        <TableCell>
                          <ProgressBar value={ach?.deals_done || 0} max={r.goal.deals_target} color="" />
                        </TableCell>
                        <TableCell style={{ color: DC.orange }}>
                          {Number(ach?.value_done || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <ProgressBar value={Number(ach?.value_done || 0)} max={Number(r.goal.value_target)} color="" />
                        </TableCell>
                        <TableCell>{ach?.activities_done || 0}</TableCell>
                        <TableCell>{ach?.calls_done || 0}</TableCell>
                      </TableRow>
                    );
                  })}
                  {ranking.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhuma meta configurada para este mês
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Performance */}
        <TabsContent value="my" className="space-y-6 mt-4">
          {myRank ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Deals Fechados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold text-foreground">
                    {myRank.achievement?.deals_done || 0}
                    <span className="text-lg text-muted-foreground"> / {myRank.goal.deals_target}</span>
                  </div>
                  <ProgressBar value={myRank.achievement?.deals_done || 0} max={myRank.goal.deals_target} color="" />
                  {myRank.goal.deals_target > (myRank.achievement?.deals_done || 0) && (
                    <p className="text-sm text-muted-foreground">
                      Faltam <span className="font-bold" style={{ color: DC.orange }}>
                        {myRank.goal.deals_target - (myRank.achievement?.deals_done || 0)}
                      </span> deals para bater a meta
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Valor Fechado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold" style={{ color: DC.orange }}>
                    {Number(myRank.achievement?.value_done || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Meta: {Number(myRank.goal.value_target).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <ProgressBar value={Number(myRank.achievement?.value_done || 0)} max={Number(myRank.goal.value_target)} color="" />
                  {Number(myRank.goal.value_target) > Number(myRank.achievement?.value_done || 0) && (
                    <p className="text-sm text-muted-foreground">
                      Faltam <span className="font-bold" style={{ color: DC.orange }}>
                        {(Number(myRank.goal.value_target) - Number(myRank.achievement?.value_done || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span> para bater a meta
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Atividades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold text-foreground">
                    {myRank.achievement?.activities_done || 0}
                    <span className="text-lg text-muted-foreground"> / {myRank.goal.activities_target}</span>
                  </div>
                  <ProgressBar value={myRank.achievement?.activities_done || 0} max={myRank.goal.activities_target} color="" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ligações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold text-foreground">
                    {myRank.achievement?.calls_done || 0}
                    <span className="text-lg text-muted-foreground"> / {myRank.goal.calls_target}</span>
                  </div>
                  <ProgressBar value={myRank.achievement?.calls_done || 0} max={myRank.goal.calls_target} color="" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma meta configurada para você neste mês.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Config */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={saving || Object.keys(editedGoals).length === 0}
              onClick={handleSaveGoals}
              style={{ backgroundColor: DC.orange }}
            >
              <Save className="h-4 w-4 mr-1" /> Salvar Metas
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Meta Deals</TableHead>
                    <TableHead>Meta Valor (R$)</TableHead>
                    <TableHead>Meta Atividades/mês</TableHead>
                    <TableHead>Meta Ligações/mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.filter(m => m.active !== false).map(m => {
                    const goal = goals.find(g => g.user_id === m.id);
                    const edited = editedGoals[m.id] || {};
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            value={edited.deals_target ?? goal?.deals_target ?? ''}
                            onChange={e => setEditedGoals(g => ({ ...g, [m.id]: { ...g[m.id], deals_target: parseInt(e.target.value) || 0 } }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-32 h-8"
                            value={edited.value_target ?? goal?.value_target ?? ''}
                            onChange={e => setEditedGoals(g => ({ ...g, [m.id]: { ...g[m.id], value_target: parseFloat(e.target.value) || 0 } }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            value={edited.activities_target ?? goal?.activities_target ?? ''}
                            onChange={e => setEditedGoals(g => ({ ...g, [m.id]: { ...g[m.id], activities_target: parseInt(e.target.value) || 0 } }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            value={edited.calls_target ?? goal?.calls_target ?? ''}
                            onChange={e => setEditedGoals(g => ({ ...g, [m.id]: { ...g[m.id], calls_target: parseInt(e.target.value) || 0 } }))}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
