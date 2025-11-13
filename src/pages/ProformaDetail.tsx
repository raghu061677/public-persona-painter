import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Building2, FileText, IndianRupee } from "lucide-react";
import { ProformaPDFButton } from "@/components/proforma/ProformaPDFButton";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface ProformaInvoice {
  id: string;
  proforma_number: string;
  proforma_date: string;
  reference_plan_id?: string;
  client_name: string;
  client_gstin?: string;
  client_address?: string;
  client_state?: string;
  plan_name?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  subtotal: number;
  printing_total: number;
  mounting_total: number;
  discount_total: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_tax: number;
  grand_total: number;
  status: string;
  additional_notes?: string;
}

interface ProformaItem {
  id: string;
  asset_id: string;
  display_name: string;
  area: string;
  location: string;
  direction: string;
  dimension_width: number;
  dimension_height: number;
  total_sqft: number;
  illumination_type: string;
  negotiated_rate: number;
  discount: number;
  printing_charge: number;
  mounting_charge: number;
  line_total: number;
}

const ProformaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [proforma, setProforma] = useState<ProformaInvoice | null>(null);
  const [items, setItems] = useState<ProformaItem[]>([]);

  useEffect(() => {
    if (id) {
      fetchProformaDetails();
    }
  }, [id]);

  const fetchProformaDetails = async () => {
    try {
      // Fetch proforma invoice
      const { data: proformaData, error: proformaError } = await supabase
        .from('proforma_invoices')
        .select('*')
        .eq('id', id)
        .single() as any;

      if (proformaError) throw proformaError;
      setProforma(proformaData);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select('*')
        .eq('proforma_invoice_id', id)
        .order('created_at') as any;

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

    } catch (error) {
      console.error('Error fetching proforma details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load proforma invoice details."
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'accepted': return 'default'; // Changed from 'success'
      case 'expired': return 'destructive';
      case 'converted': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading proforma invoice...</div>
      </div>
    );
  }

  if (!proforma) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Proforma invoice not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/proformas')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Proforma Invoice</h1>
            <p className="text-muted-foreground">{proforma.proforma_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(proforma.status)}>
            {proforma.status.toUpperCase()}
          </Badge>
          <ProformaPDFButton proformaId={proforma.id} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proforma Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(proforma.proforma_date).toLocaleDateString('en-IN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{proforma.client_name}</div>
            {proforma.client_gstin && (
              <p className="text-xs text-muted-foreground truncate">
                GSTIN: {proforma.client_gstin}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reference</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {proforma.reference_plan_id || 'N/A'}
            </div>
            {proforma.plan_name && (
              <p className="text-xs text-muted-foreground truncate">{proforma.plan_name}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{proforma.grand_total.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Details */}
      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">{proforma.client_name}</p>
            </div>
            {proforma.client_gstin && (
              <div>
                <p className="text-sm font-medium">GSTIN</p>
                <p className="text-sm text-muted-foreground">{proforma.client_gstin}</p>
              </div>
            )}
            {proforma.client_state && (
              <div>
                <p className="text-sm font-medium">State</p>
                <p className="text-sm text-muted-foreground">{proforma.client_state}</p>
              </div>
            )}
            {proforma.client_address && (
              <div className="col-span-2">
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{proforma.client_address}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items ({items.length})</CardTitle>
          <CardDescription>Media assets included in this proforma invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Asset ID</th>
                  <th className="text-left p-2">Display Name</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-right p-2">Rate</th>
                  <th className="text-right p-2">Discount</th>
                  <th className="text-right p-2">Printing</th>
                  <th className="text-right p-2">Mounting</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-mono text-sm">{item.asset_id}</td>
                    <td className="p-2">{item.display_name}</td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {item.area}, {item.location}
                    </td>
                    <td className="p-2 text-right">₹{item.negotiated_rate.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-right text-red-600">
                      {item.discount > 0 ? `-₹${item.discount.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-2 text-right">
                      {item.printing_charge > 0 ? `₹${item.printing_charge.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-2 text-right">
                      {item.mounting_charge > 0 ? `₹${item.mounting_charge.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-2 text-right font-bold">₹{item.line_total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">₹{proforma.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Printing Charges:</span>
              <span className="font-medium">₹{proforma.printing_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Mounting Charges:</span>
              <span className="font-medium">₹{proforma.mounting_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span className="font-medium">-₹{proforma.discount_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>Taxable Amount:</span>
              <span className="font-medium">₹{proforma.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>CGST @ 9%:</span>
              <span>₹{proforma.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>SGST @ 9%:</span>
              <span>₹{proforma.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Grand Total:</span>
              <span>₹{proforma.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {proforma.additional_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {proforma.additional_notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProformaDetail;