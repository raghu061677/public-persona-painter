import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type SearchType = 'media_assets' | 'clients' | 'campaigns' | 'plans' | 'invoices' | 'global';

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  search_type: SearchType;
  filters: Record<string, any>;
  is_favorite: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecentSearch {
  id: string;
  user_id: string;
  search_query: string;
  search_type: SearchType;
  filters: Record<string, any>;
  created_at: string;
}

export function useAdvancedSearch(searchType: SearchType) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedSearches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('search_type', searchType)
        .order('is_favorite', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches((data || []) as SavedSearch[]);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  }, [searchType]);

  const fetchRecentSearches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recent_searches')
        .select('*')
        .eq('search_type', searchType)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentSearches((data || []) as RecentSearch[]);
    } catch (error) {
      console.error('Error fetching recent searches:', error);
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  useEffect(() => {
    fetchSavedSearches();
    fetchRecentSearches();
  }, [fetchSavedSearches, fetchRecentSearches]);

  const saveSearch = useCallback(async (name: string, filters: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name,
          search_type: searchType,
          filters,
        });

      if (error) throw error;

      toast({
        title: 'Search saved',
        description: `"${name}" has been saved to your searches`,
      });
      fetchSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      toast({
        title: 'Error',
        description: 'Failed to save search',
        variant: 'destructive',
      });
    }
  }, [searchType, fetchSavedSearches]);

  const deleteSavedSearch = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Search deleted',
        description: 'Saved search has been removed',
      });
      fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting saved search:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete search',
        variant: 'destructive',
      });
    }
  }, [fetchSavedSearches]);

  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);

      if (error) throw error;
      fetchSavedSearches();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [fetchSavedSearches]);

  const updateLastUsed = useCallback(async (id: string) => {
    try {
      await supabase
        .from('saved_searches')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', id);
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  }, []);

  const addRecentSearch = useCallback(async (query: string, filters: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('recent_searches')
        .insert({
          user_id: user.id,
          search_query: query,
          search_type: searchType,
          filters,
        });

      fetchRecentSearches();
    } catch (error) {
      console.error('Error adding recent search:', error);
    }
  }, [searchType, fetchRecentSearches]);

  const clearRecentSearches = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('recent_searches')
        .delete()
        .eq('user_id', user.id)
        .eq('search_type', searchType);

      if (error) throw error;

      toast({
        title: 'Recent searches cleared',
      });
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  }, [searchType]);

  return {
    savedSearches,
    recentSearches,
    loading,
    saveSearch,
    deleteSavedSearch,
    toggleFavorite,
    updateLastUsed,
    addRecentSearch,
    clearRecentSearches,
  };
}
