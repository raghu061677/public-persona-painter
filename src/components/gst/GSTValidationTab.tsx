import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GSTValidationTabProps {
  data: any[];
  loading: boolean;
}

export function GSTValidationTab({ data, loading }: GSTValidationTabProps) {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const blocking = data.filter((r: any) => r.severity === "blocking");
    const warnings = data.filter((r: any) => r.severity === "warning");
    const info = data.filter((r: any) => r.severity === "info");
    return { blocking, warnings, info };
  }, [data]);

  if (!loading && data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <Info className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">All Clear</h3>
        <p className="text-sm text-muted-foreground mt-1">No validation issues found. Your GST data is ready for filing.</p>
      </div>
    );
  }

  const handleRowClick = (r: any) => {
    if (r.source_table === "invoices" && r.source_id) {
      navigate(`/admin/invoices/view/${encodeURIComponent(r.source_id)}`);
    }
  };

  const severityIcon = (s: string) => {
    if (s === "blocking") return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const severityBadge = (s: string) => {
    if (s === "blocking") return <Badge variant="destructive" className="text-xs">Blocking</Badge>;
    if (s === "warning") return <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-200">Warning</Badge>;
    return <Badge variant="outline" className="text-xs">Info</Badge>;
  };

  const renderSection = (title: string, items: any[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title} ({items.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Severity</TableHead>
                  <TableHead>Issue Code</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Suggested Fix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r: any, i: number) => (
                  <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(r)}>
                    <TableCell>{severityBadge(r.severity)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.issue_code}</TableCell>
                    <TableCell className="text-sm">{r.issue_message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.source_table}</TableCell>
                    <TableCell className="font-mono text-xs text-primary">{r.source_document_no || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px]">{r.suggested_fix}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        {grouped.blocking.length > 0 && <Badge variant="destructive">{grouped.blocking.length} Blocking</Badge>}
        {grouped.warnings.length > 0 && <Badge className="bg-amber-100 text-amber-800">{grouped.warnings.length} Warnings</Badge>}
        {grouped.info.length > 0 && <Badge variant="outline">{grouped.info.length} Info</Badge>}
      </div>
      {renderSection("Blocking Issues", grouped.blocking, <XCircle className="h-5 w-5 text-destructive" />)}
      {renderSection("Warnings", grouped.warnings, <AlertTriangle className="h-5 w-5 text-amber-500" />)}
      {renderSection("Info", grouped.info, <Info className="h-5 w-5 text-blue-500" />)}
    </div>
  );
}
