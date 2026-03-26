import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Account, RESPONSIBLE_ROLE_OPTIONS, ResponsibleRoleKey } from '@/types/crm';
import { getAccountTeamStatus, getVisibleRoles, PlanFlags, DEFAULT_PLAN_FLAGS, ROLE_KEY_LABELS } from '@/lib/accountTeam';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountTeamCardProps {
  account: Account;
  onUpdate: (field: keyof Account, value: string | null) => Promise<void>;
}

export function AccountTeamCard({ account, onUpdate }: AccountTeamCardProps) {
  const { getActiveMembers } = useTeamMembers();
  const { services } = useSettings();
  const activeMembers = getActiveMembers();
  const [savingField, setSavingField] = useState<string | null>(null);

  // Derive plan flags from the account's service
  const planFlags: PlanFlags = useMemo(() => {
    if (!account.service_id) return DEFAULT_PLAN_FLAGS;
    const svc = services.find((s: any) => s.id === account.service_id);
    if (!svc) return DEFAULT_PLAN_FLAGS;
    return { has_content: (svc as any).has_content ?? true, has_traffic: (svc as any).has_traffic ?? true };
  }, [account.service_id, services]);

  const visibleRoles = useMemo(() => getVisibleRoles(planFlags), [planFlags]);
  const teamStatus = getAccountTeamStatus(account, planFlags);

  const visibleRoleOptions = RESPONSIBLE_ROLE_OPTIONS.filter(r => visibleRoles.includes(r.value));

  const getValue = (roleKey: ResponsibleRoleKey): string | null => {
    const option = RESPONSIBLE_ROLE_OPTIONS.find(o => o.value === roleKey);
    if (!option) return null;
    return account[option.field] as string | null;
  };

  const handleChange = async (roleKey: ResponsibleRoleKey, memberId: string) => {
    const option = RESPONSIBLE_ROLE_OPTIONS.find(o => o.value === roleKey);
    if (!option) return;
    
    setSavingField(option.field);
    try {
      await onUpdate(option.field, memberId === '_none_' ? null : memberId);
      toast.success(`${option.label} atualizado com sucesso`);
    } catch (error) {
      toast.error(`Erro ao atualizar ${option.label}`);
    } finally {
      setSavingField(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Time da Conta
          </CardTitle>
          {teamStatus.isComplete ? (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          ) : (
            <Badge variant="attention" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {teamStatus.defined}/{teamStatus.total}
            </Badge>
          )}
        </div>
        {!teamStatus.isComplete && teamStatus.missingLabels.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Faltando: {teamStatus.missingLabels.join(', ')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleRoleOptions.map((role) => {
          const currentValue = getValue(role.value);
          const isSaving = savingField === role.field;
          const isMissing = !currentValue;
          
          return (
            <div key={role.value} className="grid grid-cols-2 gap-2 items-center">
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
                  <SelectTrigger className={`h-8 text-sm ${isMissing ? 'border-amber-400' : ''}`}>
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
          <p className="text-xs text-muted-foreground">
            Nenhum usuário ativo cadastrado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
