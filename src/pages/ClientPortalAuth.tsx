import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClientPortalAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [companyBranding, setCompanyBranding] = useState<any>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    loadCompanyBranding();
    if (token) verifyMagicLink(token);
  }, [token]);

  const loadCompanyBranding = async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('name, logo_url, theme_color')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (data) {
        setCompanyBranding(data);
        if (data.theme_color) {
          document.documentElement.style.setProperty('--primary', data.theme_color);
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const verifyMagicLink = async (magicToken: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-client-portal-magic-link', {
        body: { token: magicToken },
      });

      if (error) throw error;

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        toast({ title: 'Welcome!', description: 'Authentication successful.' });
        navigate('/portal/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message || 'Invalid or expired link',
        variant: 'destructive',
      });
      navigate('/portal/auth');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: portalUser, error: userError } = await supabase
        .from('client_portal_users')
        .select('email, client_id')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (userError || !portalUser) {
        throw new Error('Email not found. Contact your account manager.');
      }

      const { error } = await supabase.functions.invoke('send-client-portal-magic-link', {
        body: { email, client_id: portalUser.client_id },
      });

      if (error) throw error;

      setLinkSent(true);
      toast({ title: 'Magic Link Sent', description: 'Check your email. Link expires in 24h.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Verifying access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {companyBranding?.logo_url && (
            <img src={companyBranding.logo_url} alt="Company Logo" className="h-16 mx-auto object-contain" />
          )}
          <div>
            <CardTitle className="text-2xl">Client Portal</CardTitle>
            <CardDescription>Secure access to your campaigns</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {linkSent ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Check your email!</strong>
                <p className="mt-2">Magic link sent to <strong>{email}</strong></p>
                <button onClick={() => { setLinkSent(false); setEmail(''); }} className="underline mt-2 text-sm">
                  Try again
                </button>
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Email registered by your account manager</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><Mail className="mr-2 h-4 w-4" />Send Magic Link</>
                )}
              </Button>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Passwordless login:</strong> Secure link via email
                </AlertDescription>
              </Alert>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
