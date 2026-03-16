import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const COMPACT_BREAKPOINT = 1280;

export function useSidebarPreference() {
  const { user } = useAuth();
  // Default collapsed (false)
  const [sidebarExpanded, setSidebarExpandedState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isSmallScreen = useRef(false);

  // Check viewport on mount
  useEffect(() => {
    isSmallScreen.current = window.innerWidth < COMPACT_BREAKPOINT;
  }, []);

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
        // On small screens, always start collapsed regardless of saved pref
        const savedValue = data.sidebar_expanded;
        setSidebarExpandedState(
          window.innerWidth < COMPACT_BREAKPOINT ? false : savedValue
        );
      }
      setLoaded(true);
    })();
  }, [user?.id]);

  const setSidebarExpanded = useCallback((value: boolean) => {
    setSidebarExpandedState(value);
    if (!user?.id) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, sidebar_expanded: value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    }, 100);
  }, [user?.id]);

  return { sidebarExpanded, setSidebarExpanded, loaded };
}
