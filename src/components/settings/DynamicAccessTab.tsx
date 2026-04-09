import { useEffect, useState, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldX, RefreshCw, Sparkles, Users, User, ToggleLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { 
  usePermissionSync, 
  useRoutePermissions, 
  useRolePermissions,
  useUserPermissionOverrides,
  RoutePermission 
} from '@/hooks/usePermissionSync';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getRoutesForAccessControl, 
  MODULE_ORDER, 
  PermissionAction 
} from '@/config/routeRegistry';

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Visualizar',
  edit: 'Editar',
  manage: 'Gerenciar',
};

const ACTION_COLORS: Record<PermissionAction, string> = {
  view: 'text-primary',
  edit: 'text-warning',
  manage: 'text-primary',
};

export function DynamicAccessTab() {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  
  const { roles, loading: loadingRoles } = useJobRoles();
  const { members, loading: loadingMembers } = useTeamMembers();
  const { syncPermissions, syncing, lastSyncReport } = usePermissionSync();
  const { permissions, loading: loadingPermissions, fetchPermissions } = useRoutePermissions();
  const { rolePermissions, loading: loadingRolePerms, fetchRolePermissions, setPermission, setMultiplePermissions, hasPermission } = useRolePermissions(selectedRoleKey);
  const { overrides, loading: loadingOverrides, fetchOverrides, setOverride, getOverride } = useUserPermissionOverrides(selectedUserId);

  // Get user's role key for user override tab
  const selectedUser = members.find(m => m.id === selectedUserId);
  const selectedUserRole = selectedUser?.role_id ? roles.find(r => r.id === selectedUser.role_id) : null;
  const selectedUserRoleKey = selectedUserRole?.name?.toLowerCase() || null;

  // Load user's role permissions when user is selected
  const { rolePermissions: userRolePermissions, fetchRolePermissions: fetchUserRolePerms } = useRolePermissions(selectedUserRoleKey);

  // Initial sync when component mounts
  useEffect(() => {
    const init = async () => {
      await syncPermissions();
      await fetchPermissions();
    };
    init();
  }, [syncPermissions, fetchPermissions]);

  // Fetch role permissions when role is selected
  useEffect(() => {
    if (selectedRoleKey) {
      fetchRolePermissions();
    }
  }, [selectedRoleKey, fetchRolePermissions]);

  // Fetch user overrides and role permissions when user is selected
  useEffect(() => {
    if (selectedUserId) {
      fetchOverrides();
    }
  }, [selectedUserId, fetchOverrides]);

  useEffect(() => {
    if (selectedUserRoleKey) {
      fetchUserRolePerms();
    }
  }, [selectedUserRoleKey, fetchUserRolePerms]);

  const handleManualSync = async () => {
    const report = await syncPermissions();
    await fetchPermissions();
    
    if (report.errors.length > 0) {
      toast.error('Erro na sincronização', { 
        description: report.errors[0] 
      });
    } else if (report.newPermissions > 0 || report.newRolePermissions > 0) {
      toast.success('Sincronização concluída', {
        description: `${report.newPermissions} permissões e ${report.newRolePermissions} atribuições criadas`
      });
    } else {
      toast.info('Tudo sincronizado', {
        description: 'Nenhuma nova permissão encontrada'
      });
    }
  };

  const handleToggleRolePermission = async (permissionKey: string, currentValue: boolean) => {
    const result = await setPermission(permissionKey, !currentValue);
    if (result.success) {
      toast.success('Permissão atualizada');
    } else {
      toast.error(result.error || 'Erro ao atualizar');
    }
  };

  // Handle toggling all permissions in a module
  const handleToggleModule = async (module: string, enable: boolean) => {
    const modulePermissions = permissions.filter(p => p.module === module);
    if (modulePermissions.length === 0) return;

    setTogglingModule(module);
    const permissionKeys = modulePermissions.map(p => p.key);
    
    const result = await setMultiplePermissions(permissionKeys, enable);
    
    if (result.success) {
      toast.success(enable ? `Módulo "${module}" habilitado` : `Módulo "${module}" desabilitado`);
    } else {
      toast.error(result.error || 'Erro ao atualizar módulo');
    }
    
    setTogglingModule(null);
  };

  // Calculate if a module has all permissions enabled
  const isModuleFullyEnabled = useCallback((module: string): boolean => {
    const modulePermissions = permissions.filter(p => p.module === module);
    if (modulePermissions.length === 0) return false;
    return modulePermissions.every(p => hasPermission(p.key));
  }, [permissions, hasPermission]);

  // Calculate if a module has some (but not all) permissions enabled
  const isModulePartiallyEnabled = useCallback((module: string): boolean => {
    const modulePermissions = permissions.filter(p => p.module === module);
    if (modulePermissions.length === 0) return false;
    const enabledCount = modulePermissions.filter(p => hasPermission(p.key)).length;
    return enabledCount > 0 && enabledCount < modulePermissions.length;
  }, [permissions, hasPermission]);

  const handleToggleUserOverride = async (permissionKey: string, currentOverride: boolean | null, roleDefault: boolean) => {
    // Cycle through: null (use role) -> !roleDefault -> roleDefault -> null
    let newValue: boolean | null;
    if (currentOverride === null) {
      newValue = !roleDefault;
    } else if (currentOverride !== roleDefault) {
      newValue = roleDefault;
    } else {
      newValue = null;
    }

    const result = await setOverride(permissionKey, newValue);
    if (result.success) {
      if (newValue === null) {
        toast.success('Usando permissão do cargo');
      } else {
        toast.success('Override de usuário aplicado');
      }
    } else {
      toast.error(result.error || 'Erro ao atualizar');
    }
  };

  // Group permissions by module and category
  const groupedPermissions = groupPermissionsByModuleAndCategory(permissions);

  const activeMembers = members.filter(m => m.active);

  if (loadingRoles || loadingMembers || loadingPermissions) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Configure permissões por cargo ou override individual por usuário.
          </p>
          {lastSyncReport && lastSyncReport.newRoutes.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">
                {lastSyncReport.newRoutes.length} novas rotas detectadas
              </span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          disabled={syncing}
        >
          {syncing ? (
            <Skeleton className="h-4 w-16 rounded" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar Agora
        </Button>
      </div>

      {/* Tabs for Role vs User */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'roles' | 'users')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Por Cargo
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Por Usuário
          </TabsTrigger>
        </TabsList>

        {/* ROLE TAB */}
        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissões por Cargo
              </CardTitle>
              <CardDescription>
                Defina as permissões padrão para cada cargo. Todos os usuários do cargo herdam essas permissões.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-sm">
                <Label htmlFor="selectRole">Selecionar Cargo</Label>
                <Select
                  value={selectedRoleKey || ''}
                  onValueChange={(v) => setSelectedRoleKey(v || null)}
                >
                  <SelectTrigger id="selectRole">
                    <SelectValue placeholder="Selecione um cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name.toLowerCase()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRoleKey && (
                loadingRolePerms ? (
                  <div className="flex items-center justify-center h-32">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </div>
                ) : (
                  <PermissionMatrix
                    groupedPermissions={groupedPermissions}
                    checkPermission={(key) => hasPermission(key)}
                    onToggle={handleToggleRolePermission}
                    permissions={permissions}
                    isModuleFullyEnabled={isModuleFullyEnabled}
                    isModulePartiallyEnabled={isModulePartiallyEnabled}
                    onToggleModule={handleToggleModule}
                    togglingModule={togglingModule}
                  />
                )
              )}

              {!selectedRoleKey && (
                <EmptyState message="Selecione um cargo para configurar as permissões" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* USER TAB */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Overrides por Usuário
              </CardTitle>
              <CardDescription>
                Configure exceções individuais. Permissões sem override usam o padrão do cargo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-sm">
                <Label htmlFor="selectUser">Selecionar Usuário</Label>
                <Select
                  value={selectedUserId || ''}
                  onValueChange={(v) => setSelectedUserId(v || null)}
                >
                  <SelectTrigger id="selectUser">
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

              {selectedUserId && selectedUserRole && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Badge variant="secondary">{selectedUserRole.name}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Permissões base herdadas do cargo
                  </span>
                </div>
              )}

              {selectedUserId && (
                loadingOverrides ? (
                  <div className="flex items-center justify-center h-32">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </div>
                ) : (
                  <PermissionMatrixWithOverrides
                    groupedPermissions={groupedPermissions}
                    getRolePermission={(key) => {
                      const rp = userRolePermissions.find(p => p.permission_key === key);
                      return rp?.allowed ?? false;
                    }}
                    getOverride={getOverride}
                    onToggle={handleToggleUserOverride}
                    permissions={permissions}
                  />
                )
              )}

              {!selectedUserId && (
                <EmptyState message="Selecione um usuário para configurar exceções" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for empty states
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 border rounded-lg">
      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

// Permission matrix for roles
interface PermissionMatrixProps {
  groupedPermissions: Record<string, Record<string, RoutePermission[]>>;
  checkPermission: (key: string) => boolean;
  onToggle: (key: string, currentValue: boolean) => void;
  permissions: RoutePermission[];
  isModuleFullyEnabled: (module: string) => boolean;
  isModulePartiallyEnabled: (module: string) => boolean;
  onToggleModule: (module: string, enable: boolean) => void;
  togglingModule: string | null;
}

function PermissionMatrix({ 
  groupedPermissions, 
  checkPermission, 
  onToggle, 
  permissions,
  isModuleFullyEnabled,
  isModulePartiallyEnabled,
  onToggleModule,
  togglingModule,
}: PermissionMatrixProps) {
  return (
    <Accordion type="multiple" defaultValue={MODULE_ORDER} className="space-y-2">
      {MODULE_ORDER.map((module) => {
        const categories = groupedPermissions[module];
        if (!categories || Object.keys(categories).length === 0) return null;

        const isFullyEnabled = isModuleFullyEnabled(module);
        const isPartiallyEnabled = isModulePartiallyEnabled(module);
        const isToggling = togglingModule === module;

        return (
          <AccordionItem key={module} value={module} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{module}</span>
                  {isFullyEnabled && (
                    <Badge variant="default" className="text-xs bg-primary/20 text-primary">
                      Completo
                    </Badge>
                  )}
                  {isPartiallyEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      Parcial
                    </Badge>
                  )}
                </div>
                <div 
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isToggling ? (
                    <Skeleton className="h-4 w-16 rounded" />
                  ) : (
                    <Checkbox 
                      checked={isFullyEnabled}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      onCheckedChange={(checked) => {
                        onToggleModule(module, checked === true);
                      }}
                    />
                  )}
                  <span className="text-xs text-muted-foreground font-normal">
                    Módulo inteiro
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {Object.entries(categories).map(([category, perms]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {perms.map((perm) => {
                        const isAllowed = checkPermission(perm.key);
                        const action = perm.action as PermissionAction;

                        return (
                          <div key={perm.key} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              {isAllowed ? (
                                <ShieldCheck className="h-4 w-4 text-primary" />
                              ) : (
                                <ShieldX className="h-4 w-4 text-destructive" />
                              )}
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${ACTION_COLORS[action]}`}>
                                  {ACTION_LABELS[action]}
                                </span>
                                <span className="text-sm">{perm.label.replace(/^(Visualizar|Editar|Gerenciar)\s/, '')}</span>
                                {perm.is_new && (
                                  <Badge variant="secondary" className="text-xs">Novo</Badge>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={isAllowed}
                              onCheckedChange={() => onToggle(perm.key, isAllowed)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// Permission matrix with user overrides
interface PermissionMatrixWithOverridesProps {
  groupedPermissions: Record<string, Record<string, RoutePermission[]>>;
  getRolePermission: (key: string) => boolean;
  getOverride: (key: string) => boolean | null;
  onToggle: (key: string, currentOverride: boolean | null, roleDefault: boolean) => void;
  permissions: RoutePermission[];
}

function PermissionMatrixWithOverrides({ 
  groupedPermissions, 
  getRolePermission, 
  getOverride, 
  onToggle,
  permissions 
}: PermissionMatrixWithOverridesProps) {
  return (
    <Accordion type="multiple" defaultValue={MODULE_ORDER} className="space-y-2">
      {MODULE_ORDER.map((module) => {
        const categories = groupedPermissions[module];
        if (!categories || Object.keys(categories).length === 0) return null;

        return (
          <AccordionItem key={module} value={module} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">{module}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {Object.entries(categories).map(([category, perms]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {perms.map((perm) => {
                        const roleDefault = getRolePermission(perm.key);
                        const override = getOverride(perm.key);
                        const effectiveValue = override !== null ? override : roleDefault;
                        const hasOverride = override !== null;
                        const action = perm.action as PermissionAction;

                        return (
                          <div key={perm.key} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              {effectiveValue ? (
                                <ShieldCheck className={`h-4 w-4 ${hasOverride ? 'text-green-500' : 'text-primary'}`} />
                              ) : (
                                <ShieldX className={`h-4 w-4 ${hasOverride ? 'text-destructive' : 'text-destructive'}`} />
                              )}
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${ACTION_COLORS[action]}`}>
                                  {ACTION_LABELS[action]}
                                </span>
                                <span className="text-sm">{perm.label.replace(/^(Visualizar|Editar|Gerenciar)\s/, '')}</span>
                                {hasOverride && (
                                  <Badge variant="outline" className="text-xs">Override</Badge>
                                )}
                                {perm.is_new && (
                                  <Badge variant="secondary" className="text-xs">Novo</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {hasOverride ? 'Personalizado' : 'Do cargo'}
                              </span>
                              <Switch
                                checked={effectiveValue}
                                onCheckedChange={() => onToggle(perm.key, override, roleDefault)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// Helper function to group permissions
function groupPermissionsByModuleAndCategory(
  permissions: RoutePermission[]
): Record<string, Record<string, RoutePermission[]>> {
  const result: Record<string, Record<string, RoutePermission[]>> = {};

  for (const perm of permissions) {
    if (!result[perm.module]) {
      result[perm.module] = {};
    }
    if (!result[perm.module][perm.category]) {
      result[perm.module][perm.category] = [];
    }
    result[perm.module][perm.category].push(perm);
  }

  return result;
}
