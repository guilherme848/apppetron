import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Check, X, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { OnboardingAtividade } from '@/hooks/useOnboardings';

const ETAPA_CONFIG: Record<number, { label: string; name: string }> = {
  1: { label: 'ETAPA 1', name: 'PRIMEIROS PASSOS' },
  2: { label: 'ETAPA 2', name: 'BM' },
  3: { label: 'ETAPA 3', name: 'CAMPANHA' },
};

const FULL_ACCESS_ROLES = ['administrador', 'cs', 'customer success', 'diretor', 'sócio', 'socio'];

interface ActivitiesSectionProps {
  atividades: OnboardingAtividade[];
  isConcluido: boolean;
  csMembers: { id: string; name: string }[];
  trafficMembers: { id: string; name: string }[];
  onToggle: (atividadeId: string, currentStatus: string) => void;
  onResponsavelChange: (atividadeId: string, memberId: string) => void;
}

function MemberAvatar({ name, size = 20 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-[9px] font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
      }}
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
        'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150',
        checked
          ? 'bg-primary border-primary'
          : disabled
            ? 'border-muted-foreground/20 bg-transparent cursor-not-allowed opacity-50'
            : 'border-muted-foreground/40 bg-transparent hover:border-primary/60',
      )}
    >
      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </button>
  );
}

