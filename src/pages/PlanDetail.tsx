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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Share2, Trash2, Copy, Rocket, MoreVertical, Ban, Activity, ExternalLink, Download, FileText, Plus, X, FileSpreadsheet, FileImage, Save, Wand2, Edit, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { AIProposalGeneratorDialog } from "@/components/plans/AIProposalGeneratorDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/mediaAssets";
import { getPlanStatusColor, formatDate } from "@/utils/plans";
import { generateCampaignCode } from "@/lib/codeGenerator";
import { calcProRata, calcDiscount, calcProfit } from "@/utils/pricing";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { exportPlanToPPT, exportPlanToExcel, exportPlanToPDF, exportPlanImagesToPDF } from "@/utils/planExports";
import { UnifiedExportButton } from "@/components/plans/UnifiedExportButton";
import { ExportOptionsDialog, ExportOptions } from "@/components/plans/ExportOptionsDialog";
import { ExportSettingsDialog, ExportSettings } from "@/components/plans/ExportSettingsDialog";
import { TermsConditionsDialog, TermsData } from "@/components/plans/TermsConditionsDialog";
import { BulkPrintingMountingDialog } from "@/components/plans/BulkPrintingMountingDialog";
import { PrintingInstallationDialog } from "@/components/plans/PrintingInstallationDialog";
import { AddAssetsDialog } from "@/components/plans/AddAssetsDialog";
import { SaveAsTemplateDialog } from "@/components/plans/SaveAsTemplateDialog";
import { ApprovalWorkflowDialog } from "@/components/plans/ApprovalWorkflowDialog";
import { ApprovalHistoryTimeline } from "@/components/plans/ApprovalHistoryTimeline";
import { Checkbox } from "@/components/ui/checkbox";
import { PageCustomization } from "@/components/ui/page-customization";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import { Settings2, CalendarDays } from "lucide-react";
import { generateProposalExcel } from "@/lib/exports/proposalExcelExport";
import { PlanAssetsTable } from "@/components/plans/PlanAssetsTable";

