import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ReferenceDot } from 'recharts';
import { ScenarioConfig, calcScenarioMonths } from './MrrScenarioCard';
import type { MonthlyActuals } from '@/hooks/usePlatformData';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

interface MrrScenariosChartProps {
  clientesIniciais: number;
  ticketMedio: number;
  inicial: ScenarioConfig;
  bom: ScenarioConfig;
  otimo: ScenarioConfig;
  monthlyActuals: MonthlyActuals[];
}

const currentMonth = new Date().getMonth();

function calcNovaPrevisaoMrr(monthlyActuals: MonthlyActuals[], ticketMedio: number, config: ScenarioConfig): number[] {
  const result: number[] = [];
  for (let i = 0; i < 12; i++) {
    if (i <= currentMonth) {
      result.push(monthlyActuals[i]?.mrrAtMonth ?? 0);
    } else {
      const prevClientes = i === currentMonth + 1
        ? (monthlyActuals[currentMonth]?.activeClientsAtMonth ?? 0)
        : Math.round((result[i - 1] / ticketMedio));
      const newClientes = Math.round(prevClientes - (prevClientes * config.churnPct / 100) + config.adicaoMensal);
      result.push(newClientes * ticketMedio);
    }
  }
  return result;
}

export default function MrrScenariosChart({ clientesIniciais, ticketMedio, inicial, bom, otimo, monthlyActuals }: MrrScenariosChartProps) {
  const chartData = useMemo(() => {
    const janClientes = monthlyActuals[0]?.activeClientsAtMonth ?? clientesIniciais;
    const janMrr = monthlyActuals[0]?.mrrAtMonth ?? 0;
    // Estimativas originais (starting from real January)
    const eI = calcScenarioMonths(clientesIniciais, ticketMedio, inicial, janClientes, janMrr);
    const eB = calcScenarioMonths(clientesIniciais, ticketMedio, bom, janClientes, janMrr);
    const eO = calcScenarioMonths(clientesIniciais, ticketMedio, otimo, janClientes, janMrr);

    // Nova Previsão
    const npI = calcNovaPrevisaoMrr(monthlyActuals, ticketMedio, inicial);
    const npB = calcNovaPrevisaoMrr(monthlyActuals, ticketMedio, bom);
    const npO = calcNovaPrevisaoMrr(monthlyActuals, ticketMedio, otimo);

    return MONTHS.map((name, i) => ({
      name,
      // Nova Previsão (solid lines)
      npInicial: npI[i],
      npBom: npB[i],
      npOtimo: npO[i],
      // Estimativa Original (dashed lines)
      estInicial: eI[i].mrr,
      estBom: eB[i].mrr,
      estOtimo: eO[i].mrr,
      isCurrent: i === currentMonth,
    }));
  }, [clientesIniciais, ticketMedio, inicial, bom, otimo, monthlyActuals]);

  const chartConfig = {
    npInicial: { label: 'Inicial — Nova Previsão', color: 'hsl(0 72% 51%)' },
    npBom: { label: 'Bom — Nova Previsão', color: 'hsl(45 93% 47%)' },
    npOtimo: { label: 'Ótimo — Nova Previsão', color: 'hsl(142 71% 45%)' },
    estInicial: { label: 'Inicial — Estimativa', color: 'hsl(0 72% 51%)' },
    estBom: { label: 'Bom — Estimativa', color: 'hsl(45 93% 47%)' },
    estOtimo: { label: 'Ótimo — Estimativa', color: 'hsl(142 71% 45%)' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparativo de Cenários — MRR Projetado</CardTitle>
        <p className="text-xs text-muted-foreground">── Nova Previsão &nbsp;&nbsp; ╌╌ Estimativa Original</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value, name) => {
                  const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                  return <span>{label}: {fmt(Number(value))}</span>;
                }}
              />}
            />
            <Legend />
            {/* Nova Previsão — solid lines */}
            <Line type="monotone" dataKey="npInicial" name="Inicial — Nova Previsão" stroke="hsl(0 72% 51%)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="npBom" name="Bom — Nova Previsão" stroke="hsl(45 93% 47%)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="npOtimo" name="Ótimo — Nova Previsão" stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={{ r: 3 }} />
            {/* Estimativa Original — dashed lines */}
            <Line type="monotone" dataKey="estInicial" name="Inicial — Estimativa" stroke="hsl(0 72% 51%)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="estBom" name="Bom — Estimativa" stroke="hsl(45 93% 47%)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="estOtimo" name="Ótimo — Estimativa" stroke="hsl(142 71% 45%)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            {/* Current month dots */}
            {chartData[currentMonth] && (
              <>
                <ReferenceDot x={MONTHS[currentMonth]} y={chartData[currentMonth].npInicial} r={6} fill="hsl(0 72% 51%)" stroke="white" strokeWidth={2} />
                <ReferenceDot x={MONTHS[currentMonth]} y={chartData[currentMonth].npBom} r={6} fill="hsl(45 93% 47%)" stroke="white" strokeWidth={2} />
                <ReferenceDot x={MONTHS[currentMonth]} y={chartData[currentMonth].npOtimo} r={6} fill="hsl(142 71% 45%)" stroke="white" strokeWidth={2} />
              </>
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
