import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionKey, MemberPermission } from '@/types/permissions';

/**
 * Hook to check permissions for the currently authenticated user
 * This replaces the localStorage-based useCurrentUserPermissions
 */
export function useAuthPermissions() {
  const { member, isAdmin, loading: authLoading } = useAuth();
  const [memberPermissions, setMemberPermissions] = useState<MemberPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!member?.id) {
        setMemberPermissions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('member_permissions')
        .select('*')
        .eq('member_id', member.id);

      if (error) {
        console.error('Error fetching permissions:', error);
      } else {
        setMemberPermissions(data || []);
      }
      setLoading(false);
    };

    if (!authLoading) {
      fetchPermissions();
    }
  }, [member?.id, authLoading]);

  const can = useCallback((permissionKey: PermissionKey): boolean => {
    // Admin has all permissions
    if (isAdmin) return true;
    
    // If no member is set, deny all
    if (!member) return false;
    
    const mp = memberPermissions.find(p => p.permission_key === permissionKey);
    // If no record exists, permission is allowed by default
    return mp ? mp.allowed : true;
  }, [member, isAdmin, memberPermissions]);

  return { 
    can, 
    loading: loading || authLoading, 
    currentMemberId: member?.id || null,
    isAdmin,
    member,
  };
}
