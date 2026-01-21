import { useState } from 'react';
import { Loader2, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCsClientOnboarding, useCsClientTasks } from '@/hooks/useCsData';
import { CS_ONBOARDING_STATUS_LABELS } from '@/types/cs';
import { Link } from 'react-router-dom';

export default function CsOnboarding() {
  const { onboardings, loading } = useCsClientOnboarding();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { tasks } = useCsClientTasks(selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'attention': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProgress = (onboardingId: string) => {
    if (selectedId !== onboardingId) return 0;
    const done = tasks.filter(t => t.status === 'done').length;
    return tasks.length > 0 ? (done / tasks.length) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-muted-foreground">Acompanhamento de onboarding de clientes</p>
        </div>
      </div>

      {onboardings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum onboarding em andamento
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {onboardings.map((onboarding) => (
            <Card 
              key={onboarding.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedId(selectedId === onboarding.id ? null : onboarding.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(onboarding.status)}
                    <CardTitle className="text-base">
                      <Link 
                        to={`/cs/client/${onboarding.client_id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onboarding.client_name}
                      </Link>
                    </CardTitle>
                  </div>
                  <Badge variant="outline">
                    {CS_ONBOARDING_STATUS_LABELS[onboarding.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  Fluxo: {onboarding.flow_name}
                </div>
                {selectedId === onboarding.id && (
                  <div className="mt-4 space-y-2">
                    <Progress value={getProgress(onboarding.id)} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {tasks.filter(t => t.status === 'done').length} de {tasks.length} tarefas concluídas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
