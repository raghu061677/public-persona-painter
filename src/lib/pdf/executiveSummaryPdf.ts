import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from './pdfHelpers';
import { ensurePdfUnicodeFont } from './fontLoader';

// ============= TYPES =============

export interface ExecutiveSummaryPDFData {
  companyName: string;
  companyLogoBase64?: string;
  themeColor?: string;
  dateRangeLabel: string;
  generatedAt: string;
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
  revenueTrendChartImage?: string;
  clientConcentrationChartImage?: string;
  profitTrendChartImage?: string;
  clientConcentrationBasis: 'invoiced' | 'booked' | 'none';
  clientConcentrationData: { name: string; value: number }[];
  revenueTrendData: { month: string; revenue: number; expenses: number; profit: number }[];
}

// ============= CONSTANTS =============

const PAGE_W = 210;
const PAGE_H = 297;
const M = 18;
const CW = PAGE_W - 2 * M;

// ============= PALETTE =============

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16) || 30,
    parseInt(c.slice(2, 4), 16) || 64,
    parseInt(c.slice(4, 6), 16) || 175,
  ];
}

function lighten(rgb: RGB, amount: number): RGB {
  return rgb.map(c => Math.min(255, Math.round(c + (255 - c) * amount))) as RGB;
}

function darken(rgb: RGB, amount: number): RGB {
  return rgb.map(c => Math.max(0, Math.round(c * (1 - amount)))) as RGB;
}

/** Compact INR: 12,50,000 → Rs. 12.5L */
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 10000000) return `Rs. ${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `Rs. ${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `Rs. ${(v / 1000).toFixed(1)}K`;
  return formatCurrencyForPDF(v);
}

// Shared palette object built once per export
interface Palette {
  theme: RGB;
  themeBg: RGB;       // very light tint
  themeBgMid: RGB;    // mid tint
  themeDark: RGB;     // darker shade
  dark: RGB;
  body: RGB;          // secondary neutral for body text
  gray: RGB;
  lightGray: RGB;
  muted: RGB;         // ultra-light for backgrounds
  white: RGB;
  divider: RGB;
  success: RGB;
  warning: RGB;
  danger: RGB;
  purple: RGB;
}

function buildPalette(themeHex: string): Palette {
  const theme = hexToRgb(themeHex);
  return {
    theme,
    themeBg: lighten(theme, 0.93),
    themeBgMid: lighten(theme, 0.86),
    themeDark: darken(theme, 0.15),
    dark: [17, 24, 39],
    body: [55, 65, 81],        // secondary neutral — softer than dark
    gray: [107, 114, 128],
    lightGray: [156, 163, 175],
    muted: [243, 244, 246],    // F3F4F6
    white: [255, 255, 255],
    divider: [229, 231, 235],
    success: [16, 185, 129],
    warning: [245, 158, 11],
    danger: [239, 68, 68],
    purple: [124, 58, 237],
  };
}

// ============= MICRO RENDERERS =============

/** Render a contextual insight line with themed bullet */
function renderInsightLine(doc: jsPDF, text: string, x: number, y: number, maxW: number, p: Palette): number {
  doc.setFillColor(...p.theme);
  doc.circle(x + 1.5, y - 1, 0.7, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...p.body);
  const lines = doc.splitTextToSize(text, maxW - 8);
  lines.forEach((line: string) => {
    doc.text(line, x + 5, y);
    y += 4;
  });
  return y + 1;
}

/** Section sub-header with small left accent */
function renderSectionLabel(doc: jsPDF, label: string, x: number, y: number, p: Palette): number {
  doc.setFillColor(...p.theme);
  doc.rect(x, y - 2.5, 1.5, 3.5, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...p.dark);
  doc.text(label, x + 5, y);
  return y + 6;
}

