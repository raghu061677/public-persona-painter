import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Share2, Trash2, Copy, Rocket, MoreVertical, Ban, Activity, ExternalLink, Download, FileText, Plus, X, FileSpreadsheet, FileImage, Save, Wand2, Edit, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/mediaAssets";
import { getPlanStatusColor, formatDate } from "@/utils/plans";
import { generateCampaignCode } from "@/lib/codeGenerator";
import { calcProRata, calcDiscount, calcProfit } from "@/utils/pricing";
import { toast } from "@/hooks/use-toast";
import { exportPlanToPPT, exportPlanToExcel, exportPlanToPDF } from "@/utils/planExports";
import { ExportOptionsDialog, ExportOptions } from "@/components/plans/ExportOptionsDialog";
import { ExportSettingsDialog, ExportSettings } from "@/components/plans/ExportSettingsDialog";
import { TermsConditionsDialog, TermsData } from "@/components/plans/TermsConditionsDialog";
import { BulkPrintingMountingDialog } from "@/components/plans/BulkPrintingMountingDialog";
import { AddAssetsDialog } from "@/components/plans/AddAssetsDialog";
import { SaveAsTemplateDialog } from "@/components/plans/SaveAsTemplateDialog";
import { ApprovalWorkflowDialog } from "@/components/plans/ApprovalWorkflowDialog";
import { ApprovalHistoryTimeline } from "@/components/plans/ApprovalHistoryTimeline";
import { Checkbox } from "@/components/ui/checkbox";

