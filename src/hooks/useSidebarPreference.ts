import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSidebarPreference() {
  const { user } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load preference from Supabase
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('sidebar_expanded')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSidebarExpanded(data.sidebar_expanded);
      }
      setLoaded(true);
    })();
  }, [user?.id]);

  const toggleSidebar = useCallback(async () => {
    const newValue = !sidebarExpanded;
    setSidebarExpanded(newValue);

    if (!user?.id) return;

    await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, sidebar_expanded: newValue, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  }, [sidebarExpanded, user?.id]);

  return { sidebarExpanded, toggleSidebar, loaded };
}