/** Subtle dot-pattern background for cover */
function renderCoverBackground(doc: jsPDF, p: Palette) {
  // Light tinted band across center
  doc.setFillColor(...p.themeBg);
  doc.rect(0, 70, PAGE_W, 85, 'F');
  // Subtle diagonal accent line
  doc.setDrawColor(...lighten(p.theme, 0.7));
  doc.setLineWidth(0.15);
  for (let i = 0; i < 8; i++) {
    const offset = 30 + i * 25;
    doc.line(offset, 70, offset + 85, 155);
  }
}

// ============= PDF GENERATOR =============

export async function generateExecutiveSummaryPDF(data: ExecutiveSummaryPDFData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  await ensurePdfUnicodeFont(doc);

  const p = buildPalette(data.themeColor || '#1e40af');
  let y = 0;

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — HERO COVER
  // ══════════════════════════════════════════════════════════

  // Subtle background pattern
  renderCoverBackground(doc, p);

  // Top accent band
  doc.setFillColor(...p.theme);
  doc.rect(0, 0, PAGE_W, 3.5, 'F');

  // ── Top Row: Logo (left) + Date info (right) ──
  y = 20;
  if (data.companyLogoBase64) {
    try {
      doc.addImage(data.companyLogoBase64, 'PNG', M, y - 7, 24, 24);
    } catch { /* skip */ }
  }

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...p.lightGray);
  doc.text(data.dateRangeLabel, PAGE_W - M, y - 1, { align: 'right' });
  doc.text(`Generated ${data.generatedAt}`, PAGE_W - M, y + 4, { align: 'right' });

  // ── Centered Title Block (over tinted band) ──
  y = 90;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...p.gray);
  doc.text('STRATEGIC PERFORMANCE REPORT', PAGE_W / 2, y, { align: 'center' });

  y += 14;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...p.dark);
  const displayName = data.companyName.length > 28 ? data.companyName.slice(0, 26) + '...' : data.companyName;
  doc.text(displayName, PAGE_W / 2, y, { align: 'center' });

  y += 9;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...p.gray);
  doc.text('Executive Summary', PAGE_W / 2, y, { align: 'center' });

  // 1-line cover insight
  y += 9;
  doc.setFontSize(8);
  doc.setTextColor(...p.body);
  const coverInsight = data.invoicedRevenue > 0
    ? `${fmtCompact(data.invoicedRevenue)} invoiced across ${data.activeCampaigns} active campaign${data.activeCampaigns !== 1 ? 's' : ''}`
    : `${data.totalAssets} assets managed across ${data.totalClients} client${data.totalClients !== 1 ? 's' : ''}`;
  doc.text(coverInsight, PAGE_W / 2, y, { align: 'center' });

  // ── Center divider ──
  y += 10;
  doc.setDrawColor(...p.theme);
  doc.setLineWidth(0.7);
  doc.line(PAGE_W / 2 - 22, y, PAGE_W / 2 + 22, y);

  // ── Hero KPI Blocks ──
  y += 18;
  const heroKpis = [
    { label: 'REVENUE', value: data.invoicedRevenue > 0 ? fmtCompact(data.invoicedRevenue) : '\u2014' },
    { label: 'OCCUPANCY', value: data.bookedAssets > 0 ? `${data.avgOccupancy}%` : '\u2014' },
    { label: 'CAMPAIGNS', value: String(data.activeCampaigns) },
    { label: 'TOP CITY', value: data.topCity !== '\u2014' ? data.topCity : '\u2014' },
  ];

  const heroCardW = (CW - 12) / 4;
  const heroCardH = 40;
  heroKpis.forEach((kpi, i) => {
    const x = M + i * (heroCardW + 4);
    // Card with soft border
    doc.setFillColor(...p.white);
    doc.setDrawColor(...p.divider);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, heroCardW, heroCardH, 3, 3, 'FD');
    // Top accent line
    doc.setFillColor(...p.theme);
    doc.roundedRect(x + 6, y, heroCardW - 12, 1.2, 0.6, 0.6, 'F');

    // Value — larger
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...p.dark);
    const valLines = doc.splitTextToSize(kpi.value, heroCardW - 10);
    doc.text(valLines[0] || '', x + heroCardW / 2, y + 19, { align: 'center' });

    // Label
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...p.lightGray);
    doc.text(kpi.label, x + heroCardW / 2, y + 30, { align: 'center' });
  });

  // ── Cover bottom ──
  doc.setFillColor(...p.theme);
  doc.rect(0, PAGE_H - 3.5, PAGE_W, 3.5, 'F');

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...p.lightGray);
  doc.text('Confidential', M, PAGE_H - 9);
  doc.text(data.companyName, PAGE_W - M, PAGE_H - 9, { align: 'right' });

  // ══════════════════════════════════════════════════════════
  // PAGE 2 — FINANCIAL INSIGHTS
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  y = renderPremiumHeader(doc, 'Financial Performance', data.companyName, data.dateRangeLabel, p);

  // Accrual basis pill
  doc.setFillColor(...p.themeBgMid);
  doc.roundedRect(M, y, 32, 5.5, 2, 2, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...p.theme);
  doc.text('ACCRUAL BASIS', M + 2.5, y + 3.8);
  y += 12;

  // ── KPI Stack (left) + Chart (right) ──
  const leftColW = 52;
  const rightColX = M + leftColW + 8;
  const rightColW = CW - leftColW - 8;
  const kpiStartY = y;

  const finKpis = [
    { label: 'Invoiced Revenue', value: data.invoicedRevenue > 0 ? fmtCompact(data.invoicedRevenue) : '\u2014', color: p.theme },
    { label: 'Net Profit', value: data.invoicedRevenue > 0 ? fmtCompact(data.netProfit) : '\u2014', color: data.netProfit >= 0 ? p.success : p.danger },
    { label: 'Collection Rate', value: data.invoicedRevenue > 0 ? `${data.collectionRate}%` : '\u2014', color: data.collectionRate >= 80 ? p.success : p.warning },
    { label: 'Avg Occupancy', value: data.bookedAssets > 0 ? `${data.avgOccupancy}%` : '\u2014', color: data.avgOccupancy >= 60 ? p.success : p.warning },
  ];

  const vCardH = 22;
  const vCardGap = 3;
  finKpis.forEach((kpi, i) => {
    const cardY = kpiStartY + i * (vCardH + vCardGap);
    // Card bg + subtle border
    doc.setFillColor(...p.themeBg);
    doc.setDrawColor(...p.divider);
    doc.setLineWidth(0.15);
    doc.roundedRect(M, cardY, leftColW, vCardH, 2, 2, 'FD');
    // Left accent
    doc.setFillColor(...kpi.color);
    doc.roundedRect(M, cardY + 3, 1.2, vCardH - 6, 0.6, 0.6, 'F');

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...p.gray);
    doc.text(kpi.label.toUpperCase(), M + 5, cardY + 7);

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, M + 5, cardY + 17);
  });

  // Chart (right side)
  const chartTopY = kpiStartY;
  const chartH = finKpis.length * (vCardH + vCardGap) - vCardGap;

  y = renderSectionLabel(doc, '12-Month Revenue vs Expenses', rightColX, chartTopY - 1, p);

  if (data.revenueTrendChartImage) {
    try {
      doc.addImage(data.revenueTrendChartImage, 'PNG', rightColX, chartTopY + 5, rightColW, chartH - 7);
    } catch {
      renderRevenueTrendTable(doc, data.revenueTrendData, chartTopY + 5, rightColX, rightColW, p);
    }
  } else if (data.revenueTrendData.some(d => d.revenue > 0 || d.expenses > 0)) {
    renderRevenueTrendTable(doc, data.revenueTrendData, chartTopY + 5, rightColX, rightColW, p);
  } else {
    renderEmptyState(doc, 'No revenue or expense data for the selected period.', rightColX, chartTopY + 18, rightColW, p);
  }

  // Financial insights below KPI stack
  y = kpiStartY + chartH + 6;
  const finInsights = buildFinancialInsights(data);
  finInsights.forEach(ins => { y = renderInsightLine(doc, ins, M, y, CW, p); });

  // ── Separator ──
  y += 4;
  doc.setDrawColor(...p.divider);
  doc.setLineWidth(0.15);
  doc.line(M, y, PAGE_W - M, y);
  y += 8;

  // ── Client Concentration ──
  const basisLabel = data.clientConcentrationBasis === 'invoiced' ? 'Based on invoiced revenue'
    : data.clientConcentrationBasis === 'booked' ? 'Based on booked value' : '';

  y = renderSectionLabel(doc, 'Client Revenue Concentration', M, y, p);
  if (basisLabel) {
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...p.lightGray);
    doc.text(basisLabel, M + 5, y - 1);
    y += 3;
  }

  if (data.clientConcentrationChartImage) {
    try {
      const pieW = CW * 0.55;
      const pieX = M + (CW - pieW) / 2;
      doc.addImage(data.clientConcentrationChartImage, 'PNG', pieX, y, pieW, 52);
      y += 55;
    } catch {
      y = renderClientTable(doc, data.clientConcentrationData, y, M, CW, p);
    }
  } else if (data.clientConcentrationData.length > 0) {
    y = renderClientTable(doc, data.clientConcentrationData, y, M, CW, p);
  } else {
    renderEmptyState(doc, 'No invoiced or booked client data in the selected period.', M, y + 8, CW, p);
    y += 22;
  }

  // Client concentration insight
  if (data.clientConcentrationData.length > 0) {
    const topClient = data.clientConcentrationData[0];
    const total = data.clientConcentrationData.reduce((s, d) => s + d.value, 0);
    if (total > 0) {
      const share = Math.round((topClient.value / total) * 100);
      y = renderInsightLine(doc, `${topClient.name} accounts for ${share}% of total revenue \u2014 ${share > 50 ? 'high concentration risk' : 'healthy distribution'}.`, M, y + 2, CW, p);
    }
  }

  renderPremiumFooter(doc, data.companyName, p);

  // ══════════════════════════════════════════════════════════
  // PAGE 3 — CAMPAIGN & INVENTORY INSIGHTS
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  y = renderPremiumHeader(doc, 'Campaign & Inventory Insights', data.companyName, data.dateRangeLabel, p);

  // ── Operational KPI Grid (2×2) ──
  const gridW = (CW - 6) / 2;
  const gridH = 30;
  const gridKpis = [
    { label: 'AVG OCCUPANCY', value: data.bookedAssets > 0 ? `${data.avgOccupancy}%` : '\u2014', accent: data.avgOccupancy >= 60 ? p.success : p.warning },
    { label: 'TOTAL ASSETS', value: String(data.totalAssets), accent: p.theme },
    { label: 'BOOKED ASSETS', value: String(data.bookedAssets), accent: p.theme },
    { label: 'ACTIVE CAMPAIGNS', value: String(data.activeCampaigns), accent: p.theme },
  ];

  gridKpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (gridW + 6);
    const cardY = y + row * (gridH + 5);

    // White card with soft border
    doc.setFillColor(...p.white);
    doc.setDrawColor(...p.divider);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cardY, gridW, gridH, 3, 3, 'FD');
    // Top accent line
    doc.setFillColor(...kpi.accent);
    doc.roundedRect(x + 8, cardY + 0.5, gridW - 16, 1.2, 0.6, 0.6, 'F');

    // Value
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...p.dark);
    doc.text(kpi.value, x + gridW / 2, cardY + 16, { align: 'center' });

    // Label
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...p.lightGray);
    doc.text(kpi.label, x + gridW / 2, cardY + 24, { align: 'center' });
  });

  y += 2 * (gridH + 5) + 4;

  // Grid insights
  const gridInsights = buildOperationalInsights(data);
  gridInsights.forEach(ins => { y = renderInsightLine(doc, ins, M, y, CW, p); });
  y += 4;

  // ── Separator ──
  doc.setDrawColor(...p.divider);
  doc.setLineWidth(0.15);
  doc.line(M, y, PAGE_W - M, y);
  y += 8;

  // ── Highlight Cards: Top City + Best ROI ──
  const hlW = (CW - 6) / 2;
  const hlH = 38;

  // Top City — themed fill
  doc.setFillColor(...p.theme);
  doc.roundedRect(M, y, hlW, hlH, 3, 3, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...lighten(p.white, 0.2));
  doc.text('TOP CITY BY BOOKED VALUE', M + 8, y + 9);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...p.white);
  const cityDisplay = data.topCity !== '\u2014' ? data.topCity : 'N/A';
  doc.text(cityDisplay.length > 14 ? cityDisplay.slice(0, 12) + '..' : cityDisplay, M + 8, y + 24);
  if (data.topCity !== '\u2014') {
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...lighten(p.white, 0.25));
    doc.text(fmtCompact(data.topCityRevenue), M + 8, y + 33);
  }

  // Best ROI — purple or gray
  const roiX = M + hlW + 6;
  const roiColor: RGB = data.bestROI !== null ? p.purple : p.gray;
  doc.setFillColor(...roiColor);
  doc.roundedRect(roiX, y, hlW, hlH, 3, 3, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...lighten(p.white, 0.2));
  doc.text('BEST ROI ASSET', roiX + 8, y + 9);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...p.white);
  doc.text(data.bestROI !== null ? `${data.bestROI}%` : 'N/A', roiX + 8, y + 24);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...lighten(p.white, 0.25));
  const roiSub = data.bestROI !== null ? data.bestROIAsset : 'Insufficient cost data';
  const roiLines = doc.splitTextToSize(roiSub, hlW - 16);
  doc.text(roiLines[0] || '', roiX + 8, y + 33);

  y += hlH + 12;

  // ── Inventory Utilisation Bar ──
  y = renderSectionLabel(doc, 'Inventory Utilisation', M, y, p);
  y += 2;

  const barW = CW * 0.6;
  const barH = 7;
  // Track
  doc.setFillColor(...p.muted);
  doc.roundedRect(M, y, barW, barH, barH / 2, barH / 2, 'F');
  // Fill
  const fillW = Math.min(100, data.avgOccupancy) / 100 * barW;
  if (fillW > 0) {
    doc.setFillColor(...p.theme);
    doc.roundedRect(M, y, Math.max(barH, fillW), barH, barH / 2, barH / 2, 'F');
  }
  // Percentage
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...p.dark);
  doc.text(`${data.avgOccupancy}%`, M + barW + 6, y + 5.5);

  y += barH + 3;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...p.lightGray);
  doc.text(`${data.bookedAssets} booked of ${data.totalAssets} total assets`, M, y + 3);
  y += 12;

  // ── Monthly Profit Trend ──
  if (data.profitTrendChartImage) {
    if (y + 58 > PAGE_H - 25) {
      renderPremiumFooter(doc, data.companyName, p);
      doc.addPage();
      y = renderPremiumHeader(doc, 'Profit Trend', data.companyName, data.dateRangeLabel, p);
    }
    y = renderSectionLabel(doc, 'Monthly Net Profit Trend', M, y, p);
    y += 2;
    try {
      doc.addImage(data.profitTrendChartImage, 'PNG', M, y, CW, 46);
      y += 50;
    } catch { /* skip */ }
  }

  // ── Key Insights ──
  y += 2;
  if (y + 25 > PAGE_H - 25) {
    renderPremiumFooter(doc, data.companyName, p);
    doc.addPage();
    y = renderPremiumHeader(doc, 'Key Insights', data.companyName, data.dateRangeLabel, p);
  }

  doc.setDrawColor(...p.divider);
  doc.setLineWidth(0.15);
  doc.line(M, y, PAGE_W - M, y);
  y += 7;

  y = renderSectionLabel(doc, 'Key Insights', M, y, p);

  const insights = buildInsights(data);
  insights.forEach(insight => {
    if (y + 10 > PAGE_H - 20) {
      renderPremiumFooter(doc, data.companyName, p);
      doc.addPage();
      y = renderPremiumHeader(doc, 'Key Insights', data.companyName, data.dateRangeLabel, p);
    }
    y = renderInsightLine(doc, insight, M, y, CW, p);
  });

  renderPremiumFooter(doc, data.companyName, p);

  // ══════════════════════════════════════════════════════════
  // PAGE 4 — METRIC DEFINITIONS
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  y = renderPremiumHeader(doc, 'Metric Definitions', data.companyName, data.dateRangeLabel, p);

  const definitions = [
    { metric: 'Invoiced Revenue', def: 'Sum of non-Draft, non-Cancelled invoices in the selected period.' },
    { metric: 'Net Profit', def: 'Invoiced Revenue minus expenses in the selected period.' },
    { metric: 'Collection Rate', def: 'Cash collected against invoices in the selected period, regardless of payment date.' },
    { metric: 'Avg Occupancy', def: 'Booked asset-days divided by total asset-days in the selected period.' },
    { metric: 'Top City', def: 'Highest city by booked commercial value in the selected period.' },
    { metric: 'Best ROI Asset', def: 'Based on booked value versus direct cost where cost data exists.' },
  ];

  definitions.forEach((d) => {
    // Metric with accent dot
    doc.setFillColor(...p.theme);
    doc.circle(M + 1.5, y - 1, 0.8, 'F');

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...p.dark);
    doc.text(d.metric, M + 5, y);
    y += 4.5;

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...p.body);
    const defLines = doc.splitTextToSize(d.def, CW - 8);
    defLines.forEach((line: string) => {
      doc.text(line, M + 5, y);
      y += 3.8;
    });
    y += 5;
  });

  renderPremiumFooter(doc, data.companyName, p);

  // ── Page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...p.lightGray);
    doc.text(`${pg} / ${totalPages}`, PAGE_W / 2, PAGE_H - 5, { align: 'center' });
  }

  return doc.output('blob');
}

