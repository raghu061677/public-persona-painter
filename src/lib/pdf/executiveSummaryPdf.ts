import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from './pdfHelpers';
import { ensurePdfUnicodeFont } from './fontLoader';

// ============= TYPES =============

export interface ExecutiveSummaryPDFData {
  // Branding
  companyName: string;
  companyLogoBase64?: string;
  themeColor?: string; // hex e.g. "#1e40af"

  // Period
  dateRangeLabel: string; // e.g. "01 Jan 2026 – 31 Mar 2026"
  generatedAt: string;    // e.g. "18 Mar 2026"

  // KPIs
  invoicedRevenue: number;
  netProfit: number;
  collectionRate: number;
  avgOccupancy: number;
  totalAssets: number;
  bookedAssets: number;
  activeCampaigns: number;
  totalClients: number;
  topCity: string;
  topCityRevenue: number;
  bestROI: number | null;
  bestROIAsset: string;

  // Charts (base64 PNG data URIs)
  revenueTrendChartImage?: string;
  clientConcentrationChartImage?: string;
  profitTrendChartImage?: string;

  // Chart basis label
  clientConcentrationBasis: 'invoiced' | 'booked' | 'none';

  // Client concentration data (for table fallback)
  clientConcentrationData: { name: string; value: number }[];

  // Revenue trend data (for table fallback)
  revenueTrendData: { month: string; revenue: number; expenses: number; profit: number }[];
}

// ============= CONSTANTS =============

const PAGE_W = 210;
const PAGE_H = 297;
const M = 18;       // generous margin
const CW = PAGE_W - 2 * M;

// ============= COLOR HELPERS =============

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16) || 30,
    parseInt(c.slice(2, 4), 16) || 64,
    parseInt(c.slice(4, 6), 16) || 175,
  ];
}

/** Lighten an RGB color towards white */
function lighten(rgb: RGB, amount: number): RGB {
  return rgb.map(c => Math.min(255, Math.round(c + (255 - c) * amount))) as RGB;
}

/** Format large INR values compactly: 12,50,000 → Rs. 12.5L */
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 10000000) return `Rs. ${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `Rs. ${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `Rs. ${(v / 1000).toFixed(1)}K`;
  return formatCurrencyForPDF(v);
}

// ============= PDF GENERATOR =============

