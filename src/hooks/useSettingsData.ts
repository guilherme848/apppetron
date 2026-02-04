import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Service, Niche } from '@/types/settings';

export function useSettingsData() {
  const [services, setServices] = useState<Service[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching services:', error);
    } else {
      setServices(data || []);
    }
  }, []);

  const fetchNiches = useCallback(async () => {
    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching niches:', error);
    } else {
      setNiches(data || []);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchServices(), fetchNiches()]);
    setLoading(false);
  }, [fetchServices, fetchNiches]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Services CRUD
  const addService = async (
    name: string, 
    trafficRoutineId?: string | null,
    hasContent: boolean = true,
    hasTraffic: boolean = true,
    isLegacy: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: 'Nome é obrigatório' };

    // Check for duplicates (case-insensitive)
    const exists = services.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) return { success: false, error: 'Serviço já existe' };

    const insertData: { 
      name: string; 
      traffic_routine_id?: string | null;
      has_content: boolean;
      has_traffic: boolean;
      is_legacy: boolean;
    } = { 
      name: trimmedName,
      has_content: hasContent,
      has_traffic: hasTraffic,
      is_legacy: isLegacy
    };
    
    if (trafficRoutineId !== undefined) {
      insertData.traffic_routine_id = trafficRoutineId;
    }

    const { data, error } = await supabase
      .from('services')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Serviço já existe' };
      }
      console.error('Error adding service:', error);
      return { success: false, error: 'Erro ao adicionar serviço' };
    }

    setServices(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { success: true };
  };

  const updateService = async (id: string, updates: Partial<Service>): Promise<{ success: boolean; error?: string }> => {
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) return { success: false, error: 'Nome é obrigatório' };
      
      const exists = services.some(s => s.id !== id && s.name.toLowerCase() === trimmedName.toLowerCase());
      if (exists) return { success: false, error: 'Serviço já existe' };
      
      updates.name = trimmedName;
    }

    const { error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Serviço já existe' };
      }
      console.error('Error updating service:', error);
      return { success: false, error: 'Erro ao atualizar serviço' };
    }

    setServices(prev => 
      prev.map(s => s.id === id ? { ...s, ...updates } : s)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return { success: true };
  };

  const deleteService = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      console.error('Error deleting service:', error);
      return { success: false, error: 'Erro ao excluir serviço' };
    }
    setServices(prev => prev.filter(s => s.id !== id));
    return { success: true };
  };

  const toggleServiceActive = async (id: string) => {
    const service = services.find(s => s.id === id);
    if (service) {
      await updateService(id, { active: !service.active });
    }
  };

  // Niches CRUD
  const addNiche = async (name: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: 'Nome é obrigatório' };

    const exists = niches.some(n => n.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) return { success: false, error: 'Nicho já existe' };

    const { data, error } = await supabase
      .from('niches')
      .insert([{ name: trimmedName }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Nicho já existe' };
      }
      console.error('Error adding niche:', error);
      return { success: false, error: 'Erro ao adicionar nicho' };
    }

    setNiches(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { success: true };
  };

  const updateNiche = async (id: string, updates: Partial<Niche>): Promise<{ success: boolean; error?: string }> => {
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) return { success: false, error: 'Nome é obrigatório' };
      
      const exists = niches.some(n => n.id !== id && n.name.toLowerCase() === trimmedName.toLowerCase());
      if (exists) return { success: false, error: 'Nicho já existe' };
      
      updates.name = trimmedName;
    }

    const { error } = await supabase
      .from('niches')
      .update(updates)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Nicho já existe' };
      }
      console.error('Error updating niche:', error);
      return { success: false, error: 'Erro ao atualizar nicho' };
    }

    setNiches(prev => 
      prev.map(n => n.id === id ? { ...n, ...updates } : n)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return { success: true };
  };

  const deleteNiche = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('niches').delete().eq('id', id);
    if (error) {
      console.error('Error deleting niche:', error);
      return { success: false, error: 'Erro ao excluir nicho' };
    }
    setNiches(prev => prev.filter(n => n.id !== id));
    return { success: true };
  };

  const toggleNicheActive = async (id: string) => {
    const niche = niches.find(n => n.id === id);
    if (niche) {
      await updateNiche(id, { active: !niche.active });
    }
  };

  // Helpers to get active items
  const activeServices = services.filter(s => s.active);
  const activeNiches = niches.filter(n => n.active);

  // Helper to find by name (for legacy compatibility)
  const findServiceByName = (name: string) => 
    services.find(s => s.name.toLowerCase() === name.toLowerCase());
  
  const findNicheByName = (name: string) => 
    niches.find(n => n.name.toLowerCase() === name.toLowerCase());

  return {
    services,
    niches,
    activeServices,
    activeNiches,
    loading,
    addService,
    updateService,
    deleteService,
    toggleServiceActive,
    addNiche,
    updateNiche,
    deleteNiche,
    toggleNicheActive,
    findServiceByName,
    findNicheByName,
    refetch: fetchAll,
  };
}
