import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TrafficMetricCatalog,
  TrafficAlertRule,
  TrafficScore,
  TrafficDashboardLayout,
  METRIC_CATEGORY_OPTIONS,
  METRIC_UNIT_OPTIONS,
  METRIC_TYPE_OPTIONS,
  ALERT_CONDITION_OPTIONS,
  ALERT_SEVERITY_OPTIONS,
  MetricCategory,
  MetricUnit,
  MetricType,
  AlertCondition,
  AlertSeverity,
} from '@/types/trafficAnalytics';

interface MetricFormData {
  name: string;
  slug: string;
  description: string;
  category: MetricCategory;
  unit: MetricUnit;
  metric_type: MetricType;
  formula: string;
  visible_for_managers: boolean;
  default_order: number;
}

interface AlertFormData {
  name: string;
  metric_slug: string;
  condition: AlertCondition;
  threshold: string;
  window_days: number;
  severity: AlertSeverity;
  message: string;
  action_hint: string;
  is_active: boolean;
}

interface AlertSaveData {
  name: string;
  metric_slug: string;
  condition: AlertCondition;
  threshold: number | null;
  window_days: number;
  severity: AlertSeverity;
  message: string;
  action_hint: string;
  is_active: boolean;
}

export function TrafficAnalyticsSettingsTab() {
  const [metrics, setMetrics] = useState<TrafficMetricCatalog[]>([]);
  const [alertRules, setAlertRules] = useState<TrafficAlertRule[]>([]);
  const [scores, setScores] = useState<TrafficScore[]>([]);
  const [layouts, setLayouts] = useState<TrafficDashboardLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('metrics');

  // Metric form state
  const [editingMetric, setEditingMetric] = useState<TrafficMetricCatalog | null>(null);
  const [metricDialogOpen, setMetricDialogOpen] = useState(false);

  // Alert form state
  const [editingAlert, setEditingAlert] = useState<TrafficAlertRule | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [metricsRes, alertsRes, scoresRes, layoutsRes] = await Promise.all([
      supabase.from('traffic_metric_catalog').select('*').order('default_order'),
      supabase.from('traffic_alert_rules').select('*').order('name'),
      supabase.from('traffic_scores').select('*'),
      supabase.from('traffic_dashboard_layout').select('*'),
    ]);

    setMetrics((metricsRes.data || []) as TrafficMetricCatalog[]);
    setAlertRules((alertsRes.data || []) as TrafficAlertRule[]);
    setScores((scoresRes.data || []) as unknown as TrafficScore[]);
    setLayouts((layoutsRes.data || []) as unknown as TrafficDashboardLayout[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Metric CRUD
  const handleSaveMetric = async (metric: MetricFormData) => {
    const payload = {
      name: metric.name,
      slug: metric.slug,
      description: metric.description,
      category: metric.category,
      unit: metric.unit,
      metric_type: metric.metric_type,
      formula: metric.formula || null,
      visible_for_managers: metric.visible_for_managers,
      default_order: metric.default_order,
    };
    
    if (editingMetric?.id) {
      const { error } = await supabase
        .from('traffic_metric_catalog')
        .update(payload)
        .eq('id', editingMetric.id);
      if (error) {
        toast.error('Erro ao atualizar métrica');
        return;
      }
      toast.success('Métrica atualizada');
    } else {
      const { error } = await supabase
        .from('traffic_metric_catalog')
        .insert([payload]);
      if (error) {
        toast.error('Erro ao criar métrica');
        return;
      }
      toast.success('Métrica criada');
    }
    setMetricDialogOpen(false);
    setEditingMetric(null);
    fetchAll();
  };

  const handleDeleteMetric = async (id: string) => {
    const { error } = await supabase
      .from('traffic_metric_catalog')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao excluir métrica');
      return;
    }
    toast.success('Métrica excluída');
    fetchAll();
  };

  const handleToggleMetricActive = async (metric: TrafficMetricCatalog) => {
    await supabase
      .from('traffic_metric_catalog')
      .update({ is_active: !metric.is_active })
      .eq('id', metric.id);
    fetchAll();
  };

  // Alert CRUD
  const handleSaveAlert = async (alert: AlertSaveData) => {
    const payload = {
      name: alert.name,
      metric_slug: alert.metric_slug,
      condition: alert.condition,
      threshold: alert.threshold,
      window_days: alert.window_days,
      severity: alert.severity,
      message: alert.message,
      action_hint: alert.action_hint || null,
      is_active: alert.is_active,
    };
    
    if (editingAlert?.id) {
      const { error } = await supabase
        .from('traffic_alert_rules')
        .update(payload)
        .eq('id', editingAlert.id);
      if (error) {
        toast.error('Erro ao atualizar alerta');
        return;
      }
      toast.success('Alerta atualizado');
    } else {
      const { error } = await supabase
        .from('traffic_alert_rules')
        .insert([payload]);
      if (error) {
        toast.error('Erro ao criar alerta');
        return;
      }
      toast.success('Alerta criado');
    }
    setAlertDialogOpen(false);
    setEditingAlert(null);
    fetchAll();
  };

  const handleDeleteAlert = async (id: string) => {
    const { error } = await supabase
      .from('traffic_alert_rules')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao excluir alerta');
      return;
    }
    toast.success('Alerta excluído');
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Multi-Contas</h1>
        <p className="text-muted-foreground">
          Configure métricas, metas, score e alertas do painel de tráfego
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Catálogo de Métricas</h2>
            <Dialog open={metricDialogOpen} onOpenChange={setMetricDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingMetric(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Métrica
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingMetric ? 'Editar Métrica' : 'Nova Métrica'}</DialogTitle>
                </DialogHeader>
                <MetricForm 
                  metric={editingMetric} 
                  onSave={handleSaveMetric}
                  onCancel={() => setMetricDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map(metric => (
                <TableRow key={metric.id}>
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell className="font-mono text-sm">{metric.slug}</TableCell>
                  <TableCell className="capitalize">{metric.category}</TableCell>
                  <TableCell>
                    <Badge variant={metric.metric_type === 'calculated' ? 'secondary' : 'outline'}>
                      {metric.metric_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={metric.is_active}
                      onCheckedChange={() => handleToggleMetricActive(metric)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingMetric(metric);
                          setMetricDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteMetric(metric.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Regras de Alerta</h2>
            <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingAlert(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Alerta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingAlert ? 'Editar Alerta' : 'Novo Alerta'}</DialogTitle>
                </DialogHeader>
                <AlertForm 
                  alert={editingAlert}
                  metrics={metrics}
                  onSave={handleSaveAlert}
                  onCancel={() => setAlertDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertRules.map(alert => (
                <TableRow key={alert.id}>
                  <TableCell className="font-medium">{alert.name}</TableCell>
                  <TableCell>{alert.metric_slug}</TableCell>
                  <TableCell>{alert.condition} {alert.threshold}</TableCell>
                  <TableCell>
                    <Badge variant={
                      alert.severity === 'critical' ? 'destructive' :
                      alert.severity === 'attention' ? 'secondary' : 'outline'
                    }>
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.is_active ? 'default' : 'outline'}>
                      {alert.is_active ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingAlert(alert);
                          setAlertDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Score Tab */}
        <TabsContent value="score" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Composto</CardTitle>
              <CardDescription>
                Configure os pesos das métricas e thresholds do score de saúde
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scores.length === 0 ? (
                <p className="text-muted-foreground">Nenhum score configurado</p>
              ) : (
                scores.map(score => (
                  <div key={score.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{score.name}</h3>
                        <Badge variant={score.is_active ? 'default' : 'outline'}>
                          {score.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Verde (≥)</Label>
                        <Input value={score.green_threshold} disabled />
                      </div>
                      <div>
                        <Label>Amarelo (≥)</Label>
                        <Input value={score.yellow_threshold} disabled />
                      </div>
                      <div>
                        <Label>Vermelho (&lt;)</Label>
                        <Input value={score.yellow_threshold} disabled />
                      </div>
                    </div>
                    <div>
                      <Label>Métricas e Pesos</Label>
                      <div className="space-y-2 mt-2">
                        {score.config_json?.metrics?.map((m: { slug: string; weight: number }) => (
                          <div key={m.slug} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                            <span className="font-mono">{m.slug}</span>
                            <span>Peso: {m.weight}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout do Dashboard</CardTitle>
              <CardDescription>
                Configure os cards e colunas exibidos no painel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {layouts.length === 0 ? (
                <p className="text-muted-foreground">Nenhum layout configurado</p>
              ) : (
                layouts.map(layout => (
                  <div key={layout.id} className="space-y-4 mb-6 pb-6 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {layout.scope === 'global' ? 'Global' : `Objetivo: ${layout.objective}`}
                      </Badge>
                    </div>
                    <div>
                      <Label>Cards do Topo</Label>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {layout.cards?.map((card: { slug: string; label: string }) => (
                          <Badge key={card.slug} variant="secondary">
                            {card.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Colunas da Tabela</Label>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {layout.columns?.map((col: { slug: string; order: number }) => (
                          <Badge key={col.slug} variant="outline">
                            {col.slug}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Form Component
function MetricForm({ 
  metric, 
  onSave, 
  onCancel 
}: { 
  metric: TrafficMetricCatalog | null; 
  onSave: (m: MetricFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<MetricFormData>({
    name: metric?.name || '',
    slug: metric?.slug || '',
    description: metric?.description || '',
    category: (metric?.category || 'entrega') as MetricCategory,
    unit: (metric?.unit || 'NUMBER') as MetricUnit,
    metric_type: (metric?.metric_type || 'simple') as MetricType,
    formula: metric?.formula || '',
    visible_for_managers: metric?.visible_for_managers ?? true,
    default_order: metric?.default_order || 0,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome</Label>
          <Input 
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Slug</Label>
          <Input 
            value={form.slug}
            onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
            disabled={!!metric}
          />
        </div>
      </div>

      <div>
        <Label>Descrição</Label>
        <Textarea 
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Categoria</Label>
          <Select 
            value={form.category}
            onValueChange={(v) => setForm(prev => ({ ...prev, category: v as MetricCategory }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_CATEGORY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Unidade</Label>
          <Select 
            value={form.unit}
            onValueChange={(v) => setForm(prev => ({ ...prev, unit: v as MetricUnit }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_UNIT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo</Label>
          <Select 
            value={form.metric_type}
            onValueChange={(v) => setForm(prev => ({ ...prev, metric_type: v as MetricType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.metric_type === 'calculated' && (
        <div>
          <Label>Fórmula</Label>
          <Input 
            value={form.formula}
            onChange={(e) => setForm(prev => ({ ...prev, formula: e.target.value }))}
            placeholder="Ex: spend / link_clicks"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use os slugs das métricas simples na fórmula
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch 
          checked={form.visible_for_managers}
          onCheckedChange={(v) => setForm(prev => ({ ...prev, visible_for_managers: v }))}
        />
        <Label>Visível para gestores</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(form)}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

// Alert Form Component
function AlertForm({ 
  alert,
  metrics,
  onSave, 
  onCancel 
}: { 
  alert: TrafficAlertRule | null;
  metrics: TrafficMetricCatalog[];
  onSave: (a: AlertSaveData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AlertFormData>({
    name: alert?.name || '',
    metric_slug: alert?.metric_slug || '',
    condition: (alert?.condition || 'gt') as AlertCondition,
    threshold: alert?.threshold?.toString() || '',
    window_days: alert?.window_days || 7,
    severity: (alert?.severity || 'attention') as AlertSeverity,
    message: alert?.message || '',
    action_hint: alert?.action_hint || '',
    is_active: alert?.is_active ?? true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input 
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Métrica</Label>
          <Select 
            value={form.metric_slug}
            onValueChange={(v) => setForm(prev => ({ ...prev, metric_slug: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {metrics.map(m => (
                <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Condição</Label>
          <Select 
            value={form.condition}
            onValueChange={(v) => setForm(prev => ({ ...prev, condition: v as AlertCondition }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALERT_CONDITION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Threshold</Label>
          <Input 
            type="number"
            value={form.threshold}
            onChange={(e) => setForm(prev => ({ ...prev, threshold: e.target.value }))}
          />
        </div>
        <div>
          <Label>Janela (dias)</Label>
          <Input 
            type="number"
            value={form.window_days}
            onChange={(e) => setForm(prev => ({ ...prev, window_days: parseInt(e.target.value) || 7 }))}
          />
        </div>
        <div>
          <Label>Severidade</Label>
          <Select 
            value={form.severity}
            onValueChange={(v) => setForm(prev => ({ ...prev, severity: v as AlertSeverity }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALERT_SEVERITY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Mensagem</Label>
        <Input 
          value={form.message}
          onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
          placeholder="Ex: CPM acima do esperado"
        />
      </div>

      <div>
        <Label>Sugestão de Ação</Label>
        <Input 
          value={form.action_hint}
          onChange={(e) => setForm(prev => ({ ...prev, action_hint: e.target.value }))}
          placeholder="Ex: Revisar segmentação"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch 
          checked={form.is_active}
          onCheckedChange={(v) => setForm(prev => ({ ...prev, is_active: v }))}
        />
        <Label>Ativo</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => {
          const saveData: AlertSaveData = {
            name: form.name,
            metric_slug: form.metric_slug,
            condition: form.condition,
            threshold: form.threshold ? parseFloat(form.threshold) : null,
            window_days: form.window_days,
            severity: form.severity,
            message: form.message,
            action_hint: form.action_hint,
            is_active: form.is_active,
          };
          onSave(saveData);
        }}>
          Salvar
        </Button>
      </DialogFooter>
    </div>
  );
}
