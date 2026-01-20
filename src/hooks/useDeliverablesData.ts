import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Deliverable, ServiceDeliverable } from '@/types/deliverables';

export function useDeliverablesData() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliverables = useCallback(async () => {
    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching deliverables:', error);
    } else {
      setDeliverables(data || []);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await fetchDeliverables();
    setLoading(false);
  }, [fetchDeliverables]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Deliverables CRUD
  const addDeliverable = async (name: string, unit: string | null): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: 'Nome é obrigatório' };

    const exists = deliverables.some(d => d.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) return { success: false, error: 'Entregável já existe' };

    const { data, error } = await supabase
      .from('deliverables')
      .insert([{ name: trimmedName, unit: unit?.trim() || null }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Entregável já existe' };
      }
      console.error('Error adding deliverable:', error);
      return { success: false, error: 'Erro ao adicionar entregável' };
    }

    setDeliverables(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { success: true };
  };

  const updateDeliverable = async (id: string, updates: Partial<Deliverable>): Promise<{ success: boolean; error?: string }> => {
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) return { success: false, error: 'Nome é obrigatório' };
      
      const exists = deliverables.some(d => d.id !== id && d.name.toLowerCase() === trimmedName.toLowerCase());
      if (exists) return { success: false, error: 'Entregável já existe' };
      
      updates.name = trimmedName;
    }

    if (updates.unit !== undefined) {
      updates.unit = updates.unit?.trim() || null;
    }

    const { error } = await supabase
      .from('deliverables')
      .update(updates)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Entregável já existe' };
      }
      console.error('Error updating deliverable:', error);
      return { success: false, error: 'Erro ao atualizar entregável' };
    }

    setDeliverables(prev => 
      prev.map(d => d.id === id ? { ...d, ...updates } : d)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return { success: true };
  };

  const deleteDeliverable = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('deliverables').delete().eq('id', id);
    if (error) {
      console.error('Error deleting deliverable:', error);
      return { success: false, error: 'Erro ao excluir entregável. Pode estar em uso.' };
    }
    setDeliverables(prev => prev.filter(d => d.id !== id));
    return { success: true };
  };

  const toggleDeliverableActive = async (id: string) => {
    const deliverable = deliverables.find(d => d.id === id);
    if (deliverable) {
      await updateDeliverable(id, { active: !deliverable.active });
    }
  };

  const activeDeliverables = deliverables.filter(d => d.active);

  return {
    deliverables,
    activeDeliverables,
    loading,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    toggleDeliverableActive,
    refetch: fetchAll,
  };
}

// Hook for service deliverables
export function useServiceDeliverables(serviceId: string | null) {
  const [items, setItems] = useState<ServiceDeliverable[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!serviceId) {
      setItems([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('service_deliverables')
      .select(`
        *,
        deliverable:deliverables(*)
      `)
      .eq('service_id', serviceId)
      .order('created_at');

    if (error) {
      console.error('Error fetching service deliverables:', error);
    } else {
      setItems((data || []).map(item => ({
        ...item,
        deliverable: item.deliverable as Deliverable
      })));
    }
    setLoading(false);
  }, [serviceId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (deliverableId: string, quantity: number, notes: string | null): Promise<{ success: boolean; error?: string }> => {
    if (!serviceId) return { success: false, error: 'Serviço não selecionado' };

    const { data, error } = await supabase
      .from('service_deliverables')
      .insert([{ 
        service_id: serviceId, 
        deliverable_id: deliverableId, 
        quantity, 
        notes: notes?.trim() || null 
      }])
      .select(`
        *,
        deliverable:deliverables(*)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Entregável já adicionado a este plano' };
      }
      console.error('Error adding service deliverable:', error);
      return { success: false, error: 'Erro ao adicionar entregável' };
    }

    setItems(prev => [...prev, { ...data, deliverable: data.deliverable as Deliverable }]);
    return { success: true };
  };

  const updateItem = async (id: string, updates: { quantity?: number; notes?: string | null }): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase
      .from('service_deliverables')
      .update({
        quantity: updates.quantity,
        notes: updates.notes?.trim() || null
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating service deliverable:', error);
      return { success: false, error: 'Erro ao atualizar' };
    }

    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
    return { success: true };
  };

  const deleteItem = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('service_deliverables').delete().eq('id', id);
    if (error) {
      console.error('Error deleting service deliverable:', error);
      return { success: false, error: 'Erro ao remover' };
    }
    setItems(prev => prev.filter(item => item.id !== id));
    return { success: true };
  };

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  };
}

// Hook to get deliverables for a client based on their service
export function useClientDeliverables(serviceId: string | null) {
  const [items, setItems] = useState<ServiceDeliverable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      if (!serviceId) {
        setItems([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('service_deliverables')
        .select(`
          *,
          deliverable:deliverables(*)
        `)
        .eq('service_id', serviceId)
        .order('created_at');

      if (error) {
        console.error('Error fetching client deliverables:', error);
      } else {
        setItems((data || []).map(item => ({
          ...item,
          deliverable: item.deliverable as Deliverable
        })));
      }
      setLoading(false);
    };

    fetchItems();
  }, [serviceId]);

  return { items, loading };
}
