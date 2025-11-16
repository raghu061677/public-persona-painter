import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'proof_upload' | 'invoice_reminder' | 'payment_confirmation' | 'campaign_milestone';
  recipientEmail: string;
  recipientName: string;
  data: Record<string, any>;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, recipientEmail, recipientName, data } = await req.json() as NotificationRequest;

    console.log('Sending notification email:', { type, recipientEmail });

    // Get company details for branding
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url, theme_color')
      .limit(1)
      .single();

    const companyName = company?.name || 'Go-Ads 360°';
    const logoUrl = company?.logo_url || '';
    const themeColor = company?.theme_color || '#1e40af';

    // Generate email template based on type
    const emailTemplate = generateEmailTemplate(type, recipientName, data, companyName, logoUrl, themeColor);

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <notifications@go-ads.app>`,
        to: recipientEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully:', result);

    // Log notification
    await supabase.from('client_portal_access_logs').insert({
      client_id: data.clientId || 'system',
      action: `email_sent_${type}`,
      metadata: { recipientEmail, emailId: result.id },
    });

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending notification email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailTemplate(
  type: string,
  recipientName: string,
  data: Record<string, any>,
  companyName: string,
  logoUrl: string,
  themeColor: string
): EmailTemplate {
  const baseStyles = `
    body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, ${themeColor} 0%, ${adjustColor(themeColor, -20)} 100%); padding: 40px 30px; text-align: center; }
    .logo { max-width: 150px; height: auto; margin-bottom: 20px; }
    .header-title { color: white; font-size: 24px; font-weight: 600; margin: 0; }
    .content { padding: 40px 30px; color: #1e293b; line-height: 1.6; }
    .content h2 { color: #0f172a; font-size: 20px; margin-bottom: 16px; }
    .details-box { background: #f8fafc; border-left: 4px solid ${themeColor}; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #0f172a; font-weight: 600; }
    .button { display: inline-block; background: ${themeColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
  `;

  switch (type) {
    case 'proof_upload':
      return {
        subject: `New Proof Photos Available - ${data.campaignName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header">
                ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
                <h1 class="header-title">New Proof Photos Available</h1>
              </div>
              <div class="content">
                <p>Hi ${recipientName},</p>
                <p>Great news! New installation proof photos have been uploaded for your campaign.</p>
                <div class="details-box">
                  <div class="detail-row">
                    <span class="detail-label">Campaign:</span>
                    <span class="detail-value">${data.campaignName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Asset Location:</span>
                    <span class="detail-value">${data.assetLocation}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Photos Uploaded:</span>
                    <span class="detail-value">${data.photoCount} photos</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Uploaded On:</span>
                    <span class="detail-value">${new Date(data.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <p>You can now view these photos in your client portal.</p>
                <a href="${data.portalUrl}/proofs?campaign=${data.campaignId}" class="button">View Proof Photos</a>
              </div>
              <div class="footer">
                <p>© 2025 ${companyName}. All rights reserved.</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'invoice_reminder':
      return {
        subject: `Payment Reminder - Invoice ${data.invoiceId}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header">
                ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
                <h1 class="header-title">Payment Reminder</h1>
              </div>
              <div class="content">
                <p>Hi ${recipientName},</p>
                <p>This is a friendly reminder that the following invoice is ${data.status === 'overdue' ? 'overdue' : 'due soon'}.</p>
                <div class="details-box">
                  <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span class="detail-value">${data.invoiceId}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Amount Due:</span>
                    <span class="detail-value">₹${data.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Due Date:</span>
                    <span class="detail-value">${new Date(data.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  ${data.status === 'overdue' ? `
                  <div class="detail-row">
                    <span class="detail-label">Days Overdue:</span>
                    <span class="detail-value" style="color: #ef4444;">${data.daysOverdue} days</span>
                  </div>
                  ` : ''}
                </div>
                <p>Please process the payment at your earliest convenience to avoid any service interruptions.</p>
                <a href="${data.portalUrl}/payments?invoice=${data.invoiceId}" class="button">View Invoice</a>
              </div>
              <div class="footer">
                <p>© 2025 ${companyName}. All rights reserved.</p>
                <p>For payment assistance, please contact our finance team.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'payment_confirmation':
      return {
        subject: `Payment Received - Thank You!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header">
                ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
                <h1 class="header-title">Payment Received</h1>
              </div>
              <div class="content">
                <p>Hi ${recipientName},</p>
                <p>Thank you! We have successfully received your payment.</p>
                <div class="details-box">
                  <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span class="detail-value">${data.invoiceId}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Amount Paid:</span>
                    <span class="detail-value">₹${data.amountPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Payment Date:</span>
                    <span class="detail-value">${new Date(data.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">${data.paymentMethod || 'Bank Transfer'}</span>
                  </div>
                  ${data.transactionId ? `
                  <div class="detail-row">
                    <span class="detail-label">Transaction ID:</span>
                    <span class="detail-value">${data.transactionId}</span>
                  </div>
                  ` : ''}
                </div>
                <p>A receipt has been generated and is available in your client portal.</p>
                <a href="${data.portalUrl}/payments?invoice=${data.invoiceId}" class="button">View Receipt</a>
              </div>
              <div class="footer">
                <p>© 2025 ${companyName}. All rights reserved.</p>
                <p>Thank you for your business!</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'campaign_milestone':
      return {
        subject: `Campaign Milestone: ${data.milestone} - ${data.campaignName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="header">
                ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
                <h1 class="header-title">Campaign Update</h1>
              </div>
              <div class="content">
                <p>Hi ${recipientName},</p>
                <p>Your campaign has reached an important milestone!</p>
                <div class="details-box">
                  <div class="detail-row">
                    <span class="detail-label">Campaign:</span>
                    <span class="detail-value">${data.campaignName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Milestone:</span>
                    <span class="detail-value">${data.milestone}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Completion:</span>
                    <span class="detail-value">${data.completionPercentage}%</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Assets Installed:</span>
                    <span class="detail-value">${data.assetsInstalled} of ${data.totalAssets}</span>
                  </div>
                </div>
                <p>${getMilestoneMessage(data.milestone)}</p>
                <a href="${data.portalUrl}/campaigns/${data.campaignId}" class="button">View Campaign Progress</a>
              </div>
              <div class="footer">
                <p>© 2025 ${companyName}. All rights reserved.</p>
                <p>Track your campaign progress anytime in the client portal.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      throw new Error('Invalid notification type');
  }
}

function getMilestoneMessage(milestone: string): string {
  const messages: Record<string, string> = {
    'Campaign Started': 'Your campaign has officially started! Our team is working on getting all assets installed.',
    'Installation Complete': 'All assets have been successfully installed. Proof photos are being uploaded.',
    'Proofs Uploaded': 'All proof photos have been uploaded and are ready for your review.',
    'Campaign Completed': 'Your campaign has been successfully completed. Thank you for choosing our services!',
  };
  return messages[milestone] || 'Your campaign has reached a new milestone.';
}

function adjustColor(color: string, percent: number): string {
  // Simple color adjustment (darker/lighter)
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
