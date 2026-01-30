import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MessageSquare, Mail, CheckCircle, XCircle } from 'lucide-react';

interface Reminder {
  id: string;
  reminder_type: string;
  aging_bucket: number;
  sent_at: string;
  status: string;
}

export function InvoiceRemindersHistory({ invoiceId }: { invoiceId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const { data, error } = await supabase
          .from('invoice_reminders')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('sent_at', { ascending: false });

        if (error) throw error;
        setReminders(data || []);
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReminders();
  }, [invoiceId]);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Reminder History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No reminders sent yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Reminder History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded border"
            >
              <div className="flex items-center gap-2">
                {reminder.reminder_type === 'whatsapp' ? (
                  <MessageSquare className="h-4 w-4 text-green-600" />
                ) : (
                  <Mail className="h-4 w-4 text-blue-600" />
                )}
                <span className="text-sm capitalize">{reminder.reminder_type}</span>
                <Badge variant="outline" className="text-xs">
                  {reminder.aging_bucket} days
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {reminder.status === 'sent' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(reminder.sent_at), 'dd MMM, hh:mm a')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
