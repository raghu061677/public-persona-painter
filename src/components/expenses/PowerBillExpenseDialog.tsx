import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Zap, Calendar as CalendarIcon, Loader2, Upload, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PowerBillExpenseDialogProps {
  onBillAdded?: () => void;
  billToEdit?: any;
  mode?: 'add' | 'edit';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PowerBillExpenseDialog({ 
  onBillAdded, 
  billToEdit, 
  mode = 'add',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: PowerBillExpenseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [billMonth, setBillMonth] = useState<Date>();
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    asset_id: "",
    consumer_name: "",
    service_number: "",
    unique_service_number: "",
    section_name: "",
    ero: "",
    bill_amount: "",
    paid_amount: "",
    payment_status: "Pending",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchAssets();
      if (mode === 'edit' && billToEdit) {
        populateEditData();
      }
    }
  }, [open, billToEdit, mode]);

  const populateEditData = () => {
    if (!billToEdit) return;
    
    setFormData({
      asset_id: billToEdit.asset_id || "",
      consumer_name: billToEdit.consumer_name || "",
      service_number: billToEdit.service_number || "",
      unique_service_number: billToEdit.unique_service_number || "",
      section_name: billToEdit.section_name || "",
      ero: billToEdit.ero || "",
      bill_amount: billToEdit.bill_amount?.toString() || "",
      paid_amount: billToEdit.paid_amount?.toString() || "",
      payment_status: billToEdit.payment_status || "Pending",
      notes: billToEdit.notes || "",
    });
    
    if (billToEdit.bill_month) {
      setBillMonth(new Date(billToEdit.bill_month));
    }
    
    if (billToEdit.payment_date) {
      setPaymentDate(new Date(billToEdit.payment_date));
    }
    
    if (billToEdit.bill_url) {
      setExistingReceiptUrl(billToEdit.bill_url);
    }
  };

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from('media_assets')
      .select('id, location, area, city, consumer_name, service_number, unique_service_number, ero, section_name')
      .order('id', { ascending: true });

    if (!error && data) {
      setAssets(data);
    }
  };

  const handleAssetSelect = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setSelectedAsset(asset);
      setFormData(prev => ({
        ...prev,
        asset_id: asset.id,
        consumer_name: asset.consumer_name || "",
        service_number: asset.service_number || "",
        unique_service_number: asset.unique_service_number || "",
        section_name: asset.section_name || "",
        ero: asset.ero || "",
      }));
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (!file) return null;

    setUploadingReceipt(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `power-bill-receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload receipt",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const resetForm = () => {
    setFormData({
      asset_id: "",
      consumer_name: "",
      service_number: "",
      unique_service_number: "",
      section_name: "",
      ero: "",
      bill_amount: "",
      paid_amount: "",
      payment_status: "Pending",
      notes: "",
    });
    setBillMonth(undefined);
    setPaymentDate(undefined);
    setSelectedAsset(null);
    setReceiptFile(null);
    setExistingReceiptUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.asset_id) {
      toast({
        title: "Error",
        description: "Please select an asset",
        variant: "destructive",
      });
      return;
    }

    if (!billMonth) {
      toast({
        title: "Error",
        description: "Please select a bill month",
        variant: "destructive",
      });
      return;
    }

    if (!formData.bill_amount || parseFloat(formData.bill_amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid bill amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload receipt if provided
      let receiptUrl = null;
      if (receiptFile) {
        receiptUrl = await handleReceiptUpload(receiptFile);
      }

      // Format bill_month as YYYY-MM-01
      const formattedBillMonth = format(billMonth, 'yyyy-MM-01');

      const billData = {
        asset_id: formData.asset_id,
        consumer_name: formData.consumer_name || null,
        service_number: formData.service_number || null,
        unique_service_number: formData.unique_service_number || null,
        section_name: formData.section_name || null,
        ero: formData.ero || null,
        bill_amount: parseFloat(formData.bill_amount),
        paid_amount: formData.paid_amount ? parseFloat(formData.paid_amount) : 0,
        bill_month: formattedBillMonth,
        payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
        payment_status: formData.payment_status,
        bill_url: receiptUrl || existingReceiptUrl,
        notes: formData.notes || null,
        ...(mode === 'add' && { created_by: user.id }),
      };

      let error;
      if (mode === 'edit' && billToEdit) {
        const result = await supabase
          .from('asset_power_bills')
          .update(billData)
          .eq('id', billToEdit.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('asset_power_bills')
          .insert(billData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: mode === 'edit' 
          ? "Power bill updated successfully"
          : "Power bill expense added successfully",
      });

      resetForm();
      setOpen(false);
      
      if (onBillAdded) {
        onBillAdded();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add power bill",
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
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === 'add' && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Zap className="mr-2 h-4 w-4" />
            Add Power Bill
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Power Bill' : 'Add Power Bill Expense'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Update power bill payment details'
              : 'Record power bill payment for a media asset'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Asset Selection */}
            <div className="space-y-2">
              <Label>Select Asset *</Label>
              <Select value={formData.asset_id} onValueChange={handleAssetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.id} - {asset.location}, {asset.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAsset && (
              <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Consumer Details (from Asset)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consumer_name">Consumer Name</Label>
                    <Input
                      id="consumer_name"
                      value={formData.consumer_name}
                      disabled
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_number">Service Number</Label>
                    <Input
                      id="service_number"
                      value={formData.service_number}
                      disabled
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unique_service_number">Unique Service Number</Label>
                    <Input
                      id="unique_service_number"
                      value={formData.unique_service_number}
                      disabled
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ero">ERO</Label>
                    <Input
                      id="ero"
                      value={formData.ero}
                      disabled
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bill Month - Required */}
            <div className="space-y-2">
              <Label>Bill Month *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !billMonth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {billMonth ? format(billMonth, "MMMM yyyy") : "Select month"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={billMonth}
                    onSelect={setBillMonth}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Bill Amount - Required */}
              <div className="space-y-2">
                <Label htmlFor="bill_amount">Bill Amount (₹) *</Label>
                <Input
                  id="bill_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bill_amount}
                  onChange={(e) => updateField('bill_amount', e.target.value)}
                  placeholder="Enter bill amount"
                  required
                />
              </div>

              {/* Paid Amount */}
              <div className="space-y-2">
                <Label htmlFor="paid_amount">Paid Amount (₹)</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.paid_amount}
                  onChange={(e) => updateField('paid_amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Status */}
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(v) => updateField('payment_status', v)}>
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

              {/* Payment Date */}
              <div className="space-y-2">
                <Label>Payment Date {formData.payment_status === 'Paid' && '*'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, "dd MMM yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={setPaymentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label htmlFor="receipt">Payment Receipt (Proof of Payment)</Label>
              {existingReceiptUrl && !receiptFile && (
                <div className="p-2 bg-muted rounded-md flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Current receipt attached</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(existingReceiptUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {receiptFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setReceiptFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {receiptFile && (
                <p className="text-sm text-muted-foreground">
                  New file: {receiptFile.name}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || uploadingReceipt}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingReceipt}>
              {loading || uploadingReceipt ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingReceipt ? "Uploading..." : mode === 'edit' ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  {mode === 'edit' ? 'Update Power Bill' : 'Add Power Bill'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
