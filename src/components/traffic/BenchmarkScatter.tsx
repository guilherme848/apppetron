import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import type { ClientMonitoringRow } from '@/hooks/useMetaMonitoring';

interface Props {
  rows: ClientMonitoringRow[];
  onClientClick?: (row: ClientMonitoringRow) => void;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function BenchmarkScatter({ rows, onClientClick }: Props) {
  const data = useMemo(() => {
    return rows
      .filter(r => r.current.whatsapp_conversations > 0 && r.current.cost_per_conversation > 0)
      .map(r => ({
        x: r.current.whatsapp_conversations,
        y: r.current.cost_per_conversation,
        name: r.client_name,
        health: r.health,
        row: r,
      }));
  }, [rows]);

  const medianCost = useMemo(() => median(data.map(d => d.y)), [data]);
  const medianVolume = useMemo(() => median(data.map(d => d.x)), [data]);

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Nenhum cliente com conversas no período selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-muted/30 rounded-md">
          <p className="text-xs text-muted-foreground">Mediana volume</p>
          <p className="text-lg font-bold">{medianVolume.toFixed(0)} conversas</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-md">
          <p className="text-xs text-muted-foreground">Mediana custo/conversa</p>
          <p className="text-lg font-bold">{fmtBRL(medianCost)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            type="number" dataKey="x" name="Conversas"
            label={{ value: 'Conversas no período', position: 'insideBottom', offset: -10, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="number" dataKey="y" name="Custo/conv"
            label={{ value: 'Custo por conversa (R$)', angle: -90, position: 'insideLeft', fontSize: 11 }}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `R$${v.toFixed(0)}`}
          />
          <ReferenceLine x={medianVolume} stroke="#888" strokeDasharray="4 4" label={{ value: 'Mediana volume', fontSize: 10, fill: '#888' }} />
          <ReferenceLine y={medianCost} stroke="#888" strokeDasharray="4 4" label={{ value: 'Mediana custo', fontSize: 10, fill: '#888', position: 'insideTopRight' }} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p: any = payload[0].payload;
              return (
                <div className="bg-card border rounded-md p-2 text-xs shadow">
                  <p className="font-medium mb-1">{p.name}</p>
                  <p>{p.x} conversas</p>
                  <p>{fmtBRL(p.y)} por conversa</p>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            onClick={(p: any) => onClientClick && onClientClick(p.row)}
            className="cursor-pointer"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={
                entry.health === 'red' ? '#dc2626' :
                entry.health === 'yellow' ? '#d97706' :
                '#16a34a'
              } />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-md">
          <p className="font-medium text-green-700">🎯 Quadrante ideal (direita-baixo)</p>
          <p className="text-muted-foreground mt-1">Alto volume + baixo custo/conversa. Estratégia a replicar.</p>
        </div>
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-md">
          <p className="font-medium text-red-700">⚠️ Atenção (esquerda-alto)</p>
          <p className="text-muted-foreground mt-1">Poucas conversas e custo acima da mediana. Priorizar otimização.</p>
        </div>
      </div>
    </div>
  );
}
