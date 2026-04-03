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
import { getAssetDisplayCode } from "@/lib/assets/getAssetDisplayCode";

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
      // Fetch company info for branding
      let companyName = "GO-ADS 360°";
      let companyGstin = "";
      let companyAddress = "";
      if (campaign.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name, gstin, city, state")
          .eq("id", campaign.company_id)
          .maybeSingle();
        if (company) {
          companyName = company.name || companyName;
          companyGstin = company.gstin || "";
          companyAddress = [company.city, company.state].filter(Boolean).join(", ");
        }
      }

      // Fetch client info
      let clientGstin = "";
      let clientAddress = "";
      if (campaign.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("gst_number, billing_address_line1, billing_city")
          .eq("id", campaign.client_id)
          .maybeSingle();
        if (client) {
          clientGstin = client.gst_number || "";
          clientAddress = [client.billing_address_line1, client.billing_city].filter(Boolean).join(", ");
        }
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 15;

      // ─── Header with company branding ───
      doc.setFillColor(30, 58, 138); // Deep blue
      doc.rect(0, 0, pageWidth, 35, "F");
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(companyName, 15, 16);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (companyAddress) doc.text(companyAddress, 15, 23);
      if (companyGstin) doc.text(`GSTIN: ${companyGstin}`, 15, 29);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("CAMPAIGN REPORT", pageWidth - 15, 20, { align: "right" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth - 15, 27, { align: "right" });

      yPos = 45;
      doc.setTextColor(0, 0, 0);

      // ─── Campaign Info Box ───
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, yPos, pageWidth - 30, 40, 2, 2, "F");
      
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(campaign.campaign_name || "Campaign", 20, yPos + 10);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const col1x = 20, col2x = pageWidth / 2 + 10;
      doc.text(`Campaign ID: ${campaign.id}`, col1x, yPos + 18);
      doc.text(`Client: ${campaign.client_name || "-"}`, col1x, yPos + 25);
      if (clientGstin) doc.text(`Client GSTIN: ${clientGstin}`, col1x, yPos + 32);
      
      const startDate = campaign.start_date ? formatDate(campaign.start_date) : "-";
      const endDate = campaign.end_date ? formatDate(campaign.end_date) : "-";
      const durationDays = campaign.start_date && campaign.end_date
        ? Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;
      
      doc.text(`Period: ${startDate} to ${endDate}`, col2x, yPos + 18);
      doc.text(`Duration: ${durationDays} Days`, col2x, yPos + 25);
      doc.text(`Status: ${campaign.status}`, col2x, yPos + 32);

      yPos += 48;

      // ─── Financial Summary ───
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Financial Summary", 15, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;

      const rentTotal = campaignAssets.reduce((s, a) => s + (a.rent_amount || a.negotiated_rate || a.card_rate || 0), 0);
      const printingTotal = campaignAssets.reduce((s, a) => s + (a.printing_charges || 0), 0);
      const mountingTotal = campaignAssets.reduce((s, a) => s + (a.mounting_charges || 0), 0);

      const financialData = [
        ["Display / Rent Cost", formatCurrency(rentTotal)],
        ["Printing Charges", formatCurrency(printingTotal)],
        ["Mounting Charges", formatCurrency(mountingTotal)],
        ["Taxable Amount", formatCurrency(campaign.total_amount || 0)],
        [`GST (${campaign.gst_percent || 0}%)`, formatCurrency(campaign.gst_amount || 0)],
        ["Grand Total", formatCurrency(campaign.grand_total || 0)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [["Description", "Amount (₹)"]],
        body: financialData,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: "right" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.row.index === financialData.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [219, 234, 254];
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;

      // ─── Performance Metrics ───
      if (yPos > pageHeight - 80) { doc.addPage(); yPos = 20; }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Performance Summary", 15, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;

      const verifiedAssets = campaignAssets.filter(a => a.status === "Verified").length;
      const installedAssets = campaignAssets.filter(a => a.status === "Installed" || a.status === "Proof Uploaded").length;
      const completionRate = campaignAssets.length > 0 ? (verifiedAssets / campaignAssets.length) * 100 : 0;

      autoTable(doc, {
        startY: yPos,
        head: [["Metric", "Value"]],
        body: [
          ["Total Active Assets", String(campaignAssets.length)],
          ["Verified", String(verifiedAssets)],
          ["Installed / Proof Uploaded", String(installedAssets)],
          ["Pending", String(campaignAssets.length - verifiedAssets - installedAssets)],
          ["Completion Rate", `${Math.round(completionRate)}%`],
        ],
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
        columnStyles: { 0: { cellWidth: 100 } },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;

      // ─── Asset Details Table ───
      if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Asset-wise Details", 15, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;

      const assetRows = campaignAssets.map((a, i) => {
        const displayCode = getAssetDisplayCode(
          { media_asset_code: a.media_asset_code },
          a.asset_id
        );
        const assetStart = a.booking_start_date || a.start_date || campaign.start_date;
        const assetEnd = a.booking_end_date || a.end_date || campaign.end_date;
        return [
          String(i + 1),
          displayCode,
          `${a.location || ""}, ${a.city || ""}`.substring(0, 35),
          a.media_type || "-",
          assetStart ? formatDate(assetStart) : "-",
          assetEnd ? formatDate(assetEnd) : "-",
          String(a.booked_days || "-"),
          formatCurrency(a.negotiated_rate || a.card_rate || 0),
          formatCurrency(a.rent_amount || a.total_price || 0),
          a.status || "Pending",
          a.mounter_name || "-",
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Asset Code", "Location", "Type", "Start", "End", "Days", "Rate (₹)", "Amount (₹)", "Status", "Mounter"]],
        body: assetRows,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], fontSize: 7, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 22 },
          2: { cellWidth: 40 },
          3: { cellWidth: 16 },
          4: { cellWidth: 16, halign: "center" },
          5: { cellWidth: 16, halign: "center" },
          6: { cellWidth: 10, halign: "center" },
          7: { cellWidth: 18, halign: "right" },
          8: { cellWidth: 18, halign: "right" },
          9: { cellWidth: 14, halign: "center" },
          10: { cellWidth: 14 },
        },
      });

      // ─── Footer on each page ───
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Bottom line
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.5);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `${companyName} | Confidential`,
          15,
          pageHeight - 10
        );
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 15,
          pageHeight - 10,
          { align: "right" }
        );
      }

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
        <Button variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Campaign Report</DialogTitle>
          <DialogDescription>Download a comprehensive PDF report with full campaign details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Professional PDF report including:
          </p>
          <ul className="text-sm space-y-1.5 ml-4 list-disc text-muted-foreground">
            <li>Company & client branding with GSTIN</li>
            <li>Campaign period, duration & status</li>
            <li>Complete financial breakdown (rent, printing, mounting, GST)</li>
            <li>Performance metrics & completion rates</li>
            <li>Asset-wise details with booking dates, rates & mounter info</li>
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