export default function ActivitiesSection({
  atividades, isConcluido, csMembers, onToggle, onResponsavelChange,
}: ActivitiesSectionProps) {
  const { member, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [userRoleName, setUserRoleName] = useState<string | null>(null);

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

  const hasFullAccess = useMemo(() => {
    if (isAdmin) return true;
    if (!userRoleName) return false;
    return FULL_ACCESS_ROLES.some(r => userRoleName.includes(r));
  }, [isAdmin, userRoleName]);

  const completedCount = atividades.filter(a => a.status === 'concluida').length;
  const totalCount = atividades.length;

  // Group by etapa
  const stages = useMemo(() => {
    const map = new Map<number, OnboardingAtividade[]>();
    atividades.forEach(a => {
      const etapa = a.etapa || 1;
      if (!map.has(etapa)) map.set(etapa, []);
      map.get(etapa)!.push(a);
    });
    return [1, 2, 3]
      .filter(e => map.has(e))
      .map(e => ({ etapa: e, items: map.get(e)! }));
  }, [atividades]);

  const [openStages, setOpenStages] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });

  const canInteract = (at: OnboardingAtividade): boolean => {
    if (isConcluido) return false;
    if (hasFullAccess) return true;
    // Non-CS users can only toggle activities delegated to them
    if (member?.id && at.delegado_para_id === member.id) return true;
    return false;
  };

  const handleDelegate = async (atividadeId: string, memberId: string, onboardingId: string) => {
    if (memberId === '_none_') {
      await supabase
        .from('onboarding_atividades')
        .update({ delegado_para_id: null, delegado_por_id: null, delegado_em: null } as any)
        .eq('id', atividadeId);
    } else {
      await supabase
        .from('onboarding_atividades')
        .update({
          delegado_para_id: memberId,
          delegado_por_id: member?.id || null,
          delegado_em: new Date().toISOString(),
        } as any)
        .eq('id', atividadeId);
    }
    queryClient.invalidateQueries({ queryKey: ['onboarding-atividades', onboardingId] });
  };

  const allMembers = csMembers;

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Atividades
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            {completedCount} de {totalCount} concluídas
          </span>
        </div>

        {/* Overall progress */}
        <div className="w-full h-2 rounded-lg bg-muted overflow-hidden">
          <div
            className="h-full rounded-lg transition-all duration-500"
            style={{
              width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
            }}
          />
        </div>

        {/* Stages */}
        {stages.map((stage, stageIdx) => {
          const config = ETAPA_CONFIG[stage.etapa] || { label: `ETAPA ${stage.etapa}`, name: '' };
          const stageCompleted = stage.items.filter(a => a.status === 'concluida').length;
          const stageTotal = stage.items.length;
          const isStageComplete = stageCompleted === stageTotal;
          const isOpen = openStages[stage.etapa] !== false;
          const pct = stageTotal > 0 ? (stageCompleted / stageTotal) * 100 : 0;

          return (
            <Collapsible
              key={stage.etapa}
              open={isOpen}
              onOpenChange={() => setOpenStages(prev => ({ ...prev, [stage.etapa]: !prev[stage.etapa] }))}
            >
              <div
                className="animate-fade-in"
                style={{ animationDelay: `${stageIdx * 60}ms`, animationFillMode: 'both' }}
              >
                {/* Stage header */}
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-5 py-3 cursor-pointer transition-all',
                      'bg-muted/50 hover:bg-muted/80',
                      isStageComplete && 'border-l-[3px] border-l-[hsl(var(--success))]'
                    )}
                  >
                    <ChevronDown className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform duration-200',
                      !isOpen && '-rotate-90'
                    )} />

                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        {config.label} — {config.name}
                      </span>

                      {isStageComplete && (
                        <Badge variant="outline" className="text-[10px] font-semibold border bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]">
                          Concluída
                        </Badge>
                      )}
                    </div>

                    <span className="text-xs font-mono text-muted-foreground">
                      {stageCompleted} de {stageTotal}
                    </span>

                    {/* Mini progress bar */}
                    <div className="w-20 h-1 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: isStageComplete
                            ? 'hsl(var(--success))'
                            : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
                        }}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                {/* Stage activities */}
                <CollapsibleContent>
                  <div className="mt-1">
                    {stage.items.map((at, idx) => {
                      const isDone = at.status === 'concluida';
                      const userCanInteract = canInteract(at);
                      const isReadOnly = !userCanInteract;
                      const delegadoName = at.delegado_para_name;
                      const onboardingId = at.onboarding_id;

                      const row = (
                        <div
                          key={at.id}
                          className={cn(
                            'flex items-center gap-3 h-12 px-4 border-b border-border/50 transition-colors',
                            !isDone && !isReadOnly && 'hover:bg-primary/[0.03]',
                            isReadOnly && !isDone && 'opacity-70',
                          )}
                          style={{ animationDelay: `${(stageIdx * 60) + (idx * 25)}ms`, animationFillMode: 'both' }}
                        >
                          <ActivityCheckbox
                            checked={isDone}
                            onChange={() => onToggle(at.id, at.status)}
                            disabled={isConcluido || isReadOnly}
                          />

                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              'text-sm',
                              isDone && 'line-through text-muted-foreground',
                              isReadOnly && !isDone && 'text-muted-foreground',
                            )}>
                              {at.titulo}
                            </span>
                          </div>

                          {isDone && at.data_conclusao && (
                            <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                              {format(new Date(at.data_conclusao), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          )}

                          {/* Delegation controls — only for full-access users */}
                          {!isConcluido && hasFullAccess && (
                            delegadoName && at.delegado_para_id ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <MemberAvatar name={delegadoName} />
                                <span className="text-[11px] text-muted-foreground max-w-[100px] truncate">{delegadoName}</span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDelegate(at.id, '_none_', onboardingId); }}
                                  className="h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <Select
                                value="_none_"
                                onValueChange={(v) => handleDelegate(at.id, v, onboardingId)}
                              >
                                <SelectTrigger className="w-auto text-xs rounded-lg px-2.5 py-1 h-auto bg-muted/60 border-border/60 text-muted-foreground hover:bg-muted gap-1">
                                  <Users className="h-3 w-3" />
                                  <span className="text-[11px] font-medium">Delegar</span>
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

                          {/* Non-full-access: show delegated badge if delegated to them */}
                          {!isConcluido && !hasFullAccess && delegadoName && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <MemberAvatar name={delegadoName} />
                              <span className="text-[11px] text-muted-foreground">{delegadoName}</span>
                            </div>
                          )}

                          {/* Concluded onboarding: show delegated member */}
                          {isConcluido && delegadoName && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <MemberAvatar name={delegadoName} />
                              <span className="text-[11px] text-muted-foreground">{delegadoName}</span>
                            </div>
                          )}
                        </div>
                      );

                      if (isReadOnly && !isDone) {
                        return (
                          <Tooltip key={at.id}>
                            <TooltipTrigger asChild>{row}</TooltipTrigger>
                            <TooltipContent>
                              <p>Atividade sob responsabilidade do CS</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return row;
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
