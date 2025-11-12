import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PowerBill {
  id: string;
  asset_id: string;
  bill_month: string;
  bill_amount: number;
  consumer_name: string;
  service_number: string;
  media_assets?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting power bill reminder check...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate dates
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Format dates for comparison (YYYY-MM-DD)
    const todayStr = today.toISOString().split('T')[0];
    const threeDayStr = threeDaysFromNow.toISOString().split('T')[0];
    const sevenDayStr = sevenDaysFromNow.toISOString().split('T')[0];

    console.log('Checking bills due on:', threeDayStr, 'and', sevenDayStr);

    // Fetch pending bills that are due in 3 or 7 days
    const { data: bills, error } = await supabaseClient
      .from('asset_power_bills')
      .select(`
        id,
        asset_id,
        bill_month,
        bill_amount,
        consumer_name,
        service_number,
        media_assets!inner (
          location
        )
      `)
      .eq('payment_status', 'Pending')
      .or(`bill_month.eq.${threeDayStr},bill_month.eq.${sevenDayStr}`);

    if (error) {
      console.error('Error fetching bills:', error);
      throw error;
    }

    console.log(`Found ${bills?.length || 0} bills requiring reminders`);

    if (!bills || bills.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No bills requiring reminders at this time',
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Group bills by due date
    const billsDue3Days = bills.filter(b => b.bill_month === threeDayStr);
    const billsDue7Days = bills.filter(b => b.bill_month === sevenDayStr);

    const reminders = [];

    // Send reminders using Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email sending');
    } else {
      // Dynamically import Resend
      const { Resend } = await import('https://esm.sh/resend@2.0.0');
      const resend = new Resend(RESEND_API_KEY);

      // Send 3-day reminders
      if (billsDue3Days.length > 0) {
        const emailContent = generateReminderEmail(billsDue3Days, 3);
        
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Go-Ads Power Bills <noreply@go-ads.in>',
          to: ['admin@go-ads.in'], // Replace with actual admin email(s)
          subject: `⚠️ ${billsDue3Days.length} Power Bills Due in 3 Days`,
          html: emailContent,
        });

        if (emailError) {
          console.error('Error sending 3-day reminder:', emailError);
        } else {
          console.log('Sent 3-day reminder email:', emailData);
          reminders.push({ type: '3-day', count: billsDue3Days.length });
        }
      }

      // Send 7-day reminders
      if (billsDue7Days.length > 0) {
        const emailContent = generateReminderEmail(billsDue7Days, 7);
        
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Go-Ads Power Bills <noreply@go-ads.in>',
          to: ['admin@go-ads.in'], // Replace with actual admin email(s)
          subject: `📅 ${billsDue7Days.length} Power Bills Due in 7 Days`,
          html: emailContent,
        });

        if (emailError) {
          console.error('Error sending 7-day reminder:', emailError);
        } else {
          console.log('Sent 7-day reminder email:', emailData);
          reminders.push({ type: '7-day', count: billsDue7Days.length });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${reminders.length} reminder emails`,
        reminders,
        totalBills: bills.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in send-power-bill-reminders:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateReminderEmail(bills: PowerBill[], daysUntilDue: number): string {
  const totalAmount = bills.reduce((sum, b) => sum + Number(b.bill_amount || 0), 0);
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const billRows = bills.map(bill => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${bill.asset_id}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${(bill.media_assets as any)?.location || 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${bill.consumer_name || 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${bill.service_number || 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatINR(Number(bill.bill_amount))}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Power Bill Reminder</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">⚡ Power Bill Reminder</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Upcoming Payments Due</p>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #92400e;">
            ${daysUntilDue === 3 ? '⚠️ URGENT:' : '📅 NOTICE:'} ${bills.length} power bill${bills.length > 1 ? 's are' : ' is'} due in ${daysUntilDue} days
          </p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">Summary</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Total Bills</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: #1e40af;">${bills.length}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Total Amount</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: #dc2626;">${formatINR(totalAmount)}</p>
            </div>
          </div>
        </div>

        <h3 style="color: #1f2937; margin: 0 0 15px 0;">Bill Details</h3>
        <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Asset ID</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Location</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Consumer</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Service No.</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${billRows}
          </tbody>
          <tfoot>
            <tr style="background: #f9fafb; font-weight: 700;">
              <td colspan="4" style="padding: 15px; text-align: right; border-top: 2px solid #e5e7eb;">Total:</td>
              <td style="padding: 15px; text-align: right; border-top: 2px solid #e5e7eb; color: #dc2626; font-size: 18px;">${formatINR(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e40af;">📝 Action Required:</p>
          <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
            <li>Review the above bills and ensure timely payment</li>
            <li>Access the Power Bills Dashboard to make bulk payments</li>
            <li>Upload payment receipts after completing transactions</li>
          </ul>
        </div>

        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">This is an automated reminder from <strong>Go-Ads 360°</strong></p>
          <p style="margin: 5px 0 0 0;">Power Bills Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}