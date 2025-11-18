import { useThemeStore } from '@/store/themeStore';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const themes = [
  { value: 'corporate', label: 'Corporate', icon: Monitor },
  { value: 'luxury-gold', label: 'Luxury Gold', icon: Palette },
  { value: 'cosmic-blue', label: 'Cosmic Blue', icon: Palette },
  { value: 'business-dark', label: 'Business Dark', icon: Moon },
  { value: 'billboard-black', label: 'Billboard Black', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'classic', label: 'Classic', icon: Monitor },
  { value: 'modern', label: 'Modern', icon: Palette },
] as const;

export default function ThemePicker() {
  const { theme, setTheme } = useThemeStore();

  // Apply theme on mount
  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      'classic', 'modern', 'dark', 'light', 'brand-blue', 'brand-green',
      'luxury-gold', 'cosmic-blue', 'corporate', 'business-dark', 'billboard-black'
    );
    // Set data-theme attribute for DaisyUI
    document.documentElement.setAttribute('data-theme', theme);
    // Add current theme as class
    document.documentElement.classList.add(theme);
    // Add dark class for tailwind dark mode
    if (theme === 'dark' || theme === 'business-dark' || theme === 'billboard-black' || theme === 'cosmic-blue') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const saveTheme = async (value: typeof theme) => {
    setTheme(value);
    
    // Save to user preferences in Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // You can save theme preference to a profiles table if needed
        // await supabase.from('profiles').update({ theme_preference: value }).eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Change Theme">
          <Palette className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          {themes.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={theme === value ? 'default' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => saveTheme(value)}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
