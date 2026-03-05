import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, PenTool, Eraser, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";

interface PlanData {
  id: string;
  plan_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  grand_total: number;
  gst_amount: number;
  status: string;
  company_id: string;
}

interface PlanItem {
  id: string;
  asset_id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  dimensions: string;
  start_date: string;
  end_date: string;
  sales_price: number;
  card_rate: number;
  media_asset_code: string;
  printing_charges: number;
  mounting_charges: number;
  duration_days: number;
}

export default function ROSign() {
  const { planId, token } = useParams<{ planId: string; token: string }>();
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [companyName, setCompanyName] = useState("Matrix Network Solutions");
  const [tokenValid, setTokenValid] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planId && token) {
      validateAndLoad();
    }
  }, [planId, token]);

  async function validateAndLoad() {
    setLoading(true);
    setError(null);
    try {
      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from("plan_ro_tokens")
        .select("*")
        .eq("plan_id", planId!)
        .eq("token", token!)
        .gt("expires_at", new Date().toISOString())
        .is("used_at", null)
        .maybeSingle();

      if (tokenError) throw tokenError;

      if (!tokenData) {
        // Check if already used
        const { data: usedToken } = await supabase
          .from("plan_ro_tokens")
          .select("used_at")
          .eq("plan_id", planId!)
          .eq("token", token!)
          .maybeSingle();

        if (usedToken?.used_at) {
          setAlreadySigned(true);
          setTokenValid(false);
        } else {
          setError("This signing link has expired or is invalid.");
          setTokenValid(false);
        }
        setLoading(false);
        return;
      }

      setTokenValid(true);

      // Fetch plan
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("id, plan_name, client_name, start_date, end_date, grand_total, gst_amount, status, company_id")
        .eq("id", planId!)
        .single();

      if (planError) throw planError;
      setPlan(planData as PlanData);

      // Fetch plan items
      const { data: items } = await supabase
        .from("plan_items")
        .select("id, asset_id, location, area, city, media_type, dimensions, start_date, end_date, sales_price, card_rate, printing_charges, mounting_charges, duration_days, media_assets(media_asset_code)")
        .eq("plan_id", planId!)
        .order("created_at");

      const mappedItems = (items || []).map((item: any) => ({
        ...item,
        media_asset_code: item.media_assets?.media_asset_code || null,
      }));
      setPlanItems(mappedItems as PlanItem[]);

      // Fetch company name
      if (planData?.company_id) {
        const { data: compData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", planData.company_id)
          .single();
        if (compData?.name) setCompanyName(compData.name);
      }
    } catch (err: any) {
      console.error("Load error:", err);
      setError("Failed to load Release Order details.");
    }
    setLoading(false);
  }

  function clearSignature() {
    sigCanvasRef.current?.clear();
  }

  async function handleSign() {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please draw your signature before approving.",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);
    try {
      // Get signature as PNG blob
      const dataUrl = sigCanvasRef.current.toDataURL("image/png");
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Upload signature to storage
      const sigPath = `${planId}.png`;
      const { error: uploadError } = await supabase.storage
        .from("ro-signatures")
        .upload(sigPath, blob, { upsert: true, contentType: "image/png" });

      if (uploadError) throw uploadError;

      // Get a signed URL for the signature
      const { data: urlData } = await supabase.storage
        .from("ro-signatures")
        .createSignedUrl(sigPath, 60 * 60 * 24 * 365);

      const signatureUrl = urlData?.signedUrl || sigPath;

      // Mark token as used
      const { error: tokenUpdateError } = await supabase
        .from("plan_ro_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("plan_id", planId!)
        .eq("token", token!);

      if (tokenUpdateError) throw tokenUpdateError;

      // Update plan with signed RO info
      const { error: planUpdateError } = await supabase
        .from("plans")
        .update({
          signed_ro_url: signatureUrl,
          signed_ro_uploaded_at: new Date().toISOString(),
          signed_ro_uploaded_by: null, // client (no auth user)
          status: "wo_received" as any,
        } as any)
        .eq("id", planId!);

      if (planUpdateError) throw planUpdateError;

      setSigned(true);
      toast({
        title: "Release Order Signed!",
        description: "Your digital signature has been recorded successfully.",
      });
    } catch (err: any) {
      console.error("Signing error:", err);
      toast({
        title: "Signing Failed",
        description: err.message || "Could not complete the signing process.",
        variant: "destructive",
      });
    }
    setSigning(false);
  }

  function formatDate(d: string) {
    if (!d) return "-";
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "-";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading Release Order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Link Invalid</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySigned || signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Release Order Signed</h2>
            <p className="text-muted-foreground">
              {signed
                ? "Thank you! Your digital signature has been recorded successfully."
                : "This Release Order has already been signed."}
            </p>
            {plan && (
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong>Plan:</strong> {plan.plan_name || plan.id}</p>
                <p><strong>Client:</strong> {plan.client_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid || !plan) return null;

  const totalDays = Math.max(1, Math.ceil(
    (new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold">{companyName}</h1>
          <p className="text-primary-foreground/80 mt-1 flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            Release Order Approval
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-12">
        {/* Campaign Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Campaign Name</p>
                <p className="font-semibold">{plan.plan_name || plan.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-semibold">{plan.client_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Campaign Period</p>
                <p className="font-semibold">{formatDate(plan.start_date)} — {formatDate(plan.end_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Assets</p>
                <p className="font-semibold">{planItems.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grand Total</p>
                <p className="font-semibold text-primary">{formatCurrency(plan.grand_total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="secondary">{plan.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Media Assets</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Media Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planItems.map((item, idx) => {
                  const rate = Number(item.sales_price || item.card_rate || 0);
                  const days = item.duration_days || totalDays;
                  const amount = Math.round(((rate / 30) * days) * 100) / 100;
                  const displayCode = formatAssetDisplayCode({
                    mediaAssetCode: item.media_asset_code,
                    fallbackId: item.asset_id,
                    companyName,
                  });

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{displayCode || item.asset_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.location}</p>
                          <p className="text-xs text-muted-foreground">{item.area || item.city}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.media_type}</TableCell>
                      <TableCell>{formatDate(item.start_date || plan.start_date)}</TableCell>
                      <TableCell>{formatDate(item.end_date || plan.end_date)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(rate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Digital Signature
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              By signing below, you approve this Release Order and authorize the commencement of the campaign.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: "w-full h-[200px] rounded-lg",
                  style: { width: "100%", height: "200px" },
                }}
                penColor="#1e3a8a"
                backgroundColor="white"
              />
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={signing}
              >
                <Eraser className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button
                onClick={handleSign}
                disabled={signing}
                size="lg"
                className="min-w-[200px]"
              >
                {signing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Sign & Approve
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This digital signature is legally binding. By clicking "Sign & Approve", 
              you confirm that you have reviewed all campaign details and agree to the terms.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
