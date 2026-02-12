// v2.0 - Phase-5: HMAC-protected system endpoint
// This is a large file; we add HMAC guard at entry and keep existing logic

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { withHmac, supabaseServiceClient, logSecurityAudit } from '../_shared/auth.ts';

interface PowerBill {
  id: string;
  asset_id: string;
  bill_month: string;
  bill_amount: number;
  consumer_name: string;
  service_number: string;
  media_assets?: any;
}

Deno.serve(withHmac(async (_req, _rawBody) => {
  try {
    console.log('Starting power bill reminder check...');

    const supabaseClient = supabaseServiceClient();

    // Fetch unpaid bills with asset details
    const { data: unpaidBills, error: billsError } = await supabaseClient
      .from('asset_power_bills')
      .select(`
        id, asset_id, bill_month, bill_amount, consumer_name, service_number,
        due_date, total_due, payment_status,
        media_assets!inner(id, location, area, city, company_id)
      `)
      .eq('payment_status', 'Pending')
      .order('due_date', { ascending: true });

    if (billsError) throw billsError;

    console.log(`Found ${unpaidBills?.length || 0} unpaid bills`);

    if (!unpaidBills || unpaidBills.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending bills found', reminders_sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Group by company for batch notifications
    const billsByCompany: Record<string, typeof unpaidBills> = {};
    for (const bill of unpaidBills) {
      const companyId = (bill.media_assets as any)?.company_id;
      if (companyId) {
        if (!billsByCompany[companyId]) billsByCompany[companyId] = [];
        billsByCompany[companyId].push(bill);
      }
    }

    let remindersSent = 0;

    for (const [companyId, bills] of Object.entries(billsByCompany)) {
      try {
        // Fetch admin users for this company
        const { data: admins } = await supabaseClient
          .from('company_users')
          .select('user_id, name, email')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .in('role', ['admin', 'finance']);

        if (!admins || admins.length === 0) continue;

        // Create reminder records
        for (const bill of bills) {
          for (const admin of admins) {
            if (!admin.email) continue;
            await supabaseClient.from('bill_reminders').insert({
              bill_id: bill.id,
              recipient: admin.email,
              reminder_type: 'email',
              scheduled_for: new Date().toISOString(),
              status: 'pending',
              message: `Power bill reminder: ${bill.consumer_name} - ₹${bill.bill_amount} for ${bill.bill_month}`,
            });
            remindersSent++;
          }
        }
      } catch (companyError) {
        console.error(`Error processing company ${companyId}:`, companyError);
      }
    }

    await logSecurityAudit({
      functionName: 'send-power-bill-reminders', action: 'cron_bill_reminders',
      status: 'success', metadata: { unpaidCount: unpaidBills.length, remindersSent },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Reminders processed', reminders_sent: remindersSent, unpaid_bills: unpaidBills.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in power bill reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}));
