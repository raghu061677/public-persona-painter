import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatINR } from '@/utils/finance';
import { formatDate } from '@/utils/plans';

interface InvoiceTemplateZohoProps {
  invoiceId: string;
  readOnly?: boolean;
}

interface InvoiceData {
  invoice: any;
  client: any;
  company: any;
  campaign: any;
  items: any[];
}

// Helper to get terms label
function getTermsLabel(termsMode: string, termsDays: number): string {
  switch (termsMode) {
    case 'DUE_ON_RECEIPT': return 'Due on Receipt';
    case 'NET_30': return '30 Net Days';
    case 'NET_45': return '45 Net Days';
    case 'CUSTOM': return `${termsDays} Net Days`;
    default: return 'Due on Receipt';
  }
}

// Helper to get document title
function getDocumentTitle(invoiceType: string): string {
  return invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
}

export function InvoiceTemplateZoho({ invoiceId, readOnly = false }: InvoiceTemplateZohoProps) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      // Fetch invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) throw new Error('Invoice not found');

      // Fetch client
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', invoice.client_id)
        .single();

      // Fetch company
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', invoice.company_id)
        .single();

      // Fetch campaign if exists
      let campaign = null;
      if (invoice.campaign_id) {
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', invoice.campaign_id)
          .single();
        campaign = campaignData;
      }

      // Parse items
      const items = Array.isArray(invoice.items) ? invoice.items : [];

      setData({ invoice, client, company, campaign, items });
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  const { invoice, client, company, campaign, items } = data;
  const invoiceType = invoice.invoice_type || 'TAX_INVOICE';
  const termsMode = invoice.terms_mode || 'DUE_ON_RECEIPT';
  const termsDays = invoice.terms_days || 0;
  const termsLabel = getTermsLabel(termsMode, termsDays);

  // Calculate totals
  const subtotal = parseFloat(invoice.sub_total) || 0;
  const cgst = invoice.cgst_amount || (invoice.gst_amount ? invoice.gst_amount / 2 : subtotal * 0.09);
  const sgst = invoice.sgst_amount || (invoice.gst_amount ? invoice.gst_amount / 2 : subtotal * 0.09);
  const igst = invoice.igst_amount || 0;
  const grandTotal = parseFloat(invoice.total_amount) || (subtotal + cgst + sgst + igst);
  const balanceDue = parseFloat(invoice.balance_due) || grandTotal;

  return (
    <div className="bg-background p-6 space-y-6 max-w-4xl mx-auto print:p-0">
      {/* Header with Company Info and Document Title */}
      <div className="flex justify-between items-start">
        {/* Company Logo & Details */}
        <div className="flex gap-4">
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{company?.name || 'Matrix Network Solutions'}</h1>
            <p className="text-sm text-muted-foreground">
              {company?.address_line1 || 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,'}
            </p>
            <p className="text-sm text-muted-foreground">
              {company?.city || 'Hyderabad'}, {company?.state || 'Telangana'} {company?.pincode || '500016'}
            </p>
            <p className="text-sm text-muted-foreground">
              GSTIN: {company?.gstin || '36AATFM4107H2Z3'}
            </p>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-right">
          <h2 className="text-2xl font-bold text-primary">
            {getDocumentTitle(invoiceType)}
          </h2>
          <Badge variant={invoiceType === 'PROFORMA' ? 'secondary' : 'default'}>
            {invoiceType.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Bill To / Invoice Details Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bill To */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Bill To</h3>
          <p className="font-bold">{client?.name || client?.company || 'Client'}</p>
          <p className="text-sm text-muted-foreground">
            {client?.billing_address_line1 || client?.address || ''}
          </p>
          <p className="text-sm text-muted-foreground">
            {[client?.billing_city || client?.city, client?.billing_state || client?.state, client?.billing_pincode || client?.pincode].filter(Boolean).join(', ')}
          </p>
          {client?.gst_number && (
            <p className="text-sm font-medium mt-2">GSTIN: {client.gst_number}</p>
          )}
        </Card>

        {/* Invoice Details */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2 text-muted-foreground">
            {invoiceType === 'PROFORMA' ? 'Proforma Invoice Details' : 'Invoice Details'}
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {invoiceType === 'PROFORMA' ? 'Proforma #:' : 'Invoice No:'}
              </span>
              <span className="font-bold">{invoice.invoice_no || invoice.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{formatDate(invoice.invoice_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span>{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms:</span>
              <span className="font-medium">{termsLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Place of Supply:</span>
              <span>{invoice.place_of_supply || client?.billing_state || 'Telangana'} (36)</span>
            </div>
            {invoice.sales_person && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales Person:</span>
                <span>{invoice.sales_person}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Campaign Info */}
      {campaign && (
        <div className="bg-muted/30 p-3 rounded-md">
          <span className="font-semibold text-primary">Campaign: </span>
          <span>{campaign.campaign_name}</span>
          {campaign.start_date && campaign.end_date && (
            <span className="text-muted-foreground ml-4">
              ({formatDate(campaign.start_date)} to {formatDate(campaign.end_date)})
            </span>
          )}
        </div>
      )}

      {/* Line Items Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="p-2 text-left w-10">#</th>
              <th className="p-2 text-left">LOCATION & DESCRIPTION</th>
              <th className="p-2 text-center">SIZE</th>
              <th className="p-2 text-center">BOOKING</th>
              <th className="p-2 text-right">UNIT PRICE</th>
              <th className="p-2 text-right">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, index: number) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="p-2 align-top">{index + 1}</td>
                <td className="p-2 align-top">
                  <div className="font-medium">[{item.asset_id}] {item.location || item.description}</div>
                  <div className="text-muted-foreground text-xs">
                    {item.area && <span>Area: {item.area} </span>}
                    {item.media_type && <span>Media: {item.media_type} </span>}
                    {item.direction && <span>Route: {item.direction}</span>}
                  </div>
                </td>
                <td className="p-2 text-center align-top">
                  <div>{item.dimensions || 'N/A'}</div>
                  {item.total_sqft && <div className="text-xs text-muted-foreground">Sqft: {item.total_sqft}</div>}
                </td>
                <td className="p-2 text-center align-top text-xs">
                  {item.start_date && (
                    <div>From: {formatDate(item.start_date)}</div>
                  )}
                  {item.end_date && (
                    <div>To: {formatDate(item.end_date)}</div>
                  )}
                </td>
                <td className="p-2 text-right align-top">
                  {formatINR(item.rate || item.unit_price || item.negotiated_rate || item.card_rate || 0)}
                </td>
                <td className="p-2 text-right align-top font-medium">
                  {formatINR(item.amount || item.final_price || item.subtotal || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bank Details */}
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Bank Details</h3>
          <div className="text-sm space-y-1">
            <p className="font-medium">HDFC Bank Limited</p>
            <p className="text-muted-foreground">Branch: Karkhana Road, Secunderabad – 500009</p>
            <p className="text-muted-foreground">Account No: 50200010727301</p>
            <p className="text-muted-foreground">IFSC Code: HDFC0001555</p>
            <p className="text-muted-foreground">MICR: 500240026</p>
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Sub Total</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {igst > 0 ? (
              <div className="flex justify-between">
                <span>IGST @ 18%</span>
                <span>{formatINR(igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>CGST @ 9%</span>
                  <span>{formatINR(cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST @ 9%</span>
                  <span>{formatINR(sgst)}</span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatINR(grandTotal)}</span>
            </div>
            {invoiceType === 'TAX_INVOICE' && (
              <div className="flex justify-between font-bold text-orange-600">
                <span>Balance Due</span>
                <span>{formatINR(balanceDue)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Payment Terms */}
      <div className="text-sm">
        <span className="font-semibold">Payment Terms: </span>
        <span>{termsLabel}</span>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="text-sm">
          <span className="font-semibold">Notes: </span>
          <span className="text-muted-foreground">{invoice.notes}</span>
        </div>
      )}
    </div>
  );
}
