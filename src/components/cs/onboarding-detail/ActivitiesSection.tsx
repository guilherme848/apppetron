import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { OnboardingAtividade } from '@/hooks/useOnboardings';

// Map responsavel_perfil to display labels and style
const GROUP_CONFIG: Record<string, { label: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  cs: {
    label: 'Customer Success',
    badgeBg: 'bg-[hsl(var(--info)/0.12)]',
    badgeText: 'text-[hsl(var(--info))]',
    badgeBorder: 'border-[hsl(var(--info)/0.25)]',
  },
  traffic: {
    label: 'Tráfego Pago',
    badgeBg: 'bg-[hsl(258,90%,66%,0.12)]',
    badgeText: 'text-[hsl(258,90%,66%)]',
    badgeBorder: 'border-[hsl(258,90%,66%,0.25)]',
  },
  designer: {
    label: 'Design',
    badgeBg: 'bg-[hsl(var(--success)/0.12)]',
    badgeText: 'text-[hsl(var(--success))]',
    badgeBorder: 'border-[hsl(var(--success)/0.25)]',
  },
  videomaker: {
    label: 'Videomaker',
    badgeBg: 'bg-[hsl(var(--warning)/0.12)]',
    badgeText: 'text-[hsl(var(--warning))]',
    badgeBorder: 'border-[hsl(var(--warning)/0.25)]',
  },
  social: {
    label: 'Social Media',
    badgeBg: 'bg-primary/12',
    badgeText: 'text-primary',
    badgeBorder: 'border-primary/25',
  },
  support: {
    label: 'Atendimento',
    badgeBg: 'bg-muted',
    badgeText: 'text-muted-foreground',
    badgeBorder: 'border-border',
  },
};

const DEFAULT_GROUP_CONFIG = {
  label: 'Outros',
  badgeBg: 'bg-muted',
  badgeText: 'text-muted-foreground',
  badgeBorder: 'border-border',
};

// Map job_role names to responsavel_perfil keys
const ROLE_NAME_TO_PERFIL: Record<string, string> = {
  'gestor de tráfego': 'traffic',
  'designer': 'designer',
  'videomaker': 'videomaker',
  'social media': 'social',
  'atendimento': 'support',
};

// Roles that have full access to all groups
const FULL_ACCESS_ROLES = ['administrador', 'cs', 'customer success', 'diretor', 'sócio', 'socio'];

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
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--destructive)))' }}
    >
      {initials}
    </div>
  );
}

