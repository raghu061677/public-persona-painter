import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, MapPin } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { getPlanStatusColor, formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import { PlanAssetMap } from "@/components/plans/PlanAssetMap";
import { PublicPlanShare } from "@/components/plans/PublicPlanShare";

export default function PlanShare() {
  const { id, shareToken } = useParams();
  const [plan, setPlan] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [termsData, setTermsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [id, shareToken]);

  const fetchPlan = async () => {
    const { data: planData, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .eq('share_token', shareToken)
      .single();

    if (error || !planData) {
      toast({
        title: "Error",
        description: "Invalid or expired share link",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!planData.share_link_active) {
      toast({
        title: "Link Inactive",
        description: "This share link has been deactivated",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setPlan(planData);

    // Fetch plan items
    const { data: itemsData } = await supabase
      .from('plan_items')
      .select('*')
      .eq('plan_id', id)
      .order('created_at');
    
    setPlanItems(itemsData || []);

    // Fetch asset details for map
    if (itemsData && itemsData.length > 0) {
      const assetIds = itemsData.map(item => item.asset_id);
      const { data: assetsData } = await supabase
        .from('media_assets')
        .select('id, location, area, city, media_type, dimensions, direction, illumination, total_sqft, latitude, longitude')
        .in('id', assetIds);
      
      setAssets(assetsData || []);
    }

    // Fetch terms and conditions
    const { data: termsSettings } = await supabase
      .from('plan_terms_settings')
      .select('*')
      .limit(1)
      .single();
    
    setTermsData(termsSettings);
    
    setLoading(false);
  };

  const handleApprove = async () => {
    const { error } = await supabase
      .from('plans')
      .update({ status: 'Approved' })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan approved successfully",
      });
      fetchPlan();
    }
  };

  const handleRequestChanges = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Request changes functionality will be available soon",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">This share link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground py-8">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl font-bold mb-2">Go-Ads 360°</h1>
          <p className="text-primary-foreground/80">Media Planning Proposal</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Plan Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{plan.plan_name}</h2>
              <p className="text-muted-foreground">{plan.id}</p>
            </div>
            <Badge className={getPlanStatusColor(plan.status)}>
              {plan.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{plan.client_name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Campaign Period</p>
                <p className="font-medium">
                  {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.duration_days} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="font-medium text-xl">{formatCurrency(plan.grand_total)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Assets Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Proposed Media Assets ({planItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Media Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.location}</TableCell>
                    <TableCell>{item.city}</TableCell>
                    <TableCell>{item.media_type}</TableCell>
                    <TableCell>{item.dimensions}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.total_with_gst)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Investment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(plan.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({plan.gst_percent}%)</span>
                <span>{formatCurrency(plan.gst_amount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold text-lg">
                <span>Grand Total</span>
                <span>{formatCurrency(plan.grand_total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map View */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Asset Locations
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? "Hide Map" : "Show Map"}
              </Button>
            </div>
          </CardHeader>
          {showMap && (
            <CardContent>
              <PlanAssetMap assets={assets} planItems={planItems} />
            </CardContent>
          )}
        </Card>

        {/* Share & Download */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Share & Download</CardTitle>
          </CardHeader>
          <CardContent>
            <PublicPlanShare 
              plan={plan} 
              publicUrl={`${window.location.origin}/share/plan/${plan.id}/${plan.share_token}`}
            />
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        {termsData && termsData.terms && termsData.terms.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{termsData.title || "Terms & Conditions"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {termsData.terms.map((term: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {plan.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{plan.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {plan.status === 'Sent' && (
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRequestChanges}
            >
              <XCircle className="mr-2 h-5 w-5" />
              Request Changes
            </Button>
            <Button
              variant="gradient"
              size="lg"
              onClick={handleApprove}
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Approve Plan
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground border-t pt-6">
          <p>© 2025 Go-Ads 360° | Out-of-Home Media Solutions</p>
          <p className="mt-1">For questions, contact: info@goads360.com</p>
        </div>
      </div>
    </div>
  );
}