export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showExportSettingsDialog, setShowExportSettingsDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showBulkPrintingDialog, setShowBulkPrintingDialog] = useState(false);
  const [showAddAssetsDialog, setShowAddAssetsDialog] = useState(false);
  const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [exportingPPT, setExportingPPT] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [campaignData, setCampaignData] = useState({
    campaign_name: "",
    start_date: "",
    end_date: "",
    notes: "",
  });

  const loadPendingApprovals = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("plan_approvals")
      .select("*", { count: "exact" })
      .eq("plan_id", id)
      .eq("status", "pending");

    if (!error && data) {
      setPendingApprovalsCount(data.length);
    }
  };

  useEffect(() => {
    checkAdminStatus();
    fetchPlan();
    fetchPlanItems();
    loadPendingApprovals();
  }, [id]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchPlan = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch plan",
        variant: "destructive",
      });
      navigate('/admin/plans');
    } else {
      setPlan(data);
    }
    setLoading(false);
  };

  const fetchPlanItems = async () => {
    const { data } = await supabase
      .from('plan_items')
      .select('*')
      .eq('plan_id', id)
      .order('created_at');
    setPlanItems(data || []);
  };

  const generateShareLink = async () => {
    if (!plan) return;

    let shareToken = plan.share_token;
    
    if (!shareToken) {
      // Generate new share token
      const { data } = await supabase.rpc('generate_share_token');
      shareToken = data;
      
      await supabase
        .from('plans')
        .update({ 
          share_token: shareToken,
          share_link_active: true 
        })
        .eq('id', id);
    } else if (!plan.share_link_active) {
      // Reactivate existing link
      await supabase
        .from('plans')
        .update({ share_link_active: true })
        .eq('id', id);
    }

    const shareUrl = `${window.location.origin}/share/plan/${id}/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Public Link Generated",
      description: "Share link copied to clipboard",
    });
    
    fetchPlan();
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(plan.id);
    toast({
      title: "Copied",
      description: "Plan ID copied to clipboard",
    });
  };

  const handleBlock = async () => {
    const { error } = await supabase
      .from('plans')
      .update({ status: 'Rejected' })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan rejected successfully",
      });
      fetchPlan();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
      navigate('/admin/plans');
    }
  };

  const handleRemoveAsset = async (itemId: string, assetId: string) => {
    if (!confirm("Remove this asset from the plan?")) return;

    try {
      // Delete from plan_items
      const { error } = await supabase
        .from('plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Recalculate plan totals
      const updatedItems = planItems.filter(item => item.id !== itemId);
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const gstAmount = (subtotal * plan.gst_percent) / 100;
      const grandTotal = subtotal + gstAmount;

      await supabase
        .from('plans')
        .update({
          total_amount: subtotal,
          gst_amount: gstAmount,
          grand_total: grandTotal,
        })
        .eq('id', id);

      toast({
        title: "Success",
        description: "Asset removed from plan",
      });

      fetchPlan();
      fetchPlanItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddAssets = async (assets: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create plan items for new assets
      const newPlanItems = assets.map(asset => ({
        plan_id: id,
        asset_id: asset.id,
        location: asset.location,
        city: asset.city,
        area: asset.area,
        media_type: asset.media_type,
        dimensions: asset.dimensions,
        card_rate: asset.card_rate,
        base_rent: asset.base_rent,
        sales_price: asset.card_rate,
        printing_charges: asset.printing_charges || 0,
        mounting_charges: asset.mounting_charges || 0,
        discount_type: 'Percent',
        discount_value: 0,
        discount_amount: 0,
        subtotal: asset.card_rate,
        gst_amount: (asset.card_rate * plan.gst_percent) / 100,
        total_with_gst: asset.card_rate * (1 + plan.gst_percent / 100),
      }));

      const { error } = await supabase
        .from('plan_items')
        .insert(newPlanItems);

      if (error) throw error;

      // Recalculate plan totals
      const allItems = [...planItems, ...newPlanItems];
      const subtotal = allItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const gstAmount = (subtotal * plan.gst_percent) / 100;
      const grandTotal = subtotal + gstAmount;

      await supabase
        .from('plans')
        .update({
          total_amount: subtotal,
          gst_amount: gstAmount,
          grand_total: grandTotal,
        })
        .eq('id', id);

      toast({
        title: "Success",
        description: `${assets.length} asset(s) added to plan`,
      });

      fetchPlan();
      fetchPlanItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportPPT = async (uploadToCloud = false) => {
    setExportingPPT(true);
    try {
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .single();

      const result = await exportPlanToPPT(plan, planItems, orgSettings, uploadToCloud);
      
      toast({
        title: "Success",
        description: uploadToCloud 
          ? "Plan exported to PowerPoint and uploaded to cloud" 
          : "Plan exported to PowerPoint",
      });
      
      if (uploadToCloud && result) {
        fetchPlan();
      }
    } catch (error: any) {
      console.error("PPT Export Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export PPT",
        variant: "destructive",
      });
    } finally {
      setExportingPPT(false);
    }
  };

  const handleExportExcel = async (uploadToCloud = false) => {
    setExportingExcel(true);
    try {
      const result = await exportPlanToExcel(plan, planItems, uploadToCloud);
      toast({
        title: "Success",
        description: uploadToCloud
          ? "Plan exported to Excel and uploaded to cloud"
          : "Plan exported to Excel",
      });
      
      if (uploadToCloud && result) {
        fetchPlan();
      }
    } catch (error: any) {
      console.error("Excel Export Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export Excel",
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleGenerateAndUploadPDF = async (docType: "quotation" | "estimate" | "proforma_invoice" | "work_order") => {
    try {
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .single();

      const { data: termsData } = await supabase
        .from('plan_terms_settings')
        .select('terms')
        .limit(1)
        .single();

      await exportPlanToPDF(
        plan,
        planItems,
        docType,
        orgSettings,
        termsData?.terms,
        true // Upload to cloud
      );
      
      toast({
        title: "Success",
        description: `${docType.toUpperCase()} exported and uploaded to cloud`,
      });
      
      fetchPlan();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async (terms?: TermsData) => {
    try {
      const docTypeMap: Record<string, "quotation" | "estimate" | "proforma_invoice" | "work_order"> = {
        "Quotation": "quotation",
        "Estimate": "estimate",
        "Proforma Invoice": "proforma_invoice",
        "Work Order": "work_order",
      };
      
      const docType = terms?.optionType ? docTypeMap[terms.optionType] : "quotation";
      
      await exportPlanToPDF(
        plan,
        planItems,
        docType,
        { organization_name: terms?.companyName || "Go-Ads 360°", gstin: terms?.gstin },
        terms?.terms || [],
        false // Don't upload, just download
      );
      toast({
        title: "Success",
        description: "Document exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to export document",
        variant: "destructive",
      });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === planItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(planItems.map(item => item.asset_id)));
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("plans").update({ status: "Sent" }).eq("id", id);
      
      // Create approval workflow
      await supabase.rpc("create_plan_approval_workflow", { p_plan_id: id });

      toast({
        title: "Success",
        description: "Plan submitted for approval",
      });

      setShowSubmitDialog(false);
      setApprovalRemarks("");
      fetchPlan();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApprovePlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get pending approval for current user
      const { data: approvals } = await supabase
        .from("plan_approvals")
        .select("id")
        .eq("plan_id", id)
        .eq("status", "pending")
        .limit(1);

      if (!approvals || approvals.length === 0) {
        throw new Error("No pending approval found");
      }

      const result = await supabase.rpc("process_plan_approval", {
        p_approval_id: approvals[0].id,
        p_status: "approved",
        p_comments: approvalRemarks,
      });

      toast({
        title: "Success",
        description: "Plan approved successfully",
      });

      setShowApproveDialog(false);
      setApprovalRemarks("");
      fetchPlan();
      loadPendingApprovals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get pending approval for current user
      const { data: approvals } = await supabase
        .from("plan_approvals")
        .select("id")
        .eq("plan_id", id)
        .eq("status", "pending")
        .limit(1);

      if (!approvals || approvals.length === 0) {
        throw new Error("No pending approval found");
      }

      await supabase.rpc("process_plan_approval", {
        p_approval_id: approvals[0].id,
        p_status: "rejected",
        p_comments: approvalRemarks,
      });

      toast({
        title: "Plan Rejected",
        description: "Plan has been rejected",
        variant: "destructive",
      });

      setShowRejectDialog(false);
      setApprovalRemarks("");
      fetchPlan();
      loadPendingApprovals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConvertToCampaign = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate campaign ID based on start date
      const startDate = campaignData.start_date ? new Date(campaignData.start_date) : new Date(plan.start_date);
      const campaignId = await generateCampaignCode(startDate);

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          id: campaignId,
          plan_id: plan.id,
          client_id: plan.client_id,
          client_name: plan.client_name,
          campaign_name: campaignData.campaign_name || plan.plan_name,
          start_date: campaignData.start_date || plan.start_date,
          end_date: campaignData.end_date || plan.end_date,
          status: 'Planned',
          total_assets: planItems.length,
          total_amount: plan.total_amount,
          gst_percent: plan.gst_percent,
          gst_amount: plan.gst_amount,
          grand_total: plan.grand_total,
          notes: campaignData.notes || plan.notes,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create campaign assets from plan items
      const campaignAssets = planItems.map(item => ({
        campaign_id: campaignId,
        asset_id: item.asset_id,
        location: item.location,
        city: item.city,
        area: item.area,
        media_type: item.media_type,
        card_rate: item.card_rate,
        mounting_charges: item.mounting_charges,
        printing_charges: item.printing_charges,
        status: 'Pending',
      }));

      const { error: assetsError } = await supabase
        .from('campaign_assets')
        .insert(campaignAssets as any);

      if (assetsError) throw assetsError;

      // Update plan status
      await supabase
        .from('plans')
        .update({ status: 'Converted' })
        .eq('id', id);

      // Update media assets status to Booked
      const assetIds = planItems.map(item => item.asset_id);
      await supabase
        .from('media_assets')
        .update({ status: 'Booked' })
        .in('id', assetIds);

      toast({
        title: "Success",
        description: "Campaign created successfully",
      });

      setShowConvertDialog(false);
      navigate(`/admin/campaigns/${campaignId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/plans')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{plan.plan_name}</h1>
            <div className="flex items-center gap-3">
              <Badge className={getPlanStatusColor(plan.status)}>
                {plan.status}
              </Badge>
              <span className="text-muted-foreground">{plan.id}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap items-start">
            {/* Submit for Approval - Draft Status */}
            {plan.status === 'Draft' && isAdmin && (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Activity className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            )}

            {/* Approve/Reject - Sent Status */}
            {plan.status === 'Sent' && isAdmin && pendingApprovalsCount > 0 && (
              <>
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  size="sm"
                  variant="destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {/* Convert to Campaign - Approved Status */}
            {plan.status === 'Approved' && isAdmin && (
              <Button 
                size="sm" 
                className="bg-gradient-primary hover:shadow-glow transition-smooth"
                onClick={() => setShowConvertDialog(true)}
              >
                <Rocket className="mr-2 h-4 w-4" />
                Convert to Campaign
              </Button>
            )}

            {/* Already Converted Badge */}
            {plan.status === 'Converted' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Already Converted to Campaign
              </Badge>
            )}
            
            {/* Actions Dropdown - Always Visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlock} className="text-orange-600">
                      <Ban className="mr-2 h-4 w-4" />
                      Block
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleCopyId}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={generateShareLink}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/admin/audit-logs?entity_type=plan&entity_id=${id}`)}>
                  <Activity className="mr-2 h-4 w-4" />
                  Activity
                </DropdownMenuItem>
                <DropdownMenuItem onClick={generateShareLink}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Public Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportPPT(false)} disabled={exportingPPT}>
                  <Download className="mr-2 h-4 w-4" />
                  {exportingPPT ? "Exporting..." : "Download PPT"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel(false)} disabled={exportingExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {exportingExcel ? "Exporting..." : "Download Excel"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTermsDialog(true)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportPPT(true)} disabled={exportingPPT}>
                  <Save className="mr-2 h-4 w-4" />
                  Upload PPT to Cloud
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel(true)} disabled={exportingExcel}>
                  <Save className="mr-2 h-4 w-4" />
                  Upload Excel to Cloud
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(`/admin/plans/edit/${id}`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Plan
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Convert to Campaign Dialog */}
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Convert to Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={campaignData.campaign_name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, campaign_name: e.target.value }))}
                  placeholder={plan.plan_name}
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={campaignData.start_date}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={campaignData.end_date}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={campaignData.notes}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button onClick={handleConvertToCampaign} className="w-full">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Links Section */}
        {plan.export_links && (plan.export_links.ppt_url || plan.export_links.excel_url || plan.export_links.pdf_url) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Saved Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {plan.export_links.ppt_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(plan.export_links.ppt_url, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Open PPT
                  </Button>
                )}
                {plan.export_links.excel_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(plan.export_links.excel_url, '_blank')}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Open Excel
                  </Button>
                )}
                {plan.export_links.pdf_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(plan.export_links.pdf_url, '_blank')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Open PDF
                  </Button>
                )}
                {plan.share_link_active && plan.share_token && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`${window.location.origin}/share/plan/${plan.id}/${plan.share_token}`, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Public Link
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Client Info - Blue Theme */}
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Client Name</p>
                <p className="font-semibold text-lg">{plan.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client ID</p>
                <p className="font-mono">{plan.client_id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Period - Green Theme */}
          <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                Campaign Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-semibold">{formatDate(plan.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-semibold">{formatDate(plan.end_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold">{plan.duration_days} days</p>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary - Orange Theme */}
          <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Subtotal</span>
                <span className="font-bold text-lg">{formatCurrency(plan.total_amount)}</span>
              </div>
              
              {/* Discount - Blue */}
              {(() => {
                const totalDiscount = planItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
                if (totalDiscount > 0) {
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Discount</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        -{formatCurrency(totalDiscount)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Net Total - After Discount */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs font-medium">Net Total</span>
                <span className="font-semibold">{formatCurrency(plan.grand_total - plan.gst_amount)}</span>
              </div>
              
              {/* Profit - Green */}
              {(() => {
                const baseCost = planItems.reduce((sum, item) => sum + (item.base_rent || 0), 0);
                const profit = (plan.grand_total - plan.gst_amount) - baseCost;
                if (profit > 0) {
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Profit</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* GST - Red */}
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  GST ({plan.gst_percent}%)
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(plan.gst_amount)}
                </span>
              </div>
              
              {/* Grand Total - Blue Large */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
                <span className="text-xs font-bold text-muted-foreground">Grand Total</span>
                <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">
                  {formatCurrency(plan.grand_total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval History Timeline */}
        {(plan.status === 'Sent' || plan.status === 'Approved' || plan.status === 'Rejected' || plan.status === 'Converted') && (
          <div className="mb-6">
            <ApprovalHistoryTimeline planId={plan.id} />
          </div>
        )}

        {/* Plan Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Selected Assets ({planItems.length})</CardTitle>
            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkPrintingDialog(true)}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Bulk P&M
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAssetsDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Assets
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === planItems.length && planItems.length > 0}
                      onCheckedChange={toggleAllItems}
                    />
                  </TableHead>
                  {isAdmin && <TableHead className="w-12"></TableHead>}
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Card Rate</TableHead>
                  <TableHead className="text-right">Negotiated</TableHead>
                  <TableHead className="text-right">Pro-Rata</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Printing</TableHead>
                  <TableHead className="text-right">Mounting</TableHead>
                  <TableHead className="text-right">Total + GST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planItems.map((item) => {
                  const proRata = calcProRata(item.sales_price, plan.duration_days);
                  const discount = calcDiscount(item.card_rate, item.sales_price);
                  const profit = calcProfit(item.base_rent || 0, item.sales_price);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.asset_id)}
                          onCheckedChange={() => toggleItemSelection(item.asset_id)}
                        />
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAsset(item.id, item.asset_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{item.asset_id}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>{item.city}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.card_rate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.sales_price)}</TableCell>
                      <TableCell className="text-right text-purple-600">{formatCurrency(proRata)}</TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        -{formatCurrency(discount.value)} ({discount.percent.toFixed(2)}%)
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(profit.value)} ({profit.percent.toFixed(2)}%)
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.printing_charges)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.mounting_charges)}</TableCell>
                      <TableCell className="text-right font-semibold text-lg">
                        {formatCurrency(item.total_with_gst)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {plan.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{plan.notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-sm text-muted-foreground">
          <p>Created: {new Date(plan.created_at).toLocaleString()}</p>
          <p>Last updated: {new Date(plan.updated_at).toLocaleString()}</p>
        </div>

        {/* Approval History Timeline */}
        {(plan.status === 'Sent' || plan.status === 'Approved' || plan.status === 'Rejected' || plan.status === 'Converted') && (
          <div className="mt-6">
            <ApprovalHistoryTimeline planId={id!} />
          </div>
        )}

        <ExportOptionsDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={(options) => {
            const docTypeMap: Record<string, "quotation" | "estimate" | "proforma_invoice" | "work_order"> = {
              "Quotation": "quotation",
              "Estimate": "estimate",
              "Proforma Invoice": "proforma_invoice",
              "Work Order": "work_order",
            };
            const docType = docTypeMap[options.optionType] || "quotation";
            exportPlanToPDF(plan, planItems, docType, { organization_name: "Go-Ads 360°" }, options.termsAndConditions);
          }}
          clientName={plan.client_name}
        />

        <ExportSettingsDialog
          open={showExportSettingsDialog}
          onOpenChange={setShowExportSettingsDialog}
          onExport={(settings) => {
            handleExportExcel();
            setShowExportSettingsDialog(false);
          }}
        />

        <TermsConditionsDialog
          open={showTermsDialog}
          onOpenChange={setShowTermsDialog}
          onSave={(data) => {
            handleExportPDF(data);
            setShowTermsDialog(false);
          }}
        />

        <BulkPrintingMountingDialog
          open={showBulkPrintingDialog}
          onOpenChange={setShowBulkPrintingDialog}
          selectedAssetIds={selectedItems}
          planId={id!}
          onSuccess={() => {
            fetchPlanItems();
            fetchPlan();
            setSelectedItems(new Set());
          }}
        />

        <AddAssetsDialog
          open={showAddAssetsDialog}
          onClose={() => setShowAddAssetsDialog(false)}
          existingAssetIds={planItems.map(item => item.asset_id)}
          onAddAssets={handleAddAssets}
        />

        <SaveAsTemplateDialog
          open={showSaveAsTemplateDialog}
          onOpenChange={setShowSaveAsTemplateDialog}
          planId={plan.id}
          planType={plan.plan_type}
          durationDays={plan.duration_days}
          gstPercent={plan.gst_percent}
          notes={plan.notes}
          planItems={planItems}
        />


        {/* Submit for Approval Dialog */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Plan for Approval</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Submit this plan for approval workflow. It will be reviewed by designated approvers.
              </p>
              <div>
                <Label>Remarks (Optional)</Label>
                <Textarea
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Add any remarks or notes for approvers..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitForApproval} className="bg-orange-600 hover:bg-orange-700">
                  Submit for Approval
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve Plan Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Approve this plan to proceed with campaign conversion.
              </p>
              <div>
                <Label>Approval Comments (Optional)</Label>
                <Textarea
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Add approval comments..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApprovePlan} className="bg-green-600 hover:bg-green-700">
                  Approve Plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Plan Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reject this plan. Please provide a reason for rejection.
              </p>
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRejectPlan} 
                  variant="destructive"
                  disabled={!approvalRemarks.trim()}
                >
                  Reject Plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ApprovalWorkflowDialog
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          planId={id!}
          planName={plan?.plan_name || ""}
          onApprovalComplete={() => {
            fetchPlan();
            loadPendingApprovals();
          }}
        />
      </div>
    </div>
  );
}
