import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtINR } from "@/lib/gst-format";
import { Info } from "lucide-react";

interface GSTHSNTabProps {
  data: any[];
  loading: boolean;
}

export function GSTHSNTab({ data, loading }: GSTHSNTabProps) {
  if (!loading && data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground"><p>No HSN/SAC data for the selected period</p></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">Go-Ads defaults OOH advertising services to <strong>SAC 998365</strong> (Advertising space or time selling services) where HSN/SAC is not explicitly set.</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">HSN/SAC Summary ({data.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN/SAC</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Taxable Value</TableHead>
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
                    <TableCell className="font-mono font-medium">{r.hsn_sac_code || "—"}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.item_description || "—"}</TableCell>
                    <TableCell className="text-right">{r.total_quantity ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.taxable_value)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.cgst_amount)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.sgst_amount)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.igst_amount)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{fmtINR(r.total_value)}</TableCell>
                    <TableCell className="text-right">{r.invoice_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
