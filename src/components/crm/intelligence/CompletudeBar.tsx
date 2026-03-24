import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CompletudeBarProps {
  percent: number;
  missing: string[];
}

export function CompletudeBar({ percent, missing }: CompletudeBarProps) {
  const color = percent >= 80 ? 'text-[hsl(var(--success))]' : percent >= 50 ? 'text-[hsl(var(--warning))]' : 'text-destructive';
  const barColor = percent >= 80 ? '[&>div]:bg-[hsl(var(--success))]' : percent >= 50 ? '[&>div]:bg-[hsl(var(--warning))]' : '[&>div]:bg-destructive';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-muted-foreground">
          Perfil do cliente: <span className={cn('font-mono', color)}>{percent}%</span> completo
        </p>
        {percent < 50 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/.25)]">
            Dados insuficientes para IA
          </span>
        )}
      </div>
      <Progress value={percent} className={cn('h-1.5', barColor)} />
      {missing.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Faltam: {missing.join(', ')}
        </p>
      )}
    </div>
  );
}
