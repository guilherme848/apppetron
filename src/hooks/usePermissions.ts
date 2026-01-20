import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Permission, MemberPermission, PermissionKey } from '@/types/permissions';

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('key');
      
      if (error) {
        console.error('Error fetching permissions:', error);
      } else {
        setPermissions(data || []);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, []);

  return { permissions, loading };
}

export function useMemberPermissions(memberId: string | null) {
  const [memberPermissions, setMemberPermissions] = useState<MemberPermission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMemberPermissions = useCallback(async () => {
    if (!memberId) {
      setMemberPermissions([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('member_permissions')
      .select('*')
      .eq('member_id', memberId);

    if (error) {
      console.error('Error fetching member permissions:', error);
    } else {
      setMemberPermissions(data || []);
    }
    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    fetchMemberPermissions();
  }, [fetchMemberPermissions]);

  const setPermission = async (permissionKey: string, allowed: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!memberId) return { success: false, error: 'Nenhum membro selecionado' };

    const existing = memberPermissions.find(mp => mp.permission_key === permissionKey);

    if (existing) {
      if (allowed) {
        // Remove the record (allowed is default)
        const { error } = await supabase
          .from('member_permissions')
          .delete()
          .eq('id', existing.id);

        if (error) {
          console.error('Error deleting permission:', error);
          return { success: false, error: 'Erro ao atualizar permissão' };
        }

        setMemberPermissions(prev => prev.filter(mp => mp.id !== existing.id));
      } else {
        // Update to not allowed
        const { error } = await supabase
          .from('member_permissions')
          .update({ allowed: false })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating permission:', error);
          return { success: false, error: 'Erro ao atualizar permissão' };
        }

        setMemberPermissions(prev => 
          prev.map(mp => mp.id === existing.id ? { ...mp, allowed: false } : mp)
        );
      }
    } else {
      if (!allowed) {
        // Create with allowed = false
        const { data, error } = await supabase
          .from('member_permissions')
          .insert([{ member_id: memberId, permission_key: permissionKey, allowed: false }])
          .select()
          .single();

        if (error) {
          console.error('Error creating permission:', error);
          return { success: false, error: 'Erro ao criar permissão' };
        }

        setMemberPermissions(prev => [...prev, data]);
      }
      // If allowed and doesn't exist, that's the default state - no need to create
    }

    return { success: true };
  };

  const hasPermission = (permissionKey: string): boolean => {
    const mp = memberPermissions.find(p => p.permission_key === permissionKey);
    // If no record exists, permission is allowed by default
    // If record exists, check the allowed field
    return mp ? mp.allowed : true;
  };

  return {
    memberPermissions,
    loading,
    setPermission,
    hasPermission,
    refetch: fetchMemberPermissions,
  };
}

// Hook for current user permissions (from localStorage)
const CURRENT_MEMBER_KEY = 'current_member_id';

export function useCurrentMember() {
  const [currentMemberId, setCurrentMemberIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CURRENT_MEMBER_KEY);
    }
    return null;
  });

  const setCurrentMemberId = (id: string | null) => {
    if (id) {
      localStorage.setItem(CURRENT_MEMBER_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_MEMBER_KEY);
    }
    setCurrentMemberIdState(id);
    // Dispatch storage event for other components
    window.dispatchEvent(new Event('storage'));
  };

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(CURRENT_MEMBER_KEY);
      setCurrentMemberIdState(stored);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { currentMemberId, setCurrentMemberId };
}

// Hook to check permissions for current user
export function useCurrentUserPermissions() {
  const { currentMemberId } = useCurrentMember();
  const { memberPermissions, loading } = useMemberPermissions(currentMemberId);

  const can = useCallback((permissionKey: PermissionKey): boolean => {
    // If no current member is set, allow everything (admin mode)
    if (!currentMemberId) return true;
    
    const mp = memberPermissions.find(p => p.permission_key === permissionKey);
    // If no record exists, permission is allowed by default
    return mp ? mp.allowed : true;
  }, [currentMemberId, memberPermissions]);

  return { 
    can, 
    loading, 
    currentMemberId,
    isAdmin: !currentMemberId, // No user selected = admin mode
  };
}