// ══════════════════════════════════════════════════════════
// REUSABLE LAYOUT COMPONENTS
// ══════════════════════════════════════════════════════════

function renderPremiumHeader(doc: jsPDF, title: string, companyName: string, dateLabel: string, p: Palette): number {
  // Top accent
  doc.setFillColor(...p.theme);
  doc.rect(0, 0, PAGE_W, 2.5, 'F');

  let y = 16;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...p.dark);
  doc.text(title, M, y);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...p.lightGray);
  doc.text(`${companyName}  \u00B7  ${dateLabel}`, PAGE_W - M, y, { align: 'right' });

  y += 5;
  doc.setDrawColor(...p.divider);
  doc.setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);

  return y + 8;
}

function renderPremiumFooter(doc: jsPDF, companyName: string, p: Palette) {
  doc.setDrawColor(...p.divider);
  doc.setLineWidth(0.15);
  doc.line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...p.lightGray);
  doc.text('Generated by Go-Ads 360\u00B0', M, PAGE_H - 9);
  doc.text(companyName, PAGE_W - M, PAGE_H - 9, { align: 'right' });

  doc.setFillColor(...p.theme);
  doc.rect(0, PAGE_H - 2.5, PAGE_W, 2.5, 'F');
}

function renderEmptyState(doc: jsPDF, message: string, x: number, y: number, w: number, p: Palette) {
  doc.setFillColor(...p.muted);
  doc.roundedRect(x, y - 4, w, 16, 2, 2, 'F');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...p.gray);
  doc.text(message, x + w / 2, y + 4, { align: 'center' });
}

