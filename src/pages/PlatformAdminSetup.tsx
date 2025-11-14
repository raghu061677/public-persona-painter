import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PlatformAdminSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const handleSetupAdmin = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "You must be logged in to set up platform admin access",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.rpc('setup_platform_admin', {
        p_user_email: user.email,
        p_company_name: 'Go-Ads Platform'
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        setSetupComplete(true);
        toast({
          title: "Success!",
          description: "Platform admin access has been granted. Please refresh the page.",
        });
        
        // Refresh the page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result?.message || 'Failed to setup admin access');
      }
    } catch (error: any) {
      console.error('Error setting up admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to setup platform admin. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl">Platform Admin Setup</CardTitle>
          <CardDescription className="text-base mt-2">
            Set up your account as a Platform Administrator to manage all companies, users, and marketplace features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!setupComplete ? (
            <>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg">What is Platform Admin?</h3>
                <p className="text-sm text-muted-foreground">
                  Platform Admin is the master account that has full access to:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Companies Management:</strong> View, approve, suspend all media owners and agencies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>User Management:</strong> Manage all users across all companies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Marketplace Control:</strong> Oversee all asset listings and bookings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Subscription Management:</strong> Handle billing and subscriptions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Commission Tracking:</strong> Monitor platform fees and commissions</span>
                  </li>
                </ul>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">Important</p>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Only grant platform admin access to trusted administrators. This role has full system access.
                    </p>
                  </div>
                </div>
              </div>

              {user && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Platform admin will be set up for: <strong className="text-foreground">{user.email}</strong>
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleSetupAdmin}
                  disabled={isProcessing}
                  className="flex-1"
                  size="lg"
                >
                  {isProcessing ? "Setting up..." : "Setup Platform Admin Access"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={isProcessing}
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-20 w-20 text-green-500" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">Setup Complete!</h3>
                <p className="text-muted-foreground">
                  Platform admin access has been granted. The page will refresh automatically.
                </p>
              </div>
              <Button onClick={() => window.location.reload()} size="lg">
                Refresh Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
