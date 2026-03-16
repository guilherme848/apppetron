import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSidebarPreference() {
  const { user } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load preference from Supabase
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('sidebar_expanded, expanded_groups')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSidebarExpanded(data.sidebar_expanded);
        if (Array.isArray(data.expanded_groups)) {
          setExpandedGroups(data.expanded_groups as string[]);
        }
      }
      setLoaded(true);
    })();
  }, [user?.id]);

  const persistPrefs = useCallback((updates: Record<string, unknown>) => {
    if (!user?.id) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    }, 300);
  }, [user?.id]);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => {
      const newValue = !prev;
      persistPrefs({ sidebar_expanded: newValue });
      return newValue;
    });
  }, [persistPrefs]);

  const toggleGroup = useCallback((module: string) => {
    setExpandedGroups(prev => {
      const next = prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module];
      persistPrefs({ expanded_groups: next });
      return next;
    });
  }, [persistPrefs]);

  const isGroupExpanded = useCallback((module: string) => {
    return expandedGroups.includes(module);
  }, [expandedGroups]);

  // Initialize active group as expanded if no saved preference
  const initActiveGroup = useCallback((module: string) => {
    if (loaded && expandedGroups.length === 0) {
      setExpandedGroups([module]);
    }
  }, [loaded, expandedGroups.length]);

  return { sidebarExpanded, toggleSidebar, loaded, toggleGroup, isGroupExpanded, initActiveGroup };
}
