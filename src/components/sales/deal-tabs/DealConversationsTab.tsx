import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Phone, Mail, Calendar, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
};

const TYPE_LABELS: Record<string, string> = {
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  meeting: 'Reunião',
  task: 'Tarefa',
};

interface Props {
  dealId?: string;
}

export function DealConversationsTab({ dealId }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('crm_activities')
        .select('id, title, type, status, scheduled_at, completed_at, notes')
        .eq('deal_id', dealId)
        .order('scheduled_at', { ascending: false })
        .limit(5);
      setActivities(data || []);
      setLoading(false);
    };

    fetchActivities();
  }, [dealId]);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Sem atividades recentes</p>
        <p className="text-xs mt-1 max-w-xs">
          As atividades registradas neste negócio aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Últimas atividades
      </p>
      {activities.map(act => {
        const Icon = TYPE_ICONS[act.type] || MessageCircle;
        const label = TYPE_LABELS[act.type] || act.type;
        return (
          <div
            key={act.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{act.title}</p>
                <Badge variant={act.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                  {act.status === 'completed' ? 'Concluída' : 'Pendente'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                {act.scheduled_at && (
                  <span className="text-xs text-muted-foreground">
                    · {format(new Date(act.scheduled_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                )}
              </div>
              {act.notes && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
