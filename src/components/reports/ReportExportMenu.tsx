import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Presentation,
  Archive,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ExportMetadata {
  reportName: string;
  generatedAt: Date;
  dateRange?: { from: Date; to: Date };
  filtersApplied: string[];
  companyName?: string;
}

interface ReportExportMenuProps {
  onExportExcel: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  onExportPPT?: () => Promise<void>;
  onExportAll?: () => Promise<void>;
  metadata: ExportMetadata;
  disabled?: boolean;
}

export function ReportExportMenu({
  onExportExcel,
  onExportPDF,
  onExportPPT,
  onExportAll,
  metadata,
  disabled = false,
}: ReportExportMenuProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: string, exportFn: () => Promise<void>) => {
    setExporting(type);
    try {
      await exportFn();
      toast({
        title: "Export complete",
        description: `${type} file has been downloaded`,
      });
    } catch (error) {
      console.error(`Export ${type} failed:`, error);
      toast({
        title: "Export failed",
        description: `Failed to generate ${type} file`,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || !!exporting}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
              <ChevronDown className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem
          onClick={() => handleExport("Excel", onExportExcel)}
          disabled={!!exporting}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("PDF", onExportPDF)}
          disabled={!!exporting}
        >
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          Export to PDF
        </DropdownMenuItem>
        {onExportPPT && (
          <DropdownMenuItem
            onClick={() => handleExport("PPT", onExportPPT)}
            disabled={!!exporting}
          >
            <Presentation className="h-4 w-4 mr-2 text-orange-600" />
            Export to PPT
          </DropdownMenuItem>
        )}
        {onExportAll && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleExport("All", onExportAll)}
              disabled={!!exporting}
            >
              <Archive className="h-4 w-4 mr-2 text-blue-600" />
              Export All (ZIP)
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <p className="font-medium">{metadata.reportName}</p>
          {metadata.dateRange && (
            <p className="mt-0.5">
              {metadata.dateRange.from.toLocaleDateString()} -{" "}
              {metadata.dateRange.to.toLocaleDateString()}
            </p>
          )}
          {metadata.filtersApplied.length > 0 && (
            <p className="mt-0.5">{metadata.filtersApplied.length} filters applied</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
