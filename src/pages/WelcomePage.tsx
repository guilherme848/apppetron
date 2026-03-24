import { useMemo } from 'react';
import { useWelcomeCommandCenter, UserRole } from '@/hooks/useWelcomeCommandCenter';
import { useWelcomeData } from '@/hooks/useWelcomeData';
import { useMyTasks } from '@/hooks/useMyTasks';
import { WelcomeHeader } from '@/components/welcome/WelcomeHeader';
import { BirthdayCard } from '@/components/welcome/BirthdayCard';
import { BirthdayModal, useBirthdayModal } from '@/components/welcome/BirthdayModal';
import { BirthdayToast } from '@/components/welcome/BirthdayToast';
import { UserNotesCard } from '@/components/notes/UserNotesCard';
import { Sparkles, AlertCircle, Trophy, Activity, CheckCircle, Clock, Flame, TrendingUp, Calendar, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

function ShimmerCard({ className }: { className?: string }) {
  return (
    <Card className={cn("border-border", className)}>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

// AI Phrase Card
function AiPhraseCard({ phrase, loading }: { phrase: string | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-muted/30 p-4 flex items-center gap-3">
        <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const text = phrase || 'Confira seus dados do dia abaixo.';

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-muted/30 p-4 flex items-start gap-3 animate-in fade-in duration-300">
      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
      </div>
      <Badge variant="outline" className="shrink-0 text-[9px] bg-primary/10 text-primary border-primary/20">IA</Badge>
    </div>
  );
}

// Mini KPI
function MiniKPI({ label, value, color = 'text-foreground', pulse = false }: { label: string; value: number; color?: string; pulse?: boolean }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-extrabold font-mono", color, pulse && value > 0 && "animate-pulse")}>{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

// Director View
function DirectorView({
  alerts, activities, highlights, monthDeliveries, monthGoal, workingDaysRemaining, currentMonth,
}: {
  alerts: any[];
  activities: any[];
  highlights: any[];
  monthDeliveries: number;
  monthGoal: number;
  workingDaysRemaining: number;
  currentMonth: string;
}) {
  const navigate = useNavigate();
  const progress = monthGoal > 0 ? Math.round((monthDeliveries / monthGoal) * 100) : 0;
  const avgPerDay = workingDaysRemaining > 0 ? monthDeliveries : 0;
  const projection = monthGoal > 0 ? Math.round(monthDeliveries + (avgPerDay * workingDaysRemaining)) : 0;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Meta Countdown */}
      <Card className="border-border border-l-[3px] border-l-primary">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="text-center sm:text-left">
              <p className="text-5xl font-extrabold font-mono text-foreground">{workingDaysRemaining}</p>
              <p className="text-sm text-muted-foreground">dias úteis</p>
              <p className="text-xs text-muted-foreground/70">para fechar {currentMonth}</p>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold font-mono">Entregas: {monthDeliveries} de {monthGoal}</p>
              <div className="w-full h-3 bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progress >= 80 ? "bg-emerald-500" : progress >= 60 ? "bg-amber-500" : "bg-destructive"
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className={cn("text-xs font-mono", progress >= 80 ? "text-emerald-500" : progress >= 60 ? "text-amber-500" : "text-destructive")}>
                {progress}% da meta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Atenção Necessária
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">{alerts.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm">Tudo sob controle. Nenhum alerta no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    alert.severity === 'danger' ? "bg-destructive animate-pulse" : "bg-amber-500"
                  )} />
                  <p className="text-sm text-foreground flex-1">{alert.text}</p>
                  {alert.actionPath && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate(alert.actionPath!)}>
                      {alert.actionLabel || 'Ver'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Atividade do Time
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhuma atividade registrada hoje.</p>
          ) : (
            <div className="relative space-y-0">
              {activities.slice(0, 8).map((act, i) => (
                <div key={act.id} className="flex items-start gap-3 py-2 hover:bg-muted/30 rounded-lg px-2 transition-colors cursor-pointer group">
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0 mt-1.5",
                      act.tipo === 'post_concluido' ? "bg-emerald-500" :
                      act.tipo === 'cliente_cadastrado' ? "bg-primary" :
                      "bg-blue-500"
                    )} />
                    {i < activities.length - 1 && <div className="w-px h-full bg-border absolute top-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{act.usuario_name || 'Sistema'}</span>{' '}
                      {act.descricao}
                      {act.cliente_name && <span className="text-muted-foreground"> para {act.cliente_name}</span>}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                    {format(parseISO(act.created_at), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Execution View (Designer, Videomaker, Social, etc.)
function ExecutionView({
  userRole, myDayMetrics, myPosts, monthlyDeliveries, monthlyGoal, avgPerDay, userName, changePostStatus,
}: {
  userRole: UserRole;
  myDayMetrics: any;
  myPosts: any[];
  monthlyDeliveries: number;
  monthlyGoal: number;
  avgPerDay: number;
  userName: string;
  changePostStatus: (id: string, status: string) => Promise<boolean>;
}) {
  const navigate = useNavigate();
  const borderColor = userRole === 'designer' ? 'border-l-blue-500' :
    userRole === 'videomaker' ? 'border-l-purple-500' :
    userRole === 'social' ? 'border-l-emerald-500' :
    userRole === 'traffic' ? 'border-l-primary' :
    userRole === 'cs' ? 'border-l-blue-500' :
    'border-l-primary';

  const overduePosts = myPosts.filter(p => p.daysOverdue && p.daysOverdue > 0);
  const todayPosts = myPosts.filter(p => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return p.dueDate === todayStr;
  });
  const upcomingPosts = myPosts.filter(p => {
    if (!p.dueDate) return true;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return p.dueDate > todayStr;
  });

  const progress = monthlyGoal > 0 ? Math.round((monthlyDeliveries / monthlyGoal) * 100) : 0;

  const handleAction = async (post: any) => {
    if (post.status === 'doing') {
      await changePostStatus(post.id, 'done');
    } else if (post.status === 'todo') {
      await changePostStatus(post.id, 'doing');
    }
  };

  const getActionLabel = (status: string) => {
    if (status === 'doing') return 'Concluir';
    if (status === 'todo') return 'Iniciar';
    return null;
  };

  const getFormatBadge = (format: string | undefined) => {
    if (!format) return null;
    const colors: Record<string, string> = {
      post: 'bg-blue-500/10 text-blue-500',
      carrossel: 'bg-purple-500/10 text-purple-500',
      carousel: 'bg-purple-500/10 text-purple-500',
      video: 'bg-rose-500/10 text-rose-500',
      reels: 'bg-rose-500/10 text-rose-500',
      story: 'bg-amber-500/10 text-amber-500',
    };
    return (
      <Badge variant="outline" className={cn("text-[9px] border-0", colors[format?.toLowerCase()] || '')}>
        {format}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* My Day */}
      <Card className={cn("border-border border-l-[3px]", borderColor)}>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Seu dia, {userName}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {myDayMetrics.overdue > 0
              ? `Você tem ${myPosts.length} posts pra produzir, ${myDayMetrics.overdue} atrasado${myDayMetrics.overdue > 1 ? 's' : ''}`
              : `${myPosts.length} posts pendentes. Tudo em dia!`}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            <MiniKPI label="Para Hoje" value={myDayMetrics.forToday} color="text-primary" />
            <MiniKPI label="Atrasados" value={myDayMetrics.overdue} color="text-destructive" pulse />
            <MiniKPI label="Em Andamento" value={myDayMetrics.inProgress} color="text-blue-500" />
            <MiniKPI label="Concluídos Hoje" value={myDayMetrics.completedToday} color="text-emerald-500" />
          </div>
        </CardContent>
      </Card>

      {/* My Posts */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Meus Posts</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {myPosts.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Nenhum post atribuído</p>
              <p className="text-xs text-muted-foreground">Bom momento pra organizar.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {[...overduePosts, ...todayPosts, ...upcomingPosts].slice(0, 10).map(post => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/content/post/${post.id}`)}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    post.daysOverdue && post.daysOverdue > 0 ? "bg-destructive animate-pulse" :
                    post.dueDate === format(new Date(), 'yyyy-MM-dd') ? "bg-amber-500" :
                    "bg-muted-foreground/30"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground">{post.clientName}</p>
                  </div>
                  {getFormatBadge(post.format)}
                  {post.daysOverdue && post.daysOverdue > 0 && (
                    <span className="text-[10px] text-destructive font-medium">Atrasado {post.daysOverdue}d</span>
                  )}
                  {getActionLabel(post.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleAction(post); }}
                    >
                      {getActionLabel(post.status)}
                    </Button>
                  )}
                </div>
              ))}
              {myPosts.length > 10 && (
                <Button variant="link" size="sm" className="text-xs text-muted-foreground w-full" onClick={() => navigate('/tasks')}>
                  Ver todos ({myPosts.length}) →
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Productivity */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Minha Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-extrabold font-mono text-foreground">{monthlyDeliveries}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Entregas no Mês</p>
              <div className="w-full h-1.5 bg-border rounded-full mt-1 overflow-hidden">
                <div className={cn("h-full rounded-full", progress >= 80 ? "bg-emerald-500" : progress >= 60 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold font-mono text-foreground">{avgPerDay}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Média/Dia</p>
            </div>
            <div className="text-right">
              <p className={cn("text-xl font-extrabold font-mono", progress >= 80 ? "text-emerald-500" : progress >= 60 ? "text-amber-500" : "text-destructive")}>
                {progress}%
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Da Meta</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Petron OS shortcut for Social Media */}
      {userRole === 'social' && (
        <Card
          className="border-border cursor-pointer hover:border-primary/40 transition-colors bg-gradient-to-r from-card to-primary/5"
          onClick={() => navigate('/petron-os')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sugerir Conteúdos com IA</p>
              <p className="text-xs text-muted-foreground">Use o Petron OS para gerar pautas, legendas e briefings</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Sidebar: Upcoming Deadlines
function UpcomingDeadlines({ posts }: { posts: any[] }) {
  const upcoming = posts
    .filter(p => p.dueDate)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Próximos Prazos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {upcoming.map(post => {
          const today = format(new Date(), 'yyyy-MM-dd');
          const isOverdue = post.dueDate < today;
          const isToday = post.dueDate === today;
          return (
            <div key={post.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{post.title}</p>
                <p className="text-[10px] text-muted-foreground">{post.clientName}</p>
              </div>
              <span className={cn(
                "text-[10px] font-mono shrink-0",
                isOverdue ? "text-destructive" : isToday ? "text-amber-500" : "text-muted-foreground"
              )}>
                {isOverdue ? `Atrasado ${post.daysOverdue}d` : isToday ? 'Hoje' : post.dueDate}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function WelcomePage() {
  const {
    loading, userRole, greeting, userName, capitalizedDate, currentMonth, workingDaysRemaining,
    aiPhrase, aiPhraseLoading,
    alerts, activities, highlights, monthDeliveries, monthGoal,
    myDayMetrics, myPosts, monthlyDeliveries, monthlyGoal, avgPerDay, punctuality,
    changePostStatus, currentMember,
  } = useWelcomeCommandCenter();

  const {
    birthdayMembers, isUserBirthdayToday, isUserBirthdayMonth,
  } = useWelcomeData();

  const { showModal, closeModal } = useBirthdayModal(isUserBirthdayToday);

  const isDirector = userRole === 'director' || userRole === 'admin';
  const isExecution = !isDirector;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-1">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <ShimmerCard />
            <ShimmerCard />
            <ShimmerCard />
          </div>
          <div className="space-y-4">
            <ShimmerCard />
            <ShimmerCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl md:text-[28px] font-bold text-foreground">
            {isUserBirthdayToday ? `Feliz aniversário, ${userName} 🎂` : `${greeting}, ${userName}`}
          </h1>
          <p className="text-sm text-muted-foreground">{capitalizedDate}</p>
        </header>

        {/* Daily Quote */}
        <DailyQuoteCard />

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main Column */}
          <div>
            {isDirector ? (
              <DirectorView
                alerts={alerts}
                activities={activities}
                highlights={highlights}
                monthDeliveries={monthDeliveries}
                monthGoal={monthGoal}
                workingDaysRemaining={workingDaysRemaining}
                currentMonth={currentMonth}
              />
            ) : (
              <ExecutionView
                userRole={userRole}
                myDayMetrics={myDayMetrics}
                myPosts={myPosts}
                monthlyDeliveries={monthlyDeliveries}
                monthlyGoal={monthlyGoal}
                avgPerDay={avgPerDay}
                userName={userName}
                changePostStatus={changePostStatus}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <UserNotesCard />
            {isExecution && <UpcomingDeadlines posts={myPosts} />}
            <BirthdayCard
              members={birthdayMembers}
              isUserBirthdayToday={isUserBirthdayToday}
              isUserBirthdayMonth={isUserBirthdayMonth}
            />
          </div>
        </div>
      </div>

      <BirthdayModal userName={userName} isOpen={showModal} onClose={closeModal} />
      <BirthdayToast isUserBirthdayToday={isUserBirthdayToday} />
    </>
  );
}
