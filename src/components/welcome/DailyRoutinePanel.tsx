import { FileText, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoutineMetrics } from '@/hooks/useWelcomeData';

interface DailyRoutinePanelProps {
  metrics: RoutineMetrics;
}

interface MetricBlockProps {
  icon: React.ReactNode;
  title: string;
  items: { label: string; value: number }[];
}

function MetricBlock({ icon, title, items }: MetricBlockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {items.map((item, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-semibold text-foreground">{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyRoutinePanel({ metrics }: DailyRoutinePanelProps) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-foreground">
          Sua rotina de hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pendências */}
        <MetricBlock
          icon={<FileText className="h-4 w-4" />}
          title="Pendências"
          items={[
            { label: 'A fazer', value: metrics.pendencias.aFazer },
            { label: 'Em andamento', value: metrics.pendencias.emAndamento },
            { label: 'Delegado', value: metrics.pendencias.delegado },
          ]}
        />

        <div className="border-t border-border" />

        {/* Customer Success */}
        <MetricBlock
          icon={<Users className="h-4 w-4" />}
          title="Customer Success"
          items={[
            { label: 'Onboardings', value: metrics.cs.onboardingsAtivos },
            { label: 'Atrasados', value: metrics.cs.acompanhamentosAtrasados },
            { label: 'NPS pendente', value: metrics.nps.pesquisasPendentes },
          ]}
        />
      </CardContent>
    </Card>
  );
}
