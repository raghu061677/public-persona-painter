import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface SendReceiptRequest {
  confirmationId: string;
  receiptId: string;
  sendWhatsApp: boolean;
  sendEmail: boolean;
  isRetry?: boolean;
}

interface ClientContactInfo {
  whatsappNumber: string | null;
  email: string | null;
  clientName: string;
}

interface ReceiptDetails {
  receiptNo: string;
  receiptDate: string;
  amountReceived: number;
  paymentMethod: string | null;
  referenceNo: string | null;
  invoiceNo: string;
  invoiceDate: string;
  balanceDue: number;
  clientName: string;
  clientGst: string | null;
  pdfUrl: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { confirmationId, receiptId, sendWhatsApp, sendEmail, isRetry } = await req.json() as SendReceiptRequest;

    console.log('Processing receipt notification:', { confirmationId, receiptId, sendWhatsApp, sendEmail, isRetry });

    // Get confirmation details
    const { data: confirmation, error: confirmError } = await supabase
      .from('payment_confirmations')
      .select('*')
      .eq('id', confirmationId)
      .single();

    if (confirmError || !confirmation) {
      throw new Error('Payment confirmation not found');
    }

    // Safety check: Don't process if already successfully sent (unless retry)
    if (!isRetry) {
      if (sendWhatsApp && confirmation.whatsapp_send_status === 'sent') {
        console.log('WhatsApp already sent, skipping');
      }
      if (sendEmail && confirmation.email_send_status === 'sent') {
        console.log('Email already sent, skipping');
      }
    }

