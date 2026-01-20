import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatINR } from '@/utils/finance';
import { formatDate } from '@/utils/plans';
import { formatAssetDisplayCode } from '@/lib/assets/formatAssetDisplayCode';

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

// Convert number to words for Indian currency
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;
  const ten = Math.floor(num / 10);
  const one = num % 10;

  let words = '';

  if (crore > 0) {
    words += (crore < 20 ? ones[crore] : tens[Math.floor(crore / 10)] + ' ' + ones[crore % 10]).trim() + ' Crore ';
  }
  if (lakh > 0) {
    words += (lakh < 20 ? ones[lakh] : tens[Math.floor(lakh / 10)] + ' ' + ones[lakh % 10]).trim() + ' Lakh ';
  }
  if (thousand > 0) {
    words += (thousand < 20 ? ones[thousand] : tens[Math.floor(thousand / 10)] + ' ' + ones[thousand % 10]).trim() + ' Thousand ';
  }
  if (hundred > 0) {
    words += ones[hundred] + ' Hundred ';
  }
  if (ten > 1) {
    words += tens[ten] + ' ' + ones[one];
  } else if (ten === 1 || one > 0) {
    words += ones[ten * 10 + one];
  }

  return words.trim() + ' Rupees Only';
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

  const clientName = client?.name || client?.company || 'Client';
  const clientAddress = [
    client?.billing_address_line1 || client?.address || '',
    [client?.billing_city || client?.city, client?.billing_state || client?.state].filter(Boolean).join(', '),
  ].filter(Boolean).join('\n');
  const clientGstin = client?.gstin || client?.gst_number || '';

  return (
    <div className="bg-white text-black p-6 space-y-4 max-w-4xl mx-auto print:p-0 font-sans text-sm">
      {/* ========== HEADER SECTION - Zoho Style: Logo LEFT | Company CENTER | Title RIGHT ========== */}
      <div className="border border-border">
        <div className="flex items-start p-4">
          {/* LEFT: Company Logo */}
          <div className="flex-shrink-0 w-24">
            {company?.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="w-20 h-20 object-contain"
              />
            )}
          </div>

          {/* CENTER: Company Details */}
          <div className="flex-1 text-center text-xs px-4">
            <h1 className="text-lg font-bold text-primary mb-1">{company?.name || 'Matrix Network Solutions'}</h1>
            <p className="text-muted-foreground">{company?.name || 'Matrix Network Solutions'}</p>
            <p>{company?.address_line1 || 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,'}</p>
            <p>{company?.address_line2 || 'Near Begumpet Metro Station, Opp Country Club, Begumpet,'}</p>
            <p>{company?.city || 'HYDERABAD'} {company?.pincode || '500016'}, {company?.state || 'Telangana'} India</p>
            <p>Phone: {company?.phone || '+91 9666 444 888'}</p>
            <p>{company?.email || 'info@matrix-networksolutions.com'}</p>
            <p>{company?.website || 'www.matrixnetworksolutions.in'}</p>
            <p className="font-semibold mt-1">GSTIN: {company?.gstin || '36AATFM4107H2Z3'}</p>
          </div>

          {/* RIGHT: Document Title - aligned with GSTIN level */}
          <div className="flex-shrink-0 w-40 text-right flex flex-col justify-end h-full">
            <h2 className="text-xl font-bold text-primary tracking-wide mt-auto">
              {getDocumentTitle(invoiceType)}
            </h2>
          </div>
        </div>
      </div>

      {/* ========== INVOICE DETAILS ROW ========== */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        {/* Left Column */}
        <div className="space-y-1">
          <div className="flex">
            <span className="w-24">{invoiceType === 'PROFORMA' ? 'Proforma No' : 'Invoice No'}</span>
            <span className="font-bold">: {invoice.invoice_no || invoice.id}</span>
          </div>
          <div className="flex">
            <span className="w-24">Invoice Date</span>
            <span className="font-bold">: {formatDate(invoice.invoice_date)}</span>
          </div>
          <div className="flex">
            <span className="w-24">Terms</span>
            <span className="font-bold">: {termsLabel}</span>
          </div>
          <div className="flex">
            <span className="w-24">Due Date</span>
            <span className="font-bold">: {formatDate(invoice.due_date || invoice.invoice_date)}</span>
          </div>
          <div className="flex">
            <span className="w-24">HSN/SAC Code</span>
            <span className="font-bold">: 998361</span>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28">Place Of Supply</span>
            <span className="font-bold">: {invoice.place_of_supply || client?.billing_state || 'Telangana'} (36)</span>
          </div>
          <div className="flex">
            <span className="w-28">Sales person</span>
            <span className="font-bold">: {invoice.sales_person || 'Raghunath Gajula'}</span>
          </div>
        </div>
      </div>

      {/* ========== BILL TO / SHIP TO SECTION ========== */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        {/* Bill To */}
        <div className="border border-border">
          <div className="bg-primary text-primary-foreground px-3 py-1.5 font-bold">Bill To</div>
          <div className="p-3">
            <p className="font-bold">{clientName}</p>
            <p className="whitespace-pre-line text-muted-foreground">{clientAddress}</p>
            <p>India</p>
            {clientGstin && <p className="font-semibold mt-1">GSTIN: {clientGstin}</p>}
          </div>
        </div>
        
        {/* Ship To */}
        <div className="border border-border">
          <div className="bg-primary text-primary-foreground px-3 py-1.5 font-bold">Ship To</div>
          <div className="p-3">
            <p className="font-bold">{clientName}</p>
            <p className="whitespace-pre-line text-muted-foreground">{clientAddress}</p>
            <p>India</p>
            {clientGstin && <p className="font-semibold mt-1">GSTIN: {clientGstin}</p>}
          </div>
        </div>
      </div>

      {/* Campaign Header if exists */}
      {campaign && (
        <div className="text-xs font-bold text-primary flex items-center gap-2">
          <span>Campaign: {campaign.campaign_name}</span>
          <span className="flex-1 border-b border-dotted border-muted-foreground mx-2" />
          <span>Campaign Duration: ({formatDate(campaign.start_date)} to {formatDate(campaign.end_date)})</span>
        </div>
      )}

      {/* Line Items Table */}
      <div className="border border-border">
        <table className="w-full text-xs">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="p-2 text-left w-8 border-r border-primary-foreground/30">#</th>
              <th className="p-2 text-left border-r border-primary-foreground/30">LOCATION & DESCRIPTION</th>
              <th className="p-2 text-center w-28 border-r border-primary-foreground/30">SIZE</th>
              <th className="p-2 text-center w-32 border-r border-primary-foreground/30">BOOKING</th>
              <th className="p-2 text-right w-24 border-r border-primary-foreground/30">UNIT PRICE</th>
              <th className="p-2 text-right w-24">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, index: number) => {
              const litType = item.illumination_type || item.lit_type || 'N/A';
              return (
                <tr key={index} className="border-t border-border">
                  <td className="p-2 align-top border-r border-border">{index + 1}</td>
                  <td className="p-2 align-top border-r border-border">
                    <div className="font-medium">[{formatAssetDisplayCode({ mediaAssetCode: item.media_asset_code, fallbackId: item.asset_id, companyName: data?.company?.name })}] {item.location || item.description}</div>
                    <div className="text-muted-foreground">
                      {item.area && <span>Area: {item.area} </span>}
                      {item.media_type && <span>Media: {item.media_type} </span>}
                      {item.direction && <span>Route: {item.direction} </span>}
                      <span>Lit: {litType}</span>
                    </div>
                    <div className="text-muted-foreground">HSN/SAC Code: 998361</div>
                  </td>
                  <td className="p-2 text-center align-top border-r border-border">
                    <div>Dimension: {item.dimensions || 'N/A'}</div>
                    {item.total_sqft && <div>Total Sqft: {item.total_sqft}</div>}
                  </td>
                  <td className="p-2 text-center align-top border-r border-border">
                    {item.start_date && <div>From: {formatDate(item.start_date)}</div>}
                    {item.end_date && <div>To: {formatDate(item.end_date)}</div>}
                    <div>Duration: 1 Month</div>
                  </td>
                  <td className="p-2 text-right align-top border-r border-border">
                    {formatINR(item.rate || item.unit_price || item.negotiated_rate || item.card_rate || 0)}
                  </td>
                  <td className="p-2 text-right align-top font-medium">
                    {formatINR(item.amount || item.final_price || item.subtotal || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bank Details & Totals Section */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        {/* Bank Details */}
        <div className="border border-border p-3">
          <h3 className="font-bold text-primary mb-2">Bank Details</h3>
          <table className="w-full">
            <tbody>
              <tr><td colSpan={2} className="font-semibold">HDFC Bank Limited</td></tr>
              <tr><td colSpan={2}>Branch: Karkhana Road, Secunderabad – 500009</td></tr>
              <tr><td colSpan={2}>Account No: 50200010727301</td></tr>
              <tr><td colSpan={2}>IFSC Code: HDFC0001555</td></tr>
              <tr><td colSpan={2}>MICR: 500240026</td></tr>
            </tbody>
          </table>
        </div>

        {/* Summary Totals */}
        <div className="border border-border p-3">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="py-1">Sub Total</td>
                <td className="py-1 text-right font-medium">{formatINR(subtotal)}</td>
              </tr>
              {igst > 0 ? (
                <tr>
                  <td className="py-1">IGST @ 18%</td>
                  <td className="py-1 text-right">{formatINR(igst)}</td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td className="py-1">CGST @ 9%</td>
                    <td className="py-1 text-right">{formatINR(cgst)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">SGST @ 9%</td>
                    <td className="py-1 text-right">{formatINR(sgst)}</td>
                  </tr>
                </>
              )}
              <tr className="border-t border-border">
                <td className="py-2 font-bold">Total</td>
                <td className="py-2 text-right font-bold text-lg">{formatINR(grandTotal)}</td>
              </tr>
              {invoiceType === 'TAX_INVOICE' && (
                <tr className="border-t border-border">
                  <td className="py-1 font-bold text-orange-600">Balance Due</td>
                  <td className="py-1 text-right font-bold text-orange-600">{formatINR(balanceDue)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total in Words */}
      <div className="text-xs border-t border-border pt-2">
        <span className="font-semibold">Total (In Words): </span>
        <span>{numberToWords(Math.round(grandTotal))}</span>
      </div>

      {/* Payment Terms */}
      <div className="border-t border-border pt-3">
        <h3 className="font-bold text-primary mb-1">Payment Terms</h3>
        <p className="text-xs">{termsLabel}</p>
      </div>

      {/* Terms & Conditions */}
      <div className="border-t border-border pt-3">
        <h3 className="font-bold text-primary mb-2">Terms & Conditions:</h3>
        <ol className="text-xs list-decimal pl-4 space-y-1">
          <li>Advance Payment & Purchase Order is Mandatory to start the campaign.</li>
          <li>Printing & Mounting will be extra & GST @ 18% will be applicable extra.</li>
          <li>Site available date may change in case of present display Renewal.</li>
          <li>Site Availability changes every minute, please double check site available dates when you confirm the sites.</li>
          <li>Campaign Execution takes 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.</li>
          <li>Kindly ensure that your artwork is ready before confirming the sites.</li>
          <li>In case flex / vinyl / display material is damaged, torn or vandalised, it will be your responsibility to provide us with new flex.</li>
          <li>Renewal of site will only be entertained before 10 days of site expiry.</li>
        </ol>
      </div>

      {/* Signature */}
      <div className="pt-6 text-right text-xs">
        <p className="mb-8">For,</p>
        <p className="font-bold">{company?.name || 'Matrix Network Solutions'}</p>
        <p className="border-t border-border inline-block pt-1 px-4 mt-4">Authorized Signatory</p>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="text-xs border-t border-border pt-2">
          <span className="font-semibold">Notes: </span>
          <span className="text-muted-foreground">{invoice.notes}</span>
        </div>
      )}
    </div>
  );
}
