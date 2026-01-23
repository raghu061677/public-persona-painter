import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FileDown, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatDate } from "@/utils/plans";
import { addQrToPdfPage } from "@/lib/reports/addQrToPdf";

interface CampaignPDFReportProps {
  campaign: any;
  campaignAssets: any[];
}

export function CampaignPDFReport({ campaign, campaignAssets }: CampaignPDFReportProps) {
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Campaign Performance Report", pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Campaign Info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Campaign ID: ${campaign.id}`, 20, yPos);
      yPos += 7;
      doc.text(`Display Name: ${campaign.campaign_name}`, 20, yPos);
      yPos += 7;
      doc.text(`Client: ${campaign.client_name}`, 20, yPos);
      yPos += 7;
      
      const startDate = new Date(campaign.start_date);
      const endDate = new Date(campaign.end_date);
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const durationMonths = Math.round(durationDays / 30);
      
      doc.text(`Period: ${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`, 20, yPos);
      yPos += 7;
      doc.text(`Duration: ${durationDays} days (${durationMonths} ${durationMonths === 1 ? 'month' : 'months'})`, 20, yPos);
      yPos += 15;

      // Financial Summary
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Financial Summary", 20, yPos);
      yPos += 10;

      // Calculate costs
      const baseAmount = campaignAssets.reduce((sum, a) => sum + (a.card_rate || 0), 0);
      const printingTotal = campaignAssets.reduce((sum, a) => sum + (a.printing_charges || 0), 0);
      const mountingTotal = campaignAssets.reduce((sum, a) => sum + (a.mounting_charges || 0), 0);
      const subtotal = baseAmount + printingTotal + mountingTotal;
      const discount = subtotal - campaign.total_amount;

      const financialData = [
        ['Base Amount (Card Rates)', formatCurrency(baseAmount)],
        ['Printing Charges', formatCurrency(printingTotal)],
        ['Mounting Charges', formatCurrency(mountingTotal)],
        ['Subtotal', formatCurrency(subtotal)],
        ...(discount > 0 ? [['Discount', `- ${formatCurrency(discount)}`]] : []),
        ['Taxable Amount', formatCurrency(campaign.total_amount)],
        [`GST (${campaign.gst_percent}%)`, formatCurrency(campaign.gst_amount)],
        ['Grand Total', formatCurrency(campaign.grand_total)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Item', 'Amount']],
        body: financialData,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175] },
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Performance Metrics
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Performance Metrics", 20, yPos);
      yPos += 10;

      const verifiedAssets = campaignAssets.filter(a => a.status === 'Verified').length;
      const completionRate = campaignAssets.length > 0 ? (verifiedAssets / campaignAssets.length) * 100 : 0;
      const costPerAsset = campaignAssets.length > 0 ? campaign.grand_total / campaignAssets.length : 0;

      const metricsData = [
        ['Total Assets', campaignAssets.length.toString()],
        ['Verified Assets', verifiedAssets.toString()],
        ['Completion Rate', `${Math.round(completionRate)}%`],
        ['Cost per Asset', formatCurrency(costPerAsset)],
        ['Campaign Status', campaign.status],
      ];

      autoTable(doc, {
        startY: yPos,
        body: metricsData,
        theme: 'plain',
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Assets Summary
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Assets Summary", 20, yPos);
      yPos += 10;

      // Add QR codes to top-right corner for each asset with QR available
      for (const asset of campaignAssets) {
        if (asset.qr_code_url) {
          await addQrToPdfPage(doc, asset.qr_code_url, 160, 15, 30);
        }
      }

      const assetsData = campaignAssets.map(asset => [
        asset.asset_id,
        `${asset.location}, ${asset.city}`,
        asset.status,
        asset.mounter_name || '-',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Asset ID', 'Location', 'Status', 'Mounter']],
        body: assetsData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save PDF
      doc.save(`Campaign-Report-${campaign.id}.pdf`);

      toast({
        title: "Success",
        description: "Campaign report downloaded successfully",
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Campaign Report</DialogTitle>
          <DialogDescription>Download a comprehensive PDF report of the campaign</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Generate a comprehensive PDF report including:
          </p>
          <ul className="text-sm space-y-2 ml-4 list-disc text-muted-foreground">
            <li>Campaign overview and period details</li>
            <li>Complete financial breakdown with all charges</li>
            <li>Performance metrics and completion status</li>
            <li>Assets summary with status tracking</li>
            <li>Professional formatting for client delivery</li>
          </ul>
          <Button onClick={generatePDF} disabled={generating} className="w-full">
            {generating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