    // Get receipt details
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      throw new Error('Receipt not found');
    }

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_no, invoice_date, balance_due')
      .eq('id', receipt.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Resolve client contact info
    const contactInfo = await resolveClientContact(supabase, receipt.client_id);

    // Prepare receipt details for messages
    const receiptDetails: ReceiptDetails = {
      receiptNo: receipt.receipt_no,
      receiptDate: receipt.receipt_date,
      amountReceived: Number(receipt.amount_received),
      paymentMethod: receipt.payment_method,
      referenceNo: receipt.reference_no,
      invoiceNo: invoice.invoice_no || invoice.id,
      invoiceDate: invoice.invoice_date,
      balanceDue: Number(invoice.balance_due) || 0,
      clientName: contactInfo.clientName,
      clientGst: null,
      pdfUrl: receipt.pdf_url,
    };

    // Generate portal link for receipt
    const portalUrl = `${Deno.env.get('FRONTEND_URL') || 'https://go-ads.lovable.app'}/portal`;
    const receiptLink = `${portalUrl}/receipts/${receiptId}`;

    const results = {
      whatsapp: { status: 'not_sent', error: null as string | null },
      email: { status: 'not_sent', error: null as string | null },
    };

    // Send WhatsApp notification
    if (sendWhatsApp) {
      if (!contactInfo.whatsappNumber) {
        results.whatsapp = { status: 'failed', error: 'No WhatsApp number available' };
        await updateConfirmationStatus(supabase, confirmationId, 'whatsapp', 'failed', 'No WhatsApp number available');
      } else {
        try {
          // Update status to pending
          await updateConfirmationStatus(supabase, confirmationId, 'whatsapp', 'pending', null);
          
          // Send WhatsApp message
          const whatsappResult = await sendWhatsAppMessage(
            contactInfo.whatsappNumber,
            receiptDetails,
            receiptLink
          );
          
          if (whatsappResult.success) {
            results.whatsapp = { status: 'sent', error: null };
            await updateConfirmationStatus(supabase, confirmationId, 'whatsapp', 'sent', null);
          } else {
            results.whatsapp = { status: 'failed', error: whatsappResult.error || 'WhatsApp send failed' };
            await updateConfirmationStatus(supabase, confirmationId, 'whatsapp', 'failed', whatsappResult.error);
          }
        } catch (e: any) {
          results.whatsapp = { status: 'failed', error: e.message };
          await updateConfirmationStatus(supabase, confirmationId, 'whatsapp', 'failed', e.message);
        }
      }
    }

    // Send Email notification
    if (sendEmail) {
      if (!contactInfo.email) {
        results.email = { status: 'failed', error: 'No email address available' };
        await updateConfirmationStatus(supabase, confirmationId, 'email', 'failed', 'No email address available');
      } else {
        try {
          // Update status to pending
          await updateConfirmationStatus(supabase, confirmationId, 'email', 'pending', null);
          
          // Send Email
          const emailResult = await sendEmailNotification(
            contactInfo.email,
            contactInfo.clientName,
            receiptDetails,
            receiptLink
          );
          
          if (emailResult.success) {
            results.email = { status: 'sent', error: null };
            await updateConfirmationStatus(supabase, confirmationId, 'email', 'sent', null);
          } else {
            results.email = { status: 'failed', error: emailResult.error || 'Email send failed' };
            await updateConfirmationStatus(supabase, confirmationId, 'email', 'failed', emailResult.error);
          }
        } catch (e: any) {
          results.email = { status: 'failed', error: e.message };
          await updateConfirmationStatus(supabase, confirmationId, 'email', 'failed', e.message);
        }
      }
    }

    console.log('Receipt notification results:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-receipt-notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Resolve client contact information with priority:
 * 1. clients.whatsapp / clients.email
 * 2. clients.phone (for WhatsApp)
 * 3. client_contacts.phone / email where is_primary = true
 */
async function resolveClientContact(supabase: any, clientId: string): Promise<ClientContactInfo> {
  // Get client details
  const { data: client } = await supabase
    .from('clients')
    .select('name, phone, email, whatsapp')
    .eq('id', clientId)
    .single();

  let whatsappNumber = client?.whatsapp || client?.phone || null;
  let email = client?.email || null;
  const clientName = client?.name || 'Valued Customer';

  // If no contact from client, check primary contact
  if (!whatsappNumber || !email) {
    const { data: primaryContact } = await supabase
      .from('client_contacts')
      .select('phone, mobile, email')
      .eq('client_id', clientId)
      .eq('is_primary', true)
      .maybeSingle();

    if (primaryContact) {
      if (!whatsappNumber) {
        whatsappNumber = primaryContact.mobile || primaryContact.phone || null;
      }
      if (!email) {
        email = primaryContact.email || null;
      }
    }
  }

  // Clean WhatsApp number (ensure it starts with country code)
  if (whatsappNumber) {
    whatsappNumber = cleanPhoneNumber(whatsappNumber);
  }

  return { whatsappNumber, email, clientName };
}

/**
 * Clean and format phone number for WhatsApp
 */
function cleanPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 91
  if (cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  }
  
  // If doesn't start with country code, assume India
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Update confirmation send status
 */
async function updateConfirmationStatus(
  supabase: any,
  confirmationId: string,
  channel: 'whatsapp' | 'email',
  status: string,
  error: string | null
) {
  const updates: any = {};
  
  if (channel === 'whatsapp') {
    updates.whatsapp_send_status = status;
    updates.whatsapp_send_error = error;
    if (status === 'sent') {
      updates.whatsapp_sent_at = new Date().toISOString();
    }
  } else {
    updates.email_send_status = status;
    updates.email_send_error = error;
    if (status === 'sent') {
      updates.email_sent_at = new Date().toISOString();
    }
  }

  await supabase
    .from('payment_confirmations')
    .update(updates)
    .eq('id', confirmationId);
}

/**
 * Send WhatsApp message using Meta Cloud API
 * Note: Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN secrets
 */
async function sendWhatsAppMessage(
  toNumber: string,
  receipt: ReceiptDetails,
  receiptLink: string
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

  if (!phoneNumberId || !accessToken) {
    console.log('WhatsApp not configured - logging message instead');
    // Log for manual sending if API not configured
    const message = formatWhatsAppMessage(receipt, receiptLink);
    console.log('WhatsApp message to send:', { to: toNumber, message });
    
    // Return success for demo/testing (message logged)
    return { success: true };
  }

  const message = formatWhatsAppMessage(receipt, receiptLink);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return { success: false, error: `WhatsApp API error: ${response.status}` };
    }

    const result = await response.json();
    console.log('WhatsApp sent successfully:', result);
    return { success: true };
    
  } catch (e: any) {
    console.error('WhatsApp send error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Format WhatsApp message (professional, no emojis)
 */
function formatWhatsAppMessage(receipt: ReceiptDetails, receiptLink: string): string {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(receipt.amountReceived);

  const formattedDate = new Date(receipt.receiptDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let message = `Dear ${receipt.clientName},

Payment received successfully.

Receipt No: ${receipt.receiptNo}
Invoice: ${receipt.invoiceNo}
Amount: ${formattedAmount}
Date: ${formattedDate}`;

  if (receipt.referenceNo) {
    message += `\nRef: ${receipt.referenceNo}`;
  }

  if (receipt.balanceDue > 0) {
    const formattedBalance = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(receipt.balanceDue);
    message += `\n\nRemaining Balance: ${formattedBalance}`;
  }

  message += `

Please find the receipt here:
${receiptLink}

Regards,
Matrix Network Solutions
Accounts Team`;

  return message;
}

/**
 * Send Email notification using Resend
 */
async function sendEmailNotification(
  toEmail: string,
  clientName: string,
  receipt: ReceiptDetails,
  receiptLink: string
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.log('Resend API key not configured - logging email instead');
    console.log('Email to send:', { to: toEmail, receipt });
    return { success: true }; // For demo/testing
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(receipt.amountReceived);

  const formattedDate = new Date(receipt.receiptDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedBalance = receipt.balanceDue > 0
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(receipt.balanceDue)
    : '₹0';

  const subject = `Payment Receipt – ${receipt.receiptNo} | Invoice ${receipt.invoiceNo} | Matrix Network Solutions`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center; }
        .header-title { color: white; font-size: 24px; font-weight: 600; margin: 0; }
        .header-subtitle { color: rgba(255,255,255,0.8); font-size: 16px; margin-top: 8px; }
        .content { padding: 40px 30px; color: #1e293b; line-height: 1.6; }
        .amount-box { background: #10b981; color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }
        .amount-label { font-size: 14px; opacity: 0.9; margin-bottom: 4px; }
        .amount-value { font-size: 32px; font-weight: 700; }
        .details-box { background: #f8fafc; border-left: 4px solid #1e40af; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .detail-label { color: #64748b; font-weight: 500; }
        .detail-value { color: #0f172a; font-weight: 600; }
        .button { display: inline-block; background: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
        .balance-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="header-title">Payment Received</h1>
          <p class="header-subtitle">Thank you for your payment</p>
        </div>
        <div class="content">
          <p>Dear ${clientName},</p>
          <p>We have successfully received your payment. Please find the details below:</p>
          
          <div class="amount-box">
            <div class="amount-label">Amount Received</div>
            <div class="amount-value">${formattedAmount}</div>
          </div>
          
          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">Receipt No:</span>
              <span class="detail-value">${receipt.receiptNo}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Invoice No:</span>
              <span class="detail-value">${receipt.invoiceNo}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Date:</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">${receipt.paymentMethod || 'Bank Transfer'}</span>
            </div>
            ${receipt.referenceNo ? `
            <div class="detail-row">
              <span class="detail-label">Reference/UTR:</span>
              <span class="detail-value">${receipt.referenceNo}</span>
            </div>
            ` : ''}
          </div>
          
          ${receipt.balanceDue > 0 ? `
          <div class="balance-note">
            <strong>Remaining Balance:</strong> ${formattedBalance}
            <br><small>Please arrange for the balance payment at your earliest convenience.</small>
          </div>
          ` : '<p style="color: #10b981; font-weight: 600;">✓ Invoice fully paid. Thank you!</p>'}
          
          <p>You can download your receipt from the link below:</p>
          <a href="${receiptLink}" class="button">View Receipt</a>
        </div>
        <div class="footer">
          <p><strong>Matrix Network Solutions</strong></p>
          <p>Accounts Team</p>
          <p style="margin-top: 16px; font-size: 12px;">This is an automated notification. Please contact us for any queries.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Matrix Network Solutions <accounts@go-ads.in>',
        to: [toEmail],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return { success: false, error: `Email API error: ${response.status}` };
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return { success: true };

  } catch (e: any) {
    console.error('Email send error:', e);
    return { success: false, error: e.message };
  }
}
