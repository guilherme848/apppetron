import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Grid3X3 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CohortData {
  cohortMonth: string;
  cohortLabel: string;
  months: (number | null)[];
  totalClients: number;
}

interface CohortAnalysisProps {
  data: CohortData[];
}

function getCellColor(value: number | null): string {
  if (value === null) return 'bg-muted/30';
  if (value >= 90) return 'bg-primary/80 text-primary-foreground';
  if (value >= 70) return 'bg-primary/60 text-primary-foreground';
  if (value >= 50) return 'bg-primary/40';
  if (value >= 30) return 'bg-primary/20';
  return 'bg-muted/50';
}

export function CohortAnalysis({ data }: CohortAnalysisProps) {
  const hasData = data.some((d) => d.totalClients > 0);
  const maxMonths = 12;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            <CardTitle className="text-lg">Análise de Cohort</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Mostra a taxa de retenção de clientes agrupados por mês de entrada. M0 é o mês
                    de entrada, M1 é o primeiro mês após, etc.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>Retenção mensal por coorte de entrada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Dados insuficientes para análise de cohort
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          <CardTitle className="text-lg">Análise de Cohort</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Mostra a taxa de retenção de clientes agrupados por mês de entrada. M0 é o mês de
                  entrada, M1 é o primeiro mês após, etc.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>Retenção mensal por coorte de entrada (% de clientes ativos)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground border-b">
                    Coorte
                  </th>
                  <th className="text-center p-2 font-medium text-muted-foreground border-b w-12">
                    Total
                  </th>
                  {Array.from({ length: maxMonths }, (_, i) => (
                    <th
                      key={i}
                      className="text-center p-2 font-medium text-muted-foreground border-b w-12"
                    >
                      M{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((cohort) => (
                  <tr key={cohort.cohortMonth} className="border-b border-border/50 last:border-0">
                    <td className="p-2 font-medium">{cohort.cohortLabel}</td>
                    <td className="p-2 text-center text-muted-foreground">{cohort.totalClients}</td>
                    {cohort.months.map((value, i) => (
                      <td key={i} className="p-1">
                        <div
                          className={`flex items-center justify-center h-8 rounded text-xs font-medium ${getCellColor(
                            value
                          )}`}
                        >
                          {value !== null ? `${value}%` : '—'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
