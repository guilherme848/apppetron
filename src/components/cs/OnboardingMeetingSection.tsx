import { useState, useEffect } from 'react';
import { AlertTriangle, Users, CheckCircle, Plus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOnboardingMeetings, useCreateOnboardingMeeting } from '@/hooks/useOnboardingMeeting';
import { CS_MEETING_STATUS_LABELS, CS_RISK_LEVEL_LABELS, CS_RISK_LEVEL_COLORS } from '@/types/onboardingMeeting';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';


interface OnboardingMeetingSectionProps {
  clientId: string;
  isLocked?: boolean;
}

export function OnboardingMeetingSection({ clientId, isLocked = false }: OnboardingMeetingSectionProps) {
  const navigate = useNavigate();
  const { data: allMeetings, isLoading } = useOnboardingMeetings(clientId);
  const createMeeting = useCreateOnboardingMeeting();

  // Get the latest meeting for this client
  const latestMeeting = allMeetings?.[0];
  const isCompleted = latestMeeting?.status === 'completed';

  const handleCreateMeeting = async () => {
    const meeting = await createMeeting.mutateAsync({
      client_id: clientId,
      meeting_date: new Date().toISOString().split('T')[0],
    });
    if (meeting?.id) {
      navigate(`/cs/onboarding/meeting/${meeting.id}`);
    }
  };

  if (isLocked) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Etapa Bloqueada</p>
            <p className="text-sm">
              Complete o Briefing da Venda (Etapa 1) para liberar a Reunião de Onboarding.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No meeting exists yet
  if (!latestMeeting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Reunião de Onboarding
          </CardTitle>
          <CardDescription>
            Conduza a reunião estruturada para coletar informações do cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhuma reunião de onboarding registrada para este cliente.
            </p>
            <Button onClick={handleCreateMeeting} disabled={createMeeting.isPending}>
              {createMeeting.isPending ? (
                <Skeleton className="h-4 w-16 rounded" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Iniciar Reunião de Onboarding
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Meeting exists
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Reunião de Onboarding
            </CardTitle>
            <CardDescription>
              {isCompleted ? 'Reunião concluída' : 'Reunião em andamento'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isCompleted ? 'default' : 'outline'}>
              {CS_MEETING_STATUS_LABELS[latestMeeting.status]}
            </Badge>
            {latestMeeting.risk_level && (
              <Badge className={CS_RISK_LEVEL_COLORS[latestMeeting.risk_level]}>
                Risco: {CS_RISK_LEVEL_LABELS[latestMeeting.risk_level]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Meeting Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-medium">
                {format(new Date(latestMeeting.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsável CS</p>
              <p className="font-medium">{latestMeeting.cs_owner_name || 'Não definido'}</p>
            </div>
            {latestMeeting.overall_quality_score !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Score de Qualidade</p>
                <p className="font-medium text-lg">
                  <span className={
                    latestMeeting.overall_quality_score >= 75 ? 'text-green-600' :
                    latestMeeting.overall_quality_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }>
                    {latestMeeting.overall_quality_score}
                  </span>
                  <span className="text-muted-foreground text-sm">/100</span>
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="flex items-center gap-1 mt-1">
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <Calendar className="h-4 w-4 text-secondary" />
                )}
                <span className="font-medium">
                  {CS_MEETING_STATUS_LABELS[latestMeeting.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              variant={isCompleted ? 'outline' : 'default'}
              onClick={() => navigate(`/cs/onboarding/meeting/${latestMeeting.id}`)}
            >
              {isCompleted ? 'Ver Detalhes da Reunião' : 'Continuar Reunião'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
