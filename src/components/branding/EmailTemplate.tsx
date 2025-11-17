/**
 * Company-branded email template components
 * Use these for generating HTML emails with company branding
 */

import { CompanyBranding } from '@/lib/branding';

interface EmailTemplateProps {
  branding: CompanyBranding;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}

/**
 * Generate HTML email template with company branding
 */
export function generateBrandedEmail({
  branding,
  title,
  body,
  ctaText,
  ctaUrl,
  footer,
}: EmailTemplateProps): string {
  const logoHtml = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="${branding.name}" style="height: 50px; margin-bottom: 20px;" />`
    : `<h2 style="color: ${branding.theme_color}; margin-bottom: 20px;">${branding.name}</h2>`;

  const ctaHtml = ctaText && ctaUrl
    ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${ctaUrl}" 
           style="background-color: ${branding.theme_color}; 
                  color: white; 
                  padding: 12px 30px; 
                  text-decoration: none; 
                  border-radius: 6px;
                  display: inline-block;
                  font-weight: 600;">
          ${ctaText}
        </a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header with branding -->
        <div style="background: linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color}); padding: 30px; text-align: center;">
          ${logoHtml}
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h1 style="color: ${branding.theme_color}; margin-bottom: 20px; font-size: 24px;">
            ${title}
          </h1>
          
          <div style="color: #475569; font-size: 16px; line-height: 1.8;">
            ${body}
          </div>
          
          ${ctaHtml}
        </div>
        
        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            ${footer || `© ${new Date().getFullYear()} ${branding.name}. All rights reserved.`}
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">
            This email was sent by ${branding.name} through Go-Ads 360° Platform
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

/**
 * Pre-defined email templates for common scenarios
 */

export function generateWelcomeEmail(branding: CompanyBranding, portalUrl: string): string {
  return generateBrandedEmail({
    branding,
    title: `Welcome to ${branding.name} Client Portal`,
    body: `
      <p>Dear Valued Client,</p>
      <p>We're excited to have you on board! Your client portal account has been created.</p>
      <p>Through your portal, you can:</p>
      <ul style="margin: 15px 0; padding-left: 20px;">
        <li>View campaign progress in real-time</li>
        <li>Access installation proof photos</li>
        <li>Download invoices and reports</li>
        <li>Track payment status</li>
      </ul>
      <p>Click the button below to access your portal:</p>
    `,
    ctaText: 'Access Portal',
    ctaUrl: portalUrl,
  });
}

export function generateCampaignProofEmail(
  branding: CompanyBranding,
  campaignName: string,
  proofUrl: string
): string {
  return generateBrandedEmail({
    branding,
    title: 'Campaign Proofs Available',
    body: `
      <p>Dear Client,</p>
      <p>We're pleased to inform you that the installation proofs for your campaign <strong>"${campaignName}"</strong> are now available.</p>
      <p>All assets have been successfully installed and verified with geo-tagged photos.</p>
      <p>Click below to view the complete proof of performance:</p>
    `,
    ctaText: 'View Proofs',
    ctaUrl: proofUrl,
  });
}

export function generateInvoiceEmail(
  branding: CompanyBranding,
  invoiceId: string,
  amount: number,
  dueDate: string,
  invoiceUrl: string
): string {
  return generateBrandedEmail({
    branding,
    title: `Invoice ${invoiceId}`,
    body: `
      <p>Dear Client,</p>
      <p>Your invoice is ready for review:</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${branding.theme_color};">
        <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceId}</p>
        <p style="margin: 5px 0;"><strong>Amount Due:</strong> ₹${amount.toLocaleString('en-IN')}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
      </div>
      <p>Please click below to view and download your invoice:</p>
    `,
    ctaText: 'View Invoice',
    ctaUrl: invoiceUrl,
  });
}

export function generatePaymentReminderEmail(
  branding: CompanyBranding,
  invoiceId: string,
  amount: number,
  daysOverdue: number,
  paymentUrl: string
): string {
  return generateBrandedEmail({
    branding,
    title: 'Payment Reminder',
    body: `
      <p>Dear Client,</p>
      <p>This is a friendly reminder that the following invoice is ${daysOverdue > 0 ? `overdue by ${daysOverdue} days` : 'due soon'}:</p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceId}</p>
        <p style="margin: 5px 0;"><strong>Outstanding Amount:</strong> ₹${amount.toLocaleString('en-IN')}</p>
      </div>
      <p>Please process the payment at your earliest convenience to avoid any service interruption.</p>
    `,
    ctaText: 'Make Payment',
    ctaUrl: paymentUrl,
  });
}

export function generatePlanShareEmail(
  branding: CompanyBranding,
  planName: string,
  clientName: string,
  shareUrl: string
): string {
  return generateBrandedEmail({
    branding,
    title: `Media Plan: ${planName}`,
    body: `
      <p>Dear ${clientName},</p>
      <p>We've prepared a comprehensive media plan for your upcoming campaign.</p>
      <p>The plan includes:</p>
      <ul style="margin: 15px 0; padding-left: 20px;">
        <li>Detailed asset list with locations</li>
        <li>Pricing breakdown with GST</li>
        <li>Campaign timeline and coverage map</li>
        <li>Terms and conditions</li>
      </ul>
      <p>Please review the plan and let us know if you have any questions:</p>
    `,
    ctaText: 'Review Plan',
    ctaUrl: shareUrl,
  });
}
