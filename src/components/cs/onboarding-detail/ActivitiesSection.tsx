import { useMemo } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OnboardingAtividade } from '@/hooks/useOnboardings';

interface ActivitiesSectionProps {
  atividades: OnboardingAtividade[];
  isConcluido: boolean;
  csMembers: { id: string; name: string }[];
  trafficMembers: { id: string; name: string }[];
  onToggle: (atividadeId: string, currentStatus: string) => void;
  onResponsavelChange: (atividadeId: string, memberId: string) => void;
}

export default function ActivitiesSection({
  atividades, isConcluido, csMembers, trafficMembers, onToggle, onResponsavelChange,
}: ActivitiesSectionProps) {
  const completedCount = atividades.filter(a => a.status === 'concluida').length;
  const totalCount = atividades.length;

  const groups = useMemo(() => {
    const cs = atividades.filter(a => a.responsavel_perfil === 'cs' || !a.responsavel_perfil);
    const traffic = atividades.filter(a => a.responsavel_perfil === 'trafego');
    return [
      { key: 'cs', label: 'Customer Success', items: cs, badgeClass: 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]', members: csMembers },
      { key: 'trafego', label: 'Tráfego Pago', items: traffic, badgeClass: 'bg-[hsl(258,90%,66%,0.12)] text-[hsl(258,90%,66%)] border-[hsl(258,90%,66%,0.25)]', members: trafficMembers },
    ].filter(g => g.items.length > 0);
  }, [atividades, csMembers, trafficMembers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Atividades
        </h2>
        <span className="text-xs text-muted-foreground">{completedCount} de {totalCount} concluídas</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
            background: 'linear-gradient(90deg, #F97316, #f43f5e)',
          }}
        />
      </div>

      {groups.map((group) => {
        const groupCompleted = group.items.filter(a => a.status === 'concluida').length;
        return (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-[10px] font-semibold border', group.badgeClass)}>
                {group.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{groupCompleted}/{group.items.length} concluídas</span>
            </div>

            {group.items.map((at, idx) => {
              const isDone = at.status === 'concluida';
              return (
                <div
                  key={at.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card transition-all hover:border-primary/20"
                  style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                >
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => onToggle(at.id, at.status)}
                    disabled={isConcluido}
                    className={cn(
                      'transition-transform',
                      isDone && 'data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', isDone && 'line-through text-muted-foreground')}>
                      {at.titulo}
                    </p>
                    {isDone && at.data_conclusao && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {format(new Date(at.data_conclusao), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>

                  {!isConcluido && (
                    <Select
                      value={at.responsavel_id || '_none_'}
                      onValueChange={(v) => onResponsavelChange(at.id, v)}
                    >
                      <SelectTrigger className={cn('w-[160px] text-xs', !at.responsavel_id && 'text-[hsl(45,93%,47%)]')}>
                        <SelectValue placeholder="Atribuir responsável">
                          {!at.responsavel_id ? (
                            <span className="flex items-center gap-1 text-[hsl(45,93%,47%)]">
                              <UserPlus className="h-3.5 w-3.5" />
                              Atribuir responsável
                            </span>
                          ) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">Nenhum</SelectItem>
                        {group.members.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {isConcluido && at.responsavel_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {at.responsavel_name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
