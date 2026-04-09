import { useMemo } from 'react';
import { useWelcomeCommandCenter, UserRole, DirectorPillar } from '@/hooks/useWelcomeCommandCenter';
import { useWelcomeData } from '@/hooks/useWelcomeData';
import { BirthdayCard } from '@/components/welcome/BirthdayCard';
import { BirthdayModal, useBirthdayModal } from '@/components/welcome/BirthdayModal';
import { BirthdayToast } from '@/components/welcome/BirthdayToast';
import { UserNotesCard } from '@/components/notes/UserNotesCard';
import { DailyQuoteCard } from '@/components/welcome/DailyQuoteCard';
import {
  AlertCircle, Trophy, Activity, CheckCircle, Clock, TrendingUp, TrendingDown,
  Calendar, ArrowRight, Sparkles, Target, AlertTriangle, Zap,
  FileText, Palette, DollarSign, FileSignature,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

// ─── Shimmer Skeleton ───
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

// ─── KPI Card (CS pattern) ───
function KpiCard({
  label, value, subtitle, icon: Icon, danger, warning, accent, onClick,
}: {
  label: string; value: string | number; subtitle?: string;
  icon: React.ElementType; danger?: boolean; warning?: boolean; accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "kpi-card transition-all duration-200 hover:border-border/80",
        onClick && "cursor-pointer",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className={cn(
          "text-2xl font-bold font-mono stat-value",
          danger && "text-destructive",
          warning && "text-warning",
          accent && "text-primary",
          !danger && !warning && !accent && "text-foreground",
        )}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Hero Pillar Card (Director 3 numbers) ───
function PillarCard({
  label, value, sublabel, variation, prevMonthName,
  icon: Icon, iconBg, iconColor,
  formatValue,
}: {
  label: string;
  value: number;
  sublabel: string;
  variation: number;
  prevMonthName: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  formatValue?: (v: number) => string;
}) {
  const displayValue = formatValue ? formatValue(value) : String(value);
  const hasVariation = variation !== 0;
  const isPositive = variation > 0;

  return (
    <Card className="kpi-card transition-all duration-200 hover:border-primary/40">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </span>
            <div className="text-[32px] font-extrabold font-mono stat-value text-foreground leading-tight mt-1">
              {displayValue}
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">{sublabel}</p>
            {hasVariation && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs font-mono",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{isPositive ? '+' : ''}{variation}% vs {prevMonthName}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Alert Item ───
function AlertItem({ alert, onAction }: { alert: any; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "h-2 w-2 rounded-full shrink-0",
          alert.severity === 'danger' ? "bg-destructive" : "bg-warning"
        )} />
        <p className="text-sm text-foreground truncate">{alert.text}</p>
      </div>
      {alert.actionPath && (
        <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0 ml-2" onClick={onAction}>
          {alert.actionLabel || 'Ver'}
        </Button>
      )}
    </div>
  );
}

// ─── Activity Timeline Item ───
function TimelineItem({ act, isLast }: { act: any; isLast: boolean }) {
  const typeColor: Record<string, string> = {
    post_concluido: 'bg-success',
    cliente_cadastrado: 'bg-primary',
    checkin_realizado: 'bg-info',
    otimizacao_registrada: 'bg-accent',
  };

  return (
    <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
      <div className="relative flex flex-col items-center">
        <div className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", typeColor[act.tipo] || "bg-muted-foreground")} />
        {!isLast && <div className="w-px flex-1 bg-border absolute top-3" />}
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
  );
}

// ─── Post List Item ───
function PostItem({ post, onAction, onNavigate }: { post: any; onAction: () => void; onNavigate: () => void }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = post.daysOverdue && post.daysOverdue > 0;
  const isToday = post.dueDate === todayStr;
  const actionLabel = post.status === 'doing' ? 'Concluir' : post.status === 'todo' ? 'Iniciar' : null;

  return (
    <div
      className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
      onClick={onNavigate}
    >
      <div className={cn(
        "h-2 w-2 rounded-full shrink-0",
        isOverdue ? "bg-destructive" : isToday ? "bg-warning" : "bg-muted-foreground/30"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
        <p className="text-xs text-muted-foreground">{post.clientName}</p>
      </div>
      {post.format && (
        <Badge variant="outline" className="text-[9px] shrink-0">{post.format}</Badge>
      )}
      {isOverdue && (
        <span className="text-[10px] text-destructive font-medium shrink-0">{post.daysOverdue}d</span>
      )}
      {actionLabel && (
        <Button
          variant="outline"
          size="sm"
          className="text-[11px] h-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onAction(); }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DIRECTOR VIEW
// ═══════════════════════════════════════════
function DirectorView({
  contentPillar, mediaPillar, contractsPillar, prevMonthName, currentMonth,
  alerts, activities,
}: {
  contentPillar: DirectorPillar;
  mediaPillar: DirectorPillar;
  contractsPillar: DirectorPillar;
  prevMonthName: string;
  currentMonth: string;
  alerts: any[];
  activities: any[];
}) {
  const navigate = useNavigate();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      {/* 3 Pillar Hero Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-enter" style={{ animationDelay: '0ms' }}>
          <PillarCard
            label="Conteúdos Criados"
            value={contentPillar.value}
            sublabel={`conteúdos entregues em ${currentMonth}`}
            variation={contentPillar.variation}
            prevMonthName={prevMonthName}
            icon={Palette}
            iconBg="bg-primary/12"
            iconColor="text-primary"
          />
        </div>
        <div className="card-enter" style={{ animationDelay: '80ms' }}>
          <PillarCard
            label="Investimento em Mídia"
            value={mediaPillar.value}
            sublabel="verba total gerenciada no mês"
            variation={mediaPillar.variation}
            prevMonthName={prevMonthName}
            icon={DollarSign}
            iconBg="bg-primary/12"
            iconColor="text-primary"
            formatValue={formatCurrency}
          />
        </div>
        <div className="card-enter" style={{ animationDelay: '160ms' }}>
          <PillarCard
            label="Contratos Fechados"
            value={contractsPillar.value}
            sublabel={`novos contratos em ${currentMonth}`}
            variation={contractsPillar.variation}
            prevMonthName={prevMonthName}
            icon={FileSignature}
            iconBg="bg-primary/12"
            iconColor="text-primary"
          />
        </div>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Atenção Necessária
            </CardTitle>
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                {alerts.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-sm text-muted-foreground">Tudo sob controle. Nenhum alerta no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAction={() => alert.actionPath && navigate(alert.actionPath)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Atividade do Time
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Nenhuma atividade registrada hoje.
            </p>
          ) : (
            <div className="relative space-y-0">
              {activities.slice(0, 8).map((act, i) => (
                <TimelineItem key={act.id} act={act} isLast={i === Math.min(activities.length, 8) - 1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════
// EXECUTION VIEW
// ═══════════════════════════════════════════
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
  const progress = monthlyGoal > 0 ? Math.round((monthlyDeliveries / monthlyGoal) * 100) : 0;
  const progressColor = progress >= 80 ? 'text-success' : progress >= 60 ? 'text-warning' : 'text-destructive';

  const overduePosts = myPosts.filter(p => p.daysOverdue && p.daysOverdue > 0);
  const todayPosts = myPosts.filter(p => p.dueDate === format(new Date(), 'yyyy-MM-dd'));
  const upcomingPosts = myPosts.filter(p => {
    if (!p.dueDate) return true;
    return p.dueDate > format(new Date(), 'yyyy-MM-dd');
  });
  const sortedPosts = [...overduePosts, ...todayPosts, ...upcomingPosts];

  const handleAction = async (post: any) => {
    if (post.status === 'doing') await changePostStatus(post.id, 'done');
    else if (post.status === 'todo') await changePostStatus(post.id, 'doing');
  };

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="card-enter" style={{ animationDelay: '0ms' }}>
          <KpiCard label="Para Hoje" value={myDayMetrics.forToday} icon={Target} accent={myDayMetrics.forToday > 0} />
        </div>
        <div className="card-enter" style={{ animationDelay: '60ms' }}>
          <KpiCard label="Atrasados" value={myDayMetrics.overdue} icon={AlertTriangle} danger={myDayMetrics.overdue > 0} />
        </div>
        <div className="card-enter" style={{ animationDelay: '120ms' }}>
          <KpiCard label="Em Andamento" value={myDayMetrics.inProgress} icon={Clock} />
        </div>
        <div className="card-enter" style={{ animationDelay: '180ms' }}>
          <KpiCard label="Concluídos Hoje" value={myDayMetrics.completedToday} icon={CheckCircle} accent={myDayMetrics.completedToday > 0} />
        </div>
      </div>

      {/* Monthly Progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Entregas no Mês
            </span>
            <span className={cn("text-sm font-bold font-mono", progressColor)}>
              {monthlyDeliveries}/{monthlyGoal}
            </span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress >= 80 ? "bg-success" : progress >= 60 ? "bg-warning" : "bg-destructive"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">Média {avgPerDay}/dia</p>
            <p className={cn("text-xs font-mono", progressColor)}>{progress}% da meta</p>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Meus Posts
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">{myPosts.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {myPosts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium text-foreground">Nenhum post atribuído</p>
              <p className="text-xs text-muted-foreground">Bom momento pra organizar.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {sortedPosts.slice(0, 10).map(post => (
                <PostItem
                  key={post.id}
                  post={post}
                  onAction={() => handleAction(post)}
                  onNavigate={() => navigate(`/content/post/${post.id}`)}
                />
              ))}
              {myPosts.length > 10 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full mt-2" onClick={() => navigate('/tasks')}>
                  Ver todos ({myPosts.length}) →
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Petron OS shortcut */}
      {userRole === 'social' && (
        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate('/petron-os')}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Sugerir Conteúdos com IA</p>
              <p className="text-xs text-muted-foreground">Use o Petron OS para gerar pautas, legendas e briefings</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sidebar: Upcoming Deadlines ───
function UpcomingDeadlines({ posts }: { posts: any[] }) {
  const upcoming = posts.filter(p => p.dueDate).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).slice(0, 5);
  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Próximos Prazos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {upcoming.map(post => {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const isOverdue = post.dueDate < todayStr;
          const isToday = post.dueDate === todayStr;
          return (
            <div key={post.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{post.title}</p>
                <p className="text-[10px] text-muted-foreground">{post.clientName}</p>
              </div>
              <span className={cn(
                "text-[10px] font-mono shrink-0",
                isOverdue ? "text-destructive" : isToday ? "text-warning" : "text-muted-foreground"
              )}>
                {isOverdue ? `${post.daysOverdue}d atraso` : isToday ? 'Hoje' : post.dueDate}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
export default function WelcomePage() {
  const {
    loading, userRole, greeting, userName, capitalizedDate, currentMonth, prevMonthName, workingDaysRemaining,
    contentPillar, mediaPillar, contractsPillar,
    alerts, activities,
    myDayMetrics, myPosts, monthlyDeliveries, monthlyGoal, avgPerDay,
    changePostStatus,
  } = useWelcomeCommandCenter();

  const { birthdayMembers, isUserBirthdayToday, isUserBirthdayMonth } = useWelcomeData();
  const { showModal, closeModal } = useBirthdayModal(isUserBirthdayToday);

  const isDirector = userRole === 'director' || userRole === 'admin';

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <SectionSkeleton rows={3} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-12">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {isUserBirthdayToday ? `Feliz aniversário, ${userName} 🎂` : `${greeting}, ${userName}`}
            </h1>
            <p className="text-sm text-muted-foreground">Início · {capitalizedDate}</p>
          </div>
        </div>

        {/* Daily Quote */}
        <DailyQuoteCard />

        {/* Content Area */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main Column */}
          <div>
            {isDirector ? (
              <DirectorView
                contentPillar={contentPillar}
                mediaPillar={mediaPillar}
                contractsPillar={contractsPillar}
                prevMonthName={prevMonthName}
                currentMonth={currentMonth}
                alerts={alerts}
                activities={activities}
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
            {!isDirector && <UpcomingDeadlines posts={myPosts} />}
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
