import { useMemo } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

function MemberAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #F97316, #f43f5e)' }}
    >
      {initials}
    </div>
  );
}

function ActivityCheckbox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150',
        checked
          ? 'bg-primary border-primary scale-100'
          : 'border-muted-foreground/40 bg-transparent hover:border-primary/60',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      style={checked ? { animation: 'checkbox-pop 150ms ease-out' } : undefined}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
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
      {
        key: 'cs', label: 'Customer Success', items: cs,
        badgeBg: 'bg-[hsl(var(--info)/0.12)]',
        badgeText: 'text-[hsl(var(--info))]',
        badgeBorder: 'border-[hsl(var(--info)/0.25)]',
        members: csMembers,
      },
      {
        key: 'trafego', label: 'Tráfego Pago', items: traffic,
        badgeBg: 'bg-[hsl(258,90%,66%,0.12)]',
        badgeText: 'text-[hsl(258,90%,66%)]',
        badgeBorder: 'border-[hsl(258,90%,66%,0.25)]',
        members: trafficMembers,
      },
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

      {groups.map((group, gi) => {
        const groupCompleted = group.items.filter(a => a.status === 'concluida').length;
        return (
          <div key={group.key}>
            {gi > 0 && <div className="border-t border-border/50 my-4" />}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-[11px] font-semibold border', group.badgeBg, group.badgeText, group.badgeBorder)}>
                  {group.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{groupCompleted}/{group.items.length} concluídas</span>
              </div>

              {group.items.map((at, idx) => {
                const isDone = at.status === 'concluida';
                const memberName = at.responsavel_name;
                return (
                  <div
                    key={at.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card transition-all hover:border-primary/20"
                    style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                  >
                    <ActivityCheckbox
                      checked={isDone}
                      onChange={() => onToggle(at.id, at.status)}
                      disabled={isConcluido}
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
                      at.responsavel_id && memberName ? (
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar name={memberName} />
                          <span className="text-xs text-muted-foreground">{memberName}</span>
                          <Select
                            value={at.responsavel_id}
                            onValueChange={(v) => onResponsavelChange(at.id, v)}
                          >
                            <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent shadow-none [&>svg]:hidden">
                              <span className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer">✎</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none_">Nenhum</SelectItem>
                              {group.members.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Select
                          value="_none_"
                          onValueChange={(v) => onResponsavelChange(at.id, v)}
                        >
                          <SelectTrigger className={cn(
                            'w-auto text-xs rounded-md px-[10px] py-1 h-auto',
                            'bg-[hsl(var(--warning)/0.12)] border-[hsl(var(--warning)/0.25)] text-[hsl(var(--warning))]',
                            'hover:bg-[hsl(var(--warning)/0.2)]'
                          )}>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs font-medium">Atribuir</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">Nenhum</SelectItem>
                            {group.members.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    )}

                    {isConcluido && memberName && (
                      <div className="flex items-center gap-1.5">
                        <MemberAvatar name={memberName} />
                        <span className="text-xs text-muted-foreground">{memberName}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes checkbox-pop {
          0% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
