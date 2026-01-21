import { Loader2, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCsNps } from '@/hooks/useCsData';
import { CS_NPS_CLASSIFICATION_LABELS } from '@/types/cs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CsNps() {
  const { responses, getNpsScore, getAverageNps, loading } = useCsNps();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'promoter': return 'bg-green-500';
      case 'passive': return 'bg-yellow-500';
      case 'detractor': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Star className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">NPS</h1>
          <p className="text-muted-foreground">Net Promoter Score</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>NPS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{getNpsScore()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Média de Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{getAverageNps().toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Respostas</CardTitle>
          <CardDescription>{responses.length} respostas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma resposta registrada</p>
          ) : (
            <div className="space-y-3">
              {responses.map((response) => (
                <div key={response.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getClassificationColor(response.classification)}`}>
                      {response.score}
                    </div>
                    <div>
                      <p className="font-medium">{response.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(response.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {CS_NPS_CLASSIFICATION_LABELS[response.classification]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
