import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  routeRegistry, 
  generatePermissionKey, 
  PermissionAction,
  RouteDefinition 
} from '@/config/routeRegistry';

export interface SyncReport {
  newPermissions: number;
  newRoutes: string[];
  newRolePermissions: number;
  errors: string[];
}

export interface RoutePermission {
  id: string;
  key: string;
  route_id: string;
  action: string;
  label: string;
  category: string;
  module: string;
  path: string;
  created_at: string;
  is_new?: boolean;
}

export interface RolePermission {
  id: string;
  role_key: string;
  permission_key: string;
  allowed: boolean;
}

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_key: string;
  allowed: boolean;
}

/**
 * Hook for syncing permissions from route registry to database
 */
export function usePermissionSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(null);

  /**
   * Sync permissions from registry to database
   * Creates missing permissions and role_permissions entries
   */
  const syncPermissions = useCallback(async (): Promise<SyncReport> => {
    setSyncing(true);
    const report: SyncReport = {
      newPermissions: 0,
      newRoutes: [],
      newRolePermissions: 0,
      errors: [],
    };

    try {
      // 1. Get existing permissions from database using raw query for new tables
      const { data: existingPermissions, error: permError } = await supabase
        .from('route_permissions' as any)
        .select('*');

      if (permError) {
        report.errors.push(`Error fetching permissions: ${permError.message}`);
        setSyncing(false);
        setLastSyncReport(report);
        return report;
      }

      const existingKeys = new Set((existingPermissions || []).map((p: any) => p.key));

      // 2. Get existing roles
      const { data: roles, error: rolesError } = await supabase
        .from('job_roles')
        .select('id, name');

      if (rolesError) {
        report.errors.push(`Error fetching roles: ${rolesError.message}`);
      }

      // 3. Build permissions to insert
      const permissionsToInsert: any[] = [];
      const seenRoutes = new Set<string>();

      for (const route of routeRegistry) {
        // Skip child routes (they inherit from parent)
        if (route.parentId) continue;

        for (const action of route.permissions) {
          const key = generatePermissionKey(route.id, action);
          
          if (!existingKeys.has(key)) {
            permissionsToInsert.push({
              key,
              route_id: route.id,
              action,
              label: getPermissionLabel(route, action),
              category: route.category,
              module: route.module,
              path: route.path,
            });

            if (!seenRoutes.has(route.id)) {
              report.newRoutes.push(route.id);
              seenRoutes.add(route.id);
            }
          }
        }
      }

      // 4. Insert new permissions
      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('route_permissions' as any)
          .insert(permissionsToInsert);

        if (insertError) {
          report.errors.push(`Error inserting permissions: ${insertError.message}`);
        } else {
          report.newPermissions = permissionsToInsert.length;
        }
      }

      // 5. Get all permissions again (including newly created)
      const { data: allPermissions } = await supabase
        .from('route_permissions' as any)
        .select('key');

      // 6. Get existing role_permissions
      const { data: existingRolePerms } = await supabase
        .from('role_permissions' as any)
        .select('role_key, permission_key');

      const existingRolePermKeys = new Set(
        (existingRolePerms || []).map((rp: any) => `${rp.role_key}:${rp.permission_key}`)
      );

      // 7. Create missing role_permissions (default: false, except 'admin')
      const rolePermissionsToInsert: { role_key: string; permission_key: string; allowed: boolean }[] = [];

      if (roles && allPermissions) {
        for (const role of roles) {
          const roleKey = role.name.toLowerCase();
          const isAdmin = roleKey === 'admin' || roleKey === 'administrador';

          for (const perm of allPermissions as any[]) {
            const key = `${roleKey}:${perm.key}`;
            if (!existingRolePermKeys.has(key)) {
              rolePermissionsToInsert.push({
                role_key: roleKey,
                permission_key: perm.key,
                allowed: isAdmin, // Admin gets true, others get false
              });
            }
          }
        }
      }

      if (rolePermissionsToInsert.length > 0) {
        const { error: rpInsertError } = await supabase
          .from('role_permissions' as any)
          .insert(rolePermissionsToInsert);

        if (rpInsertError) {
          report.errors.push(`Error inserting role_permissions: ${rpInsertError.message}`);
        } else {
          report.newRolePermissions = rolePermissionsToInsert.length;
        }
      }

    } catch (err: any) {
      report.errors.push(`Unexpected error: ${err.message}`);
    }

    setSyncing(false);
    setLastSyncReport(report);
    return report;
  }, []);

  return {
    syncPermissions,
    syncing,
    lastSyncReport,
  };
}