export async function generateExecutiveSummaryPDF(data: ExecutiveSummaryPDFData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  await ensurePdfUnicodeFont(doc);

  const theme = hexToRgb(data.themeColor || '#1e40af');
  const themeBg = lighten(theme, 0.92);       // very light tint for card backgrounds
  const themeBgMid = lighten(theme, 0.85);     // slightly darker tint for accents
  const gray: RGB = [107, 114, 128];
  const lightGray: RGB = [156, 163, 175];
  const dark: RGB = [17, 24, 39];
  const white: RGB = [255, 255, 255];
  const divider: RGB = [229, 231, 235];

  let y = 0;

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — HERO COVER
  // ══════════════════════════════════════════════════════════

  // Full-width top accent band
  doc.setFillColor(...theme);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  // ── Top Row: Logo (left) + Date info (right) ──
  y = 18;
  if (data.companyLogoBase64) {
    try {
      doc.addImage(data.companyLogoBase64, 'PNG', M, y - 6, 22, 22);
    } catch { /* skip */ }
  }

  // Date range — top right
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...lightGray);
  doc.text(data.dateRangeLabel, PAGE_W - M, y, { align: 'right' });
  doc.text(`Generated ${data.generatedAt}`, PAGE_W - M, y + 5, { align: 'right' });

  // ── Centered Title Block ──
  y = 95;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...lightGray);
  doc.text('STRATEGIC PERFORMANCE REPORT', PAGE_W / 2, y, { align: 'center' });

  y += 14;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...dark);
  // Truncate long company names
  const displayName = data.companyName.length > 28 ? data.companyName.slice(0, 26) + '...' : data.companyName;
  doc.text(displayName, PAGE_W / 2, y, { align: 'center' });

  y += 10;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...gray);
  doc.text('Executive Summary', PAGE_W / 2, y, { align: 'center' });

  // ── Thin divider ──
  y += 12;
  doc.setDrawColor(...theme);
  doc.setLineWidth(0.6);
  const divLineW = 50;
  doc.line(PAGE_W / 2 - divLineW / 2, y, PAGE_W / 2 + divLineW / 2, y);

  // ── Hero KPI Blocks (4 large KPIs) ──
  y += 24;
  const heroKpis = [
    { label: 'Revenue', value: data.invoicedRevenue > 0 ? fmtCompact(data.invoicedRevenue) : '\u2014' },
    { label: 'Occupancy', value: data.bookedAssets > 0 ? `${data.avgOccupancy}%` : '\u2014' },
    { label: 'Active Campaigns', value: String(data.activeCampaigns) },
    { label: 'Top City', value: data.topCity !== '\u2014' ? data.topCity : '\u2014' },
  ];

  const heroCardW = (CW - 12) / 4;
  const heroCardH = 38;
  heroKpis.forEach((kpi, i) => {
    const x = M + i * (heroCardW + 4);
    // Card background
    doc.setFillColor(...themeBg);
    doc.roundedRect(x, y, heroCardW, heroCardH, 3, 3, 'F');
    // Left accent bar
    doc.setFillColor(...theme);
    doc.rect(x, y + 4, 1.2, heroCardH - 8, 'F');

    // Value
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...dark);
    const valLines = doc.splitTextToSize(kpi.value, heroCardW - 10);
    doc.text(valLines[0] || '', x + 6, y + 17);

    // Label
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text(kpi.label.toUpperCase(), x + 6, y + 28);
  });

  // ── Bottom band ──
  doc.setFillColor(...theme);
  doc.rect(0, PAGE_H - 3, PAGE_W, 3, 'F');

  // Confidential mark
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text('Confidential', M, PAGE_H - 8);
  doc.text(`${data.companyName}`, PAGE_W - M, PAGE_H - 8, { align: 'right' });

  // ══════════════════════════════════════════════════════════
  // PAGE 2 — FINANCIAL INSIGHTS
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  y = renderPremiumHeader(doc, 'Financial Performance', data.companyName, data.dateRangeLabel, theme, gray, dark);

  // Accrual basis pill
  doc.setFillColor(...themeBgMid);
  doc.roundedRect(M, y, 32, 5.5, 1.5, 1.5, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...theme);
  doc.text('ACCRUAL BASIS', M + 2.5, y + 3.8);
  y += 12;

  // ── KPI Stack (left) + Chart (right) ──
  const leftColW = 52;
  const rightColX = M + leftColW + 8;
  const rightColW = CW - leftColW - 8;
  const kpiStartY = y;

  // KPI cards — vertical stack
  const finKpis = [
    { label: 'Invoiced Revenue', value: data.invoicedRevenue > 0 ? fmtCompact(data.invoicedRevenue) : '\u2014', color: theme },
    { label: 'Net Profit', value: data.invoicedRevenue > 0 ? fmtCompact(data.netProfit) : '\u2014', color: data.netProfit >= 0 ? [16, 185, 129] as RGB : [239, 68, 68] as RGB },
    { label: 'Collection Rate', value: data.invoicedRevenue > 0 ? `${data.collectionRate}%` : '\u2014', color: data.collectionRate >= 80 ? [16, 185, 129] as RGB : [245, 158, 11] as RGB },
    { label: 'Avg Occupancy', value: data.bookedAssets > 0 ? `${data.avgOccupancy}%` : '\u2014', color: data.avgOccupancy >= 60 ? [16, 185, 129] as RGB : [245, 158, 11] as RGB },
  ];

  const vCardH = 22;
  const vCardGap = 3;
  finKpis.forEach((kpi, i) => {
    const cardY = kpiStartY + i * (vCardH + vCardGap);
    // Card
    doc.setFillColor(...themeBg);
    doc.roundedRect(M, cardY, leftColW, vCardH, 2, 2, 'F');
    // Left accent
    doc.setFillColor(...kpi.color);
    doc.rect(M, cardY + 3, 1, vCardH - 6, 'F');

    // Label
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(kpi.label.toUpperCase(), M + 5, cardY + 7);

    // Value
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, M + 5, cardY + 17);
  });

  // Revenue vs Expenses chart (right side)
  const chartTopY = kpiStartY;
  const chartH = finKpis.length * (vCardH + vCardGap) - vCardGap;

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text('12-Month Revenue vs Expenses', rightColX, chartTopY - 1);

  if (data.revenueTrendChartImage) {
    try {
      doc.addImage(data.revenueTrendChartImage, 'PNG', rightColX, chartTopY + 3, rightColW, chartH - 5);
    } catch {
      renderRevenueTrendTable(doc, data.revenueTrendData, chartTopY + 3, rightColX, rightColW, theme);
    }
  } else if (data.revenueTrendData.some(d => d.revenue > 0 || d.expenses > 0)) {
    renderRevenueTrendTable(doc, data.revenueTrendData, chartTopY + 3, rightColX, rightColW, theme);
  } else {
    renderEmptyState(doc, 'No revenue or expense data for the selected period.', rightColX, chartTopY + 15, rightColW, gray);
  }

  y = kpiStartY + chartH + 14;

  // ── Thin separator ──
  doc.setDrawColor(...divider);
  doc.setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);
  y += 10;

  // ── Client Concentration (centered below) ──
  const basisLabel = data.clientConcentrationBasis === 'invoiced' ? 'Based on invoiced revenue'
    : data.clientConcentrationBasis === 'booked' ? 'Based on booked value' : '';

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text('Client Revenue Concentration', M, y);
  if (basisLabel) {
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.text(basisLabel, M + doc.getTextWidth('Client Revenue Concentration  ') + 2, y);
  }
  y += 5;

  if (data.clientConcentrationChartImage) {
    try {
      const pieW = CW * 0.6;
      const pieX = M + (CW - pieW) / 2;
      doc.addImage(data.clientConcentrationChartImage, 'PNG', pieX, y, pieW, 55);
      y += 58;
    } catch {
      y = renderClientTable(doc, data.clientConcentrationData, y, M, CW, theme);
    }
  } else if (data.clientConcentrationData.length > 0) {
    y = renderClientTable(doc, data.clientConcentrationData, y, M, CW, theme);
  } else {
    renderEmptyState(doc, 'No invoiced or booked client data in the selected period.', M, y + 10, CW, gray);
    y += 25;
  }

  renderPremiumFooter(doc, data.companyName, gray, theme);

  // ══════════════════════════════════════════════════════════
  // PAGE 3 — CAMPAIGN & INVENTORY INSIGHTS
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  y = renderPremiumHeader(doc, 'Campaign & Inventory Insights', data.companyName, data.dateRangeLabel, theme, gray, dark);

  // ── Operational KPI Grid (2×2) ──
  const gridW = (CW - 6) / 2;
  const gridH = 28;
  const gridKpis = [
    { label: 'AVG OCCUPANCY', value: data.bookedAssets > 0 ? `${data.avgOccupancy}%` : '\u2014', accent: data.avgOccupancy >= 60 ? [16, 185, 129] as RGB : [245, 158, 11] as RGB },
    { label: 'TOTAL ASSETS', value: String(data.totalAssets), accent: theme },
    { label: 'BOOKED ASSETS', value: String(data.bookedAssets), accent: theme },
    { label: 'ACTIVE CAMPAIGNS', value: String(data.activeCampaigns), accent: theme },
  ];

  gridKpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (gridW + 6);
    const cardY = y + row * (gridH + 5);

    doc.setFillColor(...themeBg);
    doc.roundedRect(x, cardY, gridW, gridH, 3, 3, 'F');
    // Top accent line
    doc.setFillColor(...kpi.accent);
    doc.roundedRect(x + 8, cardY, gridW - 16, 1, 0.5, 0.5, 'F');

    // Value
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...dark);
    doc.text(kpi.value, x + gridW / 2, cardY + 15, { align: 'center' });

    // Label
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...gray);
    doc.text(kpi.label, x + gridW / 2, cardY + 23, { align: 'center' });
  });

  y += 2 * (gridH + 5) + 10;

  // ── Highlight Cards: Top City + Best ROI ──
  const hlW = (CW - 6) / 2;
  const hlH = 36;

  // Top City
  doc.setFillColor(...theme);
  doc.roundedRect(M, y, hlW, hlH, 3, 3, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...lighten(white, 0.15));
  doc.text('TOP CITY BY BOOKED VALUE', M + 8, y + 9);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...white);
  const cityDisplay = data.topCity !== '\u2014' ? data.topCity : 'N/A';
  doc.text(cityDisplay.length > 16 ? cityDisplay.slice(0, 14) + '..' : cityDisplay, M + 8, y + 22);
  if (data.topCity !== '\u2014') {
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...lighten(white, 0.2));
    doc.text(fmtCompact(data.topCityRevenue), M + 8, y + 31);
  }

  // Best ROI
  const roiX = M + hlW + 6;
  const purpleAccent: RGB = data.bestROI !== null ? [124, 58, 237] : gray;
  doc.setFillColor(...purpleAccent);
  doc.roundedRect(roiX, y, hlW, hlH, 3, 3, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...lighten(white, 0.15));
  doc.text('BEST ROI ASSET', roiX + 8, y + 9);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...white);
  doc.text(data.bestROI !== null ? `${data.bestROI}%` : 'N/A', roiX + 8, y + 22);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...lighten(white, 0.2));
  const roiSub = data.bestROI !== null ? data.bestROIAsset : 'Insufficient cost data';
  const roiLines = doc.splitTextToSize(roiSub, hlW - 16);
  doc.text(roiLines[0] || '', roiX + 8, y + 31);

  y += hlH + 14;

  // ── Occupancy Bar ──
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text('Inventory Utilisation', M, y);
  y += 6;

  const barW = CW * 0.65;
  const barH = 6;
  // Track
  doc.setFillColor(...divider);
  doc.roundedRect(M, y, barW, barH, barH / 2, barH / 2, 'F');
  // Fill
  const fillW = Math.min(100, data.avgOccupancy) / 100 * barW;
  if (fillW > 0) {
    doc.setFillColor(...theme);
    doc.roundedRect(M, y, Math.max(barH, fillW), barH, barH / 2, barH / 2, 'F');
  }
  // Percentage
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text(`${data.avgOccupancy}%`, M + barW + 5, y + 5);

  // Labels below bar
  y += barH + 4;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text(`${data.bookedAssets} booked of ${data.totalAssets} total assets`, M, y + 3);

  y += 14;

  // ── Monthly Profit Trend ──
  if (data.profitTrendChartImage) {
    if (y + 60 > PAGE_H - 25) {
      renderPremiumFooter(doc, data.companyName, gray, theme);
      doc.addPage();
      y = renderPremiumHeader(doc, 'Profit Trend', data.companyName, data.dateRangeLabel, theme, gray, dark);
    }
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text('Monthly Net Profit Trend', M, y);
    y += 4;
    try {
      doc.addImage(data.profitTrendChartImage, 'PNG', M, y, CW, 48);
      y += 52;
    } catch { /* skip */ }
  }

  // ── Key Insights ──
  y += 4;
  if (y + 25 > PAGE_H - 25) {
    renderPremiumFooter(doc, data.companyName, gray, theme);
    doc.addPage();
    y = renderPremiumHeader(doc, 'Key Insights', data.companyName, data.dateRangeLabel, theme, gray, dark);
  }

  // Thin separator
  doc.setDrawColor(...divider);
  doc.setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);
  y += 8;

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text('Key Insights', M, y);
  y += 6;

  const insights = buildInsights(data);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  insights.forEach(insight => {
    const lines = doc.splitTextToSize(insight, CW - 10);
    if (y + lines.length * 4.5 > PAGE_H - 20) {
      renderPremiumFooter(doc, data.companyName, gray, theme);
      doc.addPage();
      y = renderPremiumHeader(doc, 'Key Insights', data.companyName, data.dateRangeLabel, theme, gray, dark);
    }
    // Bullet dot
    doc.setFillColor(...theme);
    doc.circle(M + 2, y - 1.2, 0.8, 'F');
    lines.forEach((line: string, li: number) => {
      doc.text(line, M + 6, y);
      y += 4.5;
    });
    y += 1.5;
  });

  renderPremiumFooter(doc, data.companyName, gray, theme);

  // ══════════════════════════════════════════════════════════
  // PAGE 4 — METRIC DEFINITIONS (compact)
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  y = renderPremiumHeader(doc, 'Metric Definitions', data.companyName, data.dateRangeLabel, theme, gray, dark);

  const definitions = [
    { metric: 'Invoiced Revenue', def: 'Sum of non-Draft, non-Cancelled invoices in the selected period.' },
    { metric: 'Net Profit', def: 'Invoiced Revenue minus expenses in the selected period.' },
    { metric: 'Collection Rate', def: 'Cash collected against invoices in the selected period, regardless of payment date.' },
    { metric: 'Avg Occupancy', def: 'Booked asset-days divided by total asset-days in the selected period.' },
    { metric: 'Top City', def: 'Highest city by booked commercial value in the selected period.' },
    { metric: 'Best ROI Asset', def: 'Based on booked value versus direct cost where cost data exists.' },
  ];

  definitions.forEach((d) => {
    // Metric name
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(d.metric, M, y);
    y += 4.5;

    // Definition
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    const defLines = doc.splitTextToSize(d.def, CW - 4);
    defLines.forEach((line: string) => {
      doc.text(line, M, y);
      y += 4;
    });
    y += 4;
  });

  renderPremiumFooter(doc, data.companyName, gray, theme);

  // ── Page numbers on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.text(`${p} / ${totalPages}`, PAGE_W / 2, PAGE_H - 6, { align: 'center' });
  }

  return doc.output('blob');
}

