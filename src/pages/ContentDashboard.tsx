import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart3, TrendingUp, Users, Calendar, FileText, AlertTriangle, 
  CheckCircle2, Clock, Loader2, Download, ExternalLink, Filter, FileQuestion
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { useContentDashboardData } from '@/hooks/useContentDashboardData';
import { BATCH_STATUS_OPTIONS, POST_STATUS_OPTIONS } from '@/types/contentProduction';
import { ExtraRequestsMetrics } from '@/components/dashboard/ExtraRequestsMetrics';

const ROLE_LABELS: Record<string, string> = {
  designer: 'Designer',
  videomaker: 'Videomaker',
  social: 'Social Media',
  traffic: 'Tráfego',
  support: 'Suporte',
  cs: 'CS',
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function ContentDashboard() {
  const {
    loading,
    filters,
    updateFilter,
    accounts,
    teamMembers,
    monthRefs,
    metrics,
    completedByDay,
    postsByStatus,
    batchesByStage,
    productivityByProfessional,
    accountsByProfessionalByRole,
    batchProgress,
    postReport,
  } = useContentDashboardData();

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReport = postReport.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Post', 'Cliente', 'Mês', 'Status', 'Cargo', 'Profissional', 'Vencimento', 'Concluído em'];
    const rows = filteredReport.map(p => [
      p.title,
      p.clientName,
      p.monthRef,
      p.status,
      ROLE_LABELS[p.roleKey] || p.roleKey,
      p.assigneeName,
      p.dueDate || '',
      p.completedAt ? format(parseISO(p.completedAt), 'dd/MM/yyyy HH:mm') : '',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-posts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Dashboard de Produção
          </h1>
          <p className="text-muted-foreground">Métricas de produtividade e operação de conteúdo</p>
        </div>
      </div>

      {/* Global Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="py-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Globais
                </CardTitle>
                <Badge variant="secondary">{filtersOpen ? 'Ocultar' : 'Mostrar'}</Badge>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.from, 'yyyy-MM-dd')}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: parseISO(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={format(filters.dateRange.to, 'yyyy-MM-dd')}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: parseISO(e.target.value) })}
                    className="h-9"
                  />
                </div>

                {/* Month Ref */}
                <div className="space-y-2">
                  <Label className="text-xs">Mês do Planejamento</Label>
                  <Select value={filters.monthRef} onValueChange={(v) => updateFilter('monthRef', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {monthRefs.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Client */}
                <div className="space-y-2">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={filters.clientId} onValueChange={(v) => updateFilter('clientId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label className="text-xs">Cargo Responsável</Label>
                  <Select value={filters.roleKey} onValueChange={(v) => updateFilter('roleKey', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <Label className="text-xs">Profissional</Label>
                  <Select value={filters.assigneeId} onValueChange={(v) => updateFilter('assigneeId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch Status */}
                <div className="space-y-2">
                  <Label className="text-xs">Status do Planejamento</Label>
                  <Select value={filters.batchStatus} onValueChange={(v) => updateFilter('batchStatus', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {BATCH_STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Post Status */}
                <div className="space-y-2">
                  <Label className="text-xs">Status do Post</Label>
                  <Select value={filters.postStatus} onValueChange={(v) => updateFilter('postStatus', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {POST_STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <Label className="text-xs">Opções</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="overdueOnly"
                        checked={filters.overdueOnly}
                        onCheckedChange={(v) => updateFilter('overdueOnly', v)}
                      />
                      <Label htmlFor="overdueOnly" className="text-xs">Só vencidos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="unassignedOnly"
                        checked={filters.unassignedOnly}
                        onCheckedChange={(v) => updateFilter('unassignedOnly', v)}
                      />
                      <Label htmlFor="unassignedOnly" className="text-xs">Sem responsável</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tabs for sections */}
      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="executive">Executivo</TabsTrigger>
          <TabsTrigger value="productivity">Produtividade</TabsTrigger>
          <TabsTrigger value="workload">Carga</TabsTrigger>
          <TabsTrigger value="batches">Planejamentos</TabsTrigger>
          <TabsTrigger value="extras">Extras</TabsTrigger>
          <TabsTrigger value="report">Relatório</TabsTrigger>
        </TabsList>

        {/* Executive View */}
        <TabsContent value="executive" className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Concluídos no Período</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {metrics.completedInPeriod}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Em Aberto</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  {metrics.openPosts}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Atrasados</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {metrics.overduePosts}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">% No Prazo</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {metrics.onTimeRate}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Planejamentos Ativos</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {metrics.activeBatches}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Planej. Atrasados</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {metrics.overdueBatches}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completed by Day */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posts Concluídos por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={completedByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Posts by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posts por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={postsByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="status" type="category" className="text-xs" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }} 
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {postsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Batches by Stage */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Planejamentos por Etapa do Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={batchesByStage}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="stage" className="text-xs" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }} 
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ranking de Produtividade por Profissional
              </CardTitle>
              <CardDescription>Posts concluídos, WIP e % no prazo</CardDescription>
            </CardHeader>
            <CardContent>
              {productivityByProfessional.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum dado de produtividade no período</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Hoje</TableHead>
                      <TableHead className="text-right">No Período</TableHead>
                      <TableHead className="text-right">WIP</TableHead>
                      <TableHead className="text-right">Atrasados</TableHead>
                      <TableHead className="text-right">% No Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productivityByProfessional.map((p, idx) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                            {p.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{p.completedToday}</TableCell>
                        <TableCell className="text-right font-medium">{p.completedInPeriod}</TableCell>
                        <TableCell className="text-right">{p.wip}</TableCell>
                        <TableCell className="text-right">
                          {p.overdue > 0 ? (
                            <Badge variant="destructive">{p.overdue}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.onTimeRate >= 80 ? 'default' : p.onTimeRate >= 50 ? 'secondary' : 'destructive'}>
                            {p.onTimeRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workload Tab */}
        <TabsContent value="workload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accounts by Role */}
            {accountsByProfessionalByRole.map(roleData => (
              <Card key={roleData.role}>
                <CardHeader>
                  <CardTitle className="text-base">Contas por {roleData.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {roleData.professionals.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum profissional com contas</p>
                  ) : (
                    <div className="space-y-3">
                      {roleData.professionals.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{p.count} contas</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* WIP by Professional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carga de Trabalho (WIP + Atrasados)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productivityByProfessional.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" className="text-xs" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="wip" name="WIP" fill="hsl(var(--chart-2))" stackId="a" />
                    <Bar dataKey="overdue" name="Atrasados" fill="hsl(var(--destructive))" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Status dos Planejamentos
              </CardTitle>
              <CardDescription>Progresso e risco por cliente/mês</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Feitos/Total</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchProgress.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.clientName}</TableCell>
                      <TableCell>{b.monthRef}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.statusLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        {b.planningDueDate ? format(parseISO(b.planningDueDate), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={b.progress} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">{b.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {b.done}/{b.total}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={b.risk === 'high' ? 'destructive' : b.risk === 'medium' ? 'secondary' : 'outline'}
                        >
                          {b.risk === 'high' ? 'Alto' : b.risk === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/content/production/${b.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Relatório de Posts
                  </CardTitle>
                  <CardDescription>{filteredReport.length} posts encontrados</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 h-9"
                  />
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Mês</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Concluído</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReport.slice(0, 100).map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          <Link to={`/content/production/${p.batchId}`} className="hover:underline">
                            {p.title}
                          </Link>
                        </TableCell>
                        <TableCell>{p.clientName}</TableCell>
                        <TableCell>{p.monthRef}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'done' ? 'default' : p.status === 'doing' ? 'secondary' : 'outline'}>
                            {p.status === 'done' ? 'Feito' : p.status === 'doing' ? 'Fazendo' : 'A Fazer'}
                          </Badge>
                        </TableCell>
                        <TableCell>{ROLE_LABELS[p.roleKey] || p.roleKey || '-'}</TableCell>
                        <TableCell>{p.assigneeName || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>
                          {p.dueDate ? format(parseISO(p.dueDate), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {p.completedAt ? format(parseISO(p.completedAt), 'dd/MM HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredReport.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Mostrando 100 de {filteredReport.length} posts. Use os filtros para refinar.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extras View */}
        <TabsContent value="extras" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Solicitações Extras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExtraRequestsMetrics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
