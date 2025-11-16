import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, Send, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatINR, getInvoiceStatusColor, getDaysOverdue } from "@/utils/finance";
import { formatDate } from "@/utils/plans";

interface Invoice {
  id: string;
  client_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

interface PaymentReminder {
  id: string;
  invoice_id: string;
  reminder_number: number;
  method: string;
  status: string;
  sent_at: string;
  invoices?: Invoice;
}

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchReminders();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .in('status', ['Sent', 'Overdue'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('payment_reminders')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (remindersError) throw remindersError;

      // Fetch associated invoices separately
      if (remindersData && remindersData.length > 0) {
        const invoiceIds = remindersData.map(r => r.invoice_id);
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, client_name, invoice_date, due_date, total_amount, balance_due, status')
          .in('id', invoiceIds);

        if (invoicesError) throw invoicesError;

        // Map invoices to reminders
        const invoicesMap = (invoicesData || []).reduce((acc, inv) => {
          acc[inv.id] = inv;
          return acc;
        }, {} as Record<string, any>);

        const enrichedReminders = remindersData.map(reminder => ({
          ...reminder,
          invoices: invoicesMap[reminder.invoice_id] || null
        }));

        setReminders(enrichedReminders as any);
      } else {
        setReminders([]);
      }
    } catch (error: any) {
      console.error('Error fetching reminders:', error);
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-reminders');

      if (error) throw error;

      toast({
        title: "Reminders sent",
        description: `${data.reminders_sent} payment reminders have been sent`,
      });

      fetchReminders();
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast({
        title: "Failed to send reminders",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
    }
  };

  const getOverdueInvoices = () => {
    return invoices.filter(inv => {
      const daysOverdue = getDaysOverdue(inv.due_date);
      return daysOverdue > 0;
    });
  };

  const overdueInvoices = getOverdueInvoices();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Invoices & Payment Reminders</h1>
                <p className="text-muted-foreground">Manage invoices and automated payment reminders</p>
              </div>
            </div>
            <Button
              onClick={handleSendReminders}
              disabled={sendingReminders || overdueInvoices.length === 0}
            >
              {sendingReminders ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Reminders
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Overdue Alert */}
        {overdueInvoices.length > 0 && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm font-medium">
                  {overdueInvoices.length} invoice{overdueInvoices.length > 1 ? 's' : ''} overdue
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Invoices</CardTitle>
            <CardDescription>Invoices awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const daysOverdue = getDaysOverdue(invoice.due_date);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.client_name}</TableCell>
                        <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                        <TableCell>{formatINR(invoice.total_amount)}</TableCell>
                        <TableCell className="font-medium">{formatINR(invoice.balance_due)}</TableCell>
                        <TableCell>
                          {daysOverdue > 0 ? (
                            <span className="text-red-500 font-medium">{daysOverdue} days</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getInvoiceStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No pending invoices
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Reminders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reminders</CardTitle>
            <CardDescription>Latest payment reminder activity</CardDescription>
          </CardHeader>
          <CardContent>
            {reminders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Reminder #</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell>
                        {new Date(reminder.sent_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {reminder.invoices?.id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {reminder.invoices?.client_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Reminder {reminder.reminder_number}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{reminder.method}</TableCell>
                      <TableCell>
                        <Badge variant={reminder.status === 'sent' ? 'default' : 'secondary'}>
                          {reminder.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No reminders sent yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
