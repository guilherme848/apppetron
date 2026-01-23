import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, FileText, CheckCircle, XCircle, AlertCircle, Send } from "lucide-react";
import { ContractEvent } from "@/types/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContractTimelineProps {
  events: ContractEvent[];
}

const eventIcons: Record<string, React.ElementType> = {
  created: FileText,
  generated: FileText,
  sent: Send,
  signed: CheckCircle,
  refused: XCircle,
  canceled: XCircle,
  expired: AlertCircle,
  status_changed: Clock,
  signed_pdf_stored: FileText,
  signed_pdf_uploaded: FileText,
  signature_send_failed: AlertCircle,
  signature_skipped: AlertCircle,
};

export function ContractTimeline({ events }: ContractTimelineProps) {
  if (!events.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {events.map((event, index) => {
              const Icon = eventIcons[event.event_type] || Clock;
              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Timeline line */}
                  {index < events.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
                  )}
                  
                  {/* Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{event.event_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {event.event_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.event_description}
                      </p>
                    )}
                    {event.actor_name && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.actor_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
