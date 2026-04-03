import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";

export interface ClientOutstanding {
  client_name: string;
  gst_no: string;
  invoice_count: number;
  total_invoiced: number;
  paid_amount: number;
  balance_due: number;
  overdue_amount: number;
  oldest_due_date: string | null;
}

interface Props {
  data: ClientOutstanding[];
}

export function ClientOutstandingTable({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Client-wise Receivables</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead>Oldest Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No outstanding receivables</TableCell></TableRow>
              )}
              {data.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium max-w-[200px] truncate">{c.client_name}</TableCell>
                  <TableCell className="text-right">{c.invoice_count}</TableCell>
                  <TableCell className="text-right">{formatINR(c.total_invoiced)}</TableCell>
                  <TableCell className="text-right">{formatINR(c.paid_amount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(c.balance_due)}</TableCell>
                  <TableCell className="text-right text-red-600">{c.overdue_amount > 0 ? formatINR(c.overdue_amount) : '—'}</TableCell>
                  <TableCell>{c.oldest_due_date ? formatDate(c.oldest_due_date) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
