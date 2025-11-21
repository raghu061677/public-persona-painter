import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch overdue invoices - only for specific company or all if platform admin
    const today = new Date().toISOString().split('T')[0];
    
    // Get user context from auth header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    let invoicesQuery = supabaseClient
      .from('invoices')
      .select('*, clients(email, name), companies!inner(id)')
      .in('status', ['Sent', 'Overdue'])
      .lt('due_date', today)
      .gt('balance_due', 0);
    
    // If not a scheduled job (has user context), filter by user's company
    if (user) {
      const { data: companyUser } = await supabaseClient
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (companyUser?.company_id) {
        invoicesQuery = invoicesQuery.eq('company_id', companyUser.company_id);
      }
    }
    
    const { data: overdueInvoices, error: invoicesError } = await invoicesQuery;

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return new Response(
        JSON.stringify({ error: invoicesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reminders = [];

    for (const invoice of overdueInvoices || []) {
      const dueDate = new Date(invoice.due_date);
      const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine reminder number based on days past due
      let reminderNumber = 0;
      if (daysPastDue >= 30) reminderNumber = 4; // Escalation
      else if (daysPastDue >= 15) reminderNumber = 3;
      else if (daysPastDue >= 7) reminderNumber = 2;
      else if (daysPastDue >= 0) reminderNumber = 1;

      // Check if reminder already sent
      const { data: existingReminder } = await supabaseClient
        .from('payment_reminders')
        .select('*')
        .eq('invoice_id', invoice.id)
        .eq('reminder_number', reminderNumber)
        .single();

      if (!existingReminder) {
        const reminder = {
          invoice_id: invoice.id,
          reminder_number: reminderNumber,
          method: 'email',
          status: 'sent',
          sent_at: new Date().toISOString()
        };

        const { error: reminderError } = await supabaseClient
          .from('payment_reminders')
          .insert(reminder);

        if (!reminderError) {
          reminders.push({
            invoice_id: invoice.id,
            client_name: invoice.client_name,
            amount: invoice.balance_due,
            days_past_due: daysPastDue,
            reminder_number: reminderNumber
          });

          // TODO: Integrate with email service (Resend, SendGrid, etc.)
          console.log(`Reminder ${reminderNumber} sent for invoice ${invoice.id} (${daysPastDue} days overdue)`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_sent: reminders.length,
        reminders
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