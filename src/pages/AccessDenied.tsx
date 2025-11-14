import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AccessDenied() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);

  const requiredRole = searchParams.get('role') || 'admin';
  const module = searchParams.get('module') || 'this resource';
  const action = searchParams.get('action') || 'access';

  const roleDescriptions: Record<string, string> = {
    admin: "Full system access with user and company management",
    sales: "Client management, leads, plans, and campaigns",
    operations: "Campaign execution, proof uploads, and power bills",
    finance: "Invoices, expenses, estimations, and financial reports",
    user: "Basic read-only access to view information"
  };

  const handleRequestAccess = async () => {
    if (!user) return;

    setRequesting(true);
    try {
      // Insert access request record
      const { error: insertError } = await supabase
        .from('access_requests')
        .insert({
          user_id: user.id,
          requested_role: requiredRole,
          requested_module: module,
          requested_action: action,
          current_roles: roles,
          status: 'pending'
        } as any);

      if (insertError) throw insertError;

      // Send notification to admins
      const { error: notifyError } = await supabase.functions.invoke('send-access-request-notification', {
        body: {
          userId: user.id,
          userEmail: user.email,
          requestedRole: requiredRole,
          requestedModule: module,
          currentRoles: roles
        }
      });

      if (notifyError) {
        console.error('Notification error:', notifyError);
      }

      toast({
        title: "Access Request Sent",
        description: "An administrator will review your request and respond via email.",
      });

      navigate(-1);
    } catch (error: any) {
      console.error('Access request error:', error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send access request. Please contact an administrator directly.",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription className="mt-2">
              You don't have permission to {action} {module}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Required Permission</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-base capitalize">
                  {requiredRole}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  role or higher
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {roleDescriptions[requiredRole]}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Your Current Roles</h3>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map(role => (
                    <Badge key={role} variant="secondary" className="capitalize">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">No roles assigned</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <p className="text-sm text-muted-foreground">
              If you need access to this resource, you can request the required permissions from an administrator. 
              They will receive an email notification and can approve or deny your request.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              
              <Button
                onClick={handleRequestAccess}
                disabled={requesting}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                {requesting ? "Sending..." : "Request Access"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              For immediate assistance, contact your system administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
