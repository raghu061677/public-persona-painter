import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PlanData {
  id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  client_id: string;
  client_name: string;
  total_amount: number;
  sub_total: number;
  gst_amount: number;
  grand_total: number;
}

interface ClientData {
  id: string;
  name: string;
  gst_number?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  email?: string;
  phone?: string;
}

interface PlanItemData {
  asset_id: string;
  area: string;
  location: string;
  direction?: string;
  dimensions: string;
  total_sqft?: number;
  illumination?: string;
  card_rate: number;
  sales_price: number;
  discount_amount?: number;
  printing_charges: number;
  mounting_charges: number;
  subtotal: number;
  gst_amount: number;
  total_with_gst: number;
}

export async function generatePlanExcel(planId: string): Promise<void> {
  try {
    // Get current user and verify access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    // Fetch plan data with company verification
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*, company_id")
      .eq("id", planId)
      .single();

    if (planError) throw planError;
    if (!plan) throw new Error("Plan not found");

    // Verify user has access to this plan's company
    const { data: userCompany } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("company_id", plan.company_id)
      .single();

    if (!userCompany) {
      throw new Error("You don't have access to this plan");
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", plan.client_id)
      .single();

    if (clientError) throw clientError;

    // Fetch plan items with asset details
    const { data: planItems, error: itemsError } = await supabase
      .from("plan_items")
      .select(`
        *,
        media_assets (
          area,
          location,
          direction,
          dimensions,
          total_sqft,
          illumination
        )
      `)
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;
    if (!planItems || planItems.length === 0) {
      throw new Error("No assets found in this plan");
    }

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Plan Summary", {
      pageSetup: {
        paperSize: 9, // A4
        orientation: "landscape",
        fitToPage: true,
      },
    });

    // Column widths
    worksheet.columns = [
      { width: 6 },   // S.No
      { width: 15 },  // Asset ID
      { width: 15 },  // Area
      { width: 25 },  // Location
      { width: 12 },  // Direction
      { width: 12 },  // Dimensions
      { width: 10 },  // Sqft
      { width: 12 },  // Illumination
      { width: 12 },  // Card Rate
      { width: 14 },  // Negotiated
      { width: 12 },  // Discount
      { width: 12 },  // Printing
      { width: 12 },  // Mounting
      { width: 14 },  // Line Total
      { width: 12 },  // CGST 9%
      { width: 12 },  // SGST 9%
      { width: 14 },  // Total w/ GST
    ];

    let currentRow = 1;

    // Header Section
    const headerRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
    headerRow.getCell(1).value = "GO-ADS 360° – MEDIA PLAN SUMMARY";
    headerRow.getCell(1).font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    headerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 30;
    currentRow++;

    // Plan Details
    worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = `${plan.plan_name} (${plan.id})`;
    worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true, color: { argb: "FF1E40AF" } };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: "center" };
    currentRow++;

    worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = `Duration: ${format(new Date(plan.start_date), "dd MMM yyyy")} - ${format(new Date(plan.end_date), "dd MMM yyyy")} | Exported: ${format(new Date(), "dd MMM yyyy")}`;
    worksheet.getCell(`A${currentRow}`).font = { size: 11, color: { argb: "FF64748B" } };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: "center" };
    currentRow += 2;

    // Client Details Section
    const clientDetailsRow = currentRow;
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = "CLIENT DETAILS";
    worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    currentRow++;

    const clientFields = [
      ["Client Name", client?.name || "N/A"],
      ["GST Number", client?.gst_number || "N/A"],
      ["Address", [
        client?.billing_address_line1,
        client?.billing_address_line2,
        client?.billing_city,
        client?.billing_state,
        client?.billing_pincode,
      ].filter(Boolean).join(", ") || "N/A"],
      ["Email", client?.email || "N/A"],
      ["Mobile", client?.phone || "N/A"],
    ];

    clientFields.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow++;

    // Plan Summary Section
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = "PLAN SUMMARY";
    worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDBEAFE" },
    };
    currentRow++;

    const summaryFields = [
      ["Plan ID", plan.id],
      ["Total Assets", planItems.length],
      ["Total Before GST", `₹${(plan.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["CGST @ 9%", `₹${((plan.gst_amount || 0) / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["SGST @ 9%", `₹${((plan.gst_amount || 0) / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["GRAND TOTAL", `₹${(plan.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
    ];

    summaryFields.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
      worksheet.getCell(`B${currentRow}`).value = value;
      if (label === "GRAND TOTAL") {
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 13, color: { argb: "FF1E40AF" } };
        worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 13, color: { argb: "FF1E40AF" } };
      }
      currentRow++;
    });

    currentRow += 2;

    // Asset Details Table Header
    const tableHeaderRow = currentRow;
    const headers = [
      "S.No",
      "Asset ID",
      "Area",
      "Location",
      "Direction",
      "Dimensions",
      "Sqft",
      "Illumination",
      "Card Rate",
      "Negotiated",
      "Discount",
      "Printing",
      "Mounting",
      "Line Total",
      "CGST 9%",
      "SGST 9%",
      "Total w/ GST",
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    worksheet.getRow(currentRow).height = 25;
    currentRow++;

    // Asset Data Rows
    const dataStartRow = currentRow;
    planItems.forEach((item: any, index: number) => {
      const asset = item.media_assets;
      const rowData = [
        index + 1,
        item.asset_id,
        asset?.area || "N/A",
        asset?.location || "N/A",
        asset?.direction || "N/A",
        asset?.dimensions || "N/A",
        asset?.total_sqft || "",
        asset?.illumination || "N/A",
        item.card_rate || 0,
        item.sales_price || 0,
        item.discount_amount || 0,
        item.printing_charges || 0,
        item.mounting_charges || 0,
        `=J${currentRow}-K${currentRow}+L${currentRow}+M${currentRow}`, // Line Total
        `=N${currentRow}*0.09`, // CGST
        `=N${currentRow}*0.09`, // SGST
        `=N${currentRow}+O${currentRow}+P${currentRow}`, // Total with GST
      ];

      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        
        // Format currency columns
        if ([8, 9, 10, 11, 12, 13, 14, 15, 16].includes(colIndex)) {
          cell.numFmt = '₹#,##0.00';
        }
        
        // Alternating row colors
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB" },
        };
        
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        
        cell.alignment = { vertical: "middle", horizontal: colIndex === 0 ? "center" : "left" };
      });

      currentRow++;
    });

    // Total Summary Row
    const totalRow = currentRow;
    worksheet.getCell(`A${totalRow}`).value = "";
    worksheet.mergeCells(`A${totalRow}:H${totalRow}`);
    worksheet.getCell(`A${totalRow}`).value = "TOTAL";
    worksheet.getCell(`A${totalRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${totalRow}`).alignment = { horizontal: "right" };

    // Sum formulas
    const sumColumns = [
      { col: "I", label: "Card Rate" },
      { col: "J", label: "Negotiated" },
      { col: "K", label: "Discount" },
      { col: "L", label: "Printing" },
      { col: "M", label: "Mounting" },
      { col: "N", label: "Line Total" },
      { col: "O", label: "CGST" },
      { col: "P", label: "SGST" },
      { col: "Q", label: "Grand Total" },
    ];

    sumColumns.forEach(({ col }) => {
      const cell = worksheet.getCell(`${col}${totalRow}`);
      cell.value = { formula: `SUM(${col}${dataStartRow}:${col}${totalRow - 1})` };
      cell.numFmt = '₹#,##0.00';
      cell.font = { bold: true, size: 12 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDBEAFE" },
      };
      cell.border = {
        top: { style: "double" },
        left: { style: "thin" },
        bottom: { style: "double" },
        right: { style: "thin" },
      };
    });

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Download
    const fileName = `Plan_${plan.id}_Summary.xlsx`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error("Error generating Excel:", error);
    throw error;
  }
}