export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useCompany();
  const [plan, setPlan] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [clientDetails, setClientDetails] = useState<any>(null);
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
  const [showPrintingInstallationDialog, setShowPrintingInstallationDialog] = useState(false);
  const [showAddAssetsDialog, setShowAddAssetsDialog] = useState(false);
  const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false);
  const [showAIProposalDialog, setShowAIProposalDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [exportingPPT, setExportingPPT] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingImagesPdf, setExportingImagesPdf] = useState(false);
  const [exportingProposalExcel, setExportingProposalExcel] = useState(false);
  const [existingCampaignId, setExistingCampaignId] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState({
    campaign_name: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [showDiscount, setShowDiscount] = useState(true);

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
    checkExistingCampaign();
  }, [id]);

  const checkExistingCampaign = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('campaigns')
      .select('id')
      .eq('plan_id', id)
      .maybeSingle();
    
    if (data) {
      setExistingCampaignId(data.id);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K+C - Convert to Campaign (when approved and admin)
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const handleSecondKey = (e2: KeyboardEvent) => {
          if (e2.key === 'c' && plan?.status?.toLowerCase() === 'approved' && isAdmin) {
            // Pre-populate campaign data from plan
            setCampaignData({
              campaign_name: plan.plan_name,
              start_date: plan.start_date,
              end_date: plan.end_date,
              notes: plan.notes || "",
            });
            setShowConvertDialog(true);
          }
          document.removeEventListener('keydown', handleSecondKey);
        };
        document.addEventListener('keydown', handleSecondKey);
        setTimeout(() => document.removeEventListener('keydown', handleSecondKey), 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [plan, isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      // Check if 'admin' role exists in the array
      const hasAdminRole = data?.some(r => r.role === 'admin') || false;
      setIsAdmin(hasAdminRole);
      console.log('Admin check for user:', user.email, 'Has admin role:', hasAdminRole, 'Roles:', data);
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
      // Fetch client details
      if (data?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('gst_number, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_pincode')
          .eq('id', data.client_id)
          .single();
        setClientDetails(client);
      }
    }
    setLoading(false);
  };

  const fetchPlanItems = async () => {
    const { data } = await supabase
      .from('plan_items')
      .select(`
        *,
        media_assets!plan_items_asset_id_fkey (
          id,
          media_asset_code
        )
      `)
      .eq('plan_id', id)
      .order('created_at');
    
    // Plan items with asset display code
    const items = (data || []).map(item => ({
      ...item,
      plan_item_id: item.id,
      // Always show company-prefixed, human-readable asset codes
      display_asset_id: formatAssetDisplayCode({
        mediaAssetCode: item.media_assets?.media_asset_code,
        fallbackId: item.media_assets?.id || item.asset_id,
        companyName: company?.name || null,
      })
    }));
    
    setPlanItems(items);
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

      // Create plan items for new assets with FULL media asset snapshot
      const newPlanItems = assets.map(asset => ({
        plan_id: id,
        asset_id: asset.id,
        // Complete media asset snapshot
        media_type: asset.media_type,
        state: asset.state,
        district: asset.district,
        city: asset.city,
        area: asset.area,
        location: asset.location,
        direction: asset.direction,
        dimensions: asset.dimensions,
        total_sqft: asset.total_sqft,
        illumination_type: asset.illumination_type || asset.illumination,
        latitude: asset.latitude,
        longitude: asset.longitude,
        // Pricing
        card_rate: asset.card_rate,
        base_rent: asset.base_rate,  // Note: plan_items.base_rent stores media_assets.base_rate
        sales_price: asset.card_rate,
        printing_charges: asset.printing_rate_default || 0,
        mounting_charges: asset.mounting_rate_default || 0,
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

  const handleExportPlanImagesPDF = async (uploadToCloud = false) => {
    setExportingImagesPdf(true);
    try {
      const result = await exportPlanImagesToPDF(plan, planItems, { uploadToCloud });
      toast({
        title: "Success",
        description: uploadToCloud
          ? "Plan images exported to PDF and uploaded to cloud"
          : "Plan images exported to PDF",
      });

      if (uploadToCloud && result) {
        fetchPlan();
      }
    } catch (error: any) {
      console.error("Plan Images PDF Export Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export plan images PDF",
        variant: "destructive",
      });
    } finally {
      setExportingImagesPdf(false);
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

  // Proposal Excel export handler (READ-ONLY - no DB writes)
  const handleExportProposalExcel = async () => {
    if (!plan || planItems.length === 0) {
      toast({
        title: "No Assets",
        description: "No assets to export in this plan.",
        variant: "destructive",
      });
      return;
    }

    setExportingProposalExcel(true);
    try {
      // Build asset pricing from plan items
      const assetPricing: Record<string, any> = {};
      const assets = planItems.map(item => {
        assetPricing[item.asset_id] = {
          negotiated_price: item.sales_price || item.card_rate,
          start_date: item.start_date,
          end_date: item.end_date,
          booked_days: item.booked_days || plan.duration_days,
          printing_charges: item.printing_charges || item.printing_cost || 0,
          printing_cost: item.printing_charges || item.printing_cost || 0,
          printing_rate: item.printing_rate || 0,
          mounting_charges: item.mounting_charges || item.installation_cost || 0,
          mounting_cost: item.mounting_charges || item.installation_cost || 0,
          mounting_rate: item.installation_rate || 0,
          mounting_mode: item.mounting_mode || 'sqft',
        };
        return {
          id: item.asset_id,
          location: item.location,
          direction: item.direction,
          dimensions: item.dimensions,
          total_sqft: item.total_sqft,
          illumination_type: item.illumination_type,
          card_rate: item.card_rate,
        };
      });

      const blob = await generateProposalExcel({
        planId: plan.id,
        planName: plan.plan_name || 'Plan',
        clientName: plan.client_name || '',
        assets,
        assetPricing,
        planStartDate: new Date(plan.start_date),
        planEndDate: new Date(plan.end_date),
        durationDays: plan.duration_days,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposal_${plan.plan_name || 'Plan'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Proposal Excel downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Proposal Excel export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate proposal Excel.",
        variant: "destructive",
      });
    } finally {
      setExportingProposalExcel(false);
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

      // Update status to 'Sent' to indicate waiting for approval
      const { error } = await supabase
        .from("plans")
        .update({ status: "Sent" })
        .eq("id", id);

      if (error) throw error;
      
      // Create approval workflow if the function exists
      try {
        await supabase.rpc("create_plan_approval_workflow", { p_plan_id: id });
      } catch (workflowError) {
        console.log("Approval workflow creation skipped:", workflowError);
      }

      toast({
        title: "Success",
        description: "Plan submitted for approval successfully",
      });

      setShowSubmitDialog(false);
      setApprovalRemarks("");
      
      // Refresh plan data to show updated status
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
      console.log("🚀 Starting Plan → Campaign conversion", plan.id);

      // Validation 1: Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "You are logged out. Please login again.",
          variant: "destructive",
        });
        return;
      }

      // Validation 2: Check if plan is approved
      if (plan.status === 'rejected' || plan.status === 'Rejected') {
        toast({
          title: "Cannot Convert Plan",
          description: "Cannot convert a rejected plan to campaign",
          variant: "destructive",
        });
        setShowConvertDialog(false);
        return;
      }

      if (plan.status !== 'Approved' && plan.status !== 'approved') {
        toast({
          title: "Cannot Convert Plan",
          description: `Plan must be approved before conversion. Current status: ${plan.status}`,
          variant: "destructive",
        });
        setShowConvertDialog(false);
        return;
      }

      // Validation 3: Check for duplicate conversion
      if (plan.converted_to_campaign_id || existingCampaignId) {
        toast({
          title: "Plan Already Converted",
          description: "This plan has already been converted to a campaign",
          variant: "destructive",
        });
        setShowConvertDialog(false);
        navigate(`/admin/campaigns/${plan.converted_to_campaign_id || existingCampaignId}`);
        return;
      }

      // Validation 4: Check if plan has items
      if (!planItems || planItems.length === 0) {
        throw new Error("Plan must have at least one asset to convert to campaign");
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-plan-to-campaign`;
      console.log("📡 Calling Edge Function:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
        }),
      });

      // Network-level failure
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        let conflictDetails: Array<{asset_id: string; location: string; city: string; campaign_name: string; booked_from: string; booked_to: string}> | null = null;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
          if (response.status === 409 && errorJson.conflicts) {
            conflictDetails = errorJson.conflicts;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        console.error("❌ Edge Function Error Response:", errorText);
        
        // Show detailed conflict information for 409 errors
        if (response.status === 409 && conflictDetails && conflictDetails.length > 0) {
          const assetList = conflictDetails.map(c => 
            `• ${c.asset_id} (${c.location}, ${c.city}) - booked for "${c.campaign_name}" (${c.booked_from} to ${c.booked_to})`
          ).join('\n');
          
          toast({
            title: "Asset Booking Conflict",
            description: (
              <div className="space-y-2">
                <p>The following assets are already booked during this period:</p>
                <ul className="text-xs space-y-1 mt-2">
                  {conflictDetails.map((c, i) => (
                    <li key={i} className="bg-destructive/10 p-2 rounded">
                      <strong>{c.asset_id}</strong> ({c.location || c.city})
                      <br />
                      <span className="text-muted-foreground">
                        Booked for "{c.campaign_name}" ({c.booked_from} to {c.booked_to})
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm mt-2">Remove these assets from the plan or adjust dates to proceed.</p>
              </div>
            ),
            variant: "destructive",
            duration: 15000, // Show longer for conflict details
          });
        } else {
          toast({
            title: "Conversion Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        return;
      }

      const result = await response.json();
      console.log("🎉 Conversion Result:", result);

      if (result.error || !result.success) {
        toast({
          title: "Conversion Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Campaign Created Successfully",
        description: `Campaign created with ${result.total_items || planItems.length} assets`,
      });

      setShowConvertDialog(false);
      
      // Redirect to new campaign
      if (result.campaign_id) {
        navigate(`/admin/campaigns/${result.campaign_id}`);
      }
    } catch (error: any) {
      console.error("💥 Conversion error:", error);
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to reach server. Check internet or CORS settings.",
        variant: "destructive",
      });
      setShowConvertDialog(false);
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

        {/* Status Banner */}
        {['converted'].includes(plan.status?.toLowerCase()) && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      This Plan has been converted to Campaign {existingCampaignId || plan.converted_to_campaign_id}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Converted on {plan.converted_at ? new Date(plan.converted_at).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>
                {(existingCampaignId || plan.converted_to_campaign_id) && (
                  <Button
                    onClick={() => navigate(`/admin/campaigns/${existingCampaignId || plan.converted_to_campaign_id}`)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Campaign
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {['rejected'].includes(plan.status?.toLowerCase()) && (
          <Card className="mb-6 border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Ban className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">
                    This Plan has been Rejected
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Editing is disabled for rejected plans
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(plan.status?.toLowerCase() === 'approved') && !existingCampaignId && (
          <Card className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Plan Approved - Ready for Campaign Conversion
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This plan is approved and ready to be converted into a campaign
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{plan.plan_name}</h1>
              <div className="flex items-center gap-3">
                <Badge className={getPlanStatusColor(plan.status)}>
                  {plan.status}
                </Badge>
                <span className="text-muted-foreground">{plan.id}</span>
              </div>
            </div>
            
            {/* Page Customization */}
            <PageCustomization
              options={[
                {
                  id: "show-discount",
                  label: "Show Discount",
                  description: "Display discount information in financial summary",
                  enabled: showDiscount,
                  onChange: setShowDiscount,
                },
              ]}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap items-start">
            {/* Edit Plan Button - Standalone */}
            {isAdmin && (['pending', 'approved', 'draft', 'sent'].includes(plan.status?.toLowerCase())) && (
              <Button
                onClick={() => navigate(`/admin/plans/edit/${id}`)}
                size="sm"
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Plan
              </Button>
            )}

            {/* Submit for Approval - Draft or Pending Status */}
            {['draft', 'pending'].includes(plan.status?.toLowerCase()) && (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Activity className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            )}

            {/* Show Waiting for Approval indicator when status is Sent */}
            {plan.status?.toLowerCase() === 'sent' && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                <Activity className="h-3 w-3 mr-1" />
                Waiting for Approval
              </Badge>
            )}

            {/* Approve/Reject - Sent Status with Pending Approvals */}
            {plan.status?.toLowerCase() === 'sent' && isAdmin && pendingApprovalsCount > 0 && (
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
            {plan.status?.toLowerCase() === 'approved' && isAdmin && !existingCampaignId && (
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-glow"
                onClick={() => {
                  // Pre-populate campaign data from plan
                  setCampaignData({
                    campaign_name: plan.plan_name,
                    start_date: plan.start_date,
                    end_date: plan.end_date,
                    notes: plan.notes || "",
                  });
                  setShowConvertDialog(true);
                }}
              >
                <Rocket className="mr-2 h-5 w-5" />
                Convert to Campaign
              </Button>
            )}

            {/* Tooltip when button is not visible */}
            {plan.status?.toLowerCase() === 'approved' && !isAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="lg" 
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <Rocket className="mr-2 h-5 w-5" />
                      Convert to Campaign
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Only admins can convert approved plans to campaigns</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!['approved', 'converted'].includes(plan.status?.toLowerCase()) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="lg" 
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <Rocket className="mr-2 h-5 w-5" />
                      Convert to Campaign
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Plan must be approved before converting to campaign</p>
                    <p className="text-sm text-muted-foreground mt-1">Current status: {plan.status}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Already Converted Badge */}
            {(plan.status?.toLowerCase() === 'converted' || existingCampaignId) && (
              <Button
                variant="outline"
                className="text-green-600 border-green-600 hover:text-green-700 hover:border-green-700"
                onClick={() => existingCampaignId && navigate(`/admin/campaigns/${existingCampaignId}`)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                View Campaign
              </Button>
            )}
            
            {/* Actions Dropdown - Always Visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-md z-50">
                {/* Unified Export */}
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <UnifiedExportButton 
                    planId={id!} 
                    planName={plan?.plan_name} 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start font-normal h-auto p-0"
                  />
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                
                {/* Download Actions */}
                <DropdownMenuItem onClick={() => handleExportPPT(true)} disabled={exportingPPT}>
                  <Save className="mr-2 h-4 w-4" />
                  {exportingPPT ? "Uploading..." : "Download PPT"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel(true)} disabled={exportingExcel}>
                  <Save className="mr-2 h-4 w-4" />
                  {exportingExcel ? "Uploading..." : "Download Excel"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPlanImagesPDF(true)} disabled={exportingImagesPdf}>
                  <Save className="mr-2 h-4 w-4" />
                  {exportingImagesPdf ? "Uploading..." : "Download Plan Images (PDF)"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportProposalExcel} disabled={exportingProposalExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {exportingProposalExcel ? "Generating..." : "Download Proposal Excel"}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Sharing & Activity */}
                <DropdownMenuItem onClick={generateShareLink}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/admin/audit-logs?resource_type=plan&resource_id=${id}`)}>
                  <Activity className="mr-2 h-4 w-4" />
                  View Plan Activity
                </DropdownMenuItem>
                
                {/* Admin Actions */}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleBlock} className="text-orange-600">
                      <Ban className="mr-2 h-4 w-4" />
                      Block Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Plan
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
                <Label>Display Name / Campaign Name</Label>
                <Input
                  value={campaignData.campaign_name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, campaign_name: e.target.value }))}
                  placeholder={plan?.plan_name}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This name will be displayed in campaign details
                </p>
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
                  placeholder="Additional notes for this campaign"
                  rows={3}
                />
              </div>
              <Button onClick={handleConvertToCampaign} className="w-full bg-green-600 hover:bg-green-700">
                <Rocket className="mr-2 h-4 w-4" />
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
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
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
              {clientDetails?.gst_number && (
                <div>
                  <p className="text-xs text-muted-foreground">GST Number</p>
                  <p className="font-mono text-sm">{clientDetails.gst_number}</p>
                </div>
              )}
              {(clientDetails?.billing_address_line1 || clientDetails?.billing_city) && (
                <div>
                  <p className="text-xs text-muted-foreground">Billing Address</p>
                  <p className="text-sm">
                    {[
                      clientDetails?.billing_address_line1,
                      clientDetails?.billing_address_line2,
                      clientDetails?.billing_city,
                      clientDetails?.billing_state,
                      clientDetails?.billing_pincode
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Period - Green Theme */}
          <Card className="border-l-4 border-l-green-500 shadow-sm">
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
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{plan.duration_days} days</p>
                  {isAdmin && ['pending', 'draft', 'sent'].includes(plan.status?.toLowerCase()) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/plans/edit/${id}`)}
                      className="h-6 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Display Period</p>
                <p className="font-semibold">
                  {formatDate(plan.start_date)} to {formatDate(plan.end_date)}
                  <span className="text-xs text-muted-foreground ml-2">({plan.duration_days}d)</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary - Orange Theme */}
          <Card className="border-l-4 border-l-orange-500 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Display Cost (Rent) */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Display Cost (Rent)</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {formatCurrency(planItems.reduce((sum, item) => {
                    // Display cost is the sum of pro-rata amounts using PER-ASSET dates
                    // Use negotiated_price (priority) > sales_price > card_rate
                    const effectivePrice = item.negotiated_price || item.sales_price || item.card_rate;
                    // Use per-asset booked_days if available, otherwise fall back to plan duration
                    const assetDays = item.booked_days || plan.duration_days;
                    // Use pre-calculated rent_amount if available, otherwise calculate
                    const rentAmount = item.rent_amount ?? calcProRata(effectivePrice, assetDays);
                    return sum + rentAmount;
                  }, 0))}
                </span>
              </div>
              
              {/* Printing Cost */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Printing Cost</span>
                <span className="font-semibold text-blue-600">{formatCurrency(planItems.reduce((sum, item) => sum + (item.printing_charges || item.printing_cost || 0), 0))}</span>
              </div>
              
              {/* Installation/Mounting Cost */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Installation Cost</span>
                <span className="font-semibold text-green-600">{formatCurrency(planItems.reduce((sum, item) => sum + (item.mounting_charges || item.installation_cost || 0), 0))}</span>
              </div>
              
              {/* Total Before Tax */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs font-medium">Total Without Tax</span>
                <span className="font-bold">{formatCurrency(plan.grand_total - plan.gst_amount)}</span>
              </div>
              
              {/* Discount - Blue */}
              {showDiscount && (() => {
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
              
              {/* Profit - Green */}
              {(() => {
                // Profit = Sum of (Negotiated Price - Base Rent) as monthly figures
                // Not pro-rated - shows the margin per asset per month
                const totalProfit = planItems.reduce((sum, item) => {
                  const effectivePrice = item.negotiated_price || item.sales_price || item.card_rate;
                  const baseRent = item.base_rent || 0;
                  // Monthly margin (not pro-rated)
                  const itemProfit = effectivePrice - baseRent;
                  return sum + itemProfit;
                }, 0);
                if (totalProfit > 0) {
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Profit (Monthly)</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(totalProfit)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* GST - Red */}
              <div className="flex justify-between items-center pt-2 border-t">
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

        {/* Plan Items */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Assets ({planItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanAssetsTable
              planItems={planItems}
              plan={plan}
              isAdmin={isAdmin}
              selectedItems={selectedItems}
              onToggleItem={toggleItemSelection}
              onToggleAll={toggleAllItems}
              onRemoveAsset={handleRemoveAsset}
              onAddAssets={() => setShowAddAssetsDialog(true)}
              onBulkPrintingMounting={() => setShowBulkPrintingDialog(true)}
              onPrintingInstallation={() => setShowPrintingInstallationDialog(true)}
            />
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

        {/* Approval History Timeline */}
        {(['pending', 'approved', 'rejected', 'converted'].includes(plan.status?.toLowerCase())) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalHistoryTimeline planId={id!} />
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-sm text-muted-foreground">
          <p>Created: {new Date(plan.created_at).toLocaleString()}</p>
          <p>Last updated: {new Date(plan.updated_at).toLocaleString()}</p>
        </div>

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

        <PrintingInstallationDialog
          open={showPrintingInstallationDialog}
          onOpenChange={setShowPrintingInstallationDialog}
          selectedItems={planItems.filter(item => selectedItems.has(item.asset_id))}
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
          planItems={planItems}
        />

        <AIProposalGeneratorDialog
          open={showAIProposalDialog}
          onClose={() => setShowAIProposalDialog(false)}
          planId={plan.id}
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