function ActivityCheckbox({ checked, onChange, disabled, readOnly }: { checked: boolean; onChange: () => void; disabled: boolean; readOnly?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || readOnly}
      onClick={onChange}
      className={cn(
        'h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150',
        checked
          ? 'bg-[hsl(var(--success))] border-[hsl(var(--success))] scale-100'
          : readOnly
            ? 'border-muted-foreground/20 bg-transparent cursor-not-allowed'
            : 'border-muted-foreground/40 bg-transparent hover:border-primary/60',
        (disabled || readOnly) && !checked && 'opacity-50 cursor-not-allowed'
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
  const { member, isAdmin } = useAuth();
  const [userRoleName, setUserRoleName] = useState<string | null>(null);

  // Fetch user's job role name
  useEffect(() => {
    if (!member?.role_id) return;
    supabase
      .from('job_roles')
      .select('name')
      .eq('id', member.role_id)
      .single()
      .then(({ data }) => {
        if (data) setUserRoleName(data.name.toLowerCase());
      });
  }, [member?.role_id]);

  const completedCount = atividades.filter(a => a.status === 'concluida').length;
  const totalCount = atividades.length;

  // Determine which perfil the current user belongs to
  const userPerfil = useMemo(() => {
    if (!userRoleName) return null;
    return ROLE_NAME_TO_PERFIL[userRoleName] || null;
  }, [userRoleName]);

  const hasFullAccess = useMemo(() => {
    if (isAdmin) return true;
    if (!userRoleName) return false;
    return FULL_ACCESS_ROLES.some(r => userRoleName.includes(r));
  }, [isAdmin, userRoleName]);

  // Group activities by responsavel_perfil
  const groups = useMemo(() => {
    const groupMap = new Map<string, OnboardingAtividade[]>();
    // Define preferred order
    const order = ['cs', 'traffic', 'designer', 'videomaker', 'social', 'support'];

    atividades.forEach(a => {
      const key = a.responsavel_perfil || 'cs';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(a);
    });

    // Sort by preferred order, unknowns at end
    const sortedKeys = [...groupMap.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    return sortedKeys.map(key => ({
      key,
      config: GROUP_CONFIG[key] || { ...DEFAULT_GROUP_CONFIG, label: key },
      items: groupMap.get(key)!,
    }));
  }, [atividades]);

  // All groups start expanded
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Initialize all as open
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach(g => { initial[g.key] = true; });
    setOpenGroups(initial);
  }, [groups.length]); // only on group count change

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const canInteract = (perfil: string | null): boolean => {
    if (isConcluido) return false;
    if (hasFullAccess) return true;
    const activityPerfil = perfil || 'cs';
    return userPerfil === activityPerfil;
  };

  // Use all members for assignment (csMembers already contains all active members)
  const allMembers = csMembers;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Atividades
          </h2>
          <span className="text-xs text-muted-foreground">{completedCount} de {totalCount} concluídas</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-lg bg-muted overflow-hidden">
          <div
            className="h-full rounded-lg transition-all duration-500"
            style={{
              width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--destructive)))',
            }}
          />
        </div>

        {groups.map((group) => {
          const groupCompleted = group.items.filter(a => a.status === 'concluida').length;
          const isOpen = openGroups[group.key] !== false;
          const userCanInteractGroup = canInteract(group.key);

          return (
            <Collapsible
              key={group.key}
              open={isOpen}
              onOpenChange={() => toggleGroup(group.key)}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full py-2 group cursor-pointer"
                >
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    !isOpen && '-rotate-90'
                  )} />
                  <Badge variant="outline" className={cn('text-[11px] font-semibold border', group.config.badgeBg, group.config.badgeText, group.config.badgeBorder)}>
                    {group.config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{groupCompleted}/{group.items.length} concluídas</span>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-2 pt-1">
                {group.items.map((at, idx) => {
                  const isDone = at.status === 'concluida';
                  const memberName = at.responsavel_name;
                  const isReadOnly = !userCanInteractGroup;

                  const activityContent = (
                    <div
                      key={at.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        isReadOnly && !isDone
                          ? 'bg-card/50 border-border/50'
                          : 'bg-card hover:border-primary/20',
                      )}
                      style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                    >
                      <ActivityCheckbox
                        checked={isDone}
                        onChange={() => onToggle(at.id, at.status)}
                        disabled={isConcluido}
                        readOnly={isReadOnly}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium',
                          isDone && 'line-through text-muted-foreground',
                          isReadOnly && !isDone && 'text-muted-foreground',
                        )}>
                          {at.titulo}
                        </p>
                        {isDone && at.data_conclusao && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {format(new Date(at.data_conclusao), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {/* Assignment controls - only for users who can interact */}
                      {!isConcluido && !isReadOnly && (
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
                                {allMembers.map(m => (
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
                              {allMembers.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      )}

                      {/* Read-only: show assigned member without edit controls */}
                      {!isConcluido && isReadOnly && memberName && (
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar name={memberName} />
                          <span className="text-xs text-muted-foreground">{memberName}</span>
                        </div>
                      )}

                      {/* Concluded: show assigned member */}
                      {isConcluido && memberName && (
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar name={memberName} />
                          <span className="text-xs text-muted-foreground">{memberName}</span>
                        </div>
                      )}
                    </div>
                  );

                  // Wrap read-only items with tooltip
                  if (isReadOnly && !isDone) {
                    return (
                      <Tooltip key={at.id}>
                        <TooltipTrigger asChild>
                          {activityContent}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Atividade do time de {group.config.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return activityContent;
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        <style>{`
          @keyframes checkbox-pop {
            0% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
