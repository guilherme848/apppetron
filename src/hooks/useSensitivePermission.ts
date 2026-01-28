import { useCallback } from 'react';
import { useRouteAccess } from './useRouteAccess';

/**
 * Sensitive permission keys for data-level access control.
 * These control visibility of sensitive fields, not route access.
 */
export const SENSITIVE_PERMISSIONS = {
  VIEW_CONTRACT_VALUES: 'contracts.values:view',
} as const;

export type SensitivePermissionKey = typeof SENSITIVE_PERMISSIONS[keyof typeof SENSITIVE_PERMISSIONS];

/**
 * Hook to check sensitive permissions (data-level, not route-level).
 * Admin always has access. Default is to DENY for sensitive permissions.
 */
export function useSensitivePermission() {
  const { isAdmin, canAccess, loading, member } = useRouteAccess();

  /**
   * Check if user can view contract financial values.
   * Default: false (deny) unless explicitly allowed.
   * Uses defaultDeny=true since this is a sensitive permission.
   */
  const canViewContractValues = useCallback((): boolean => {
    if (isAdmin) return true;
    if (!member) return false;
    
    // For sensitive permissions, use defaultDeny=true
    // This means if no explicit permission exists, access is denied
    return canAccess('contracts.values', 'view', true);
  }, [isAdmin, member, canAccess]);

  return {
    canViewContractValues,
    loading,
    isAdmin,
  };
}
