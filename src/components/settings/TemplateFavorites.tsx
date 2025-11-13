import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PPTTemplatePreview } from './PPTTemplatePreview';

interface TemplateFavorite {
  id: string;
  template_name: string;
  template_config: {
    ppt_template_name: string;
    ppt_primary_color: string;
    ppt_secondary_color: string;
    ppt_accent_color: string;
    ppt_layout_style: string;
    ppt_include_company_logo: boolean;
    ppt_watermark_enabled: boolean;
    ppt_footer_text: string;
  };
  created_at: string;
}

interface TemplateFavoritesProps {
  currentSettings: any;
  onApplyTemplate: (config: any) => void;
}

export function TemplateFavorites({ currentSettings, onApplyTemplate }: TemplateFavoritesProps) {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<TemplateFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('template_favorites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load favorite templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFavorite = async () => {
    const name = prompt('Enter a name for this template:');
    if (!name) return;

    try {
      const { error } = await supabase
        .from('template_favorites')
        .insert({
          template_name: name,
          template_config: {
            ppt_template_name: currentSettings.ppt_template_name,
            ppt_primary_color: currentSettings.ppt_primary_color,
            ppt_secondary_color: currentSettings.ppt_secondary_color,
            ppt_accent_color: currentSettings.ppt_accent_color,
            ppt_layout_style: currentSettings.ppt_layout_style,
            ppt_include_company_logo: currentSettings.ppt_include_company_logo,
            ppt_watermark_enabled: currentSettings.ppt_watermark_enabled,
            ppt_footer_text: currentSettings.ppt_footer_text,
          },
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template saved to favorites',
      });
      loadFavorites();
    } catch (error: any) {
      console.error('Error saving favorite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('template_favorites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template removed from favorites',
      });
      loadFavorites();
    } catch (error: any) {
      console.error('Error deleting favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            <CardTitle>Favorite Templates</CardTitle>
          </div>
          <Button size="sm" onClick={handleSaveFavorite}>
            <Star className="mr-2 h-4 w-4" />
            Save Current as Favorite
          </Button>
        </div>
        <CardDescription>
          Quick access to your most-used template configurations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No favorite templates yet. Save your current template to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <div key={fav.id} className="relative group">
                <div onClick={() => onApplyTemplate(fav.template_config)}>
                  <PPTTemplatePreview
                    layout={fav.template_config.ppt_layout_style}
                    primaryColor={fav.template_config.ppt_primary_color}
                    secondaryColor={fav.template_config.ppt_secondary_color}
                    accentColor={fav.template_config.ppt_accent_color}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{fav.template_name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDelete(fav.id)}
                    disabled={deleting === fav.id}
                  >
                    {deleting === fav.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
