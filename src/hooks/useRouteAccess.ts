import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generatePermissionKey, PermissionAction } from '@/config/routeRegistry';

/**
 * Hook to check route-based permissions for the currently authenticated user.
 * Uses the new route_permissions system with role-based defaults and user overrides.
 */
export function useRouteAccess() {
  const { member, isAdmin, loading: authLoading } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [roleKey, setRoleKey] = useState<string | null>(null);

  // Fetch role name
  useEffect(() => {
    const fetchRoleKey = async () => {
      if (!member?.role_id) {
        setRoleKey(null);
        return;
      }

      const { data } = await supabase
        .from('job_roles')
        .select('name')
        .eq('id', member.role_id)
        .single();

      if (data) {
        setRoleKey(data.name.toLowerCase());
      }
    };

    if (!authLoading && member) {
      fetchRoleKey();
    }
  }, [member?.role_id, authLoading, member]);

  // Fetch permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!roleKey || authLoading) {
        if (!authLoading && !member) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      // Fetch role permissions
      const { data: rolePerms } = await supabase
        .from('role_permissions' as any)
        .select('permission_key, allowed')
        .eq('role_key', roleKey);

      const rolePermsMap: Record<string, boolean> = {};
      if (rolePerms) {
        for (const rp of rolePerms as any[]) {
          rolePermsMap[rp.permission_key] = rp.allowed;
        }
      }
      setRolePermissions(rolePermsMap);

      // Fetch user overrides
      if (member?.id) {
        const { data: overrides } = await supabase
          .from('user_permission_overrides' as any)
          .select('permission_key, allowed')
          .eq('user_id', member.id);

        const overridesMap: Record<string, boolean> = {};
        if (overrides) {
          for (const o of overrides as any[]) {
            overridesMap[o.permission_key] = o.allowed;
          }
        }
        setUserOverrides(overridesMap);
      }

      setLoading(false);
    };

    fetchPermissions();
  }, [roleKey, member?.id, authLoading]);

  /**
   * Check if user can perform an action on a route
   */
  const canAccess = useCallback((routeId: string, action: PermissionAction = 'view'): boolean => {
    // Admin has all permissions
    if (isAdmin) return true;
    
    // If no member is set, deny all
    if (!member) return false;

    const key = generatePermissionKey(routeId, action);

    // Check user override first
    if (key in userOverrides) {
      return userOverrides[key];
    }

    // Fall back to role permission
    if (key in rolePermissions) {
      return rolePermissions[key];
    }

    // Default: allow if no explicit permission exists
    // This makes new routes accessible until configured
    return true;
  }, [member, isAdmin, rolePermissions, userOverrides]);

  /**
   * Legacy permission check for backward compatibility
   * Maps old permission keys to new route-based system
   */
  const can = useCallback((legacyKey: string): boolean => {
    // Admin has all permissions
    if (isAdmin) return true;
    if (!member) return false;

    // Map legacy keys to route IDs
    const legacyMapping: Record<string, { routeId: string; action: PermissionAction }> = {
      'view_dashboard': { routeId: 'main.dashboard', action: 'view' },
      'view_crm': { routeId: 'crm.clients', action: 'view' },
      'edit_crm': { routeId: 'crm.clients', action: 'edit' },
      'view_content': { routeId: 'content.production', action: 'view' },
      'edit_content': { routeId: 'content.production', action: 'edit' },
      'view_tasks': { routeId: 'crm.tasks', action: 'view' },
      'edit_tasks': { routeId: 'crm.tasks', action: 'edit' },
      'view_traffic': { routeId: 'traffic.dashboard', action: 'view' },
      'edit_traffic': { routeId: 'traffic.dashboard', action: 'edit' },
      'view_cs': { routeId: 'cs.dashboard', action: 'view' },
      'edit_cs': { routeId: 'cs.dashboard', action: 'edit' },
      'manage_settings': { routeId: 'settings.home', action: 'manage' },
    };

    const mapping = legacyMapping[legacyKey];
    if (mapping) {
      return canAccess(mapping.routeId, mapping.action);
    }

    // If no mapping, allow by default
    return true;
  }, [member, isAdmin, canAccess]);

  return {
    canAccess,
    can, // Legacy compatibility
    loading: loading || authLoading,
    currentMemberId: member?.id || null,
    isAdmin,
    member,
    roleKey,
  };
}
