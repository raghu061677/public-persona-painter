import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface Invoice {
  id: string;
  client_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-primary-foreground/80 mt-2">
            View and download your invoices
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText className="h-10 w-10 text-primary" />
                      <div>
                        <p className="font-semibold text-lg">{invoice.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.client_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Date: {new Date(invoice.invoice_date).toLocaleDateString()} • 
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                      <div>
                        <p className="text-sm font-medium">Total Amount</p>
                        <p className="text-2xl font-bold">
                          ₹{invoice.total_amount?.toLocaleString('en-IN') || 0}
                        </p>
                        {invoice.balance_due > 0 && (
                          <p className="text-sm text-destructive font-medium mt-1">
                            Balance Due: ₹{invoice.balance_due?.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={invoice.status === 'Paid' ? 'default' : 'destructive'}
                        >
                          {invoice.status}
                        </Badge>
                        <Button size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