// ══════════════════════════════════════════════════════════
// REUSABLE LAYOUT COMPONENTS
// ══════════════════════════════════════════════════════════

/** Premium page header with accent line, title, company name, and period */
function renderPremiumHeader(
  doc: jsPDF,
  title: string,
  companyName: string,
  dateLabel: string,
  theme: RGB,
  gray: RGB,
  dark: RGB,
): number {
  // Top accent line
  doc.setFillColor(...theme);
  doc.rect(0, 0, PAGE_W, 2, 'F');

  let y = 16;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(title, M, y);

  // Company + date right-aligned
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(`${companyName}  |  ${dateLabel}`, PAGE_W - M, y, { align: 'right' });

  // Divider
  y += 5;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);

  return y + 8;
}

/** Premium footer with branding */
function renderPremiumFooter(doc: jsPDF, companyName: string, gray: RGB, theme: RGB) {
  // Thin line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...gray);
  doc.text('Generated by Go-Ads 360\u00B0', M, PAGE_H - 8);
  doc.text(companyName, PAGE_W - M, PAGE_H - 8, { align: 'right' });

  // Bottom accent
  doc.setFillColor(...theme);
  doc.rect(0, PAGE_H - 2, PAGE_W, 2, 'F');
}

/** Renders a centered empty-state message */
function renderEmptyState(doc: jsPDF, message: string, x: number, y: number, w: number, gray: RGB) {
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const lines = doc.splitTextToSize(message, w - 10);
  lines.forEach((line: string) => {
    doc.text(line, x + w / 2, y, { align: 'center' });
    y += 5;
  });
}

