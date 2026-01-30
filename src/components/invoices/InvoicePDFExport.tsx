import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF, INVOICE_TEMPLATES } from '@/lib/invoices/generateInvoicePDF';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface InvoicePDFExportProps {
  invoiceId: string;
}

export function InvoicePDFExport({ invoiceId }: InvoicePDFExportProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async (templateKey?: string) => {
    setGenerating(true);
    try {
      const blob = await generateInvoicePDF(invoiceId, templateKey);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      });
    } catch (error: any) {
      console.error("Error generating Invoice PDF:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate Invoice PDF",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center">
      {/* Main download button - uses default template */}
      <Button 
        onClick={() => handleDownload()} 
        disabled={generating} 
        variant="outline"
        className="rounded-r-none border-r-0"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </>
        )}
      </Button>

      {/* Template selector dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="rounded-l-none"
            disabled={generating}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Choose Template</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {INVOICE_TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.key}
              onClick={() => handleDownload(template.key)}
            >
              <div className="flex flex-col">
                <span className="font-medium">{template.name}</span>
                <span className="text-xs text-muted-foreground">{template.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
