import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ChevronDown, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF, INVOICE_TEMPLATES } from '@/lib/invoices/generateInvoicePDF';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  clientName?: string;
  campaignId?: string | null;
}

export function InvoicePDFExport({ invoiceId, clientName, campaignId }: InvoicePDFExportProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [attachProof, setAttachProof] = useState(true);

  const handleDownload = async (templateKey?: string) => {
    setGenerating(true);
    try {
      const options = templateKey === 'invoice_with_proof'
        ? { attachProofGallery: attachProof }
        : undefined;

      const blob = await generateInvoicePDF(invoiceId, templateKey, options);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeId = invoiceId.replace(/\//g, '-');
      const safeName = clientName ? `_${clientName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}` : '';
      a.download = `${safeId}${safeName}.pdf`;
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

  const hasCampaign = !!campaignId;

  return (
    <div className="flex items-center gap-2">
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
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Choose Template</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {INVOICE_TEMPLATES.map((template) => {
              const isProofTemplate = template.key === 'invoice_with_proof';
              const isDisabledProof = isProofTemplate && !hasCampaign;

              return (
                <DropdownMenuItem
                  key={template.key}
                  onClick={() => {
                    if (!isDisabledProof) {
                      handleDownload(template.key);
                    }
                  }}
                  disabled={isDisabledProof}
                >
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-1.5">
                      {isProofTemplate && <ImageIcon className="h-3.5 w-3.5" />}
                      {template.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isDisabledProof
                        ? 'No campaign proof available'
                        : template.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}

            {/* Proof gallery toggle - only shown when campaign exists */}
            {hasCampaign && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="attach-proof"
                      checked={attachProof}
                      onCheckedChange={(checked) => setAttachProof(checked === true)}
                    />
                    <Label htmlFor="attach-proof" className="text-xs cursor-pointer">
                      Attach Campaign Proof Gallery
                    </Label>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">
                    Appends proof photos when using "Invoice With Proof Gallery"
                  </p>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
