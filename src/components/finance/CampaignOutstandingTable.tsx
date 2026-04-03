import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/utils/finance";

export interface CampaignOutstanding {
  campaign_name: string;
  campaign_id: string;
  invoice_count: number;
  total_invoiced: number;
  paid_amount: number;
  balance_due: number;
  overdue_amount: number;
}

interface Props {
  data: CampaignOutstanding[];
}

export function CampaignOutstandingTable({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Campaign-wise Receivables</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No outstanding campaigns</TableCell></TableRow>
              )}
              {data.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium max-w-[220px] truncate">{c.campaign_name || c.campaign_id}</TableCell>
                  <TableCell className="text-right">{c.invoice_count}</TableCell>
                  <TableCell className="text-right">{formatINR(c.total_invoiced)}</TableCell>
                  <TableCell className="text-right">{formatINR(c.paid_amount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(c.balance_due)}</TableCell>
                  <TableCell className="text-right text-red-600">{c.overdue_amount > 0 ? formatINR(c.overdue_amount) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
