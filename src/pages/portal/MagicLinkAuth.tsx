import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle } from "lucide-react";

export default function MagicLinkAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Check for token in URL on mount
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyMagicLink(token);
    }
  }, [searchParams]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-magic-link', {
        body: { 
          email,
          redirectUrl: window.location.origin,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setLinkSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for the login link (expires in 15 minutes)",
      });
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send magic link. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyMagicLink = async (token: string) => {
    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-magic-link', {
        body: { token },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.user) {
        // Store user session in localStorage
        localStorage.setItem('portal_user', JSON.stringify(data.user));
        
        toast({
          title: "Welcome!",
          description: `Logged in as ${data.user.name || data.user.email}`,
        });

        // Redirect to portal dashboard
        navigate('/portal/dashboard');
      }
    } catch (error: any) {
      console.error('Error verifying magic link:', error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid or expired magic link",
      });
      
      // Redirect back to auth page without token
      navigate('/portal/auth', { replace: true });
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Verifying your link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Client Portal Access</CardTitle>
          <CardDescription>
            Enter your email to receive a secure login link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkSent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-6">
                <CheckCircle className="h-16 w-16 text-green-600" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Check your email</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    We've sent a magic link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    The link will expire in 15 minutes.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setLinkSent(false);
                  setEmail("");
                }}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send magic link
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Only registered client portal users can access this area.
                Contact your account manager if you need access.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
