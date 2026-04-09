import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Send, CreditCard, Ban, Receipt, Clock, CheckCircle, 
  AlertCircle, Edit, Plus 
} from "lucide-react";
import { formatINR } from "@/utils/finance";
import { format } from "date-fns";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'finalized' | 'sent' | 'payment' | 'credit_note' | 'cancelled' | 'overdue' | 'status_change';
  title: string;
  description?: string;
  amount?: number;
  icon: React.ReactNode;
  color: string;
}

interface InvoiceAuditTimelineProps {
  invoice: any;
}

export function InvoiceAuditTimeline({ invoice }: InvoiceAuditTimelineProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (invoice?.id) loadAuditData();
  }, [invoice?.id]);

  const loadAuditData = async () => {
    setLoading(true);
    const [paymentsRes, creditsRes] = await Promise.all([
      supabase
        .from('payment_records')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('payment_date', { ascending: true }),
      supabase
        .from('credit_notes')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true }),
    ]);
    setPayments(paymentsRes.data || []);
    setCreditNotes(creditsRes.data || []);
    setLoading(false);
  };

  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Invoice created
    if (invoice.created_at) {
      events.push({
        id: 'created',
        timestamp: invoice.created_at,
        type: 'created',
        title: 'Invoice Created',
        description: `${invoice.id} created for ${invoice.client_name}`,
        amount: invoice.total_amount,
        icon: <Plus className="h-3.5 w-3.5" />,
        color: 'bg-blue-500',
      });
    }

    // Finalized (if invoice has a permanent ID and was created as draft)
    if (invoice.id && !invoice.id.startsWith('DRAFT-') && invoice.created_at !== invoice.updated_at) {
      // Check if the invoice ID pattern suggests it was finalized
      const isFinalized = invoice.id.startsWith('INV/') || invoice.id.startsWith('INV-Z/');
      if (isFinalized) {
        events.push({
          id: 'finalized',
          timestamp: invoice.updated_at || invoice.created_at,
          type: 'finalized',
          title: 'Invoice Finalized',
          description: `Permanent number assigned: ${invoice.id}`,
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          color: 'bg-green-500',
        });
      }
    }

    // Status: Sent
    if (['Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled'].includes(invoice.status)) {
      events.push({
        id: 'sent',
        timestamp: invoice.updated_at || invoice.created_at,
        type: 'sent',
        title: 'Invoice Sent',
        description: 'Marked as sent to client',
        icon: <Send className="h-3.5 w-3.5" />,
        color: 'bg-indigo-500',
      });
    }

    // Payments
    payments.forEach((p, i) => {
      events.push({
        id: `payment-${p.id}`,
        timestamp: p.payment_date || p.created_at,
        type: 'payment',
        title: `Payment Received`,
        description: `${p.payment_method || 'Payment'}${p.reference_number ? ` • Ref: ${p.reference_number}` : ''}${p.tds_amount ? ` • TDS: ${formatINR(p.tds_amount)}` : ''}`,
        amount: p.amount,
        icon: <CreditCard className="h-3.5 w-3.5" />,
        color: 'bg-green-600',
      });
    });

    // Credit Notes
    creditNotes.forEach((cn) => {
      events.push({
        id: `credit-${cn.id}`,
        timestamp: cn.created_at,
        type: 'credit_note',
        title: `Credit Note Issued`,
        description: `${cn.credit_note_number || cn.id}${cn.reason ? ` — ${cn.reason}` : ''}`,
        amount: cn.credit_amount,
        icon: <Receipt className="h-3.5 w-3.5" />,
        color: 'bg-amber-500',
      });
    });

    // Cancelled
    if (invoice.status === 'Cancelled') {
      // Extract reason from notes
      const cancelMatch = invoice.notes?.match(/\[Cancelled on ([^\]]+)\]\s*Reason:\s*(.+?)(?:\n|$)/);
      events.push({
        id: 'cancelled',
        timestamp: invoice.updated_at,
        type: 'cancelled',
        title: 'Invoice Cancelled',
        description: cancelMatch ? cancelMatch[2].trim() : 'Invoice was cancelled',
        icon: <Ban className="h-3.5 w-3.5" />,
        color: 'bg-red-500',
      });
    }

    // Overdue
    if (invoice.status === 'Overdue') {
      events.push({
        id: 'overdue',
        timestamp: invoice.due_date,
        type: 'overdue',
        title: 'Invoice Overdue',
        description: `Due date passed: ${invoice.due_date}`,
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        color: 'bg-red-400',
      });
    }

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Invoice History</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
      </Card>
    );
  }

  const events = buildTimeline();

  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Invoice Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {events.map((event, idx) => (
              <div key={event.id} className="relative flex items-start gap-3 pl-0">
                {/* Dot */}
                <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full text-white shrink-0 ${event.color}`}>
                  {event.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{event.title}</span>
                    {event.amount != null && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatINR(event.amount)}
                      </Badge>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {event.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {(() => {
                      try {
                        return format(new Date(event.timestamp), 'dd MMM yyyy, hh:mm a');
                      } catch {
                        return event.timestamp;
                      }
                    })()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
