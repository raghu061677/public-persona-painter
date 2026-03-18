import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from './pdfHelpers';
import { ensurePdfUnicodeFont } from './fontLoader';
import { format } from 'date-fns';

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

// ============= HELPERS =============

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16) || 30,
    parseInt(c.slice(2, 4), 16) || 64,
    parseInt(c.slice(4, 6), 16) || 175,
  ];
}

const PAGE_W = 210; // A4 portrait mm
const PAGE_H = 297;
const M = 16;  // margin
const CW = PAGE_W - 2 * M; // content width

// ============= PDF GENERATOR =============

export async function generateExecutiveSummaryPDF(data: ExecutiveSummaryPDFData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  await ensurePdfUnicodeFont(doc);

  const theme = hexToRgb(data.themeColor || '#1e40af');
  const gray = [107, 114, 128] as [number, number, number];
  const dark = [17, 24, 39] as [number, number, number];

  let y = 0;

  // ==================== PAGE 1 — COVER ====================
  // Top accent bar
  doc.setFillColor(...theme);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  y = 30;

  // Logo
  if (data.companyLogoBase64) {
    try {
      doc.addImage(data.companyLogoBase64, 'PNG', M, y, 20, 20);
    } catch { /* skip */ }
  }

  // Company name
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...theme);
  doc.text(data.companyName || 'Company', data.companyLogoBase64 ? M + 25 : M, y + 14);

  // Divider
  y = 60;
  doc.setDrawColor(...theme);
  doc.setLineWidth(0.8);
  doc.line(M, y, PAGE_W - M, y);

  // Title
  y = 80;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...dark);
  doc.text('Executive Summary', M, y);

  // Strategic subtitle
  y += 10;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...gray);
  doc.text('Strategic performance snapshot for the selected period', M, y);

  // Period label
  y += 10;
  doc.setFontSize(13);
  doc.setTextColor(...gray);
  doc.text(data.dateRangeLabel, M, y);

  // Key stats block
  y += 30;
  const coverStats = [
    { label: 'Total Assets', value: String(data.totalAssets) },
    { label: 'Booked Assets', value: String(data.bookedAssets) },
    { label: 'Active Campaigns', value: String(data.activeCampaigns) },
    { label: 'Total Clients', value: String(data.totalClients) },
  ];

  const statW = CW / coverStats.length;
  coverStats.forEach((s, i) => {
    const x = M + i * statW;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x + 1, y, statW - 2, 22, 2, 2, 'F');
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...theme);
    doc.text(s.value, x + statW / 2, y + 10, { align: 'center' });
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(s.label, x + statW / 2, y + 18, { align: 'center' });
  });

  // Bottom accent bar
  doc.setFillColor(...theme);
  doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F');

  // Generated date
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(`Generated on ${data.generatedAt}`, M, PAGE_H - 10);
  doc.text('Confidential', PAGE_W - M, PAGE_H - 10, { align: 'right' });

  // ==================== PAGE 2 — PERFORMANCE SNAPSHOT ====================
  doc.addPage();

  // Header
  y = renderPageHeader(doc, 'Performance Snapshot', data.companyName, theme, gray);

  // Accrual basis badge
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(M, y - 3, 30, 6, 1, 1, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...gray);
  doc.text('ACCRUAL BASIS', M + 2, y + 1);
  y += 7;

  // KPI Cards — 2 rows × 4 cols
  const kpis = [
    { label: 'Invoiced Revenue', value: formatCurrencyForPDF(data.invoicedRevenue), color: theme },
    { label: 'Net Profit', value: data.invoicedRevenue > 0 ? formatCurrencyForPDF(data.netProfit) : '—', color: data.netProfit >= 0 ? [16, 185, 129] as [number, number, number] : [239, 68, 68] as [number, number, number] },
    { label: 'Collection Rate', value: data.invoicedRevenue > 0 ? `${data.collectionRate}%` : '—', color: data.collectionRate >= 80 ? [16, 185, 129] as [number, number, number] : [245, 158, 11] as [number, number, number] },
    { label: 'Avg Occupancy', value: data.bookedAssets > 0 ? `${data.avgOccupancy}%` : '—', color: data.avgOccupancy >= 60 ? [16, 185, 129] as [number, number, number] : [245, 158, 11] as [number, number, number] },
  ];

  const cardW = (CW - 6) / 4;
  const cardH = 24;
  kpis.forEach((k, i) => {
    const x = M + i * (cardW + 2);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S');

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text(k.label, x + 4, y + 7);

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...k.color);
    doc.text(k.value, x + 4, y + 18);
  });

  y += cardH + 10;

  // Revenue vs Expenses chart
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text('12-Month Revenue vs Expenses', M, y);
  y += 3;

  if (data.revenueTrendChartImage) {
    try {
      doc.addImage(data.revenueTrendChartImage, 'PNG', M, y, CW, 55);
      y += 58;
    } catch {
      y = renderRevenueTrendTable(doc, data.revenueTrendData, y, M, CW, theme);
    }
  } else if (data.revenueTrendData.some(d => d.revenue > 0 || d.expenses > 0)) {
    y = renderRevenueTrendTable(doc, data.revenueTrendData, y, M, CW, theme);
  } else {
    y += 3;
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('No revenue or expense data available for the selected period.', M, y);
    y += 10;
  }

  // Client Concentration
  y += 5;
  const basisLabel = data.clientConcentrationBasis === 'invoiced' ? 'Based on invoiced revenue'
    : data.clientConcentrationBasis === 'booked' ? 'Based on booked value' : '';

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text('Client Revenue Concentration', M, y);
  if (basisLabel) {
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(basisLabel, M + 57, y);
  }
  y += 3;

  if (data.clientConcentrationChartImage) {
    try {
      doc.addImage(data.clientConcentrationChartImage, 'PNG', M + 20, y, CW - 40, 50);
      y += 53;
    } catch {
      y = renderClientTable(doc, data.clientConcentrationData, y, M, CW, theme);
    }
  } else if (data.clientConcentrationData.length > 0) {
    y = renderClientTable(doc, data.clientConcentrationData, y, M, CW, theme);
  } else {
    y += 3;
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('No invoiced or booked client data in the selected period.', M, y);
    y += 10;
  }

  // Footer
  renderPageFooter(doc, 2, gray);

  // ==================== PAGE 3 — OPERATIONAL INSIGHTS ====================
  doc.addPage();
  y = renderPageHeader(doc, 'Operational Insights', data.companyName, theme, gray);

  // Top City & Best ROI side by side
  const halfW = (CW - 4) / 2;

  // Top City card
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(M, y, halfW, 30, 2, 2, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text('Top City by Booked Value', M + 5, y + 8);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...theme);
  doc.text(data.topCity !== '—' ? data.topCity : 'N/A', M + 5, y + 20);
  if (data.topCity !== '—') {
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(formatCurrencyForPDF(data.topCityRevenue), M + 5, y + 27);
  }

  // Best ROI card
  const roiX = M + halfW + 4;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(roiX, y, halfW, 30, 2, 2, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text('Best ROI Asset', roiX + 5, y + 8);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(data.bestROI !== null ? 124 : 107, data.bestROI !== null ? 58 : 114, data.bestROI !== null ? 237 : 128);
  doc.text(data.bestROI !== null ? `${data.bestROI}%` : 'N/A', roiX + 5, y + 20);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  const roiSubText = data.bestROI !== null ? data.bestROIAsset : 'Insufficient cost data';
  const roiSubLines = doc.splitTextToSize(roiSubText, halfW - 10);
  doc.text(roiSubLines[0] || '', roiX + 5, y + 27);

  y += 40;

  // Occupancy breakdown
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text('Occupancy Summary', M, y);
  y += 4;

  // Simple occupancy bar
  const occBarW = CW * 0.6;
  const occFill = Math.min(100, data.avgOccupancy) / 100 * occBarW;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(M, y, occBarW, 8, 2, 2, 'F');
  if (occFill > 0) {
    doc.setFillColor(...theme);
    doc.roundedRect(M, y, Math.max(4, occFill), 8, 2, 2, 'F');
  }
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(`${data.avgOccupancy}%`, M + occBarW + 4, y + 6);
  y += 14;

  // Stats mini-table
  const insightStats = [
    ['Total Assets', String(data.totalAssets)],
    ['Booked (Period)', String(data.bookedAssets)],
    ['Vacant', String(Math.max(0, data.totalAssets - data.bookedAssets))],
    ['Active Campaigns', String(data.activeCampaigns)],
    ['Collection Rate', data.invoicedRevenue > 0 ? `${data.collectionRate}%` : 'N/A'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: insightStats,
    theme: 'grid',
    styles: { font: 'NotoSans', fontSize: 9, cellPadding: 3, textColor: dark, lineColor: [229, 231, 235], lineWidth: 0.3 },
    headStyles: { fillColor: [245, 247, 250], textColor: dark, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' } },
    margin: { left: M, right: M },
    tableWidth: CW * 0.55,
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 12;

  // Monthly Profit chart
  if (data.profitTrendChartImage) {
    if (y + 65 > PAGE_H - 20) {
      doc.addPage();
      y = renderPageHeader(doc, 'Profit Trend', data.companyName, theme, gray);
    }
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text('Monthly Net Profit Trend', M, y);
    y += 3;
    try {
      doc.addImage(data.profitTrendChartImage, 'PNG', M, y, CW, 50);
      y += 53;
    } catch { /* skip */ }
  }

  // Key insights
  y += 5;
  if (y + 30 > PAGE_H - 20) {
    doc.addPage();
    y = renderPageHeader(doc, 'Key Insights', data.companyName, theme, gray);
  }

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text('Key Insights', M, y);
  y += 6;

  const insights = buildInsights(data);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  insights.forEach(insight => {
    const lines = doc.splitTextToSize(`• ${insight}`, CW - 5);
    if (y + lines.length * 5 > PAGE_H - 15) {
      doc.addPage();
      y = renderPageHeader(doc, 'Key Insights (continued)', data.companyName, theme, gray);
    }
    lines.forEach((line: string) => {
      doc.text(line, M + 2, y);
      y += 5;
    });
    y += 1;
  });

  renderPageFooter(doc, 3, gray);

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - M, PAGE_H - 6, { align: 'right' });
  }

  return doc.output('blob');
}

// ============= SUB-RENDERERS =============

function renderPageHeader(
  doc: jsPDF,
  title: string,
  companyName: string,
  theme: [number, number, number],
  gray: [number, number, number],
): number {
  // Accent line
  doc.setFillColor(...theme);
  doc.rect(0, 0, PAGE_W, 2, 'F');

  let y = 14;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...theme);
  doc.text(title, M, y);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(companyName, PAGE_W - M, y, { align: 'right' });

  // Divider
  y += 4;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(M, y, PAGE_W - M, y);

  return y + 8;
}

