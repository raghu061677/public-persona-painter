import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FavoriteMenuItem {
  id: string;
  menu_item_path: string;
  menu_item_label: string;
  display_order: number;
}

export function useMenuFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_menu_favorites')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (path: string, label: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_menu_favorites')
        .insert({
          user_id: user.id,
          menu_item_path: path,
          menu_item_label: label,
          display_order: favorites.length,
        })
        .select()
        .single();

      if (error) throw error;
      
      setFavorites([...favorites, data]);
      toast.success('Added to favorites');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Already in favorites');
      } else {
        toast.error('Failed to add favorite');
        console.error('Error adding favorite:', error);
      }
    }
  };

  const removeFavorite = async (path: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_menu_favorites')
        .delete()
        .eq('menu_item_path', path);

      if (error) throw error;
      
      setFavorites(favorites.filter(f => f.menu_item_path !== path));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove favorite');
      console.error('Error removing favorite:', error);
    }
  };

  const isFavorite = (path: string) => {
    return favorites.some(f => f.menu_item_path === path);
  };

  const reorderFavorites = async (newOrder: FavoriteMenuItem[]) => {
    if (!user) return;

    try {
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('user_menu_favorites')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      setFavorites(newOrder);
    } catch (error) {
      toast.error('Failed to reorder favorites');
      console.error('Error reordering favorites:', error);
    }
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    reorderFavorites,
  };
}
