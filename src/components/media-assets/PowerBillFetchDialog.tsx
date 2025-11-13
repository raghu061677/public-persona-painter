import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Zap, Loader2, Save, Clipboard, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PowerBillFetchDialogProps {
  assetId: string;
  asset?: any;
  defaultServiceNumber?: string;
  onBillFetched?: () => void;
}

export function PowerBillFetchDialog({ 
  assetId,
  asset,
  defaultServiceNumber,
  onBillFetched 
}: PowerBillFetchDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [parsedData, setParsedData] = useState<any>(null);
  
  // Auto-populate consumer details from asset record
  const [formData, setFormData] = useState({
    consumer_name: asset?.consumer_name || "",
    unique_service_number: asset?.unique_service_number || defaultServiceNumber || "",
    service_number: asset?.service_number || "",
    ero: asset?.ero || "",
    section: asset?.section_name || "",
    units: "",
    bill_date: "",
    due_date: "",
    current_month_bill: "",
    acd_amount: "0",
    arrears: "0",
    total_amount: "",
  });

  // Smart parser for TGSPDCL bill data
  const parseTGSPDCLData = (text: string) => {
    const data: any = {};
    
    // Helper function to extract value after various separators
    const extractValue = (line: string) => {
      // Try different patterns: →, \t, :, multiple spaces
      const patterns = [
        /→\s*(.+)$/,           // Arrow separator
        /:\s*(.+)$/,           // Colon separator  
        /\t+(.+)$/,            // Tab separator
        /\s{2,}(.+)$/,         // Multiple spaces
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) return match[1].trim();
      }
      return null;
    };

    // Parse line by line
    const lines = text.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Units
      if (lower.includes('units') || lower.includes('unit')) {
        const value = extractValue(line);
        if (value) data.units = value.replace(/[^\d.]/g, '');
      }
      
      // Bill Date / Due Date (handle combined format)
      if (lower.includes('bill date') && lower.includes('due date')) {
        const value = extractValue(line);
        if (value) {
          const dates = value.split('/').map(d => d.trim());
          if (dates[0]) {
            data.bill_date = parseDate(dates[0]);
          }
          if (dates[1]) {
            data.due_date = parseDate(dates[1]);
          }
        }
      } else {
        // Separate Bill Date
        if (lower.includes('bill date')) {
          const value = extractValue(line);
          if (value) data.bill_date = parseDate(value);
        }
        // Separate Due Date
        if (lower.includes('due date')) {
          const value = extractValue(line);
          if (value) data.due_date = parseDate(value);
        }
      }
      
      // Current Month Bill / Total Amount
      if (lower.includes('current month bill') || lower.includes('bill amount')) {
        const value = extractValue(line);
        if (value) data.current_month_bill = value.replace(/[^\d.]/g, '');
      }
      
      // ACD Amount
      if (lower.includes('acd amount') || lower.includes('acd')) {
        const value = extractValue(line);
        if (value) data.acd_amount = value.replace(/[^\d.]/g, '') || '0';
      }
      
      // Arrears
      if (lower.includes('arrears') || lower.includes('arrear')) {
        const value = extractValue(line);
        if (value) data.arrears = value.replace(/[^\d.]/g, '') || '0';
      }
      
      // Total Amount to be Paid
      if (lower.includes('total amount') || lower.includes('amount to be paid')) {
        const value = extractValue(line);
        if (value) data.total_amount = value.replace(/[^\d.]/g, '');
      }
      
      // Energy Charges
      if (lower.includes('energy charge')) {
        const value = extractValue(line);
        if (value) data.energy_charges = value.replace(/[^\d.]/g, '');
      }
      
      // Fixed Charges
      if (lower.includes('fixed charge')) {
        const value = extractValue(line);
        if (value) data.fixed_charges = value.replace(/[^\d.]/g, '');
      }
    }
    
    return data;
  };

  // Helper to parse date formats like "05-Nov-25" or "05-11-2025"
  const parseDate = (dateStr: string) => {
    try {
      // Try formats: DD-Mon-YY, DD-MM-YYYY, DD/MM/YYYY
      const cleaned = dateStr.trim();
      
      // Handle DD-Mon-YY format (05-Nov-25)
      const monthMap: any = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      
      const parts = cleaned.split(/[-\/]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        let month = parts[1];
        let year = parts[2];
        
        // Convert month name to number
        if (isNaN(Number(month))) {
          month = monthMap[month.toLowerCase().substring(0, 3)] || month;
        } else {
          month = month.padStart(2, '0');
        }
        
        // Convert 2-digit year to 4-digit
        if (year.length === 2) {
          year = '20' + year;
        }
        
        return `${year}-${month}-${day}`;
      }
      
      return cleaned;
    } catch (error) {
      return dateStr;
    }
  };

  // Handle paste and parse
  const handleParsePaste = () => {
    if (!pastedText.trim()) {
      toast({
        title: "No Data",
        description: "Please paste some data first",
        variant: "destructive",
      });
      return;
    }
    
    const parsed = parseTGSPDCLData(pastedText);
    
    if (Object.keys(parsed).length === 0) {
      toast({
        title: "No Data Extracted",
        description: "Could not extract bill data from the pasted text. Please check the format.",
        variant: "destructive",
      });
      return;
    }
    
    setParsedData(parsed);
    toast({
      title: "Data Parsed",
      description: `Extracted ${Object.keys(parsed).length} fields. Review and apply.`,
    });
  };

  // Apply parsed data to form
  const handleApplyParsedData = () => {
    if (!parsedData) return;
    
    setFormData(prev => ({
      ...prev,
      ...parsedData,
    }));
    
    setPastedText("");
    setParsedData(null);
    setPasteOpen(false);
    
    toast({
      title: "Data Applied",
      description: "Parsed data has been filled into the form. Review and save.",
    });
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
            ero: parsed.eroName || prev.ero,
            section: parsed.sectionName || prev.section,
            units: parsed.units || "",
            bill_date: parsed.billDate || "",
            due_date: parsed.dueDate || "",
            current_month_bill: parsed.currentMonthBill || "",
            acd_amount: parsed.acdAmount || "0",
            arrears: parsed.arrears || "0",
            total_amount: parsed.totalAmount || "",
          }));
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

  const tryAutoFetch = async () => {
    if (!formData.unique_service_number.trim()) {
      toast({
        title: "Missing Unique Service Number",
        description: "Please enter the Unique Service Number to auto-fetch bill",
        variant: "destructive",
      });
      return;
    }

    setAutoFetching(true);
    try {
      console.log('Attempting auto-fetch for:', formData.unique_service_number);
      
      const { data, error } = await supabase.functions.invoke('fetch-tgspdcl-payment', {
        body: {
          uniqueServiceNumber: formData.unique_service_number.trim(),
          serviceNumber: formData.service_number?.trim() || '',
          assetId: assetId,
          billMonth: new Date().toISOString().substring(0, 7), // Current month in YYYY-MM format
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Auto-fetch response:', data);

      if (data?.success && data?.billData) {
        // Auto-fill the form with fetched data
        setFormData(prev => ({
          ...prev,
          units: data.billData.units?.toString() || "",
          bill_date: data.billData.bill_date || "",
          due_date: data.billData.due_date || "",
          current_month_bill: data.billData.current_month_bill?.toString() || "",
          acd_amount: data.billData.acd_amount?.toString() || "0",
          arrears: data.billData.arrears?.toString() || "0",
          total_amount: data.billData.total_due?.toString() || "",
        }));

        toast({
          title: "Success!",
          description: "Bill details fetched and saved to database successfully",
        });

        // Call parent callback to refresh data
        onBillFetched?.();
      } else {
        throw new Error(data?.error || 'Failed to fetch bill details');
      }
    } catch (error: any) {
      console.error('Error auto-fetching bill:', error);
      toast({
        title: "Auto-Fetch Failed",
        description: error.message || "Could not retrieve bill details automatically. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setAutoFetching(false);
    }
  };

  const openTGSPDCLPortal = () => {
    window.open('https://tgsouthernpower.org/paybillonline', '_blank');
    toast({
      title: "Portal Opened",
      description: "Enter your Unique Service Number on the TGSPDCL portal, then copy the bill details here",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBill = async () => {
    // Validation
    if (!formData.unique_service_number.trim() || !formData.total_amount.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in Unique Service Number and Total Amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Parse bill month from bill_date (format: DD-MMM-YY)
      let billMonth = new Date().toISOString().slice(0, 7) + '-01';
      if (formData.bill_date) {
        try {
          const [day, monthStr, year] = formData.bill_date.split('-');
          const monthMap: Record<string, string> = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const month = monthMap[monthStr] || '01';
          const fullYear = `20${year}`;
          billMonth = `${fullYear}-${month}-01`;
        } catch (e) {
          console.error('Error parsing bill date:', e);
        }
      }

      // Parse due date (format: DD-MMM-YY)
      let dueDate = null;
      if (formData.due_date) {
        try {
          const [day, monthStr, year] = formData.due_date.split('-');
          const monthMap: Record<string, string> = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const month = monthMap[monthStr] || '01';
          const fullYear = `20${year}`;
          dueDate = `${fullYear}-${month}-${day.padStart(2, '0')}`;
        } catch (e) {
          console.error('Error parsing due date:', e);
        }
      }

      const billData = {
        asset_id: assetId,
        area: asset?.area || "",
        location: asset?.location || "",
        direction: asset?.direction || "",
        unique_service_number: formData.unique_service_number.trim(),
        service_number: formData.service_number.trim() || formData.unique_service_number.trim(),
        consumer_name: formData.consumer_name.trim(),
        ero: formData.ero.trim(),
        section_name: formData.section.trim(),
        units: parseFloat(formData.units) || 0,
        bill_month: billMonth,
        due_date: dueDate,
        current_month_bill: parseFloat(formData.current_month_bill) || 0,
        acd_amount: parseFloat(formData.acd_amount) || 0,
        arrears: parseFloat(formData.arrears) || 0,
        total_due: parseFloat(formData.total_amount) || 0,
        payment_link: `https://tgsouthernpower.org/paybillonline`,
        payment_status: 'Pending',
      };

      const { error } = await supabase
        .from('asset_power_bills')
        .upsert(billData, {
          onConflict: 'asset_id,bill_month'
        });

      if (error) throw error;

      toast({
        title: "Bill Saved Successfully",
        description: "Power bill details have been saved to the database",
      });

      setOpen(false);
      onBillFetched?.();
      
      // Reset form
      setFormData({
        consumer_name: "",
        unique_service_number: defaultServiceNumber || "",
        service_number: "",
        ero: "",
        section: "",
        units: "",
        bill_date: "",
        due_date: "",
        current_month_bill: "",
        acd_amount: "0",
        arrears: "0",
        total_amount: "",
      });
    } catch (error: any) {
      console.error('Error saving bill:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save bill data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Zap className="mr-2 h-4 w-4" />
          Fetch Bill from TGSPDCL
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fetch TGSPDCL Power Bill</DialogTitle>
          <DialogDescription>
            Open the TGSPDCL portal, enter your Unique Service Number, then copy the bill details here
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Paste Section */}
          <Collapsible open={pasteOpen} onOpenChange={setPasteOpen}>
            <div className="space-y-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 p-4 rounded-lg border-2 border-emerald-300 dark:border-emerald-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clipboard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <Label className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
                    📋 Quick Paste - Smart Data Entry
                  </Label>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {pasteOpen ? 'Hide' : 'Show'}
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Copy bill details from TGSPDCL and paste here. We'll auto-extract all fields for you!
              </p>

              <CollapsibleContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste Bill Data</Label>
                  <Textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your copied bill data here...&#10;Example:&#10;Units → 40&#10;Bill Date / Due Date → 05-Nov-25 / 19-Nov-25&#10;Current Month Bill → 982&#10;ACD Amount → 0&#10;Arrears → 0&#10;Total Amount to be Paid → 982.0"
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleParsePaste}
                    disabled={!pastedText.trim()}
                    variant="default"
                    className="flex-1"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Parse Data
                  </Button>
                  
                  {parsedData && (
                    <Button 
                      onClick={handleApplyParsedData}
                      variant="default"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Apply to Form
                    </Button>
                  )}
                </div>

                {/* Preview Section */}
                {parsedData && (
                  <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <Label className="font-semibold">Parsed Data Preview</Label>
                      <Badge variant="secondary">{Object.keys(parsedData).length} fields</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(parsedData).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex flex-col gap-1">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-semibold text-foreground">
                            {value || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      Review the extracted data above and click "Apply to Form" to fill the fields below
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Auto-Fetch Option */}
          <div className="space-y-3 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <Label className="text-base font-semibold text-blue-900 dark:text-blue-100">
              🚀 Try Auto-Fetch (Beta)
            </Label>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Enter your Unique Service Number below and try automatic bill fetching
            </p>
            <div className="flex gap-2">
              <Input
                value={formData.unique_service_number}
                onChange={(e) => handleInputChange('unique_service_number', e.target.value)}
                placeholder="Enter Unique Service Number"
                className="flex-1"
              />
              <Button 
                onClick={tryAutoFetch}
                disabled={autoFetching || !formData.unique_service_number}
                variant="default"
              >
                {autoFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Auto-Fetch
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter manually
              </span>
            </div>
          </div>

          {/* Step 1: Open Portal */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Step 1: Open TGSPDCL Portal</Label>
            <Button 
              onClick={openTGSPDCLPortal}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Open TGSPDCL Pay Bill Online Portal
            </Button>
            <p className="text-xs text-muted-foreground">
              Enter your Unique Service Number on the portal to view bill details
            </p>
          </div>

          <Separator />

          {/* Step 2: Consumer Details */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Step 2: Enter Consumer Details</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consumer_name">Consumer Name</Label>
                <Input
                  id="consumer_name"
                  value={formData.consumer_name}
                  onChange={(e) => handleInputChange('consumer_name', e.target.value)}
                  placeholder="e.g., KKRC Infrastructure Pvt Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unique_service_number">Unique Service Number *</Label>
                <Input
                  id="unique_service_number"
                  value={formData.unique_service_number}
                  onChange={(e) => handleInputChange('unique_service_number', e.target.value)}
                  placeholder="e.g., 114269004"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_number">Service Number</Label>
                <Input
                  id="service_number"
                  value={formData.service_number}
                  onChange={(e) => handleInputChange('service_number', e.target.value)}
                  placeholder="e.g., 21003 06546"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ero">ERO</Label>
                <Input
                  id="ero"
                  value={formData.ero}
                  onChange={(e) => handleInputChange('ero', e.target.value)}
                  placeholder="e.g., 15,GACHIBOWLI"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => handleInputChange('section', e.target.value)}
                  placeholder="e.g., VASANTH NAGAR"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 3: Bill Details */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Step 3: Enter Bill / Payment Details</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="units">Units</Label>
                <Input
                  id="units"
                  type="number"
                  value={formData.units}
                  onChange={(e) => handleInputChange('units', e.target.value)}
                  placeholder="e.g., 28"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_month_bill">Current Month Bill (₹)</Label>
                <Input
                  id="current_month_bill"
                  type="number"
                  step="0.01"
                  value={formData.current_month_bill}
                  onChange={(e) => handleInputChange('current_month_bill', e.target.value)}
                  placeholder="e.g., 826"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill_date">Bill Date</Label>
                <Input
                  id="bill_date"
                  value={formData.bill_date}
                  onChange={(e) => handleInputChange('bill_date', e.target.value)}
                  placeholder="DD-MMM-YY (e.g., 07-Nov-25)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  placeholder="DD-MMM-YY (e.g., 21-Nov-25)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acd_amount">ACD Amount (₹)</Label>
                <Input
                  id="acd_amount"
                  type="number"
                  step="0.01"
                  value={formData.acd_amount}
                  onChange={(e) => handleInputChange('acd_amount', e.target.value)}
                  placeholder="e.g., 0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrears">Arrears (₹)</Label>
                <Input
                  id="arrears"
                  type="number"
                  step="0.01"
                  value={formData.arrears}
                  onChange={(e) => handleInputChange('arrears', e.target.value)}
                  placeholder="e.g., 0"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="total_amount" className="text-base font-semibold">
                  Total Amount to be Paid (₹) *
                </Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => handleInputChange('total_amount', e.target.value)}
                  placeholder="e.g., 826.0"
                  className="text-lg font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSaveBill}
              disabled={loading || !formData.unique_service_number || !formData.total_amount}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Bill Details
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Instructions</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Click "Open TGSPDCL Portal" to access the bill payment page</li>
              <li>• Enter your Unique Service Number and click Submit on the portal</li>
              <li>• Copy the Consumer Details and Bill/Payment Details shown on the portal</li>
              <li>• Paste the values into this form and click "Save Bill Details"</li>
              <li>• Date format: DD-MMM-YY (e.g., 07-Nov-25)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
