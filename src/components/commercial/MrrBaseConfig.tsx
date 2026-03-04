import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Receipt, DollarSign, RefreshCw, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{fmt(ticketMedio)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">MRR ÷ Clientes ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Atuais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{clientesAtuais}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Contas ativas na base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <div className="text-2xl font-bold">{fmt(mrrAtual)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Receita recorrente mensal</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3" />
        <span>Sincronizado da base de dados</span>
        {lastFetched && <span>— Atualizado em: {formatTimestamp(lastFetched)}</span>}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-1 underline hover:text-foreground transition-colors"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Atualizar'}
          </button>
        )}
      </div>
    </div>
  );
}
