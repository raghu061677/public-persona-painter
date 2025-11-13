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
import { CalendarIcon, Loader2, AlertTriangle, Sparkles, ClipboardPaste, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

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
  
  // Quick Paste state
  const [pasteOpen, setPasteOpen] = useState(true);
  const [pastedText, setPastedText] = useState("");
  const [parsedData, setParsedData] = useState<any>(null);
  
  // Auto-fill state
  const [consumerSuggestions, setConsumerSuggestions] = useState<Array<{
    consumer_name: string;
    service_number: string;
    unique_service_number: string;
  }>>([]);
  const [consumerOpen, setConsumerOpen] = useState(false);
  
  // Auto-populate from asset record
  const [formData, setFormData] = useState({
    consumer_name: existingConsumerInfo?.consumer_name || asset?.consumer_name || "",
    service_number: existingConsumerInfo?.service_number || asset?.service_number || "",
    unique_service_number: existingConsumerInfo?.unique_service_number || asset?.unique_service_number || "",
    ero_name: existingConsumerInfo?.ero_name || asset?.ero || "",
    section_name: existingConsumerInfo?.section_name || asset?.section_name || "",
    consumer_address: existingConsumerInfo?.consumer_address || asset?.location || "",
    bill_month: "",
    units: "",
    bill_amount: "",
    acd_amount: "",
    arrears: "",
    total_due: "",
    payment_method: "online",
    payment_status: "unpaid" as const,
    transaction_id: "",
    notes: "",
  });

  // Parse pasted bill data
  const parseBillData = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const data: any = {};

    lines.forEach((line, index) => {
      // Consumer Name
      if (line.includes('Consumer Name') && lines[index + 1]) {
        data.consumer_name = lines[index + 1];
      }
      
      // Service Number
      if (line.includes('Unique Service No') && lines[index + 1]) {
        data.unique_service_number = lines[index + 1];
      } else if (line.includes('Service Number') && lines[index + 1]) {
        data.service_number = lines[index + 1];
      }
      
      // ERO
      if (line.includes('ERO Name') && lines[index + 1]) {
        data.ero_name = lines[index + 1];
      }
      
      // Section
      if (line.includes('Section Name') && lines[index + 1]) {
        data.section_name = lines[index + 1];
      }
      
      // Bill Month
      if (line.includes('Bill Month') && lines[index + 1]) {
        data.bill_month = lines[index + 1];
      }
      
      // Units
      if (line.includes('Units') && !line.includes('Bill Date')) {
        const unitsMatch = line.match(/Units[\s:]+(\d+)/i);
        if (unitsMatch) {
          data.units = unitsMatch[1];
        } else if (lines[index + 1]) {
          data.units = lines[index + 1].replace(/[^\d]/g, '');
        }
      }
      
      // Bill Date / Due Date in format "05-Nov-25 / 19-Nov-25"
      if (line.includes('Bill Date') && line.includes('Due Date')) {
        const dates = line.split('/').map(d => d.trim());
        if (dates.length >= 2) {
          // Extract dates from "Bill Date / Due Date	05-Nov-25 / 19-Nov-25"
          const datePart = dates[dates.length - 2].split(/\s+/).pop(); // Get "05-Nov-25"
          const dueDatePart = dates[dates.length - 1].split(/\s+/)[0]; // Get "19-Nov-25"
          
          if (datePart) data.bill_date = datePart;
          if (dueDatePart) data.due_date = dueDatePart;
        }
      }
      
      // Individual Bill Date
      if (line.includes('Bill Date') && !line.includes('Due Date') && lines[index + 1]) {
        data.bill_date = lines[index + 1];
      }
      
      // Individual Due Date
      if (line.includes('Due Date') && !line.includes('Bill Date') && lines[index + 1]) {
        data.due_date = lines[index + 1];
      }
      
      // Current Month Bill
      if (line.includes('Current Month Bill') && lines[index + 1]) {
        data.bill_amount = lines[index + 1].replace(/[₹,]/g, '');
      }
      
      // ACD Amount
      if (line.includes('ACD Amount') && lines[index + 1]) {
        data.acd_amount = lines[index + 1].replace(/[₹,]/g, '');
      }
      
      // Arrears
      if (line.includes('Arrears') && lines[index + 1]) {
        data.arrears = lines[index + 1].replace(/[₹,]/g, '');
      }
      
      // Total Amount (multiple variations)
      if ((line.includes('Total Amount Payable') || line.includes('Total Amount to be Paid')) && lines[index + 1]) {
        data.total_due = lines[index + 1].replace(/[₹,]/g, '');
      }
    });

    // Auto-generate bill_month from bill_date
    if (data.bill_date) {
      const parsedDate = parseDate(data.bill_date);
      if (parsedDate) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[parsedDate.getMonth()];
        const year = parsedDate.getFullYear();
        data.bill_month = `${month} ${year}`;
      }
    }

    return data;
  };

  // Parse date in format "05-Nov-25" to Date object
  const parseDate = (dateStr: string): Date | null => {
    try {
      // Handle format: "05-Nov-25" or "05-11-2025"
      const parts = dateStr.split('-');
      if (parts.length !== 3) return null;

      const [day, monthPart, yearPart] = parts;
      
      // Convert 2-digit year to 4-digit (assume 20xx for xx <= 99)
      let year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
      
      // Check if month is a name (Nov) or number (11)
      let month: string;
      if (isNaN(Number(monthPart))) {
        // Month is a name like "Nov"
        const monthMap: { [key: string]: string } = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        month = monthMap[monthPart] || '01';
      } else {
        // Month is already a number
        month = monthPart.padStart(2, '0');
      }
      
      // Create date in format "YYYY-MM-DD"
      return new Date(`${year}-${month}-${day.padStart(2, '0')}`);
    } catch (e) {
      console.error('Error parsing date:', e);
      return null;
    }
  };

  const handleParse = () => {
    if (!pastedText.trim()) {
      toast({
        title: "No Data",
        description: "Please paste bill data first",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseBillData(pastedText);
    setParsedData(parsed);
    
    toast({
      title: "Data Parsed",
      description: "Review the extracted data below",
    });
  };

  const handleApplyParsedData = () => {
    if (!parsedData) return;

    setFormData(prev => ({
      ...prev,
      consumer_name: parsedData.consumer_name || prev.consumer_name,
      service_number: parsedData.service_number || prev.service_number,
      unique_service_number: parsedData.unique_service_number || prev.unique_service_number,
      ero_name: parsedData.ero_name || prev.ero_name,
      section_name: parsedData.section_name || prev.section_name,
      bill_month: parsedData.bill_month || prev.bill_month,
      units: parsedData.units || prev.units,
      bill_amount: parsedData.bill_amount || prev.bill_amount,
      acd_amount: parsedData.acd_amount || prev.acd_amount,
      arrears: parsedData.arrears || prev.arrears,
      total_due: parsedData.total_due || prev.total_due,
    }));

    // Parse dates using the new parseDate function
    if (parsedData.bill_date) {
      const date = parseDate(parsedData.bill_date);
      if (date) setBillDate(date);
    }
    if (parsedData.due_date) {
      const date = parseDate(parsedData.due_date);
      if (date) setDueDate(date);
    }

    toast({
      title: "Data Applied",
      description: "Parsed data has been filled into the form",
    });
    
    // Clear paste area
    setPastedText("");
    setParsedData(null);
    setPasteOpen(false);
  };

  // Fetch consumer suggestions
  useEffect(() => {
    const fetchConsumerSuggestions = async () => {
      const { data, error } = await supabase
        .from("asset_power_bills")
        .select("consumer_name, service_number, unique_service_number")
        .eq("asset_id", assetId)
        .not("consumer_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        // Remove duplicates based on unique_service_number
        const unique = data.filter((bill, index, self) =>
          index === self.findIndex((b) => b.unique_service_number === bill.unique_service_number)
        );
        setConsumerSuggestions(unique);
      }
    };

    if (open && assetId) {
      fetchConsumerSuggestions();
    }
  }, [open, assetId]);

  const handleConsumerSelect = (consumer: typeof consumerSuggestions[0]) => {
    setFormData(prev => ({
      ...prev,
      consumer_name: consumer.consumer_name,
      service_number: consumer.service_number,
      unique_service_number: consumer.unique_service_number,
    }));
    setConsumerOpen(false);
  };

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
      units: "",
      bill_amount: "",
      acd_amount: "",
      arrears: "",
      total_due: "",
      payment_method: "online",
      payment_status: "unpaid" as const,
      transaction_id: "",
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
        units: parseFloat(formData.units) || 0,
        bill_amount: parseFloat(formData.bill_amount) || 0,
        acd_amount: parseFloat(formData.acd_amount) || 0,
        arrears: parseFloat(formData.arrears) || 0,
        total_due: parseFloat(formData.total_due) || 0,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method,
        transaction_id: formData.transaction_id || null,
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
            Enter bill details manually or use Quick Paste for faster entry
          </DialogDescription>
        </DialogHeader>

        {/* Quick Paste Section */}
        <Collapsible open={pasteOpen} onOpenChange={setPasteOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full mb-4">
              <Sparkles className="h-4 w-4 mr-2" />
              Quick Paste - Smart Data Entry
              <span className="ml-auto text-xs text-muted-foreground">
                {pasteOpen ? "Hide" : "Show"}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4" />
                  Paste Bill Data
                </CardTitle>
                <CardDescription className="text-xs">
                  Copy bill details from TGSPDCL website and paste here. The system will automatically extract the data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste bill data from TGSPDCL website here..."
                  className="min-h-[120px] font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleParse} 
                    size="sm"
                    type="button"
                    disabled={!pastedText.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Parse Data
                  </Button>
                  {parsedData && (
                    <Button 
                      onClick={handleApplyParsedData}
                      size="sm"
                      type="button"
                      variant="default"
                    >
                      Apply to Form
                    </Button>
                  )}
                </div>
                
                {parsedData && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium mb-2">Extracted Data:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(parsedData).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

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
                {manualMode ? (
                  <Popover open={consumerOpen} onOpenChange={setConsumerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {formData.consumer_name || "Select or enter consumer"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search or type new consumer..." 
                          value={formData.consumer_name}
                          onValueChange={(value) => updateField("consumer_name", value)}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">
                              No previous records. Type to enter new.
                            </div>
                          </CommandEmpty>
                          {consumerSuggestions.length > 0 && (
                            <CommandGroup heading="Previous Consumers">
                              {consumerSuggestions.map((consumer, idx) => (
                                <CommandItem
                                  key={idx}
                                  value={consumer.consumer_name}
                                  onSelect={() => handleConsumerSelect(consumer)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.consumer_name === consumer.consumer_name
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{consumer.consumer_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {consumer.unique_service_number} • {consumer.service_number}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    value={formData.consumer_name}
                    onChange={(e) => updateField("consumer_name", e.target.value)}
                    disabled={true}
                  />
                )}
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
                <Label>Units Consumed</Label>
                <Input
                  type="number"
                  value={formData.units}
                  onChange={(e) => updateField("units", e.target.value)}
                  placeholder="e.g., 40"
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
                <Label>ACD Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.acd_amount}
                  onChange={(e) => updateField("acd_amount", e.target.value)}
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
                <Label>Transaction ID</Label>
                <Input
                  value={formData.transaction_id}
                  onChange={(e) => updateField("transaction_id", e.target.value)}
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
