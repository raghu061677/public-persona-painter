import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import type { 
  Expense, 
  ExpenseCategory, 
  CostCenter,
  ExpenseFormData
} from "@/types/expenses";

const formSchema = z.object({
  expense_date: z.date(),
  vendor_id: z.string().nullable().optional(),
  vendor_name: z.string().min(1, "Vendor name is required"),
  vendor_gstin: z.string().optional(),
  invoice_no: z.string().optional(),
  invoice_date: z.date().nullable().optional(),
  payment_mode: z.string(),
  payment_status: z.string(),
  paid_date: z.date().nullable().optional(),
  amount_before_tax: z.number().min(0),
  gst_type_enum: z.string(),
  cgst: z.number().min(0),
  sgst: z.number().min(0),
  igst: z.number().min(0),
  tds_applicable: z.boolean(),
  tds_percent: z.number().min(0).max(100),
  category_id: z.string().nullable().optional(),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  notes: z.string().optional(),
  cost_center_id: z.string().nullable().optional(),
  allocation_type: z.string(),
  campaign_id: z.string().nullable().optional(),
  plan_id: z.string().nullable().optional(),
  asset_id: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.allocation_type === "Campaign" && !data.campaign_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Campaign is required", path: ["campaign_id"] });
  }
  if (data.allocation_type === "Plan" && !data.plan_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Plan is required", path: ["plan_id"] });
  }
  if (data.allocation_type === "Asset" && !data.asset_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Asset is required", path: ["asset_id"] });
  }
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  categories: ExpenseCategory[];
  costCenters: CostCenter[];
  onSubmit: (data: ExpenseFormData) => Promise<string | null>;
  onUpdate: (id: string, data: Partial<ExpenseFormData>) => Promise<boolean>;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  categories,
  costCenters,
  onSubmit,
  onUpdate,
}: ExpenseFormDialogProps) {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [relatedDataLoading, setRelatedDataLoading] = useState(false);
  const [plansLoadFailed, setPlansLoadFailed] = useState(false);
  const [campaignsLoadFailed, setCampaignsLoadFailed] = useState(false);
  const [assetsLoadFailed, setAssetsLoadFailed] = useState(false);
  const isEditing = !!expense;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expense_date: new Date(),
      vendor_name: "",
      vendor_gstin: "",
      invoice_no: "",
      payment_mode: "Bank Transfer",
      payment_status: "Unpaid",
      amount_before_tax: 0,
      gst_type_enum: "CGST_SGST",
      cgst: 0,
      sgst: 0,
      igst: 0,
      tds_applicable: false,
      tds_percent: 0,
      category: "",
      subcategory: "",
      notes: "",
      allocation_type: "General",
      tags: [],
    },
  });

  const watchGstType = form.watch("gst_type_enum");
  const watchAmount = form.watch("amount_before_tax");
  const watchTdsApplicable = form.watch("tds_applicable");
  const watchTdsPercent = form.watch("tds_percent");
  const watchAllocationType = form.watch("allocation_type");

  // Clear conflicting allocation fields when type changes
  useEffect(() => {
    if (watchAllocationType === "General") {
      form.setValue("campaign_id", null);
      form.setValue("plan_id", null);
      form.setValue("asset_id", null);
    } else if (watchAllocationType === "Campaign") {
      form.setValue("plan_id", null);
      form.setValue("asset_id", null);
    } else if (watchAllocationType === "Plan") {
      form.setValue("campaign_id", null);
      form.setValue("asset_id", null);
    } else if (watchAllocationType === "Asset") {
      form.setValue("campaign_id", null);
      form.setValue("plan_id", null);
    }
  }, [watchAllocationType, form]);

  // Auto-calculate GST
  useEffect(() => {
    if (watchGstType === "None") {
      form.setValue("cgst", 0);
      form.setValue("sgst", 0);
      form.setValue("igst", 0);
    } else if (watchGstType === "CGST_SGST") {
      const gstAmount = watchAmount * 0.18;
      form.setValue("cgst", Number((gstAmount / 2).toFixed(2)));
      form.setValue("sgst", Number((gstAmount / 2).toFixed(2)));
      form.setValue("igst", 0);
    } else if (watchGstType === "IGST") {
      form.setValue("cgst", 0);
      form.setValue("sgst", 0);
      form.setValue("igst", Number((watchAmount * 0.18).toFixed(2)));
    }
  }, [watchGstType, watchAmount, form]);

  // Load related data
  useEffect(() => {
    if (company?.id && open) {
      loadRelatedData();
    }
  }, [company?.id, open]);

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      form.reset({
        expense_date: expense.expense_date ? new Date(expense.expense_date) : new Date(),
        vendor_id: expense.vendor_id,
        vendor_name: expense.vendor_name || "",
        vendor_gstin: expense.vendor_gstin || "",
        invoice_no: expense.invoice_no || "",
        invoice_date: expense.invoice_date ? new Date(expense.invoice_date) : null,
        payment_mode: expense.payment_mode || "Bank Transfer",
        payment_status: expense.payment_status || "Unpaid",
        paid_date: expense.paid_date ? new Date(expense.paid_date) : null,
        amount_before_tax: expense.amount_before_tax || expense.amount || 0,
        gst_type_enum: expense.gst_type_enum || "CGST_SGST",
        cgst: expense.cgst || 0,
        sgst: expense.sgst || 0,
        igst: expense.igst || 0,
        tds_applicable: expense.tds_applicable || false,
        tds_percent: expense.tds_percent || 0,
        category_id: expense.category_id,
        category: expense.category || "",
        subcategory: expense.subcategory || "",
        notes: expense.notes || "",
        cost_center_id: expense.cost_center_id,
        allocation_type: expense.allocation_type || "General",
        campaign_id: expense.campaign_id,
        plan_id: expense.plan_id,
        asset_id: expense.asset_id,
        tags: expense.tags || [],
      });
    } else {
      form.reset();
    }
  }, [expense, form]);

  const loadRelatedData = async () => {
    setRelatedDataLoading(true);
    setPlansLoadFailed(false);
    setCampaignsLoadFailed(false);
    setAssetsLoadFailed(false);

    // Load campaigns
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.warn("Failed to load campaigns:", err);
      setCampaigns([]);
      setCampaignsLoadFailed(true);
    }

    // Load plans (non-blocking — don't crash form)
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, client_name")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.warn("Plans list unavailable:", err);
      setPlans([]);
      setPlansLoadFailed(true);
    }

    // Load assets
    try {
      const { data, error } = await supabase
        .from("media_assets")
        .select("id, media_asset_code, location, city")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.warn("Failed to load assets:", err);
      setAssets([]);
      setAssetsLoadFailed(true);
    }

    setRelatedDataLoading(false);
  };

  const getCampaignLabel = (c: any) => {
    const name = c.campaign_name || c.name || c.id;
    const client = c.client_name || "—";
    return `${name} — ${client}`;
  };

  const getPlanLabel = (p: any) => {
    const name = p.name || p.plan_name || p.id;
    const client = p.client_name || "—";
    return `${name} — ${client}`;
  };

  const getAssetLabel = (a: any) => {
    const code = a.media_asset_code || a.asset_code || a.id;
    return `${code} — ${a.location || ""}${a.city ? ` (${a.city})` : ""}`;
  };

  const getAllocationPreviewText = () => {
    const type = watchAllocationType;
    if (type === "General") return "This expense will be allocated as a General expense.";
    if (type === "Campaign") {
      const id = form.watch("campaign_id");
      const found = campaigns.find(c => c.id === id);
      return found ? `Allocated to Campaign: ${getCampaignLabel(found)}` : "Select a campaign below.";
    }
    if (type === "Plan") {
      const id = form.watch("plan_id");
      const found = plans.find(p => p.id === id);
      return found ? `Allocated to Plan: ${getPlanLabel(found)}` : "Select a plan below.";
    }
    if (type === "Asset") {
      const id = form.watch("asset_id");
      const found = assets.find(a => a.id === id);
      return found ? `Allocated to Asset: ${getAssetLabel(found)}` : "Select an asset below.";
    }
    return "";
  };

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const formData: ExpenseFormData = {
        expense_date: values.expense_date,
        vendor_id: values.vendor_id || null,
        vendor_name: values.vendor_name,
        vendor_gstin: values.vendor_gstin || "",
        invoice_no: values.invoice_no || "",
        invoice_date: values.invoice_date || null,
        payment_mode: values.payment_mode,
        payment_status: values.payment_status,
        paid_date: values.paid_date || null,
        amount_before_tax: values.amount_before_tax,
        gst_type_enum: values.gst_type_enum,
        cgst: values.cgst,
        sgst: values.sgst,
        igst: values.igst,
        tds_applicable: values.tds_applicable,
        tds_percent: values.tds_percent,
        category_id: values.category_id || null,
        category: values.category,
        subcategory: values.subcategory || "",
        notes: values.notes || "",
        cost_center_id: values.cost_center_id || null,
        allocation_type: values.allocation_type,
        campaign_id: values.campaign_id || null,
        plan_id: values.plan_id || null,
        asset_id: values.asset_id || null,
        tags: values.tags || [],
      };

      let success = false;
      if (isEditing && expense) {
        success = await onUpdate(expense.id, formData);
      } else {
        const result = await onSubmit(formData);
        success = result !== null;
      }
      if (success) {
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to save expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for display
  const totalTax = form.watch("cgst") + form.watch("sgst") + form.watch("igst");
  const totalAmount = watchAmount + totalTax;
  const tdsAmount = watchTdsApplicable ? totalAmount * (watchTdsPercent / 100) : 0;
  const netPayable = totalAmount - tdsAmount;

  const EmptyState = ({ label, failed }: { label: string; failed?: boolean }) => (
    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground bg-muted/30 rounded-md border border-dashed">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{failed ? `${label} list unavailable (permissions or config).` : `No ${label} found for this company.`} {relatedDataLoading ? "Loading..." : ""}</span>
    </div>
  );

  // Effective cost centers: DB list or fallback defaults
  const DEFAULT_COST_CENTERS: CostCenter[] = [
    { id: "general", company_id: company?.id || "", name: "General", code: "GEN", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
    { id: "operations", company_id: company?.id || "", name: "Operations", code: "OPS", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
    { id: "printing", company_id: company?.id || "", name: "Printing", code: "PRT", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
    { id: "mounting", company_id: company?.id || "", name: "Mounting", code: "MNT", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
    { id: "electricity", company_id: company?.id || "", name: "Electricity", code: "ELC", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
    { id: "transport", company_id: company?.id || "", name: "Transport", code: "TRN", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
    { id: "maintenance", company_id: company?.id || "", name: "Maintenance", code: "MNT", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
    { id: "office", company_id: company?.id || "", name: "Office", code: "OFF", type: "Department", is_active: true, created_at: "", updated_at: "", parent_id: null },
  ];
  const effectiveCostCenters = costCenters.length > 0 ? costCenters : DEFAULT_COST_CENTERS;
  const usingDefaultCostCenters = costCenters.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <Form {...form}>
            <form id="expense-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="allocation">Allocation</TabsTrigger>
                  <TabsTrigger value="tax">Tax & TDS</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Expense Date */}
                    <FormField
                      control={form.control}
                      name="expense_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expense Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "dd MMM yyyy") : "Select date"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const cat = categories.find(c => c.name === value);
                              if (cat) {
                                form.setValue("category_id", cat.id);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: cat.color }} 
                                    />
                                    {cat.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Vendor */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendor_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter vendor name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vendor_gstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor GSTIN</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 36AABCU9603R1ZM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Invoice Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoice_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="INV-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoice_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "dd MMM yyyy") : "Select date"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Amount */}
                  <FormField
                    control={form.control}
                    name="amount_before_tax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (Before Tax) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional details..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="allocation" className="space-y-4 mt-4">
                  {/* Allocation Type */}
                  <FormField
                    control={form.control}
                    name="allocation_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allocation Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Campaign">Campaign</SelectItem>
                            <SelectItem value="Plan">Plan</SelectItem>
                            <SelectItem value="Asset">Asset</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Allocation Preview */}
                  <div className="text-sm px-3 py-2 rounded-md bg-muted/50 border text-muted-foreground">
                    {getAllocationPreviewText()}
                  </div>

                  {/* Campaign Select */}
                  {watchAllocationType === "Campaign" && (
                    campaigns.length === 0 ? <EmptyState label="campaigns" failed={campaignsLoadFailed} /> : (
                      <FormField
                        control={form.control}
                        name="campaign_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campaign *</FormLabel>
                            <Select 
                              value={field.value || ""} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select campaign" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {campaigns.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {getCampaignLabel(c)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  )}

                  {/* Plan Select */}
                  {watchAllocationType === "Plan" && (
                    plans.length === 0 ? <EmptyState label="Plans" failed={plansLoadFailed} /> : (
                      <FormField
                        control={form.control}
                        name="plan_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan *</FormLabel>
                            <Select 
                              value={field.value || ""} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {plans.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {getPlanLabel(p)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  )}

                  {/* Asset Select */}
                  {watchAllocationType === "Asset" && (
                    assets.length === 0 ? <EmptyState label="assets" failed={assetsLoadFailed} /> : (
                      <FormField
                        control={form.control}
                        name="asset_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset *</FormLabel>
                            <Select 
                              value={field.value || ""} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select asset" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {assets.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {getAssetLabel(a)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  )}

                  {/* Cost Center */}
                  <FormField
                    control={form.control}
                    name="cost_center_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Center</FormLabel>
                        {usingDefaultCostCenters && (
                          <p className="text-xs text-muted-foreground">Using default cost centers</p>
                        )}
                        <Select 
                          value={field.value || ""} 
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cost center" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {effectiveCostCenters.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id}>
                                {cc.name} {cc.code && `(${cc.code})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="tax" className="space-y-4 mt-4">
                  {/* GST Type */}
                  <FormField
                    control={form.control}
                    name="gst_type_enum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="None">No GST</SelectItem>
                            <SelectItem value="CGST_SGST">CGST + SGST (Intra-state)</SelectItem>
                            <SelectItem value="IGST">IGST (Inter-state)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* GST Breakdown */}
                  {watchGstType !== "None" && (
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="cgst"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CGST (9%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                disabled={watchGstType === "IGST"}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sgst"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SGST (9%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                disabled={watchGstType === "IGST"}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="igst"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IGST (18%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                disabled={watchGstType === "CGST_SGST"}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* TDS */}
                  <div className="space-y-4 pt-4 border-t">
                    <FormField
                      control={form.control}
                      name="tds_applicable"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>TDS Applicable</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Enable if TDS needs to be deducted
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {watchTdsApplicable && (
                      <FormField
                        control={form.control}
                        name="tds_percent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>TDS Percentage</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                max={100}
                                placeholder="e.g., 2"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Amount Before Tax:</span>
                      <span>₹{watchAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Tax:</span>
                      <span>₹{totalTax.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total Amount:</span>
                      <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    {watchTdsApplicable && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>TDS ({watchTdsPercent}%):</span>
                        <span>-₹{tdsAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Net Payable:</span>
                      <span>₹{netPayable.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payment_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Mode</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payment_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Unpaid">Unpaid</SelectItem>
                              <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                              <SelectItem value="Paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="paid_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "dd MMM yyyy") : "Select date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </div>

        {/* Sticky footer */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="expense-form" 
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Saving..." : isEditing ? "Update Expense" : "Create Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
