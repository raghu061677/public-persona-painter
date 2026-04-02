import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtINR } from "@/lib/gst-format";
import { Search } from "lucide-react";

interface GSTB2CTabProps {
  data: any[];
  loading: boolean;
}

export function GSTB2CTab({ data, loading }: GSTB2CTabProps) {
  const [search, setSearch] = useState("");

  // Aggregate by place_of_supply for summary
  const summaryByState = useMemo(() => {
    const map = new Map<string, { place: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; count: number }>();
    for (const r of data) {
      const key = r.place_of_supply || "Unknown";
      const existing = map.get(key) || { place: key, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, count: 0 };
      existing.taxable += r.taxable_value || 0;
      existing.cgst += r.cgst_amount || 0;
      existing.sgst += r.sgst_amount || 0;
      existing.igst += r.igst_amount || 0;
      existing.total += r.total_invoice_value || 0;
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [data]);

  const filteredSummary = useMemo(() => {
    if (!search.trim()) return summaryByState;
    const q = search.toLowerCase();
    return summaryByState.filter((r) => r.place.toLowerCase().includes(q));
  }, [summaryByState, search]);

  if (!loading && data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground"><p>No B2C invoices for the selected period</p></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">B2C Summary by Place of Supply ({filteredSummary.length} states)</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search state..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Place of Supply</TableHead>
                  <TableHead className="text-right">Taxable Value</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.map((r) => (
                  <TableRow key={r.place}>
                    <TableCell className="font-medium">{r.place}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.taxable)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.cgst)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.sgst)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtINR(r.igst)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{fmtINR(r.total)}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
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
