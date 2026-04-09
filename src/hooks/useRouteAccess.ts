import { useState, useEffect, useCallback, useRef } from 'react';
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
  const fetchedRoleIdRef = useRef<string | null>(null);

  // Fetch role name when member changes
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) {
      return;
    }

    // If no member, set loading to false and reset state
    if (!member?.role_id) {
      setRoleKey(null);
      setRolePermissions({});
      setUserOverrides({});
      setLoading(false);
      return;
    }

    // Skip if we already fetched for this role
    if (fetchedRoleIdRef.current === member.role_id) {
      return;
    }

    const fetchRoleKey = async () => {
      console.debug('[permissions] Fetching role key for role_id:', member.role_id);
      
      const { data, error } = await supabase
        .from('job_roles')
        .select('name')
        .eq('id', member.role_id)
        .maybeSingle();

      if (error) {
        console.error('[permissions] Error fetching role:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const key = data.name.toLowerCase();
        setRoleKey(key);
        fetchedRoleIdRef.current = member.role_id;
        console.debug('[permissions] Role key set:', key);
      }
    };

    fetchRoleKey();
  }, [member?.role_id, authLoading]);

  // Fetch permissions when roleKey changes
  useEffect(() => {
    // Don't fetch if auth is loading or no roleKey yet
    if (authLoading || !roleKey) {
      return;
    }

    const fetchPermissions = async () => {
      console.debug('[permissions] Fetching permissions for role:', roleKey);
      setLoading(true);

      try {
        // Fetch role permissions
        const { data: rolePerms, error: roleError } = await supabase
          .from('role_permissions' as any)
          .select('permission_key, allowed')
          .eq('role_key', roleKey);

        if (roleError) {
          console.error('[permissions] Error fetching role permissions:', roleError);
        }

        const rolePermsMap: Record<string, boolean> = {};
        if (rolePerms) {
          for (const rp of rolePerms as any[]) {
            rolePermsMap[rp.permission_key] = rp.allowed;
          }
        }
        setRolePermissions(rolePermsMap);
        console.debug('[permissions] Role permissions loaded:', Object.keys(rolePermsMap).length);

        // Fetch user overrides
        if (member?.id) {
          const { data: overrides, error: overridesError } = await supabase
            .from('user_permission_overrides' as any)
            .select('permission_key, allowed')
            .eq('user_id', member.id);

          if (overridesError) {
            console.error('[permissions] Error fetching user overrides:', overridesError);
          }

          const overridesMap: Record<string, boolean> = {};
          if (overrides) {
            for (const o of overrides as any[]) {
              overridesMap[o.permission_key] = o.allowed;
            }
          }
          setUserOverrides(overridesMap);
          console.debug('[permissions] User overrides loaded:', Object.keys(overridesMap).length);
        }
      } catch (error) {
        console.error('[permissions] Error in fetchPermissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [roleKey, member?.id, authLoading]);

  // Set loading to false if auth is done but there's no member (allows app to proceed)
  useEffect(() => {
    if (!authLoading && !member) {
      setLoading(false);
    }
  }, [authLoading, member]);

  /**
   * Check if user can perform an action on a route
   * @param routeId - The route/permission ID to check
   * @param action - The action to check (view, edit, manage)
   * @param defaultDeny - If true, deny access when no explicit permission exists (for sensitive permissions)
   */
  const canAccess = useCallback((routeId: string, action: PermissionAction = 'view', defaultDeny: boolean = false): boolean => {
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

    // Default behavior:
    // - Regular permissions: allow if no explicit permission exists (new routes accessible until configured)
    // - Sensitive permissions (defaultDeny=true): deny if no explicit permission exists
    return !defaultDeny;
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
