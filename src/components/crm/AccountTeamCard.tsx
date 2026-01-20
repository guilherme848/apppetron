import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Check, Loader2 } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Account, RESPONSIBLE_ROLE_OPTIONS, ResponsibleRoleKey } from '@/types/crm';
import { toast } from 'sonner';

interface AccountTeamCardProps {
  account: Account;
  onUpdate: (field: keyof Account, value: string | null) => Promise<void>;
}

export function AccountTeamCard({ account, onUpdate }: AccountTeamCardProps) {
  const { getActiveMembers, getMemberById } = useTeamMembers();
  const activeMembers = getActiveMembers();
  const [savingField, setSavingField] = useState<string | null>(null);

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
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Time da Conta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {RESPONSIBLE_ROLE_OPTIONS.map((role) => {
          const currentValue = getValue(role.value);
          const isSaving = savingField === role.field;
          
          return (
            <div key={role.value} className="grid grid-cols-2 gap-2 items-center">
              <Label className="text-sm">{role.label}</Label>
              <div className="relative">
                <Select
                  value={currentValue || '_none_'}
                  onValueChange={(v) => handleChange(role.value, v)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-8 text-sm">
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
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
