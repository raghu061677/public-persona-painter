import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';

interface CompanyBranding {
  name: string;
  logo_url: string | null;
  theme_color: string;
  secondary_color: string;
}

export function ClientPortalLayout() {
  const { signOut, portalUser, loading } = useClientPortal();
  const navigate = useNavigate();
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadCompanyBranding();
  }, []);

  useEffect(() => {
    if (!loading && !portalUser) {
      navigate('/portal/auth');
    }
  }, [loading, portalUser, navigate]);

  const loadCompanyBranding = async () => {
    try {
      const { data } = await (supabase as any)
        .from('companies')
        .select('name, logo_url, theme_color, secondary_color')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (data) {
        setBranding(data);
        applyBranding(data);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const applyBranding = (brandingData: CompanyBranding) => {
    const root = document.documentElement;
    
    if (brandingData.theme_color) {
      const hsl = hexToHSL(brandingData.theme_color);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
      }
    }
    
    if (brandingData.secondary_color) {
      const hsl = hexToHSL(brandingData.secondary_color);
      if (hsl) {
        root.style.setProperty('--secondary', hsl);
      }
    }
  };

  const hexToHSL = (hex: string): string | null => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    const lPercent = Math.round(l * 100);

    return `${h} ${s}% ${lPercent}%`;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Signed out successfully' });
    } catch (error) {
      toast({
        title: 'Error signing out',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with branding */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Company Name */}
            <div className="flex items-center gap-3">
              {branding?.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt={branding.name}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="h-10 w-10 bg-primary-foreground/10 rounded flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {branding?.name?.charAt(0) || 'C'}
                  </span>
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg">{branding?.name || 'Client Portal'}</h1>
                <p className="text-xs text-primary-foreground/70">Client Portal</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate('/portal/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate('/portal/proofs')}
              >
                Proofs
              </Button>
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate('/portal/payments')}
              >
                Payments
              </Button>
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate('/portal/downloads')}
              >
                Downloads
              </Button>
              <Button
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </nav>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-primary-foreground">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/portal/dashboard');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/portal/proofs');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Proofs
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/portal/payments');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Payments
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/portal/downloads');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Downloads
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {branding?.name || 'Client Portal'}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
