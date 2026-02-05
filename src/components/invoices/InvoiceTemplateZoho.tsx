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
 
 function getTermsLabel(termsMode: string, termsDays: number): string {
   switch (termsMode) {
     case 'DUE_ON_RECEIPT': return 'Due on Receipt';
     case 'NET_30': return '30 Net Days';
     case 'NET_45': return '45 Net Days';
     case 'CUSTOM': return `${termsDays} Net Days`;
     default: return 'Due on Receipt';
   }
 }
 
 function getDocumentTitle(invoiceType: string): string {
   return invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
 }
 
 function numberToWords(num: number): string {
   const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
   const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
   if (num === 0) return 'Zero';
   const crore = Math.floor(num / 10000000); num %= 10000000;
   const lakh = Math.floor(num / 100000); num %= 100000;
   const thousand = Math.floor(num / 1000); num %= 1000;
   const hundred = Math.floor(num / 100); num %= 100;
   const ten = Math.floor(num / 10);
   const one = num % 10;
   let words = '';
   if (crore > 0) words += (crore < 20 ? ones[crore] : tens[Math.floor(crore / 10)] + ' ' + ones[crore % 10]).trim() + ' Crore ';
   if (lakh > 0) words += (lakh < 20 ? ones[lakh] : tens[Math.floor(lakh / 10)] + ' ' + ones[lakh % 10]).trim() + ' Lakh ';
   if (thousand > 0) words += (thousand < 20 ? ones[thousand] : tens[Math.floor(thousand / 10)] + ' ' + ones[thousand % 10]).trim() + ' Thousand ';
   if (hundred > 0) words += ones[hundred] + ' Hundred ';
   if (ten > 1) words += tens[ten] + ' ' + ones[one];
   else if (ten === 1 || one > 0) words += ones[ten * 10 + one];
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
       const { data: invoice, error: invoiceError } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
       if (invoiceError || !invoice) throw new Error('Invoice not found');
       const { data: client } = await supabase.from('clients').select('*').eq('id', invoice.client_id).single();
       const { data: company } = await supabase.from('companies').select('*').eq('id', invoice.company_id).single();
       let campaign = null;
       if (invoice.campaign_id) {
         const { data: campaignData } = await supabase.from('campaigns').select('*').eq('id', invoice.campaign_id).single();
         campaign = campaignData;
       }
       const items = Array.isArray(invoice.items) ? invoice.items : [];
       setData({ invoice, client, company, campaign, items });
     } catch (error) {
       console.error('Error fetching invoice data:', error);
     } finally {
       setLoading(false);
     }
   };
 
   if (loading) return <div className="flex items-center justify-center p-8"><p className="text-muted-foreground">Loading invoice...</p></div>;
   if (!data) return <div className="flex items-center justify-center p-8"><p className="text-muted-foreground">Invoice not found</p></div>;
 
   const { invoice, client, company, campaign, items } = data;
   const invoiceType = invoice.invoice_type || 'TAX_INVOICE';
   const termsLabel = getTermsLabel(invoice.terms_mode || 'DUE_ON_RECEIPT', invoice.terms_days || 0);
   const subtotal = parseFloat(invoice.sub_total) || 0;
   const cgst = invoice.cgst_amount || (invoice.gst_amount ? invoice.gst_amount / 2 : 0);
   const sgst = invoice.sgst_amount || (invoice.gst_amount ? invoice.gst_amount / 2 : 0);
   const igst = invoice.igst_amount || 0;
   const grandTotal = parseFloat(invoice.total_amount) || subtotal;
   const balanceDue = parseFloat(invoice.balance_due) || grandTotal;
   const clientName = client?.name || 'Client';
   const clientAddress = [client?.billing_address_line1 || '', [client?.billing_city, client?.billing_state].filter(Boolean).join(', ')].filter(Boolean).join('\n');
   const clientGstin = client?.gstin || '';
 
   return (
     <div className="bg-white text-black p-6 space-y-4 max-w-4xl mx-auto print:p-0 font-sans text-sm">
       <div className="border border-border">
         <div className="flex items-start p-4">
           <div className="flex-shrink-0 w-24">{company?.logo_url && <img src={company.logo_url} alt={company.name} className="w-20 h-20 object-contain" />}</div>
           <div className="flex-1 text-center text-xs px-4">
             <h1 className="text-lg font-bold text-primary mb-1">{company?.name || 'Matrix Network Solutions'}</h1>
             <p>{company?.address_line1 || 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,'}</p>
             <p>{company?.city || 'HYDERABAD'} {company?.pincode || '500016'}, {company?.state || 'Telangana'} India</p>
             <p>Phone: {company?.phone || '+91 9666 444 888'}</p>
             <p className="font-semibold mt-1">GSTIN: {company?.gstin || '36AATFM4107H2Z3'}</p>
           </div>
           <div className="flex-shrink-0 w-40 text-right"><h2 className="text-xl font-bold text-primary">{getDocumentTitle(invoiceType)}</h2></div>
         </div>
       </div>
 
       <div className="grid grid-cols-2 gap-4 text-xs">
         <div className="space-y-1">
           <div className="flex"><span className="w-24">Invoice No</span><span className="font-bold">: {invoice.invoice_no || invoice.id}</span></div>
           <div className="flex"><span className="w-24">Invoice Date</span><span className="font-bold">: {formatDate(invoice.invoice_date)}</span></div>
           <div className="flex"><span className="w-24">Terms</span><span className="font-bold">: {termsLabel}</span></div>
           <div className="flex"><span className="w-24">Due Date</span><span className="font-bold">: {formatDate(invoice.due_date)}</span></div>
         </div>
         <div className="space-y-1">
           <div className="flex"><span className="w-28">Place Of Supply</span><span className="font-bold">: {client?.billing_state || 'Telangana'} (36)</span></div>
           <div className="flex"><span className="w-28">Sales person</span><span className="font-bold">: {invoice.sales_person || 'Raghunath Gajula'}</span></div>
         </div>
       </div>
 
       <div className="grid grid-cols-2 gap-4 text-xs">
         <div className="border border-border">
           <div className="bg-primary text-primary-foreground px-3 py-1.5 font-bold">Bill To</div>
           <div className="p-3"><p className="font-bold">{clientName}</p><p className="whitespace-pre-line text-muted-foreground">{clientAddress}</p>{clientGstin && <p className="font-semibold mt-1">GSTIN: {clientGstin}</p>}</div>
         </div>
         <div className="border border-border">
           <div className="bg-primary text-primary-foreground px-3 py-1.5 font-bold">Ship To</div>
           <div className="p-3"><p className="font-bold">{clientName}</p><p className="whitespace-pre-line text-muted-foreground">{clientAddress}</p>{clientGstin && <p className="font-semibold mt-1">GSTIN: {clientGstin}</p>}</div>
         </div>
       </div>
 
       {campaign && <div className="text-xs font-bold text-primary">Campaign: {campaign.campaign_name} ({formatDate(campaign.start_date)} to {formatDate(campaign.end_date)})</div>}
 
       <div className="border border-border">
         <table className="w-full text-xs">
           <thead className="bg-primary text-primary-foreground">
             <tr>
               <th className="p-2 text-left w-8">#</th>
               <th className="p-2 text-left">LOCATION & DESCRIPTION</th>
               <th className="p-2 text-center w-24">SIZE</th>
               <th className="p-2 text-center w-28">BOOKING</th>
               <th className="p-2 text-right w-32">PRICING</th>
               <th className="p-2 text-right w-24">LINE TOTAL</th>
             </tr>
           </thead>
           <tbody>
             {items.map((item: any, index: number) => {
               const assetCode = formatAssetDisplayCode({ mediaAssetCode: item.media_asset_code || item.asset_code, fallbackId: item.asset_id, companyName: company?.name });
               const billableDays = item.billable_days || 0;
               const rentAmount = item.rent_amount || item.rate || 0;
               const printingCharges = item.printing_charges || 0;
               const mountingCharges = item.mounting_charges || 0;
               const lineTotal = item.total || item.amount || 0;
               return (
                 <tr key={index} className="border-t border-border">
                   <td className="p-2 align-top">{index + 1}</td>
                   <td className="p-2 align-top">
                     <div className="font-medium">[{assetCode}]</div>
                     <div className="text-muted-foreground text-[10px]">
                       <div>Location: {item.location || '-'}</div>
                       <div>Direction: {item.direction || '-'} | Area: {item.area || '-'}</div>
                       <div>Media: {item.media_type || '-'} | Lit: {item.illumination_type || '-'}</div>
                       <div>HSN/SAC: 998361</div>
                     </div>
                   </td>
                   <td className="p-2 text-center align-top text-[10px]"><div>Dim: {item.dimensions || '-'}</div><div>Sqft: {item.total_sqft || '-'}</div></td>
                   <td className="p-2 text-center align-top text-[10px]">{item.start_date && <div>{formatDate(item.start_date)}</div>}{item.end_date && <div>to {formatDate(item.end_date)}</div>}<div className="font-medium">{billableDays} Days</div></td>
                   <td className="p-2 text-right align-top text-[10px]"><div>Display: {formatINR(rentAmount)}</div>{printingCharges > 0 && <div>P: {formatINR(printingCharges)}</div>}{mountingCharges > 0 && <div>M: {formatINR(mountingCharges)}</div>}</td>
++ <td className="p-2 text-right align-top text-[10px]"><div>Display: {formatINR(rentAmount)}</div>{printingCharges > 0 && <div>Printing : {formatINR(printingCharges)}</div>}{mountingCharges > 0 && <div>Installation : {formatINR(mountingCharges)}</div>}</td>
                   <td className="p-2 text-right align-top font-medium">{formatINR(lineTotal)}</td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       </div>
 
       <div className="grid grid-cols-2 gap-4 text-xs">
         <div className="border border-border p-3">
           <h3 className="font-bold text-primary mb-2">Bank Details</h3>
           <p>HDFC Bank Limited</p><p>Account No: 50200010727301</p><p>IFSC Code: HDFC0001555</p>
         </div>
         <div className="border border-border p-3">
           <table className="w-full">
             <tbody>
               <tr><td className="py-1">Sub Total</td><td className="py-1 text-right font-medium">{formatINR(subtotal)}</td></tr>
               {igst > 0 ? <tr><td className="py-1">IGST @ 18%</td><td className="py-1 text-right">{formatINR(igst)}</td></tr> : <><tr><td className="py-1">CGST @ 9%</td><td className="py-1 text-right">{formatINR(cgst)}</td></tr><tr><td className="py-1">SGST @ 9%</td><td className="py-1 text-right">{formatINR(sgst)}</td></tr></>}
               <tr className="border-t border-border"><td className="py-2 font-bold">Total</td><td className="py-2 text-right font-bold text-lg">{formatINR(grandTotal)}</td></tr>
               <tr><td className="py-1 font-bold text-destructive">Balance Due</td><td className="py-1 text-right font-bold text-destructive">{formatINR(balanceDue)}</td></tr>
             </tbody>
           </table>
         </div>
       </div>
 
       <div className="text-xs border-t border-border pt-2"><span className="font-semibold">Total (In Words): </span><span>{numberToWords(Math.round(grandTotal))}</span></div>
       <div className="pt-6 text-right text-xs"><p className="mb-8">For,</p><p className="font-bold">{company?.name || 'Matrix Network Solutions'}</p><p className="border-t border-border inline-block pt-1 px-4 mt-4">Authorized Signatory</p></div>
     </div>
   );
 }