// ══════════════════════════════════════════════════════════
// FALLBACK TABLE RENDERERS
// ══════════════════════════════════════════════════════════

function renderRevenueTrendTable(doc: jsPDF, data: { month: string; revenue: number; expenses: number; profit: number }[], startY: number, marginLeft: number, contentWidth: number, p: Palette): number {
  const tableData = data
    .filter(d => d.revenue > 0 || d.expenses > 0)
    .map(d => [d.month, formatCurrencyForPDF(d.revenue), formatCurrencyForPDF(d.expenses), formatCurrencyForPDF(d.profit)]);

  if (tableData.length === 0) return startY + 5;

  autoTable(doc, {
    startY: startY + 2,
    head: [['Month', 'Revenue', 'Expenses', 'Profit']],
    body: tableData,
    theme: 'plain',
    styles: { font: 'NotoSans', fontSize: 7, cellPadding: 2, textColor: p.dark as number[] },
    headStyles: { fillColor: p.muted as number[], textColor: p.dark as number[], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: marginLeft, right: PAGE_W - marginLeft - contentWidth },
    tableWidth: contentWidth,
  });

  // @ts-ignore
  return doc.lastAutoTable.finalY + 3;
}

function renderClientTable(doc: jsPDF, data: { name: string; value: number }[], startY: number, marginLeft: number, contentWidth: number, p: Palette): number {
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
    styles: { font: 'NotoSans', fontSize: 7, cellPadding: 2, textColor: p.dark as number[] },
    headStyles: { fillColor: p.muted as number[], textColor: p.dark as number[], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: marginLeft, right: marginLeft },
    tableWidth: contentWidth * 0.65,
  });

  // @ts-ignore
  return doc.lastAutoTable.finalY + 3;
}

