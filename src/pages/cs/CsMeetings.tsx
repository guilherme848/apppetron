import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCsMeetings } from '@/hooks/useCsData';
import { CS_MEETING_STATUS_LABELS, CS_MEETING_TYPE_LABELS, CS_MEETING_PERCEPTION_LABELS } from '@/types/cs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CsMeetings() {
  const { meetings, loading } = useCsMeetings();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Reuniões</h1>
          <p className="text-muted-foreground">Histórico de reuniões com clientes</p>
        </div>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma reunião registrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{meeting.client_name}</CardTitle>
                  <Badge variant="outline">{CS_MEETING_STATUS_LABELS[meeting.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{format(new Date(meeting.meeting_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  <span>{CS_MEETING_TYPE_LABELS[meeting.type]}</span>
                  {meeting.perception && (
                    <Badge variant="secondary">{CS_MEETING_PERCEPTION_LABELS[meeting.perception]}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
