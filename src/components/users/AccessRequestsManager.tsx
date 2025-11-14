import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  requested_module: string;
  requested_action: string;
  current_roles: any;
  status: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  denial_reason?: string;
  user_email?: string;
  user_name?: string;
}

export function AccessRequestsManager() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails
      const { data: { users } } = await supabase.auth.admin.listUsers();
      
      const requestsWithUserInfo = (data || []).map(req => {
        const user = users?.find((u: any) => u.id === req.user_id);
        return {
          ...req,
          user_email: user?.email,
          user_name: user?.email?.split('@')[0] || 'Unknown'
        };
      });

      setRequests(requestsWithUserInfo);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast({
        title: "Error",
        description: "Failed to load access requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: AccessRequest) => {
    setProcessing(true);
    try {
      // Add the role to user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: request.requested_role
        } as any);

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({
        title: "Request Approved",
        description: `${request.user_name} now has ${request.requested_role} role`,
      });

      loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'denied',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          denial_reason: denialReason
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Request Denied",
        description: "The user will be notified of the decision",
      });

      setSelectedRequest(null);
      setDenialReason("");
      loadRequests();
    } catch (error: any) {
      console.error('Error denying request:', error);
      toast({
        title: "Denial Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      denied: "destructive"
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return <div>Loading access requests...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Access Requests</CardTitle>
            <CardDescription>
              Review and approve or deny user permission requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.user_name}</span>
                    <span className="text-sm text-muted-foreground">({request.user_email})</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Requesting <Badge variant="outline" className="mx-1">{request.requested_role}</Badge>
                    role to access {request.requested_module}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Current roles: {Array.isArray(request.current_roles) 
                      ? request.current_roles.join(', ') 
                      : 'None'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Requested: {new Date(request.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={processing}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedRequest(request)}
                    disabled={processing}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>Previously reviewed access requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewedRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(request.status)}
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{request.user_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Requested {request.requested_role} role • {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No access requests</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Access Request</DialogTitle>
            <DialogDescription>
              Provide a reason for denying this request. The user will receive an email notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Denial Reason</Label>
              <Textarea
                id="reason"
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="Please explain why this request is being denied..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeny}
              disabled={!denialReason.trim() || processing}
            >
              {processing ? "Processing..." : "Deny Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
