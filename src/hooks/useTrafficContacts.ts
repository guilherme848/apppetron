import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentMember } from '@/hooks/useCurrentAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// ---- Reasons ----
export function useContactReasons() {
  return useQuery({
    queryKey: ['traffic-contact-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_contact_reasons')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

// ---- Channels ----
export function useContactChannels() {
  return useQuery({
    queryKey: ['traffic-contact-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_contact_channels')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

// ---- Settings ----
export function useContactSettings() {
  return useQuery({
    queryKey: ['traffic-contact-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_contact_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// ---- Client last contacts (view) ----
export function useClientLastContacts(memberId: string | null, showAll = false) {
  return useQuery({
    queryKey: ['traffic-client-last-contacts', showAll ? '__all__' : memberId],
    enabled: showAll || !!memberId,
    queryFn: async () => {
      let q = supabase.from('traffic_client_last_contact').select('*');
      if (!showAll) {
        q = q.eq('traffic_member_id', memberId!);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// ---- Today contacts ----
export function useTodayContacts(memberId: string | null) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['traffic-contacts-today', memberId, today],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_contacts')
        .select('*, traffic_contact_reasons(*), traffic_contact_channels(*)')
        .eq('member_id', memberId!)
        .eq('contact_date', today);
      if (error) throw error;
      return data;
    },
  });
}

// ---- Monthly contact counts ----
export function useMonthlyContactCounts(memberId: string | null) {
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['traffic-contacts-monthly', memberId, monthStart],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_contacts')
        .select('contact_date')
        .eq('member_id', memberId!)
        .eq('completed', true)
        .gte('contact_date', monthStart)
        .lte('contact_date', monthEnd);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.contact_date] = (counts[row.contact_date] || 0) + 1;
      }
      return counts;
    },
  });
}

// ---- Comments ----
export function useContactComments(contactId: string | null) {
  return useQuery({
    queryKey: ['traffic-contact-comments', contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_contact_comments')
        .select('*, team_members:member_id(name, profile_photo_path)')
        .eq('contact_id', contactId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ---- Mutations ----
export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      member_id: string;
      reason_id?: string;
      channel_id?: string;
      result?: string;
      notes?: string;
      completed?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('traffic_contacts')
        .insert({
          ...input,
          completed_at: input.completed ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traffic-contacts-today'] });
      qc.invalidateQueries({ queryKey: ['traffic-client-last-contacts'] });
      qc.invalidateQueries({ queryKey: ['traffic-contacts-monthly'] });
    },
  });
}

export function useCompleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      reason_id: string;
      channel_id?: string;
      result?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('traffic_contacts')
        .update({
          reason_id: input.reason_id,
          channel_id: input.channel_id || null,
          result: input.result || null,
          notes: input.notes || null,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traffic-contacts-today'] });
      qc.invalidateQueries({ queryKey: ['traffic-client-last-contacts'] });
      qc.invalidateQueries({ queryKey: ['traffic-contacts-monthly'] });
    },
  });
}

export function useToggleContactCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('traffic_contacts')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traffic-contacts-today'] });
      qc.invalidateQueries({ queryKey: ['traffic-client-last-contacts'] });
      qc.invalidateQueries({ queryKey: ['traffic-contacts-monthly'] });
    },
  });
}

export function useAddContactComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contact_id: string; member_id: string; content: string }) => {
      const { data, error } = await supabase
        .from('traffic_contact_comments')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['traffic-contact-comments', vars.contact_id] });
    },
  });
}
