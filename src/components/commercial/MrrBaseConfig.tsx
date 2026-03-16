import { BarChart2, Users, DollarSign, RefreshCw, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MrrBaseConfigProps {
  ticketMedio: number;
  clientesAtuais: number;
  mrrAtual: number;
  loading?: boolean;
  lastFetched?: Date | null;
  onRefresh?: () => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

export default function MrrBaseConfig({ ticketMedio, clientesAtuais, mrrAtual, loading, lastFetched, onRefresh }: MrrBaseConfigProps) {
  const formatTimestamp = (d: Date) => {
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const cards = [
    {
      label: 'TICKET MÉDIO',
      value: fmt(ticketMedio),
      sub: 'valor médio por contrato ativo',
      icon: BarChart2,
      skeletonW: 'w-32',
    },
    {
      label: 'CLIENTES ATIVOS',
      value: String(clientesAtuais),
      sub: 'contas ativas na base',
      icon: Users,
      skeletonW: 'w-20',
    },
    {
      label: 'RECEITA MENSAL',
      value: fmt(mrrAtual),
      sub: 'receita acumulada mensal',
      icon: DollarSign,
      skeletonW: 'w-36',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                'relative rounded-2xl border border-border bg-card p-5 transition-all duration-150 hover:border-foreground/20',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {card.label}
                </p>
                <Icon className="h-[18px] w-[18px] text-muted-foreground/60" />
              </div>
              {loading ? (
                <Skeleton className={cn('h-9 mt-2', card.skeletonW)} />
              ) : (
                <p className="mt-2 text-[32px] font-extrabold leading-none tracking-tight text-foreground font-mono">
                  {card.value}
                </p>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Sync line — only on Ticket Médio */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <RefreshCw className="h-3 w-3" />
        <span>Sincronizado</span>
        {lastFetched && <span>· Atualizado {formatTimestamp(lastFetched)}</span>}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Atualizar'}
          </button>
        )}
      </div>
    </div>
  );
}
