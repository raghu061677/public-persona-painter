import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtINR } from "@/lib/gst-format";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GSTB2BTabProps {
  data: any[];
  loading: boolean;
}

export function GSTB2BTab({ data, loading }: GSTB2BTabProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r: any) =>
      (r.invoice_no || "").toLowerCase().includes(q) ||
      (r.client_name || "").toLowerCase().includes(q) ||
      (r.gstin || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  if (!loading && data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground"><p>No B2B invoices for the selected period</p></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">B2B Outward Supplies ({filtered.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search invoice, client, GSTIN..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Place of Supply</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>RC</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r: any, i: number) => (
                <TableRow key={r.invoice_id || i} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/invoices/view/${encodeURIComponent(r.invoice_id)}`)}>
                  <TableCell className="font-mono text-sm font-medium">{r.invoice_no}</TableCell>
                  <TableCell className="text-sm">{r.invoice_date ? new Date(r.invoice_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate">{r.client_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.gstin || "—"}</TableCell>
                  <TableCell className="text-sm">{r.place_of_supply || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.taxable_value)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.cgst_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.sgst_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtINR(r.igst_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{fmtINR(r.total_invoice_value)}</TableCell>
                  <TableCell>{r.reverse_charge_applicable ? <Badge variant="outline" className="text-xs">Y</Badge> : "N"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{r.invoice_status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1 rounded border disabled:opacity-40" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="text-xs px-3 py-1 rounded border disabled:opacity-40" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
