import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Building2, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { logActivity } from "@/utils/activityLogger";

interface BookingRequest {
  id: string;
  asset_id: string;
  requester_company_id: string;
  owner_company_id: string;
  start_date: string;
  end_date: string;
  proposed_rate: number;
  campaign_name: string | null;
  client_name: string | null;
  notes: string | null;
  status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  requester_company: {
    name: string;
    type: string;
  };
  owner_company: {
    name: string;
  };
  media_asset: {
    id: string;
    location: string;
    area: string;
    city: string;
    media_type: string;
  };
}

export default function BookingRequests() {
  const { company } = useCompany();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchBookingRequests();
  }, [company?.id]);

  const fetchBookingRequests = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_requests')
        .select(`
          *,
          requester_company:companies!booking_requests_requester_company_id_fkey(name),
          owner_company:companies!booking_requests_owner_company_id_fkey(name),
          asset:media_assets(id, location, city, area, media_type)
        `)
        .eq('owner_company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as any);
    } catch (error: any) {
      console.error('Error fetching booking requests:', error);
      toast({
        title: "Error",
        description: "Failed to load booking requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'approved',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      await logActivity(
        'approve',
        'booking_request',
        selectedRequest.id,
        `Booking for ${selectedRequest.media_asset.id}`,
        { asset_id: selectedRequest.asset_id }
      );

      toast({
        title: "Success",
        description: "Booking request approved",
      });

      setReviewDialog(false);
      setSelectedRequest(null);
      fetchBookingRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      await logActivity(
        'reject',
        'booking_request',
        selectedRequest.id,
        `Booking for ${selectedRequest.media_asset.id}`,
        { asset_id: selectedRequest.asset_id, reason: rejectionReason }
      );

      toast({
        title: "Success",
        description: "Booking request rejected",
      });

      setReviewDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      fetchBookingRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "outline", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "secondary", icon: XCircle },
      completed: { variant: "default", icon: CheckCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderRequestCard = (request: BookingRequest, isOwner: boolean) => (
    <Card key={request.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {request.media_asset.id}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{request.media_asset.area}, {request.media_asset.city}</span>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Campaign</p>
            <p className="font-medium">{request.campaign_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Client</p>
            <p className="font-medium">{request.client_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">
                {format(new Date(request.start_date), 'dd MMM yyyy')} - {format(new Date(request.end_date), 'dd MMM yyyy')}
              </span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Proposed Rate</p>
            <p className="font-medium">₹{request.proposed_rate.toLocaleString()}/month</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">{isOwner ? 'Requested by' : 'Media Owner'}</p>
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="font-medium">
                {isOwner ? request.requester_company.name : request.owner_company.name}
              </span>
            </div>
          </div>
        </div>

        {request.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm">{request.notes}</p>
          </div>
        )}

        {request.rejection_reason && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">Rejection Reason</p>
            <p className="text-sm text-destructive">{request.rejection_reason}</p>
          </div>
        )}

        {isOwner && request.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                setSelectedRequest(request);
                setReviewDialog(true);
              }}
            >
              Review Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const outgoingRequests = requests.filter(r => r.requester_company_id === company?.id);
  const incomingRequests = requests.filter(r => r.owner_company_id === company?.id);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Booking Requests</h2>
        <p className="text-muted-foreground">
          Manage asset booking requests and approvals
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading booking requests...</p>
        </div>
      ) : (
        <Tabs defaultValue="incoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="incoming">
              Incoming Requests ({incomingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              My Requests ({outgoingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No incoming booking requests</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {incomingRequests.map(request => renderRequestCard(request, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            {outgoingRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No outgoing booking requests</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {outgoingRequests.map(request => renderRequestCard(request, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Booking Request</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Asset: {selectedRequest.media_asset.id}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.media_asset.location}, {selectedRequest.media_asset.area}
                </p>
                <p className="text-sm">
                  Duration: {format(new Date(selectedRequest.start_date), 'dd MMM yyyy')} - {format(new Date(selectedRequest.end_date), 'dd MMM yyyy')}
                </p>
                <p className="text-sm">
                  Proposed Rate: ₹{selectedRequest.proposed_rate.toLocaleString()}/month
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
            <Button onClick={handleApprove}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
