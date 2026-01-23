import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionKey } from '@/types/permissions';
import { useRouteAccess } from '@/hooks/useRouteAccess';

/**
 * Hook to check permissions for the currently authenticated user.
 * 
 * MIGRATION NOTE: This hook now delegates to useRouteAccess for the new
 * route-based permission system. Legacy permission keys are mapped automatically.
 * 
 * For new code, prefer using useRouteAccess directly with route IDs:
 *   const { canAccess } = useRouteAccess();
 *   canAccess('content.production', 'view')
 */
export function useAuthPermissions() {
  const { member, isAdmin, loading: authLoading } = useAuth();
  const { can: routeAccessCan, loading: routeLoading } = useRouteAccess();

  /**
   * Check if user has a legacy permission.
   * Maps to the new route-based system under the hood.
   */
  const can = useCallback((permissionKey: PermissionKey): boolean => {
    // Admin has all permissions
    if (isAdmin) return true;
    
    // If no member is set, deny all
    if (!member) return false;
    
    // Delegate to route access system with legacy key mapping
    return routeAccessCan(permissionKey);
  }, [member, isAdmin, routeAccessCan]);

  return { 
    can, 
    loading: authLoading || routeLoading, 
    currentMemberId: member?.id || null,
    isAdmin,
    member,
  };
}
