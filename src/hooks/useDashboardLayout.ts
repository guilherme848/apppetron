import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from 'react-grid-layout';

const PAGE_KEY = 'executive_dashboard';

// Default layout for executive dashboard
const DEFAULT_LAYOUT: Layout[] = [
  { i: 'health-score', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'active-clients', x: 2, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'churns', x: 3, y: 0, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'mrr', x: 2, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'ticket', x: 3, y: 1, w: 1, h: 1, minW: 1, minH: 1 },
  { i: 'churn-mrr-charts', x: 0, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'client-evolution', x: 0, y: 5, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'churn-lt', x: 0, y: 8, w: 2, h: 2, minW: 1, minH: 2 },
  { i: 'cohort', x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'distribution', x: 0, y: 14, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'ticket-niche', x: 0, y: 17, w: 4, h: 3, minW: 2, minH: 2 },
];

export function useDashboardLayout() {
  const { member } = useAuth();
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch user's saved layout
  useEffect(() => {
    const fetchLayout = async () => {
      if (!member?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_dashboard_layouts')
          .select('layout')
          .eq('user_id', member.id)
          .eq('page_key', PAGE_KEY)
          .maybeSingle();

        if (error) {
          console.error('Error fetching layout:', error);
        } else if (data?.layout) {
          // Merge with defaults to ensure new items are included
          const savedLayout = data.layout as Layout[];
          const mergedLayout = DEFAULT_LAYOUT.map((defaultItem) => {
            const savedItem = savedLayout.find((s) => s.i === defaultItem.i);
            return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
          });
          setLayout(mergedLayout);
        }
      } catch (err) {
        console.error('Error fetching layout:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLayout();
  }, [member?.id]);

  // Save layout to database
  const saveLayout = useCallback(
    async (newLayout: Layout[]) => {
      if (!member?.id) return;

      setSaving(true);
      try {
        const { error } = await supabase.from('user_dashboard_layouts').upsert(
          {
            user_id: member.id,
            page_key: PAGE_KEY,
            layout: newLayout,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,page_key' }
        );

        if (error) {
          console.error('Error saving layout:', error);
        }
      } catch (err) {
        console.error('Error saving layout:', err);
      } finally {
        setSaving(false);
      }
    },
    [member?.id]
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      setLayout(newLayout);
      saveLayout(newLayout);
    },
    [saveLayout]
  );

  return {
    layout,
    loading,
    saving,
    handleLayoutChange,
    defaultLayout: DEFAULT_LAYOUT,
  };
}
