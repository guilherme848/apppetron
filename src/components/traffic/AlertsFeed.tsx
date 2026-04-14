import { useState } from 'react';
import { AlertTriangle, Bell, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTrafficAlerts, type TrafficAlert } from '@/hooks/useTrafficAlerts';

function severityStyles(sev: TrafficAlert['severity']) {
  switch (sev) {
    case 'critical': return 'border-red-500/50 bg-red-500/5';
    case 'attention': return 'border-amber-500/50 bg-amber-500/5';
    default: return 'border-border bg-muted/30';
  }
}
function severityBadge(sev: TrafficAlert['severity']) {
  switch (sev) {
    case 'critical': return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
    case 'attention': return <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 border-amber-500/30">Atenção</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">Info</Badge>;
  }
}

export function AlertsFeed() {
  const [expanded, setExpanded] = useState(false);
  const { alerts, loading, acknowledge, acknowledgeMany } = useTrafficAlerts();

  const critical = alerts.filter(a => a.severity === 'critical');
  const attention = alerts.filter(a => a.severity === 'attention');
  const total = alerts.length;

  if (loading && total === 0) return null;
  if (total === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-700 font-medium">Nenhum alerta ativo</span>
          <span className="text-xs text-muted-foreground ml-auto">Atualizado automaticamente a cada minuto</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(critical.length > 0 ? 'border-red-500/50' : 'border-amber-500/50')}>
      <button
        type="button"
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <AlertTriangle className={cn('h-5 w-5', critical.length > 0 ? 'text-red-600' : 'text-amber-600')} />
        <div className="flex-1 flex items-center gap-2 text-sm">
          <span className="font-semibold">{total} alerta{total > 1 ? 's' : ''} ativo{total > 1 ? 's' : ''}</span>
          {critical.length > 0 && <Badge variant="destructive" className="text-[10px]">{critical.length} crítico{critical.length > 1 ? 's' : ''}</Badge>}
          {attention.length > 0 && <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 border-amber-500/30">{attention.length} atenção</Badge>}
        </div>
        {total > 0 && (
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); acknowledgeMany(alerts.map(a => a.id)); }}
          >
            Marcar todos como lidos
          </Button>
        )}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="border-t max-h-[400px] overflow-auto divide-y">
          {alerts.map(a => (
            <div key={a.id} className={cn('p-3 flex items-start gap-3 hover:bg-muted/20', severityStyles(a.severity))}>
              <Bell className={cn('h-4 w-4 mt-0.5 flex-shrink-0',
                a.severity === 'critical' ? 'text-red-600' :
                a.severity === 'attention' ? 'text-amber-600' : 'text-muted-foreground'
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {severityBadge(a.severity)}
                  <span className="text-sm font-medium truncate">{a.client_name || a.ad_account_id}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                    {formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-foreground">{a.message}</p>
                {a.action_hint && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">→ {a.action_hint}</p>
                )}
              </div>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                onClick={() => acknowledge(a.id)}
                title="Marcar como lido"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
