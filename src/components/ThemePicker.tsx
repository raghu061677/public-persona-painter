import { useThemeStore } from '@/store/themeStore';
import { Palette, Sun, Moon, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'brand-blue', label: 'Ocean Blue', icon: Droplet },
  { value: 'brand-green', label: 'Emerald', icon: Droplet },
] as const;

export default function ThemePicker() {
  const { theme, setTheme } = useThemeStore();

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
