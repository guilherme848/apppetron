import { useAuth } from '@/contexts/AuthContext';
import { useAuthPermissions } from '@/hooks/useAuthPermissions';
import { PermissionKey } from '@/types/permissions';
import { usePermissions, useMemberPermissions } from '@/hooks/usePermissions';

// Re-export useAuthPermissions as useCurrentUserPermissions for compatibility
export function useCurrentUserPermissions() {
  return useAuthPermissions();
}

// Hook to get current member from auth context
export function useCurrentMember() {
  const { member } = useAuth();
  
  return {
    currentMemberId: member?.id || null,
    setCurrentMemberId: () => {
      // This is now managed by auth, kept for compatibility
      console.warn('setCurrentMemberId is deprecated. User is now managed by authentication.');
    },
  };
}

// Keep existing hooks for settings/permissions management
export { usePermissions, useMemberPermissions } from '@/hooks/usePermissions';
