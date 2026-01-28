import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Receipt, Lock } from 'lucide-react';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';

interface TicketByNiche {
  nicheId: string | null;
  nicheName: string;
  avgTicket: number;
  clientCount: number;
}

interface TicketByNicheChartProps {
  data: TicketByNiche[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function TicketByNicheChart({ data }: TicketByNicheChartProps) {
  const { canViewFinancialValues, loading } = useSensitivePermission();
  const hasData = data.length > 0;
  const canView = canViewFinancialValues();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  // User doesn't have permission
  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <CardTitle className="text-lg">Ticket Médio por Nicho</CardTitle>
          </div>
          <CardDescription>Valor médio mensal por segmento de mercado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Lock className="h-10 w-10" />
            <p className="text-center">
              Acesso restrito ao administrador
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-2 shadow-md">
          <p className="font-medium">{item.nicheName}</p>
          <p className="text-sm">Ticket médio: {formatCurrency(item.avgTicket)}</p>
          <p className="text-sm text-muted-foreground">
            {item.clientCount} cliente{item.clientCount !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          <CardTitle className="text-lg">Ticket Médio por Nicho</CardTitle>
        </div>
        <CardDescription>Valor médio mensal por segmento de mercado</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Nenhum dado disponível
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.slice(0, 10)}
                layout="vertical"
                margin={{ left: 20, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="nicheName"
                  width={120}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="avgTicket"
                  fill="hsl(var(--chart-2))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
