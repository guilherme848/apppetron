import { useState } from 'react';
import { Shield, ShieldCheck, ShieldX, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { usePermissions, useMemberPermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

// Group permissions by category
const PERMISSION_GROUPS: { label: string; keys: string[] }[] = [
  { 
    label: 'Dashboard', 
    keys: ['view_dashboard'] 
  },
  { 
    label: 'CRM / Clientes', 
    keys: ['view_crm', 'edit_crm', 'view_client_credentials'] 
  },
  { 
    label: 'Conteúdo', 
    keys: ['view_content', 'edit_content'] 
  },
  { 
    label: 'Tarefas', 
    keys: ['view_tasks', 'edit_tasks'] 
  },
  { 
    label: 'Configurações', 
    keys: ['manage_settings'] 
  },
];

export function AccessTab() {
  const { members, loading: loadingMembers } = useTeamMembers();
  const { permissions, loading: loadingPermissions } = usePermissions();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { memberPermissions, loading: loadingMemberPerms, setPermission, hasPermission } = useMemberPermissions(selectedMemberId);

  const activeMembers = members.filter(m => m.active);

  const handleTogglePermission = async (permissionKey: string, currentValue: boolean) => {
    const result = await setPermission(permissionKey, !currentValue);
    if (result.success) {
      toast.success('Permissão atualizada');
    } else {
      toast.error(result.error || 'Erro ao atualizar');
    }
  };

  if (loadingMembers || loadingPermissions) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Controle de Acesso
        </CardTitle>
        <CardDescription>
          Defina o que cada usuário pode ver e editar no sistema. 
          <Badge variant="outline" className="ml-2">Controle de interface</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-sm">
          <Label htmlFor="selectMember">Selecionar Usuário</Label>
          <Select
            value={selectedMemberId || ''}
            onValueChange={(v) => setSelectedMemberId(v || null)}
          >
            <SelectTrigger id="selectMember">
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {activeMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {member.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMemberId && (
          loadingMemberPerms ? (
            <div className="flex items-center justify-center h-32">
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label} className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-3">
                    {group.keys.map((key) => {
                      const permission = permissions.find(p => p.key === key);
                      if (!permission) return null;

                      const isAllowed = hasPermission(key);

                      return (
                        <div key={key} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            {isAllowed ? (
                              <ShieldCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <ShieldX className="h-4 w-4 text-destructive" />
                            )}
                            <span className="text-sm">{permission.label}</span>
                          </div>
                          <Switch
                            checked={isAllowed}
                            onCheckedChange={() => handleTogglePermission(key, isAllowed)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {!selectedMemberId && (
          <div className="text-center py-8 border rounded-lg">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Selecione um usuário para configurar as permissões</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
