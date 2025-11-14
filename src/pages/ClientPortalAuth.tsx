import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClientPortalAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [message, setMessage] = useState('Validating your access...');

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No access token provided');
      return;
    }

    try {
      // Check if token exists and is valid
      const { data: access, error } = await supabase
        .from('client_portal_access')
        .select('*, client:clients(*)')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!access) {
        setStatus('error');
        setMessage('Invalid or expired access link');
        return;
      }

      // Check if token has expired
      if (access && new Date((access as any).expires_at) < new Date()) {
        setStatus('error');
        setMessage('This access link has expired. Please request a new one.');
        return;
      }

      // Check if token has already been used
      if (access && (access as any).used_at) {
        setStatus('error');
        setMessage('This access link has already been used. Please request a new one.');
        return;
      }

      // Mark token as used and update last accessed
      await supabase
        .from('client_portal_access')
        .update({
          used_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        } as any)
        .eq('token', token);

      // Create a temporary session for client portal
      // Store client info in localStorage for client portal access
      localStorage.setItem('client_portal_access', JSON.stringify({
        clientId: (access as any).client_id,
        clientName: (access as any).client.name,
        email: (access as any).email,
        accessToken: token,
        expiresAt: (access as any).expires_at,
      }));

      setStatus('success');
      setMessage('Access granted! Redirecting to your portal...');

      // Redirect to client portal dashboard
      setTimeout(() => {
        navigate('/portal/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Error validating token:', error);
      setStatus('error');
      setMessage('Failed to validate access. Please try again.');
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Client Portal Access</CardTitle>
          <CardDescription>
            {status === 'validating' && 'Verifying your access credentials...'}
            {status === 'success' && 'Welcome to your campaign portal'}
            {status === 'error' && 'Access verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'validating' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div className="space-y-2">
                <p className="font-medium text-green-600">{message}</p>
                <p className="text-sm text-muted-foreground">
                  You will be redirected automatically...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <div className="space-y-4">
                <p className="font-medium text-destructive">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Please contact your account manager for assistance.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
