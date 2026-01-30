import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceForReminder {
  invoice_id: string;
  invoice_no: string;
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  invoice_date: string;
  due_date: string;
  balance_due: number;
  days_overdue: number;
  aging_bucket: number;
}

// Format currency for messages
function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date for messages
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Generate WhatsApp message
function generateWhatsAppMessage(invoice: InvoiceForReminder, companyName: string): string {
  return `Dear ${invoice.client_name},

This is a gentle reminder regarding Invoice ${invoice.invoice_no} dated ${formatDate(invoice.invoice_date)} with an outstanding amount of ${formatCurrency(invoice.balance_due)}.

Due Date: ${formatDate(invoice.due_date)}

You may use the payment QR in the invoice for quick settlement.

Please ignore this message if payment has already been made.

Regards,
${companyName}
Accounts Team`;
}

// Generate Email content
function generateEmailContent(invoice: InvoiceForReminder, companyName: string): { subject: string; body: string } {
  const subject = `Payment Reminder – Invoice ${invoice.invoice_no} | ${companyName}`;
  
  const body = `Dear ${invoice.client_name},

This is a friendly reminder regarding Invoice ${invoice.invoice_no}.

Invoice Details:
- Invoice Number: ${invoice.invoice_no}
- Invoice Date: ${formatDate(invoice.invoice_date)}
- Due Date: ${formatDate(invoice.due_date)}
- Outstanding Amount: ${formatCurrency(invoice.balance_due)}
- Days Overdue: ${invoice.days_overdue}

Please arrange for the payment at your earliest convenience. You may use the payment QR code on the invoice for quick UPI payment.

If you have already made the payment, please ignore this reminder.

For any queries, please contact our accounts team.

Best Regards,
${companyName}
Accounts Department`;

  return { subject, body };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body for optional company_id filter
    let targetCompanyId: string | null = null;
    try {
      const body = await req.json();
      targetCompanyId = body?.company_id || null;
    } catch {
      // No body provided, process all companies
    }

    // Get companies with auto-reminder enabled
    let settingsQuery = supabaseClient
      .from('auto_reminder_settings')
      .select('*, companies(name)')
      .eq('enabled', true);

    if (targetCompanyId) {
      settingsQuery = settingsQuery.eq('company_id', targetCompanyId);
    }

    const { data: settings, error: settingsError } = await settingsQuery;

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: any[] = [];

    for (const setting of settings || []) {
      const companyId = setting.company_id;
      const companyName = setting.companies?.name || 'Matrix Network Solutions';
      const enabledBuckets = setting.buckets_enabled || [7, 15, 30, 45];

      // Get invoices needing reminders for this company
      const { data: invoices, error: invoicesError } = await supabaseClient
        .rpc('get_invoices_for_reminders', { p_company_id: companyId });

      if (invoicesError) {
        console.error(`Error fetching invoices for company ${companyId}:`, invoicesError);
        continue;
      }

      for (const invoice of invoices || []) {
        if (!invoice.aging_bucket || !enabledBuckets.includes(invoice.aging_bucket)) {
          continue;
        }

        const remindersToSend: { type: 'whatsapp' | 'email'; content: string }[] = [];

        // Check if WhatsApp reminder needed
        if (setting.whatsapp_enabled && invoice.client_phone) {
          const { data: existingWA } = await supabaseClient
            .from('invoice_reminders')
            .select('id')
            .eq('invoice_id', invoice.invoice_id)
            .eq('reminder_type', 'whatsapp')
            .eq('aging_bucket', invoice.aging_bucket)
            .maybeSingle();

          if (!existingWA) {
            remindersToSend.push({
              type: 'whatsapp',
              content: generateWhatsAppMessage(invoice, companyName),
            });
          }
        }

        // Check if Email reminder needed (send at 15, 30, 45 days)
        if (setting.email_enabled && invoice.client_email && invoice.aging_bucket >= 15) {
          const { data: existingEmail } = await supabaseClient
            .from('invoice_reminders')
            .select('id')
            .eq('invoice_id', invoice.invoice_id)
            .eq('reminder_type', 'email')
            .eq('aging_bucket', invoice.aging_bucket)
            .maybeSingle();

          if (!existingEmail) {
            const { subject, body } = generateEmailContent(invoice, companyName);
            remindersToSend.push({
              type: 'email',
              content: `Subject: ${subject}\n\n${body}`,
            });
          }
        }

        // Send reminders and log them
        for (const reminder of remindersToSend) {
          let status: 'sent' | 'failed' = 'sent';
          let errorMessage: string | null = null;

          try {
            // TODO: Integrate with actual WhatsApp/Email APIs
            // For now, we just log the reminder
            console.log(`[${reminder.type.toUpperCase()}] Reminder for ${invoice.invoice_no} (${invoice.aging_bucket} days):`);
            console.log(reminder.content);
            console.log('---');

            // In production, call WhatsApp Cloud API or Email service here
            // Example: await sendWhatsAppMessage(invoice.client_phone, reminder.content);
            // Example: await sendEmail(invoice.client_email, subject, body);

          } catch (err) {
            status = 'failed';
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
          }

          // Log the reminder
          const { error: insertError } = await supabaseClient
            .from('invoice_reminders')
            .insert({
              invoice_id: invoice.invoice_id,
              reminder_type: reminder.type,
              aging_bucket: invoice.aging_bucket,
              status,
              error_message: errorMessage,
              message_content: reminder.content,
            });

          if (insertError) {
            console.error('Error logging reminder:', insertError);
          } else {
            results.push({
              invoice_id: invoice.invoice_id,
              invoice_no: invoice.invoice_no,
              type: reminder.type,
              aging_bucket: invoice.aging_bucket,
              status,
            });
          }
        }
      }

      // Update last run timestamp
      await supabaseClient
        .from('auto_reminder_settings')
        .update({ last_run_at: new Date().toISOString() })
        .eq('company_id', companyId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: results.length,
        reminders: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
