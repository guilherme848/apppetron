import { ClipboardList, AlertTriangle, Calendar, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TaskCounts } from '@/hooks/useMyTasks';
import { cn } from '@/lib/utils';

interface TaskCounterCardsProps {
  counts: TaskCounts;
  loading: boolean;
}

export function TaskCounterCards({ counts, loading }: TaskCounterCardsProps) {
  const cards = [
    {
      title: 'Total Abertas',
      value: counts.total,
      icon: ClipboardList,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Atrasadas',
      value: counts.overdue,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      highlight: counts.overdue > 0,
    },
    {
      title: 'Para Hoje',
      value: counts.dueToday,
      icon: Calendar,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  const moduleCards = [
    { label: 'Conteúdo', count: counts.byModule.content },
    { label: 'Tráfego', count: counts.byModule.traffic },
    { label: 'CS', count: counts.byModule.cs },
  ].filter(m => m.count > 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(card => (
          <Card 
            key={card.title} 
            className={cn(
              "transition-all",
              card.highlight && "border-destructive/50 shadow-destructive/20 shadow-md"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-lg", card.bgColor)}>
                  <card.icon className={cn("h-5 w-5", card.color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={cn("text-2xl font-bold", card.highlight && "text-destructive")}>
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module breakdown */}
      {moduleCards.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Por Módulo</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {moduleCards.map(m => (
                <div 
                  key={m.label}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
                >
                  <span className="text-sm text-muted-foreground">{m.label}</span>
                  <span className="text-sm font-semibold">{m.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
