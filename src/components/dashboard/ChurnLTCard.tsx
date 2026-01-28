import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, HelpCircle } from 'lucide-react';

interface ChurnLTCardProps {
  avgMonths: number;
  count: number;
}

export function ChurnLTCard({ avgMonths, count }: ChurnLTCardProps) {
  const formatMonths = (months: number) => {
    if (months === 0) return '—';
    const years = months / 12;
    if (years >= 1) {
      return `${months.toFixed(1).replace('.', ',')} meses (≈ ${years.toFixed(1).replace('.', ',')} anos)`;
    }
    return `${months.toFixed(1).replace('.', ',')} meses`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">LT dos Churns (Período)</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Tempo médio de permanência dos clientes que cancelaram no período selecionado.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  LT = Data de cancelamento - Data de entrada
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {count > 0 ? formatMonths(avgMonths) : '—'}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {count > 0 
            ? `Baseado em ${count} cancelamento${count !== 1 ? 's' : ''}`
            : 'Nenhum cancelamento no período'
          }
        </p>
      </CardContent>
    </Card>
  );
}
