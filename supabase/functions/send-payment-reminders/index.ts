// supabase/functions/send-payment-reminders/index.ts
// v2.0 - Phase-3 Security: User-scoped + role enforcement + audit logging

import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const serviceClient = supabaseServiceClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: overdueInvoices, error: invoicesError } = await serviceClient
    .from('invoices')
    .select('*, clients(email, name)')
    .eq('company_id', ctx.companyId) // Always scoped to user's company
    .in('status', ['Sent', 'Overdue'])
    .lt('due_date', today)
    .gt('balance_due', 0);

  if (invoicesError) {
    return jsonError(invoicesError.message, 500);
  }

  const reminders = [];

  for (const invoice of overdueInvoices || []) {
    const dueDate = new Date(invoice.due_date);
    const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let reminderNumber = 0;
    if (daysPastDue >= 30) reminderNumber = 4;
    else if (daysPastDue >= 15) reminderNumber = 3;
    else if (daysPastDue >= 7) reminderNumber = 2;
    else if (daysPastDue >= 0) reminderNumber = 1;

    const { data: existingReminder } = await serviceClient
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

      const { error: reminderError } = await serviceClient
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
        console.log(`Reminder ${reminderNumber} sent for invoice ${invoice.id} (${daysPastDue} days overdue)`);
      }
    }
  }

  await logSecurityAudit({
    functionName: 'send-payment-reminders', userId: ctx.userId,
    companyId: ctx.companyId, action: 'send_reminders',
    metadata: { reminders_sent: reminders.length }, req,
  });

  return jsonSuccess({ success: true, reminders_sent: reminders.length, reminders });
}));
