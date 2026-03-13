import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types/team';

// ID do cargo "Gestor de Tráfego"
const TRAFFIC_MANAGER_ROLE_ID = '29521693-8a2e-46fe-81a5-8b78059ad879';

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching team members:', error);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (member: Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>> & { name: string }) => {
    const { data, error } = await supabase
      .from('team_members')
      .insert([{ ...member, full_name: member.full_name || member.name }])
      .select()
      .single();
    if (error) {
      console.error('Error adding member:', error);
      return { data: null, error };
    }
    setMembers((prev) => [...prev, data as TeamMember].sort((a, b) => a.name.localeCompare(b.name)));
    return { data: data as TeamMember, error: null };
  };

  const updateMember = async (id: string, updates: Partial<TeamMember>) => {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating member:', error);
      return { data: null, error };
    }
    setMembers((prev) => prev.map((m) => (m.id === id ? data : m)).sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error: null };
  };

  const deleteMember = async (id: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) {
      console.error('Error deleting member:', error);
      return { error };
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    return { error: null };
  };

  const getMemberById = (id: string | null) => members.find((m) => m.id === id);
  
  const getActiveMembers = () => members.filter((m) => m.active);

  const getMembersByRoleId = (roleId: string) => members.filter((m) => m.role_id === roleId && m.active);

  // Filtrar apenas gestores de tráfego ativos
  const trafficManagers = useMemo(() => {
    return members.filter((m) => m.role_id === TRAFFIC_MANAGER_ROLE_ID && m.active);
  }, [members]);

  return {
    members,
    loading,
    addMember,
    updateMember,
    deleteMember,
    getMemberById,
    getActiveMembers,
    getMembersByRoleId,
    trafficManagers,
    refetch: fetchMembers,
  };
}
