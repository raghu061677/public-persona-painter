import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EnhancedBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  asset?: any;
  existingConsumerInfo?: any;
  onSuccess?: () => void;
}

export function EnhancedBillDialog({ 
  open, 
  onOpenChange, 
  assetId, 
  asset,
  existingConsumerInfo,
  onSuccess 
}: EnhancedBillDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingFromAPI, setFetchingFromAPI] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [billDate, setBillDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [paidDate, setPaidDate] = useState<Date>();
  
  // Auto-populate from asset record
  const [formData, setFormData] = useState({
    consumer_name: existingConsumerInfo?.consumer_name || asset?.consumer_name || "",
    service_number: existingConsumerInfo?.service_number || asset?.service_number || "",
    unique_service_number: existingConsumerInfo?.unique_service_number || asset?.unique_service_number || "",
    ero_name: existingConsumerInfo?.ero_name || asset?.ero || "",
    section_name: existingConsumerInfo?.section_name || asset?.section_name || "",
    consumer_address: existingConsumerInfo?.consumer_address || asset?.location || "",
    bill_month: "",
    bill_amount: "",
    energy_charges: "",
    fixed_charges: "",
    arrears: "",
    total_due: "",
    payment_status: "Pending",
    payment_reference: "",
    notes: "",
  });

  // Check for bookmarklet data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('tgspdcl_bill_data');
    const timestamp = localStorage.getItem('tgspdcl_bill_timestamp');
    
    if (savedData && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      // Data expires after 5 minutes
      if (age < 5 * 60 * 1000) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(prev => ({
            ...prev,
            consumer_name: parsed.consumerName || prev.consumer_name,
            unique_service_number: parsed.uniqueServiceNumber || prev.unique_service_number,
            service_number: parsed.serviceNumber || prev.service_number,
            ero_name: parsed.eroName || prev.ero_name,
            section_name: parsed.sectionName || prev.section_name,
            bill_amount: parsed.currentMonthBill || "",
            arrears: parsed.arrears || "",
            total_due: parsed.totalAmount || "",
          }));
          
          // Parse dates if available
          if (parsed.billDate) {
            try {
              const [day, month, year] = parsed.billDate.split('-');
              setBillDate(new Date(`${year}-${month}-${day}`));
            } catch (e) {
              console.error('Error parsing bill date:', e);
            }
          }
          if (parsed.dueDate) {
            try {
              const [day, month, year] = parsed.dueDate.split('-');
              setDueDate(new Date(`${year}-${month}-${day}`));
            } catch (e) {
              console.error('Error parsing due date:', e);
            }
          }
          
          toast({
            title: "Data Loaded",
            description: "Bookmarklet data has been auto-filled. Please verify and save.",
          });
          // Clear the data after loading
          localStorage.removeItem('tgspdcl_bill_data');
          localStorage.removeItem('tgspdcl_bill_timestamp');
        } catch (error) {
          console.error('Error parsing bookmarklet data:', error);
        }
      } else {
        // Clear expired data
        localStorage.removeItem('tgspdcl_bill_data');
        localStorage.removeItem('tgspdcl_bill_timestamp');
      }
    }
  }, []);

  const resetForm = () => {
    setFormData({
      consumer_name: existingConsumerInfo?.consumer_name || asset?.consumer_name || "",
      service_number: existingConsumerInfo?.service_number || asset?.service_number || "",
      unique_service_number: existingConsumerInfo?.unique_service_number || asset?.unique_service_number || "",
      ero_name: existingConsumerInfo?.ero_name || asset?.ero || "",
      section_name: existingConsumerInfo?.section_name || asset?.section_name || "",
      consumer_address: existingConsumerInfo?.consumer_address || asset?.location || "",
      bill_month: "",
      bill_amount: "",
      energy_charges: "",
      fixed_charges: "",
      arrears: "",
      total_due: "",
      payment_status: "Pending",
      payment_reference: "",
      notes: "",
    });
    setBillDate(undefined);
    setDueDate(undefined);
    setPaidDate(undefined);
    setManualMode(false);
  };

  const fetchFromTGSPDCL = async () => {
    const usn = formData.unique_service_number;
    if (!usn) {
      toast({
        title: "Missing USN",
        description: "Please enter a Unique Service Number",
        variant: "destructive",
      });
      return;
    }

    setFetchingFromAPI(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-tgspdcl-bill", {
        body: { 
          uniqueServiceNumber: usn,
          assetId: assetId 
        },
      });

      if (error) throw error;

      if (data?.success && data?.billData) {
        const bill = data.billData;
        
        // Populate form with fetched data
        setFormData(prev => ({
          ...prev,
          consumer_name: bill.consumer_name || prev.consumer_name,
          service_number: bill.service_number || prev.service_number,
          ero_name: bill.ero_name || prev.ero_name,
          section_name: bill.section_name || prev.section_name,
          consumer_address: bill.consumer_address || prev.consumer_address,
          bill_amount: bill.bill_amount?.toString() || "",
          energy_charges: bill.energy_charges?.toString() || "",
          fixed_charges: bill.fixed_charges?.toString() || "",
          arrears: bill.arrears?.toString() || "",
          total_due: bill.total_due?.toString() || "",
          bill_month: bill.bill_month || "",
        }));

        if (bill.bill_date) setBillDate(new Date(bill.bill_date));
        if (bill.due_date) setDueDate(new Date(bill.due_date));

        toast({
          title: "Success",
          description: "Bill details fetched successfully from TGSPDCL",
        });
        setManualMode(false);
      } else {
        throw new Error(data?.error || "Unable to fetch bill from TGSPDCL portal");
      }
    } catch (error) {
      console.error("Error fetching from TGSPDCL:", error);
      toast({
        title: "Fetch Failed",
        description: "Unable to fetch bill details. Please enter manually.",
        variant: "destructive",
      });
      setManualMode(true);
    } finally {
      setFetchingFromAPI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const billData = {
        asset_id: assetId,
        consumer_name: formData.consumer_name,
        service_number: formData.service_number,
        unique_service_number: formData.unique_service_number,
        ero_name: formData.ero_name,
        section_name: formData.section_name,
        consumer_address: formData.consumer_address,
        bill_date: billDate ? format(billDate, "yyyy-MM-dd") : null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        paid_date: paidDate ? format(paidDate, "yyyy-MM-dd") : null,
        bill_month: formData.bill_month,
        bill_amount: parseFloat(formData.bill_amount) || 0,
        energy_charges: parseFloat(formData.energy_charges) || 0,
        fixed_charges: parseFloat(formData.fixed_charges) || 0,
        arrears: parseFloat(formData.arrears) || 0,
        total_due: parseFloat(formData.total_due) || parseFloat(formData.bill_amount) || 0,
        payment_status: formData.payment_status,
        payment_reference: formData.payment_reference || null,
        notes: formData.notes || null,
      };

      const { error } = await supabase
        .from("asset_power_bills")
        .insert(billData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Power bill added successfully",
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving bill:", error);
      toast({
        title: "Error",
        description: "Failed to save power bill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Power Bill</DialogTitle>
          <DialogDescription>
            Fetch bill details from TGSPDCL or enter manually
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fetch from TGSPDCL Section */}
          <div className="space-y-3">
            <Label>Unique Service Number (USN)</Label>
            <div className="flex gap-2">
              <Input
                value={formData.unique_service_number}
                onChange={(e) => updateField("unique_service_number", e.target.value)}
                placeholder="Enter USN"
                disabled={!manualMode && formData.consumer_name !== ""}
              />
              <Button
                type="button"
                onClick={fetchFromTGSPDCL}
                disabled={fetchingFromAPI || !formData.unique_service_number}
              >
                {fetchingFromAPI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch from TGSPDCL"
                )}
              </Button>
            </div>
          </div>

          {manualMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Manual Entry Mode: All fields are now editable. Please enter the details manually.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Consumer Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Consumer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Consumer Name</Label>
                <Input
                  value={formData.consumer_name}
                  onChange={(e) => updateField("consumer_name", e.target.value)}
                  disabled={!manualMode}
                />
              </div>
              <div className="space-y-2">
                <Label>Service Number</Label>
                <Input
                  value={formData.service_number}
                  onChange={(e) => updateField("service_number", e.target.value)}
                  disabled={!manualMode}
                />
              </div>
              <div className="space-y-2">
                <Label>ERO Name</Label>
                <Input
                  value={formData.ero_name}
                  onChange={(e) => updateField("ero_name", e.target.value)}
                  disabled={!manualMode}
                />
              </div>
              <div className="space-y-2">
                <Label>Section Name</Label>
                <Input
                  value={formData.section_name}
                  onChange={(e) => updateField("section_name", e.target.value)}
                  disabled={!manualMode}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.consumer_address}
                  onChange={(e) => updateField("consumer_address", e.target.value)}
                  disabled={!manualMode}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Bill Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Bill Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bill Month</Label>
                <Input
                  value={formData.bill_month}
                  onChange={(e) => updateField("bill_month", e.target.value)}
                  placeholder="e.g., Jan 2025"
                />
              </div>
              <div className="space-y-2">
                <Label>Bill Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !billDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {billDate ? format(billDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={billDate} onSelect={setBillDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Bill Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bill_amount}
                  onChange={(e) => updateField("bill_amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Energy Charges (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.energy_charges}
                  onChange={(e) => updateField("energy_charges", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fixed Charges (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fixed_charges}
                  onChange={(e) => updateField("fixed_charges", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Arrears (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.arrears}
                  onChange={(e) => updateField("arrears", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Due (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_due}
                  onChange={(e) => updateField("total_due", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(value) => updateField("payment_status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paidDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paidDate ? format(paidDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={paidDate} onSelect={setPaidDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <Input
                  value={formData.payment_reference}
                  onChange={(e) => updateField("payment_reference", e.target.value)}
                  placeholder="Transaction ID / Reference Number"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Additional notes or comments"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Bill"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