function renderPageFooter(doc: jsPDF, _pageNum: number, gray: [number, number, number]) {
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(M, PAGE_H - 12, PAGE_W - M, PAGE_H - 12);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text('Confidential — For internal and client use only', M, PAGE_H - 6);
}

function renderRevenueTrendTable(
  doc: jsPDF,
  data: { month: string; revenue: number; expenses: number; profit: number }[],
  startY: number,
  marginLeft: number,
  contentWidth: number,
  theme: [number, number, number],
): number {
  const tableData = data
    .filter(d => d.revenue > 0 || d.expenses > 0)
    .map(d => [d.month, formatCurrencyForPDF(d.revenue), formatCurrencyForPDF(d.expenses), formatCurrencyForPDF(d.profit)]);

  if (tableData.length === 0) return startY + 5;

  autoTable(doc, {
    startY: startY + 2,
    head: [['Month', 'Revenue', 'Expenses', 'Profit']],
    body: tableData,
    theme: 'grid',
    styles: { font: 'NotoSans', fontSize: 8, cellPadding: 2.5, textColor: [17, 24, 39], lineColor: [229, 231, 235], lineWidth: 0.3 },
    headStyles: { fillColor: [245, 247, 250], textColor: [17, 24, 39], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: marginLeft, right: marginLeft },
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
  theme: [number, number, number],
): number {
  const total = data.reduce((s, d) => s + d.value, 0);
  const tableData = data.map(d => [
    d.name,
    formatCurrencyForPDF(d.value),
    total > 0 ? `${Math.round((d.value / total) * 100)}%` : '—',
  ]);

  autoTable(doc, {
    startY: startY + 2,
    head: [['Client', 'Revenue', 'Share']],
    body: tableData,
    theme: 'grid',
    styles: { font: 'NotoSans', fontSize: 8, cellPadding: 2.5, textColor: [17, 24, 39], lineColor: [229, 231, 235], lineWidth: 0.3 },
    headStyles: { fillColor: [245, 247, 250], textColor: [17, 24, 39], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: marginLeft, right: marginLeft },
    tableWidth: contentWidth * 0.7,
  });

  // @ts-ignore
  return doc.lastAutoTable.finalY + 3;
}

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
    insights.push(`Collection rate is below 50% — consider following up on outstanding invoices.`);
  }

  if (data.avgOccupancy < 40 && data.totalAssets > 0) {
    insights.push(`Average occupancy is ${data.avgOccupancy}% — significant vacant inventory available.`);
  } else if (data.avgOccupancy >= 80) {
    insights.push(`Strong occupancy at ${data.avgOccupancy}% — inventory is well-utilized.`);
  }

  if (data.topCity !== '—') {
    insights.push(`${data.topCity} leads with ${formatCurrencyForPDF(data.topCityRevenue)} in booked value.`);
  }

  if (data.bestROI !== null) {
    insights.push(`Best ROI asset: ${data.bestROIAsset} at ${data.bestROI}% return.`);
  } else {
    insights.push('ROI data unavailable — ensure printing/mounting costs are recorded for assets.');
  }

  if (insights.length === 0) {
    insights.push('No significant data to derive insights for the selected period.');
  }

  return insights;
}

// ============= CHART-TO-IMAGE UTILITY =============

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