/**
 * Generate human-readable label for a permission
 */
function getPermissionLabel(route: RouteDefinition, action: PermissionAction): string {
  const actionLabels: Record<PermissionAction, string> = {
    view: 'Visualizar',
    edit: 'Editar',
    manage: 'Gerenciar',
  };

  return `${actionLabels[action]} ${route.label}`;
}

/**
 * Hook for fetching route permissions from database
 */
export function useRoutePermissions() {
  const [permissions, setPermissions] = useState<RoutePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('route_permissions' as any)
      .select('*')
      .order('module')
      .order('category')
      .order('route_id');

    if (error) {
      console.error('Error fetching route permissions:', error);
    } else {
      // Mark permissions created in last 24 hours as "new"
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const withNewFlag = (data || []).map((p: any) => ({
        ...p,
        is_new: p.created_at > oneDayAgo,
      }));
      setPermissions(withNewFlag as RoutePermission[]);
    }

    setLoading(false);
  }, []);

  return {
    permissions,
    loading,
    fetchPermissions,
  };
}

/**
 * Hook for managing role permissions
 */
export function useRolePermissions(roleKey: string | null) {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRolePermissions = useCallback(async () => {
    if (!roleKey) {
      setRolePermissions([]);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('role_permissions' as any)
      .select('*')
      .eq('role_key', roleKey);

    if (error) {
      console.error('Error fetching role permissions:', error);
    } else {
      setRolePermissions((data || []) as unknown as RolePermission[]);
    }

    setLoading(false);
  }, [roleKey]);

  const setPermission = useCallback(async (permissionKey: string, allowed: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!roleKey) return { success: false, error: 'No role selected' };

    const existing = rolePermissions.find(rp => rp.permission_key === permissionKey);

    if (existing) {
      const { error } = await supabase
        .from('role_permissions' as any)
        .update({ allowed })
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }

      setRolePermissions(prev => 
        prev.map(rp => rp.id === existing.id ? { ...rp, allowed } : rp)
      );
    } else {
      const { data, error } = await supabase
        .from('role_permissions' as any)
        .insert([{ role_key: roleKey, permission_key: permissionKey, allowed }])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      setRolePermissions(prev => [...prev, data as unknown as RolePermission]);
    }

    return { success: true };
  }, [roleKey, rolePermissions]);

  const hasPermission = useCallback((permissionKey: string): boolean => {
    const rp = rolePermissions.find(p => p.permission_key === permissionKey);
    return rp?.allowed ?? false;
  }, [rolePermissions]);

  return {
    rolePermissions,
    loading,
    fetchRolePermissions,
    setPermission,
    hasPermission,
  };
}

/**
 * Hook for managing user permission overrides
 */
export function useUserPermissionOverrides(userId: string | null) {
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOverrides = useCallback(async () => {
    if (!userId) {
      setOverrides([]);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('user_permission_overrides' as any)
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user overrides:', error);
    } else {
      setOverrides((data || []) as unknown as UserPermissionOverride[]);
    }

    setLoading(false);
  }, [userId]);

  const setOverride = useCallback(async (permissionKey: string, allowed: boolean | null): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'No user selected' };

    const existing = overrides.find(o => o.permission_key === permissionKey);

    if (allowed === null) {
      // Remove override
      if (existing) {
        const { error } = await supabase
          .from('user_permission_overrides' as any)
          .delete()
          .eq('id', existing.id);

        if (error) return { success: false, error: error.message };
        
        setOverrides(prev => prev.filter(o => o.id !== existing.id));
      }
    } else if (existing) {
      // Update existing
      const { error } = await supabase
        .from('user_permission_overrides' as any)
        .update({ allowed })
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };
      
      setOverrides(prev => prev.map(o => o.id === existing.id ? { ...o, allowed } : o));
    } else {
      // Create new
      const { data, error } = await supabase
        .from('user_permission_overrides' as any)
        .insert([{ user_id: userId, permission_key: permissionKey, allowed }])
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      
      setOverrides(prev => [...prev, data as unknown as UserPermissionOverride]);
    }

    return { success: true };
  }, [userId, overrides]);

  const getOverride = useCallback((permissionKey: string): boolean | null => {
    const override = overrides.find(o => o.permission_key === permissionKey);
    return override?.allowed ?? null;
  }, [overrides]);

  return {
    overrides,
    loading,
    fetchOverrides,
    setOverride,
    getOverride,
  };
}
