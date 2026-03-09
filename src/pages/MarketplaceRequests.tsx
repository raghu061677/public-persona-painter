import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar, MapPin, Building2, CheckCircle, XCircle, Clock, DollarSign, ArrowLeftRight, Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface MarketplaceRequest {
  id: string;
  listing_id: string;
  requesting_company_id: string;
  requested_by: string | null;
  offer_price: number;
  start_date: string;
  end_date: string;
  campaign_name: string | null;
  client_name: string | null;
  notes: string | null;
  counter_offer_price: number | null;
  counter_notes: string | null;
  rejection_reason: string | null;
  status: string;
  reviewed_at: string | null;
  created_campaign_id: string | null;
  created_at: string;
  listing?: {
    id: string;
    asset_id: string;
    rate: number;
    company_id: string;
    media_asset?: {
      id: string;
      city: string;
      area: string;
      location: string;
      media_type: string;
    };
  };
  requesting_company?: { name: string };
}

export default function MarketplaceRequests() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Review dialog
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MarketplaceRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [counterNotes, setCounterNotes] = useState("");

  useEffect(() => {
    if (company?.id) fetchRequests();
  }, [company?.id]);

  const fetchRequests = async () => {
    if (!company?.id) return;
    setLoading(true);

    // Fetch requests where I'm the listing owner OR the requester
    const { data, error } = await supabase
      .from("marketplace_requests")
      .select(`
        *,
        listing:marketplace_listings(
          id, asset_id, rate, company_id,
          media_asset:media_assets(id, city, area, location, media_type)
        ),
        requesting_company:companies!marketplace_requests_requesting_company_id_fkey(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error:", error);
    } else {
      setRequests((data || []) as any);
    }
    setLoading(false);
  };

  const handleAction = async (action: "accept" | "reject" | "counter") => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const body: Record<string, unknown> = {
        action,
        request_id: selectedRequest.id,
      };

      if (action === "reject") {
        body.rejection_reason = rejectionReason;
      }
      if (action === "counter") {
        if (!counterPrice) {
          toast({ title: "Error", description: "Please enter a counter offer price", variant: "destructive" });
          setProcessing(false);
          return;
        }
        body.counter_offer_price = parseFloat(counterPrice);
        body.counter_notes = counterNotes;
      }

      const { data, error } = await supabase.functions.invoke("accept-marketplace-booking", {
        body,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: action === "accept"
          ? `Booking accepted! Campaign ${data?.campaign_id} created.`
          : action === "reject"
            ? "Request rejected."
            : "Counter offer sent.",
      });

      setReviewDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      setCounterPrice("");
      setCounterNotes("");
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const openReview = (req: MarketplaceRequest) => {
    setSelectedRequest(req);
    setRejectionReason("");
    setCounterPrice(String(req.offer_price));
    setCounterNotes("");
    setReviewDialog(true);
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { variant: string; icon: any }> = {
      pending: { variant: "outline", icon: Clock },
      accepted: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      countered: { variant: "secondary", icon: ArrowLeftRight },
      withdrawn: { variant: "secondary", icon: XCircle },
      expired: { variant: "destructive", icon: Clock },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const isOwner = (req: MarketplaceRequest) => req.listing?.company_id === company?.id;
  const incomingRequests = requests.filter((r) => isOwner(r));
  const outgoingRequests = requests.filter((r) => r.requesting_company_id === company?.id);

  const renderCard = (req: MarketplaceRequest, incoming: boolean) => (
    <Card key={req.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{req.listing?.asset_id || "—"}</CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {req.listing?.media_asset?.area}, {req.listing?.media_asset?.city}
            </div>
          </div>
          {statusBadge(req.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Campaign</span>
            <p className="font-medium">{req.campaign_name || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Client</span>
            <p className="font-medium">{req.client_name || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Period</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className="font-medium text-xs">
                {format(new Date(req.start_date), "dd MMM")} – {format(new Date(req.end_date), "dd MMM yyyy")}
              </span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Offer</span>
            <p className="font-medium">₹{req.offer_price?.toLocaleString("en-IN")}/mo</p>
          </div>
          {incoming && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Requesting Company</span>
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span className="font-medium">{req.requesting_company?.name || "—"}</span>
              </div>
            </div>
          )}
        </div>

        {req.counter_offer_price && (
          <div className="pt-2 border-t">
            <span className="text-sm text-muted-foreground">Counter Offer</span>
            <p className="text-sm font-medium text-primary">₹{req.counter_offer_price.toLocaleString("en-IN")}/mo</p>
            {req.counter_notes && <p className="text-xs text-muted-foreground">{req.counter_notes}</p>}
          </div>
        )}

        {req.rejection_reason && (
          <div className="pt-2 border-t">
            <span className="text-sm text-muted-foreground">Rejection Reason</span>
            <p className="text-sm text-destructive">{req.rejection_reason}</p>
          </div>
        )}

        {req.created_campaign_id && (
          <div className="pt-2 border-t">
            <span className="text-sm text-muted-foreground">Campaign Created</span>
            <p className="text-sm font-medium text-primary">{req.created_campaign_id}</p>
          </div>
        )}

        {incoming && req.status === "pending" && (
          <div className="pt-2">
            <Button size="sm" className="w-full" onClick={() => openReview(req)}>
              Review Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Marketplace Booking Requests"
        description="Manage booking requests from the OOH Exchange"
      />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <Tabs defaultValue="incoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="incoming">Incoming ({incomingRequests.length})</TabsTrigger>
            <TabsTrigger value="outgoing">My Requests ({outgoingRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No incoming requests</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {incomingRequests.map((r) => renderCard(r, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            {outgoingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No outgoing requests</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {outgoingRequests.map((r) => renderCard(r, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Booking Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p><strong>Asset:</strong> {selectedRequest.listing?.asset_id}</p>
                <p><strong>Location:</strong> {selectedRequest.listing?.media_asset?.area}, {selectedRequest.listing?.media_asset?.city}</p>
                <p><strong>Period:</strong> {format(new Date(selectedRequest.start_date), "dd MMM yyyy")} – {format(new Date(selectedRequest.end_date), "dd MMM yyyy")}</p>
                <p><strong>Listing Rate:</strong> ₹{selectedRequest.listing?.rate?.toLocaleString("en-IN")}/mo</p>
                <p><strong>Offer Price:</strong> ₹{selectedRequest.offer_price?.toLocaleString("en-IN")}/mo</p>
                <p><strong>From:</strong> {selectedRequest.requesting_company?.name}</p>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label>Counter Offer Price (₹/mo)</Label>
                <Input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="Enter counter price"
                />
                <Label>Counter Notes</Label>
                <Textarea
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  placeholder="Optional notes for counter offer"
                  rows={2}
                />
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewDialog(false)} disabled={processing}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleAction("counter")} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowLeftRight className="h-4 w-4 mr-1" />}
              Counter
            </Button>
            <Button variant="destructive" onClick={() => handleAction("reject")} disabled={processing}>
              Reject
            </Button>
            <Button onClick={() => handleAction("accept")} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
