import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLeadScoring } from '@/hooks/useLeadScoring';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { DC } from '@/lib/dashboardColors';
import { Target, Save, RefreshCw, TrendingUp, Flame } from 'lucide-react';
import { toast } from 'sonner';

function ScoreBadge({ score }: { score: number }) {
  const badge = score >= 90
    ? { label: '🔥 Hot', color: '#EF4444', pulse: true }
    : score >= 70
    ? { label: '🟢 Quente', color: '#0F766E', pulse: false }
    : score >= 40
    ? { label: '🟡 Morno', color: '#F97316', pulse: false }
    : { label: '🔴 Frio', color: '#94A3B8', pulse: false };

  return (
    <Badge
      className={`text-white text-xs ${badge.pulse ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: badge.color }}
    >
      {badge.label} {score}
    </Badge>
  );
}

export default function LeadScoringPage() {
  const { criteria, loading, updateCriterion, recalculateAllScores, scores } = useLeadScoring();
  const { deals, contacts, activities, openDeals } = useSalesCrmData();
  const [editedPoints, setEditedPoints] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const groups = criteria.reduce((acc, c) => {
    if (!acc[c.group_key]) acc[c.group_key] = { label: c.group_label, items: [] };
    acc[c.group_key].items.push(c);
    return acc;
  }, {} as Record<string, { label: string; items: typeof criteria }>);

  const handleSave = async () => {
    setSaving(true);
    for (const [id, points] of Object.entries(editedPoints)) {
      await updateCriterion(id, { points });
    }
    setEditedPoints({});
    toast.success('Configuração salva!');
    setSaving(false);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    await recalculateAllScores(deals, contacts, activities);
    toast.success('Scores recalculados para todos os deals ativos!');
    setRecalculating(false);
  };

  // Stats
  const hotDeals = openDeals.filter(d => {
    const s = scores.find(sc => sc.deal_id === d.id);
    return s && s.score >= 70;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6" style={{ color: DC.orange }} />
          <h1 className="text-xl font-bold text-foreground">Lead Scoring</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
            Recalcular Todos
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || Object.keys(editedPoints).length === 0}
            style={{ backgroundColor: DC.orange }}
          >
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Deals com Score</p>
            <p className="text-2xl font-bold text-foreground">{scores.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">🔥 Hot (90+)</p>
            <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>
              {scores.filter(s => s.score >= 90).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">🟢 Quentes (70–89)</p>
            <p className="text-2xl font-bold" style={{ color: DC.teal }}>
              {scores.filter(s => s.score >= 70 && s.score < 90).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Score Médio</p>
            <p className="text-2xl font-bold" style={{ color: DC.orange }}>
              {scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="deals">Deals por Score</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6 mt-4">
          {Object.entries(groups).map(([key, group]) => (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.items.map(c => (
                  <div key={c.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <Switch
                      checked={c.active}
                      onCheckedChange={(checked) => updateCriterion(c.id, { active: checked })}
                    />
                    <span className={`flex-1 text-sm ${!c.active ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {c.criterion_label}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20 h-8 text-sm text-center"
                        value={editedPoints[c.id] ?? c.points}
                        onChange={(e) => setEditedPoints(prev => ({ ...prev, [c.id]: parseInt(e.target.value) || 0 }))}
                      />
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                    <ScoreBadge score={Math.max(0, Math.min(100, editedPoints[c.id] ?? c.points))} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Calculado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openDeals
                    .map(d => ({ deal: d, score: scores.find(s => s.deal_id === d.id) }))
                    .sort((a, b) => (b.score?.score || 0) - (a.score?.score || 0))
                    .map(({ deal, score }) => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium text-foreground">{deal.title}</TableCell>
                        <TableCell className="text-muted-foreground">{deal.contact?.name || '—'}</TableCell>
                        <TableCell style={{ color: DC.orange }}>
                          {Number(deal.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-center font-bold">{score?.score ?? '—'}</TableCell>
                        <TableCell>{score ? <ScoreBadge score={score.score} /> : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {score ? new Date(score.calculated_at).toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  {openDeals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum deal ativo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
