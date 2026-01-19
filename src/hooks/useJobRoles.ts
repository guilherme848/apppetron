import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JobRole } from '@/types/contentProduction';

export function useJobRoles() {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_roles')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching roles:', error);
    } else {
      setRoles(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const addRole = async (name: string) => {
    const { data, error } = await supabase
      .from('job_roles')
      .insert([{ name }])
      .select()
      .single();
    if (error) {
      console.error('Error adding role:', error);
      return { data: null, error };
    }
    setRoles((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error: null };
  };

  const updateRole = async (id: string, name: string) => {
    const { data, error } = await supabase
      .from('job_roles')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating role:', error);
      return { data: null, error };
    }
    setRoles((prev) => prev.map((r) => (r.id === id ? data : r)).sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error: null };
  };

  const deleteRole = async (id: string) => {
    const { error } = await supabase.from('job_roles').delete().eq('id', id);
    if (error) {
      console.error('Error deleting role:', error);
      return { error };
    }
    setRoles((prev) => prev.filter((r) => r.id !== id));
    return { error: null };
  };

  const getRoleById = (id: string | null) => roles.find((r) => r.id === id);
  const getRoleByName = (name: string) => roles.find((r) => r.name.toLowerCase() === name.toLowerCase());

  return {
    roles,
    loading,
    addRole,
    updateRole,
    deleteRole,
    getRoleById,
    getRoleByName,
    refetch: fetchRoles,
  };
}
