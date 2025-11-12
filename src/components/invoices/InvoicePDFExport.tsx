import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/utils/finance";

interface InvoicePDFExportProps {
  invoiceId: string;
}

export function InvoicePDFExport({ invoiceId }: InvoicePDFExportProps) {
  const generatePDF = async () => {
    try {
      // Fetch invoice data
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError || !invoice) {
        throw new Error("Failed to fetch invoice details");
      }

      // Fetch organization settings
      const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("*")
        .single();

      // Fetch invoice template settings
      const { data: templateSettings } = await supabase
        .from("invoice_template_settings" as any)
        .select("*")
        .single() as any;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Add logo if available
      if (orgSettings?.logo_url) {
        try {
          doc.addImage(orgSettings.logo_url, "PNG", 15, yPos, 40, 20);
        } catch (e) {
          console.log("Logo loading skipped");
        }
      }

      // Company header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(orgSettings?.organization_name || "Go-Ads 360°", pageWidth - 15, yPos, { align: "right" });
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Out-of-Home Media Management", pageWidth - 15, yPos, { align: "right" });

      yPos += 20;

      // Invoice title and number
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 15, yPos);
      
      doc.setFontSize(12);
      doc.text(invoice.id, pageWidth - 15, yPos, { align: "right" });

      yPos += 15;

      // Client and dates section
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 15, yPos);
      doc.text("Invoice Date:", pageWidth / 2, yPos);
      
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.text(invoice.client_name || "N/A", 15, yPos);
      doc.text(new Date(invoice.invoice_date).toLocaleDateString(), pageWidth / 2, yPos);
      
      yPos += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Campaign:", 15, yPos);
      doc.text("Due Date:", pageWidth / 2, yPos);
      
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.text((invoice as any).campaign_id || "N/A", 15, yPos);
      doc.text(new Date(invoice.due_date).toLocaleDateString(), pageWidth / 2, yPos);

      yPos += 15;

      // Line items table
      const lineItems = (invoice as any).line_items || [];
      const tableData = lineItems.map((item: any) => [
        item.description || "N/A",
        item.quantity?.toString() || "1",
        formatINR(item.rate || 0),
        formatINR(item.amount || 0),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Description", "Qty", "Rate", "Amount"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 40, halign: "right" },
          3: { cellWidth: 40, halign: "right" },
        },
      });

      // @ts-ignore - autoTable adds finalY property
      yPos = doc.lastAutoTable.finalY + 10;

      // Financial summary
      const summaryX = pageWidth - 90;
      doc.setFont("helvetica", "normal");
      
      doc.text("Subtotal:", summaryX, yPos);
      doc.text(formatINR(invoice.sub_total || 0), pageWidth - 15, yPos, { align: "right" });
      
      yPos += 7;
      doc.text(`CGST (${((invoice.gst_amount || 0) / (invoice.sub_total || 1) * 50).toFixed(1)}%):`, summaryX, yPos);
      doc.text(formatINR((invoice.gst_amount || 0) / 2), pageWidth - 15, yPos, { align: "right" });
      
      yPos += 7;
      doc.text(`SGST (${((invoice.gst_amount || 0) / (invoice.sub_total || 1) * 50).toFixed(1)}%):`, summaryX, yPos);
      doc.text(formatINR((invoice.gst_amount || 0) / 2), pageWidth - 15, yPos, { align: "right" });
      
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Total Amount:", summaryX, yPos);
      doc.text(formatINR(invoice.total_amount || 0), pageWidth - 15, yPos, { align: "right" });

      yPos += 15;

      // Payment terms
      if ((templateSettings as any)?.payment_terms) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Payment Terms:", 15, yPos);
        yPos += 7;
        doc.setFont("helvetica", "normal");
        doc.text((templateSettings as any).payment_terms, 15, yPos);
        yPos += 10;
      }

      // Bank details
      if ((templateSettings as any)?.bank_details) {
        doc.setFont("helvetica", "bold");
        doc.text("Bank Details:", 15, yPos);
        yPos += 7;
        doc.setFont("helvetica", "normal");
        const bankLines = doc.splitTextToSize((templateSettings as any).bank_details, pageWidth - 30);
        doc.text(bankLines, 15, yPos);
        yPos += (bankLines.length * 7) + 10;
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(128, 128, 128);
      
      if ((templateSettings as any)?.invoice_footer) {
        const footerLines = doc.splitTextToSize((templateSettings as any).invoice_footer, pageWidth - 30);
        doc.text(footerLines, pageWidth / 2, footerY, { align: "center" });
      } else {
        doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });
      }

      // Save the PDF
      doc.save(`${invoice.id}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Invoice PDF has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Button onClick={generatePDF} variant="outline">
      <FileText className="mr-2 h-4 w-4" />
      Download PDF
    </Button>
  );
}
