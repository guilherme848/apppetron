import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PETRON_INTERNAL_ACCOUNT_ID } from '@/hooks/useAgencyContentProduction';
import { ROLE_OPTIONS, ROLE_KEY_TO_ACCOUNT_FIELD, ROLE_KEY_LABELS, RoleKey, getVisibleRoles, PlanFlags, DEFAULT_PLAN_FLAGS } from '@/lib/accountTeam';
import { Skeleton } from '@/components/ui/skeleton';

interface PetronTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TeamData {
  designer_member_id: string | null;
  videomaker_member_id: string | null;
  social_member_id: string | null;
  traffic_member_id: string | null;
  support_member_id: string | null;
  cs_member_id: string | null;
  service_id: string | null;
}

export function PetronTeamDialog({ open, onOpenChange }: PetronTeamDialogProps) {
  const { getActiveMembers } = useTeamMembers();
  const activeMembers = getActiveMembers();
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [planFlags, setPlanFlags] = useState<PlanFlags>(DEFAULT_PLAN_FLAGS);

  useEffect(() => {
    if (open) {
      fetchTeamData();
    }
  }, [open]);

  const fetchTeamData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('designer_member_id, videomaker_member_id, social_member_id, traffic_member_id, support_member_id, cs_member_id, service_id')
      .eq('id', PETRON_INTERNAL_ACCOUNT_ID)
      .single();
    
    if (error) {
      console.error('Error fetching Petron team:', error);
      toast.error('Erro ao carregar time Petron');
    } else {
      setTeamData(data);
      // Fetch plan flags
      if (data?.service_id) {
        const { data: svc } = await supabase
          .from('services')
          .select('has_content, has_traffic')
          .eq('id', data.service_id)
          .single();
        if (svc) {
          setPlanFlags({ has_content: svc.has_content ?? true, has_traffic: svc.has_traffic ?? true });
        }
      }
    }
    setLoading(false);
  };

  const visibleRoles = useMemo(() => getVisibleRoles(planFlags), [planFlags]);
  const visibleRoleOptions = ROLE_OPTIONS.filter(r => visibleRoles.includes(r.value));

  const getValue = (roleKey: RoleKey): string | null => {
    if (!teamData) return null;
    const field = ROLE_KEY_TO_ACCOUNT_FIELD[roleKey];
    return (teamData as any)[field] || null;
  };

  const handleChange = async (roleKey: RoleKey, memberId: string) => {
    const field = ROLE_KEY_TO_ACCOUNT_FIELD[roleKey];
    const value = memberId === '_none_' ? null : memberId;
    
    setSavingField(field);
    
    const { error } = await supabase
      .from('accounts')
      .update({ [field]: value })
      .eq('id', PETRON_INTERNAL_ACCOUNT_ID);
    
    if (error) {
      console.error('Error updating team:', error);
      toast.error(`Erro ao atualizar ${ROLE_KEY_LABELS[roleKey]}`);
    } else {
      setTeamData(prev => prev ? { ...prev, [field]: value } : null);
      toast.success(`${ROLE_KEY_LABELS[roleKey]} atualizado com sucesso`);
    }
    
    setSavingField(null);
  };

  const getTeamStatus = () => {
    if (!teamData) return { isComplete: false, defined: 0, total: visibleRoles.length, missingLabels: [] };
    
    const missing: string[] = [];
    let defined = 0;
    
    visibleRoles.forEach((roleKey) => {
      const field = ROLE_KEY_TO_ACCOUNT_FIELD[roleKey];
      if ((teamData as any)[field]) {
        defined++;
      } else {
        missing.push(ROLE_KEY_LABELS[roleKey]);
      }
    });
    
    return {
      isComplete: missing.length === 0,
      defined,
      total: visibleRoles.length,
      missingLabels: missing,
    };
  };

  const teamStatus = getTeamStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Time Petron
            </DialogTitle>
            {!loading && (
              teamStatus.isComplete ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completo
                </Badge>
              ) : (
                <Badge variant="attention" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {teamStatus.defined}/{teamStatus.total}
                </Badge>
              )
            )}
          </div>
          {!loading && !teamStatus.isComplete && teamStatus.missingLabels.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Faltando: {teamStatus.missingLabels.join(', ')}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {visibleRoleOptions.map((role) => {
              const currentValue = getValue(role.value);
              const isSaving = savingField === ROLE_KEY_TO_ACCOUNT_FIELD[role.value];
              const isMissing = !currentValue;
              
              return (
                <div key={role.value} className="grid grid-cols-2 gap-3 items-center">
                  <Label className={`text-sm ${isMissing ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {role.label}
                    {isMissing && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <div className="relative">
                    <Select
                      value={currentValue || '_none_'}
                      onValueChange={(v) => handleChange(role.value, v)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className={`h-9 text-sm ${isMissing ? 'border-amber-400' : ''}`}>
                        {isSaving ? (
                          <Skeleton className="h-4 w-16 rounded" />
                        ) : (
                          <SelectValue placeholder="Não definido" />
                        )}
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="_none_">Não definido</SelectItem>
                        {activeMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
            
            {activeMembers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum usuário ativo cadastrado.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