// ══════════════════════════════════════════════════════════
// FALLBACK TABLE RENDERERS
// ══════════════════════════════════════════════════════════

function renderRevenueTrendTable(
  doc: jsPDF,
  data: { month: string; revenue: number; expenses: number; profit: number }[],
  startY: number,
  marginLeft: number,
  contentWidth: number,
  theme: RGB,
): number {
  const tableData = data
    .filter(d => d.revenue > 0 || d.expenses > 0)
    .map(d => [d.month, formatCurrencyForPDF(d.revenue), formatCurrencyForPDF(d.expenses), formatCurrencyForPDF(d.profit)]);

  if (tableData.length === 0) return startY + 5;

  autoTable(doc, {
    startY: startY + 2,
    head: [['Month', 'Revenue', 'Expenses', 'Profit']],
    body: tableData,
    theme: 'plain',
    styles: { font: 'NotoSans', fontSize: 7.5, cellPadding: 2.5, textColor: [17, 24, 39] },
    headStyles: { fillColor: [245, 247, 250], textColor: [17, 24, 39], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: marginLeft, right: PAGE_W - marginLeft - contentWidth },
    tableWidth: contentWidth,
  });

  // @ts-ignore
  return doc.lastAutoTable.finalY + 3;
}

function renderClientTable(
  doc: jsPDF,
  data: { name: string; value: number }[],
  startY: number,
  marginLeft: number,
  contentWidth: number,
  theme: RGB,
): number {
  const total = data.reduce((s, d) => s + d.value, 0);
  const tableData = data.map(d => [
    d.name,
    formatCurrencyForPDF(d.value),
    total > 0 ? `${Math.round((d.value / total) * 100)}%` : '\u2014',
  ]);

  autoTable(doc, {
    startY: startY + 2,
    head: [['Client', 'Revenue', 'Share']],
    body: tableData,
    theme: 'plain',
    styles: { font: 'NotoSans', fontSize: 7.5, cellPadding: 2.5, textColor: [17, 24, 39] },
    headStyles: { fillColor: [245, 247, 250], textColor: [17, 24, 39], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: marginLeft, right: marginLeft },
    tableWidth: contentWidth * 0.7,
  });

  // @ts-ignore
  return doc.lastAutoTable.finalY + 3;
}

