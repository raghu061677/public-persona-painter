import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { generatePlanExcel } from "@/lib/plans/generatePlanExcel";
import { toast } from "@/hooks/use-toast";

interface ExportPlanExcelButtonProps {
  planId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ExportPlanExcelButton({
  planId,
  variant = "outline",
  size = "default",
  className,
}: ExportPlanExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await generatePlanExcel(planId);
      toast({
        title: "Excel Generated",
        description: "Plan summary Excel file has been downloaded successfully",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate Excel file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {isExporting ? "Generating..." : "Export Excel"}
    </Button>
  );
}
