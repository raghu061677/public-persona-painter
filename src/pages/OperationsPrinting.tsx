import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileCheck,
  MapPin,
  Calendar,
  IndianRupee,
  TrendingUp,
  Wallet,
  Settings2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPrintingStatusBadge,
  normalizePrintingStatus,
} from "@/lib/printing/printingStatus";
import PanelEditorSheet from "@/components/operations/printing/PanelEditorSheet";
import type { PrintingPanel } from "@/lib/printing/printingDefaults";

interface CampaignAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  status: string;
  printing_charges: number | null;
  printing_client_amount: number | null;
  printing_vendor_amount: number | null;
  printing_margin_amount: number | null;
  printing_costing_mode: string | null;
  campaigns: {
    campaign_name: string;
    client_name: string;
    start_date: string;
    company_id?: string | null;
  } | null;
}

export default function OperationsPrinting() {
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [panelsByAsset, setPanelsByAsset] = useState<Record<string, PrintingPanel[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CampaignAsset | null>(null);
  const { toast } = useToast();
  const { isAdmin, hasRole } = useAuth();

  const canEdit =
    isAdmin || hasRole("finance") || hasRole("operations") || hasRole("operations_manager");
  const canSeeVendor = canEdit; // vendor cost is operational/financial — restrict like finance

  useEffect(() => {
    void loadPrintingQueue();
  }, []);

  const loadPrintingQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(
          `
          id, campaign_id, asset_id, city, area, location, media_type, status,
          printing_charges, printing_client_amount, printing_vendor_amount,
          printing_margin_amount, printing_costing_mode,
          campaigns ( campaign_name, client_name, start_date, company_id )
        `
        )
        .in("status", ["Assigned", "Pending", "Installed", "Completed"])
        .order("campaigns(start_date)", { ascending: true });

      if (error) throw error;
      const list = (data || []) as unknown as CampaignAsset[];
      setAssets(list);

      // Bulk-load panels for visible assets
      const ids = list.map((a) => a.id);
      if (ids.length) {
        const { data: pData, error: pErr } = await supabase
          .from("campaign_asset_printing_panels")
          .select("*")
          .in("campaign_asset_id", ids)
          .order("sort_order", { ascending: true });
        if (pErr) throw pErr;
        const grouped: Record<string, PrintingPanel[]> = {};
        (pData || []).forEach((row: any) => {
          (grouped[row.campaign_asset_id] ||= []).push(row as PrintingPanel);
        });
        setPanelsByAsset(grouped);
      } else {
        setPanelsByAsset({});
      }
    } catch (error: any) {
      console.error("Error loading printing queue:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load printing queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return assets.reduce(
      (acc, a) => {
        const client = Number(a.printing_client_amount || a.printing_charges || 0);
        const vendor = Number(a.printing_vendor_amount || 0);
        const margin = Number(a.printing_margin_amount || 0);
        return {
          client: acc.client + client,
          vendor: acc.vendor + vendor,
          margin: acc.margin + margin,
          pending:
            acc.pending +
            (normalizePrintingStatus(a.status) === "Pending" ||
            normalizePrintingStatus(a.status) === "Assigned"
              ? 1
              : 0),
        };
      },
      { client: 0, vendor: 0, margin: 0, pending: 0 }
    );
  }, [assets]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openEditor = (asset: CampaignAsset) => {
    setEditingAsset(asset);
    setEditorOpen(true);
  };

  const renderStatus = (status: string) => {
    const meta = getPrintingStatusBadge(status);
    return (
      <Badge variant={meta.variant} className={meta.className}>
        {meta.label}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Printing Status</h1>
        <p className="text-muted-foreground">
          Monitor printing progress, panel-wise costing, and vendor payables
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<IndianRupee className="h-4 w-4" />}
          label="Total Client Printing"
          value={`₹${totals.client.toLocaleString()}`}
        />
        {canSeeVendor && (
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total Printer Payable"
            value={`₹${totals.vendor.toLocaleString()}`}
          />
        )}
        {canSeeVendor && (
          <SummaryCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Total Printing Margin"
            value={`₹${totals.margin.toLocaleString()}`}
            highlight
          />
        )}
        <SummaryCard
          icon={<FileCheck className="h-4 w-4" />}
          label="Pending Jobs"
          value={String(totals.pending)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Printing Queue ({assets.length})
          </CardTitle>
          <CardDescription>
            Track printing status and configure panel-wise client/vendor costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No printing jobs in queue</p>
              <p className="text-sm text-muted-foreground mt-2">
                Printing tasks will appear here once campaigns start
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Asset Location</TableHead>
                  <TableHead>Panels</TableHead>
                  <TableHead>Client ₹</TableHead>
                  {canSeeVendor && <TableHead>Vendor ₹</TableHead>}
                  {canSeeVendor && <TableHead>Margin ₹</TableHead>}
                  <TableHead>Start</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const panels = panelsByAsset[asset.id] || [];
                  const isOpen = !!expanded[asset.id];
                  const clientAmt = Number(
                    asset.printing_client_amount || asset.printing_charges || 0
                  );
                  const vendorAmt = Number(asset.printing_vendor_amount || 0);
                  const marginAmt = Number(asset.printing_margin_amount || 0);
                  return (
                    <>
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleExpand(asset.id)}
                            disabled={panels.length === 0}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {asset.campaigns?.campaign_name}
                        </TableCell>
                        <TableCell>{asset.campaigns?.client_name}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <div className="text-sm">
                              <div>{asset.location}</div>
                              <div className="text-xs text-muted-foreground">
                                {asset.area}, {asset.city}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {panels.length > 0 ? (
                            <Badge variant="secondary">{panels.length} panel(s)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Legacy
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>₹{clientAmt.toLocaleString()}</TableCell>
                        {canSeeVendor && (
                          <TableCell>
                            {vendorAmt ? `₹${vendorAmt.toLocaleString()}` : "—"}
                          </TableCell>
                        )}
                        {canSeeVendor && (
                          <TableCell className="text-green-700">
                            {marginAmt ? `₹${marginAmt.toLocaleString()}` : "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {asset.campaigns?.start_date
                              ? new Date(asset.campaigns.start_date).toLocaleDateString("en-IN")
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>{renderStatus(asset.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditor(asset)}
                            disabled={!canEdit}
                          >
                            <Settings2 className="h-4 w-4 mr-1" />
                            {panels.length ? "Edit panels" : "Configure"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && panels.length > 0 && (
                        <TableRow key={`${asset.id}-panels`} className="bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={canSeeVendor ? 10 : 8}>
                            <div className="py-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Panel</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Sqft</TableHead>
                                    <TableHead>Illumination</TableHead>
                                    <TableHead>Client ₹/sqft</TableHead>
                                    {canSeeVendor && <TableHead>Vendor ₹/sqft</TableHead>}
                                    <TableHead>Client ₹</TableHead>
                                    {canSeeVendor && <TableHead>Vendor ₹</TableHead>}
                                    {canSeeVendor && <TableHead>Margin ₹</TableHead>}
                                    {canSeeVendor && <TableHead>Vendor</TableHead>}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {panels.map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell className="font-medium">{p.panel_name}</TableCell>
                                      <TableCell>{`${p.width_ft} × ${p.height_ft}`}</TableCell>
                                      <TableCell>{p.sqft}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{p.illumination_type}</Badge>
                                      </TableCell>
                                      <TableCell>₹{p.client_rate_per_sqft}</TableCell>
                                      {canSeeVendor && (
                                        <TableCell>₹{p.vendor_rate_per_sqft}</TableCell>
                                      )}
                                      <TableCell>₹{p.client_amount}</TableCell>
                                      {canSeeVendor && <TableCell>₹{p.vendor_amount}</TableCell>}
                                      {canSeeVendor && (
                                        <TableCell className="text-green-700">
                                          ₹{p.margin_amount}
                                        </TableCell>
                                      )}
                                      {canSeeVendor && (
                                        <TableCell>{p.printer_vendor_name || "—"}</TableCell>
                                      )}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PanelEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        campaignAssetId={editingAsset?.id ?? null}
        campaignId={editingAsset?.campaign_id ?? null}
        companyId={editingAsset?.campaigns?.company_id ?? null}
        assetLabel={
          editingAsset
            ? `${editingAsset.location} · ${editingAsset.area}, ${editingAsset.city}`
            : undefined
        }
        canEdit={canEdit}
        onSaved={loadPrintingQueue}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div
          className={`text-2xl font-bold mt-1 ${highlight ? "text-green-700" : ""}`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
