import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MenuPreferences {
  id?: string;
  hidden_sections: string[];
  section_order: string[];
}

export function useMenuPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<MenuPreferences>({
    hidden_sections: [],
    section_order: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPreferences({ hidden_sections: [], section_order: [] });
      setLoading(false);
      return;
    }
    
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_menu_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPreferences({
          id: data.id,
          hidden_sections: data.hidden_sections || [],
          section_order: (data.section_order as string[]) || [],
        });
      }
    } catch (error) {
      console.error('Error fetching menu preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<MenuPreferences>) => {
    if (!user) return;

    try {
      const newPreferences = { ...preferences, ...updates };
      
      const { error } = await supabase
        .from('user_menu_preferences')
        .upsert({
          user_id: user.id,
          hidden_sections: newPreferences.hidden_sections,
          section_order: newPreferences.section_order,
        });

      if (error) throw error;
      
      setPreferences(newPreferences);
      toast.success('Menu preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
      console.error('Error updating preferences:', error);
    }
  };

  const toggleSectionVisibility = async (sectionTitle: string) => {
    const hidden = preferences.hidden_sections.includes(sectionTitle)
      ? preferences.hidden_sections.filter(s => s !== sectionTitle)
      : [...preferences.hidden_sections, sectionTitle];
    
    await updatePreferences({ hidden_sections: hidden });
  };

  const reorderSections = async (newOrder: string[]) => {
    await updatePreferences({ section_order: newOrder });
  };

  const resetPreferences = async () => {
    await updatePreferences({ hidden_sections: [], section_order: [] });
  };

  return {
    preferences,
    loading,
    toggleSectionVisibility,
    reorderSections,
    resetPreferences,
  };
}