// ══════════════════════════════════════════════════════════
// INSIGHT BUILDER
// ══════════════════════════════════════════════════════════

function buildInsights(data: ExecutiveSummaryPDFData): string[] {
  const insights: string[] = [];

  if (data.invoicedRevenue > 0) {
    insights.push(`Total invoiced revenue for the period: ${formatCurrencyForPDF(data.invoicedRevenue)}.`);
  } else {
    insights.push('No invoiced revenue recorded in the selected period.');
  }

  if (data.netProfit < 0 && data.invoicedRevenue > 0) {
    insights.push(`Net loss of ${formatCurrencyForPDF(Math.abs(data.netProfit))} recorded. Expenses exceeded revenue.`);
  } else if (data.netProfit > 0) {
    const margin = data.invoicedRevenue > 0 ? Math.round((data.netProfit / data.invoicedRevenue) * 100) : 0;
    insights.push(`Net profit margin: ${margin}%.`);
  }

  if (data.collectionRate < 50 && data.invoicedRevenue > 0) {
    insights.push(`Collection rate is below 50% \u2014 consider following up on outstanding invoices.`);
  }

  if (data.avgOccupancy < 40 && data.totalAssets > 0) {
    insights.push(`Average occupancy is ${data.avgOccupancy}% \u2014 significant vacant inventory available.`);
  } else if (data.avgOccupancy >= 80) {
    insights.push(`Strong occupancy at ${data.avgOccupancy}% \u2014 inventory is well-utilised.`);
  }

  if (data.topCity !== '\u2014') {
    insights.push(`${data.topCity} leads with ${formatCurrencyForPDF(data.topCityRevenue)} in booked value.`);
  }

  if (data.bestROI !== null) {
    insights.push(`Best ROI asset: ${data.bestROIAsset} at ${data.bestROI}% return.`);
  } else {
    insights.push('ROI data unavailable \u2014 ensure printing/mounting costs are recorded for assets.');
  }

  if (insights.length === 0) {
    insights.push('No significant data to derive insights for the selected period.');
  }

  return insights;
}

// ══════════════════════════════════════════════════════════
// CHART-TO-IMAGE UTILITY (unchanged)
// ══════════════════════════════════════════════════════════

/**
 * Captures a Recharts container as a base64 PNG.
 * Pass the container DOM element wrapping the <ResponsiveContainer>.
 */
export function captureChartAsImage(containerEl: HTMLElement): Promise<string | null> {
  return new Promise((resolve) => {
    const svgEl = containerEl.querySelector('svg');
    if (!svgEl) { resolve(null); return; }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // retina
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      const dataUri = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(dataUri);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
