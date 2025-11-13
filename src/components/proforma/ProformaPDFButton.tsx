import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateProformaPDF } from "@/lib/proforma/generateProformaPDF";

interface ProformaPDFButtonProps {
  proformaId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ProformaPDFButton = ({ 
  proformaId, 
  variant = "default",
  size = "default" 
}: ProformaPDFButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      // Fetch proforma invoice data
      const { data: proformaData, error: proformaError } = await supabase
        .from('proforma_invoices')
        .select('*')
        .eq('id', proformaId)
        .single() as any;

      if (proformaError) throw proformaError;

      // Fetch proforma invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select('*')
        .eq('proforma_invoice_id', proformaId)
        .order('created_at') as any;

      if (itemsError) throw itemsError;

      if (!itemsData || itemsData.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No items found for this proforma invoice."
        });
        return;
      }

      // Generate PDF
      const pdf = generateProformaPDF({
        ...proformaData,
        items: itemsData
      });

      // Download PDF
      const fileName = `Proforma_${proformaData.proforma_number.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: "Proforma invoice PDF downloaded successfully."
      });

    } catch (error) {
      console.error('Error generating proforma invoice PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate proforma invoice PDF. Please try again."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant={variant}
      size={size}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Download Proforma Invoice (PDF)
        </>
      )}
    </Button>
  );
};