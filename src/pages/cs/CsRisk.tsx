import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCsRiskCases } from '@/hooks/useCsData';
import { CS_RISK_LEVEL_LABELS, CS_RISK_STATUS_LABELS, CS_RISK_REASON_LABELS } from '@/types/cs';

export default function CsRisk() {
  const { cases, loading } = useCsRiskCases();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'moderate': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Risco & Cancelamento</h1>
          <p className="text-muted-foreground">Gerenciamento de clientes em risco</p>
        </div>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum caso de risco registrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((riskCase) => (
            <Card key={riskCase.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{riskCase.client_name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={getLevelColor(riskCase.level)}>
                      {CS_RISK_LEVEL_LABELS[riskCase.level]}
                    </Badge>
                    <Badge variant="outline">
                      {CS_RISK_STATUS_LABELS[riskCase.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Motivo: {CS_RISK_REASON_LABELS[riskCase.reason]}
                </p>
                {riskCase.owner_member_name && (
                  <p className="text-sm text-muted-foreground">
                    Responsável: {riskCase.owner_member_name}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
