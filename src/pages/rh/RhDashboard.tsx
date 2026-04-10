import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Layers, CheckCircle2, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { JOB_STATUS_LABEL } from '@/types/rh';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function RhDashboard() {
  const navigate = useNavigate();
  const { profiles, jobs, candidates, applications, loading } = useRh();

  const stats = useMemo(() => {
    const openJobs = jobs.filter((j) => j.status === 'open');
    const hiredCount = applications.filter((a) => a.status === 'hired').length;
    const activeApplications = applications.filter((a) => a.status === 'active').length;
    const avgTimeHours = (() => {
      const hired = applications.filter(
        (a) => a.status === 'hired' && a.decided_at && a.applied_at
      );
      if (!hired.length) return 0;
      const total = hired.reduce((acc, a) => {
        const dt = new Date(a.decided_at!).getTime() - new Date(a.applied_at).getTime();
        return acc + dt / 1000 / 60 / 60 / 24;
      }, 0);
      return Math.round(total / hired.length);
    })();

    return {
      totalCandidates: candidates.length,
      totalJobs: jobs.length,
      openJobs: openJobs.length,
      totalProfiles: profiles.filter((p) => p.status === 'active').length,
      hiredCount,
      activeApplications,
      avgTimeDays: avgTimeHours,
    };
  }, [profiles, jobs, candidates, applications]);

  const applicationsPerJob = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    jobs.forEach((j) => map.set(j.id, { name: j.title, count: 0 }));
    applications.forEach((a) => {
      const entry = map.get(a.job_id);
      if (entry) entry.count += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [jobs, applications]);

  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs]);

  return (
    <RhLayout
      title="Dashboard RH"
      description="Visão geral de Recrutamento & Seleção"
      actions={
        <Button onClick={() => navigate('/rh/vagas/nova')}>
          <Briefcase className="h-4 w-4 mr-2" />
          Nova Vaga
        </Button>
      }
    >
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              label="Candidatos"
              value={stats.totalCandidates}
              icon={Users}
              subtitle={`${stats.activeApplications} em processo`}
            />
            <KpiCard
              label="Vagas abertas"
              value={stats.openJobs}
              icon={Briefcase}
              subtitle={`${stats.totalJobs} no total`}
            />
            <KpiCard
              label="Funções ativas"
              value={stats.totalProfiles}
              icon={Layers}
              subtitle="Templates de cargos"
            />
            <KpiCard
              label="Contratados"
              value={stats.hiredCount}
              icon={CheckCircle2}
              subtitle={
                stats.avgTimeDays > 0
                  ? `Ciclo médio: ${stats.avgTimeDays}d`
                  : 'Aguardando contratações'
              }
            />
          </div>

          {/* Gráfico + Últimas vagas */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Inscrições por vaga</CardTitle>
                <CardDescription>Top 8 vagas por número de candidatos</CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsPerJob.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados ainda. Crie uma vaga para começar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={applicationsPerJob} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        width={140}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 12,
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {applicationsPerJob.map((_, idx) => (
                          <Cell key={idx} fill="hsl(var(--primary))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimas vagas</CardTitle>
                <CardDescription>Vagas recentes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma vaga ainda.</p>
                ) : (
                  recentJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => navigate(`/rh/vagas/${job.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{job.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {job.candidates_count} candidatos
                        </div>
                      </div>
                      <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                        {JOB_STATUS_LABEL[job.status]}
                      </Badge>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo rápido */}
          <div className="grid gap-4 md:grid-cols-4">
            <QuickStat icon={Clock} label="Em processo" value={stats.activeApplications} />
            <QuickStat icon={TrendingUp} label="Taxa conversão" value={`${conversionRate(stats).toFixed(0)}%`} />
            <QuickStat icon={CheckCircle2} label="Contratados" value={stats.hiredCount} />
            <QuickStat icon={Sparkles} label="Funções" value={stats.totalProfiles} />
          </div>
        </div>
      )}
    </RhLayout>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function conversionRate(stats: { totalCandidates: number; hiredCount: number }): number {
  if (stats.totalCandidates === 0) return 0;
  return (stats.hiredCount / stats.totalCandidates) * 100;
}
