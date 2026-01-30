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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
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
    if (company?.id) {
      loadRelatedData();
    }
  }, [company?.id]);

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
    // Load campaigns
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select("id, campaign_name, client_name")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setCampaigns(campaignData || []);

    // Load plans
    const { data: planData } = await supabase
      .from("plans")
      .select("id, name, client_name")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setPlans(planData || []);

    // Load assets
    const { data: assetData } = await supabase
      .from("media_assets")
      .select("id, media_asset_code, location, city")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setAssets(assetData || []);
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

      if (isEditing && expense) {
        await onUpdate(expense.id, formData);
      } else {
        await onSubmit(formData);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for display
  const totalTax = form.watch("cgst") + form.watch("sgst") + form.watch("igst");
  const totalAmount = watchAmount + totalTax;
  const tdsAmount = watchTdsApplicable ? totalAmount * (watchTdsPercent / 100) : 0;
  const netPayable = totalAmount - tdsAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

                {/* Campaign Select */}
                {watchAllocationType === "Campaign" && (
                  <FormField
                    control={form.control}
                    name="campaign_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign</FormLabel>
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
                                {c.campaign_name} - {c.client_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Plan Select */}
                {watchAllocationType === "Plan" && (
                  <FormField
                    control={form.control}
                    name="plan_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan</FormLabel>
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
                                {p.name} - {p.client_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Asset Select */}
                {watchAllocationType === "Asset" && (
                  <FormField
                    control={form.control}
                    name="asset_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
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
                                {a.media_asset_code || a.id} - {a.location}, {a.city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Cost Center */}
                <FormField
                  control={form.control}
                  name="cost_center_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Center</FormLabel>
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
                          {costCenters.map((cc) => (
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEditing ? "Update Expense" : "Create Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
