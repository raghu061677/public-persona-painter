import { useState } from "react";
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
import { Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManualBillDialogProps {
  assetId: string;
  onBillAdded?: () => void;
}

export function ManualBillDialog({ assetId, onBillAdded }: ManualBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [billMonth, setBillMonth] = useState<Date>();
  const [paymentDate, setPaymentDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
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

  const resetForm = () => {
    setFormData({
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      // Format bill_month as YYYY-MM-01
      const formattedBillMonth = format(billMonth, 'yyyy-MM-01');

      const { error } = await supabase.from('asset_power_bills').insert({
        asset_id: assetId,
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
        notes: formData.notes || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Power bill added successfully",
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
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Manual Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Manual Power Bill</DialogTitle>
          <DialogDescription>
            Manually enter power bill details for this asset
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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

            {/* Consumer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consumer_name">Consumer Name</Label>
                <Input
                  id="consumer_name"
                  value={formData.consumer_name}
                  onChange={(e) => updateField('consumer_name', e.target.value)}
                  placeholder="Enter consumer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_number">Service Number</Label>
                <Input
                  id="service_number"
                  value={formData.service_number}
                  onChange={(e) => updateField('service_number', e.target.value)}
                  placeholder="Enter service number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unique_service_number">Unique Service Number</Label>
                <Input
                  id="unique_service_number"
                  value={formData.unique_service_number}
                  onChange={(e) => updateField('unique_service_number', e.target.value)}
                  placeholder="USC-XXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="section_name">Section Name</Label>
                <Input
                  id="section_name"
                  value={formData.section_name}
                  onChange={(e) => updateField('section_name', e.target.value)}
                  placeholder="Enter section name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ero">ERO</Label>
                <Input
                  id="ero"
                  value={formData.ero}
                  onChange={(e) => updateField('ero', e.target.value)}
                  placeholder="Enter ERO"
                />
              </div>

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

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>Payment Date (if paid)</Label>
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
                    {paymentDate ? format(paymentDate, "dd MMM yyyy") : "Select payment date"}
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bill
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
