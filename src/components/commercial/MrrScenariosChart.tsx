import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { ScenarioConfig, calcScenarioMonths } from './MrrScenarioCard';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

interface MrrScenariosChartProps {
  clientesIniciais: number;
  ticketMedio: number;
  inicial: ScenarioConfig;
  bom: ScenarioConfig;
  otimo: ScenarioConfig;
}

export default function MrrScenariosChart({ clientesIniciais, ticketMedio, inicial, bom, otimo }: MrrScenariosChartProps) {
  const chartData = useMemo(() => {
    const mI = calcScenarioMonths(clientesIniciais, ticketMedio, inicial);
    const mB = calcScenarioMonths(clientesIniciais, ticketMedio, bom);
    const mO = calcScenarioMonths(clientesIniciais, ticketMedio, otimo);
    return MONTHS.map((name, i) => ({
      name,
      inicial: mI[i].mrr,
      bom: mB[i].mrr,
      otimo: mO[i].mrr,
      clientesInicial: mI[i].clientes,
      clientesBom: mB[i].clientes,
      clientesOtimo: mO[i].clientes,
    }));
  }, [clientesIniciais, ticketMedio, inicial, bom, otimo]);

  const chartConfig = {
    inicial: { label: 'Cenário Inicial', color: 'hsl(0 72% 51%)' },
    bom: { label: 'Cenário Bom', color: 'hsl(45 93% 47%)' },
    otimo: { label: 'Cenário Ótimo', color: 'hsl(142 71% 45%)' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparativo de Cenários — MRR Projetado</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value, name, item) => {
                  const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                  const payload = item.payload;
                  const clientesKey = name === 'inicial' ? 'clientesInicial' : name === 'bom' ? 'clientesBom' : 'clientesOtimo';
                  return (
                    <span>{label}: {fmt(Number(value))} ({payload[clientesKey]} clientes)</span>
                  );
                }}
              />}
            />
            <Legend />
            <Line type="monotone" dataKey="inicial" name="Cenário Inicial" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="bom" name="Cenário Bom" stroke="hsl(45 93% 47%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="otimo" name="Cenário Ótimo" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
