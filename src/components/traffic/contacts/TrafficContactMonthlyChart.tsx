import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  counts: Record<string, number> | undefined;
  loading: boolean;
}

export function TrafficContactMonthlyChart({ counts, loading }: Props) {
  const now = new Date();
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  }, []);

  const maxCount = useMemo(() => {
    if (!counts) return 1;
    const vals = Object.values(counts);
    return Math.max(1, ...vals);
  }, [counts]);

  const total = useMemo(() => {
    if (!counts) return 0;
    return Object.values(counts).reduce((s, v) => s + v, 0);
  }, [counts]);

  if (loading) return <Skeleton className="h-40 rounded-2xl" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm capitalize">Contatos em {monthLabel}</CardTitle>
          <span className="text-2xl font-bold font-mono">{total}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <TooltipProvider delayDuration={0}>
          <div className="flex items-end gap-[2px] h-20">
            {days.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const count = counts?.[key] || 0;
              const heightPct = count > 0 ? Math.max(12, (count / maxCount) * 100) : 4;
              const future = isFuture(day);
              const today = isToday(day);

              let bgClass = 'bg-muted';
              if (future) bgClass = 'bg-border/30';
              else if (count > 0) bgClass = 'bg-primary';

              const isFirst = i === 0;
              const isLast = i === days.length - 1;

              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={`w-full rounded-sm transition-all ${bgClass} ${today ? 'ring-2 ring-primary/30' : ''}`}
                        style={{ height: `${heightPct}%` }}
                      />
                      {(isFirst || isLast || today) && (
                        <span className="text-[9px] text-muted-foreground mt-1">
                          {format(day, 'd')}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{format(day, 'dd/MM')}</p>
                    <p>{count} contato{count !== 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