// ══════════════════════════════════════════════════════════
// INSIGHT BUILDERS
// ══════════════════════════════════════════════════════════

/** Page 2 — Financial insights derived from KPIs */
function buildFinancialInsights(data: ExecutiveSummaryPDFData): string[] {
  const out: string[] = [];
  if (data.invoicedRevenue > 0) {
    const margin = Math.round((data.netProfit / data.invoicedRevenue) * 100);
    if (margin > 0) out.push(`Profit margin stands at ${margin}% for the period.`);
    else if (margin < 0) out.push(`Operating at a ${Math.abs(margin)}% loss \u2014 expenses exceed invoiced revenue.`);
  }
  if (data.collectionRate > 0 && data.collectionRate < 60) {
    out.push(`Collection rate at ${data.collectionRate}% \u2014 follow-up on outstanding receivables recommended.`);
  } else if (data.collectionRate >= 90) {
    out.push(`Strong collection rate of ${data.collectionRate}% indicates healthy cash realisation.`);
  }
  return out.slice(0, 2);
}

/** Page 3 — Operational insights derived from KPIs */
function buildOperationalInsights(data: ExecutiveSummaryPDFData): string[] {
  const out: string[] = [];
  const vacantCount = Math.max(0, data.totalAssets - data.bookedAssets);
  if (vacantCount > 0 && data.totalAssets > 0) {
    const vacantPct = Math.round((vacantCount / data.totalAssets) * 100);
    out.push(`${vacantCount} assets (${vacantPct}%) are currently vacant \u2014 opportunity for new campaigns.`);
  }
  if (data.avgOccupancy >= 80) {
    out.push(`High utilisation at ${data.avgOccupancy}% \u2014 consider expanding inventory to meet demand.`);
  }
  if (data.activeCampaigns > 0 && data.totalClients > 0) {
    const ratio = (data.activeCampaigns / data.totalClients).toFixed(1);
    out.push(`${ratio} active campaigns per client on average.`);
  }
  return out.slice(0, 3);
}

/** Page 3 — Full key insights (unchanged logic) */
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
      const scale = 2;
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
