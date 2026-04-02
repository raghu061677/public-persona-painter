import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { fmtINR } from "@/lib/gst-format";

interface GSTSummaryTabProps {
  summary: any;
  statewise: any[];
  hsn: any[];
  loading: boolean;
}

export function GSTSummaryTab({ summary, statewise, hsn, loading }: GSTSummaryTabProps) {
  if (!summary && !loading) {
    return <div className="text-center py-12 text-muted-foreground"><p>No GST data available for the selected filing period</p></div>;
  }

  const s = summary || {};

  return (
    <div className="space-y-6">
      {/* Tax Breakup Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Tax Breakup</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particular</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Gross Outward Supplies</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.gross_invoice_taxable_value)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.gross_cgst_amount)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.gross_sgst_amount)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.gross_igst_amount)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{fmtINR(s.gross_total_invoice_value)}</TableCell>
              </TableRow>
              <TableRow className="text-destructive">
                <TableCell className="font-medium">Less: Credit Notes</TableCell>
                <TableCell className="text-right font-mono">({fmtINR(s.credit_note_taxable_reduction)})</TableCell>
                <TableCell className="text-right font-mono">({fmtINR(s.credit_note_cgst_reduction)})</TableCell>
                <TableCell className="text-right font-mono">({fmtINR(s.credit_note_sgst_reduction)})</TableCell>
                <TableCell className="text-right font-mono">({fmtINR(s.credit_note_igst_reduction)})</TableCell>
                <TableCell className="text-right font-mono font-semibold">({fmtINR(s.credit_note_total_reduction)})</TableCell>
              </TableRow>
              <TableRow className="font-bold bg-muted/30">
                <TableCell>Net Outward Supplies</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.net_taxable_value)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.net_cgst_amount)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.net_sgst_amount)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.net_igst_amount)}</TableCell>
                <TableCell className="text-right font-mono">{fmtINR(s.net_total_value)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* B2B vs B2C */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">B2B Outward Supplies</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{fmtINR(s.b2b_taxable_value)}</p>
            <p className="text-xs text-muted-foreground mt-1">Taxable value of B2B invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">B2C Outward Supplies</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{fmtINR(s.b2c_taxable_value)}</p>
            <p className="text-xs text-muted-foreground mt-1">Taxable value of B2C invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* State-wise Top Preview */}
      {statewise.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top States by Taxable Value</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statewise.slice(0, 5).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.place_of_supply || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.total_taxable_value)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR((r.cgst_amount || 0) + (r.sgst_amount || 0) + (r.igst_amount || 0))}</TableCell>
                    <TableCell className="text-right">{r.invoice_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* HSN Top Preview */}
      {hsn.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">HSN/SAC Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SAC/HSN</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hsn.slice(0, 5).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{r.hsn_sac_code || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.taxable_value)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.total_value)}</TableCell>
                    <TableCell className="text-right">{r.invoice_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
