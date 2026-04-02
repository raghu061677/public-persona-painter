import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { fmtINR } from "@/lib/gst-format";

interface GSTStatewiseTabProps {
  data: any[];
  loading: boolean;
}

export function GSTStatewiseTab({ data, loading }: GSTStatewiseTabProps) {
  if (!loading && data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground"><p>No state-wise data for the selected period</p></div>;
  }

  const totals = data.reduce((acc, r) => ({
    b2b: acc.b2b + (r.b2b_taxable_value || 0),
    b2c: acc.b2c + (r.b2c_taxable_value || 0),
    total: acc.total + (r.total_taxable_value || 0),
    cgst: acc.cgst + (r.cgst_amount || 0),
    sgst: acc.sgst + (r.sgst_amount || 0),
    igst: acc.igst + (r.igst_amount || 0),
    inv: acc.inv + (r.total_invoice_value || 0),
    count: acc.count + (r.invoice_count || 0),
  }), { b2b: 0, b2c: 0, total: 0, cgst: 0, sgst: 0, igst: 0, inv: 0, count: 0 });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">State-wise Outward Supply Summary ({data.length} states)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Place of Supply</TableHead>
                <TableHead className="text-right">B2B Taxable</TableHead>
                <TableHead className="text-right">B2C Taxable</TableHead>
                <TableHead className="text-right">Total Taxable</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{r.place_of_supply_state_code || "—"}</TableCell>
                  <TableCell className="font-medium text-sm">{r.place_of_supply || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.b2b_taxable_value)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.b2c_taxable_value)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.total_taxable_value)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.cgst_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.sgst_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.igst_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{fmtINR(r.total_invoice_value)}</TableCell>
                  <TableCell className="text-right">{r.invoice_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(totals.b2b)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(totals.b2c)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(totals.total)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(totals.cgst)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(totals.sgst)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(totals.igst)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(totals.inv)}</TableCell>
                <TableCell className="text-right">{totals.count}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
