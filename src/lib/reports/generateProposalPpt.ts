/**
 * Client Proposal PPT Generator for Media Availability Report
 * 
 * Generates a 2-slide-per-asset client-ready proposal:
 * - Cover slide with branding
 * - Summary slide
 * - Slide A: Asset details (left panel + right info table)
 * - Slide B: Asset photos (up to 2) + QR code
 * - Terms & conditions slide
 * 
 * This is a SEPARATE export from the table-based Custom Fields PPT.
 * DO NOT merge with planExports.ts or generateAvailabilityPPTWithImages.ts.
 */

import PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { fetchImageAsBase64 } from "@/lib/qrWatermark";
import { sanitizePptText, PPT_SAFE_FONTS } from "@/lib/ppt/sanitizers";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";

// ─── Types ────────────────────────────────────────────────────

export interface ProposalRow {
  asset_id: string;
  media_asset_code: string | null;
  area: string;
  location: string;
  direction: string | null;
  dimension: string | null;
  sqft: number;
  illumination: string | null;
  card_rate: number;
  city: string;
  media_type: string;
  primary_photo_url: string | null;
  qr_code_url: string | null;
  latitude: number | null;
  longitude: number | null;
  availability_status: string;
  available_from: string;
  booked_till: string | null;
  current_campaign_name: string | null;
  current_client_name: string | null;
  hold_type?: string | null;
  hold_client_name?: string | null;
  hold_start_date?: string | null;
  hold_end_date?: string | null;
}

export interface ProposalPptOptions {
  rows: ProposalRow[];
  startDate: string;
  endDate: string;
  companyName?: string;
  themeColor?: string;
  companyPrefix?: string;
  cityFilter?: string;
  mediaTypeFilter?: string;
  showCardRate?: boolean; // RBAC: false for ops/viewer
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDateIN(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

function getStatusLabel(row: ProposalRow): string {
  switch (row.availability_status) {
    case "VACANT_NOW": return "Available";
    case "AVAILABLE_SOON": return `Available From: ${formatDateIN(row.available_from)}`;
    case "HELD": return `Held/Blocked (${formatDateIN(row.hold_start_date)} - ${formatDateIN(row.hold_end_date)})`;
    case "BOOKED_THROUGH_RANGE": return `Booked (till ${formatDateIN(row.booked_till)})`;
    default: return "Booked";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "VACANT_NOW": return "22C55E";
    case "AVAILABLE_SOON": return "F59E0B";
    case "HELD": return "8B5CF6";
    default: return "EF4444";
  }
}

// ─── Image utilities ──────────────────────────────────────────

const imgCache = new Map<string, string>();

async function toFetchableUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  if (!url.startsWith("http")) {
    const { data } = await supabase.storage.from("media-assets").createSignedUrl(url, 3600);
    return data?.signedUrl || url;
  }
  return url;
}

async function ensurePptCompatible(dataUrl: string): Promise<string | null> {
  if (!dataUrl?.startsWith("data:")) return null;
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/png")) return dataUrl;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = dataUrl; });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || 1600;
    c.height = img.naturalHeight || 1200;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c.toDataURL("image/jpeg", 0.9);
  } catch { return null; }
}

async function fetchImg(url: string): Promise<string | null> {
  if (!url) return null;
  if (imgCache.has(url)) return imgCache.get(url)!;
  try {
    const fetchUrl = await toFetchableUrl(url);
    const base = await fetchImageAsBase64(fetchUrl);
    const safe = await ensurePptCompatible(base);
    if (safe) imgCache.set(url, safe);
    return safe;
  } catch {
    try {
      const { data } = await supabase.storage.from("media-assets").createSignedUrl(url, 3600);
      if (!data?.signedUrl) return null;
      const base = await fetchImageAsBase64(data.signedUrl);
      const safe = await ensurePptCompatible(base);
      if (safe) imgCache.set(url, safe);
      return safe;
    } catch { return null; }
  }
}

/** Get placeholder PNG as base64 */
let _placeholder: string | null = null;
function getPlaceholder(): string {
  if (_placeholder) return _placeholder;
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 900;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Photo Not Available", 600, 450);
  _placeholder = c.toDataURL("image/png");
  return _placeholder;
}

/**
 * Fetch up to 2 photos for an asset (for Slide B).
 * Priority: media_photos library → campaign proofs → primary_photo_url
 */
async function fetchAssetPhotos(row: ProposalRow): Promise<string[]> {
  const photos: string[] = [];

  // Try media_photos library
  try {
    const { data: libPhotos } = await supabase
      .from("media_photos")
      .select("photo_url")
      .eq("asset_id", row.asset_id)
      .order("uploaded_at", { ascending: false })
      .limit(4);
    if (libPhotos) {
      for (const p of libPhotos) {
        if (photos.length >= 2) break;
        if (p.photo_url) {
          const img = await fetchImg(p.photo_url);
          if (img) photos.push(img);
        }
      }
    }
  } catch {}

  // Try campaign proof photos if needed
  if (photos.length < 2) {
    try {
      const { data: campAssets } = await supabase
        .from("campaign_assets")
        .select("photos")
        .eq("asset_id", row.asset_id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (campAssets?.[0]?.photos) {
        const p = campAssets[0].photos as Record<string, string>;
        const urls = [p.geo, p.geotag, p.traffic1, p.traffic2, p.newspaper].filter(Boolean);
        for (const url of urls) {
          if (photos.length >= 2) break;
          const img = await fetchImg(url!);
          if (img) photos.push(img);
        }
      }
    } catch {}
  }

  // Fallback: primary_photo_url
  if (photos.length < 2 && row.primary_photo_url) {
    const img = await fetchImg(row.primary_photo_url);
    if (img && !photos.includes(img)) photos.push(img);
  }

  return photos;
}

/** Fetch QR code as base64 */
async function fetchQR(qrUrl: string | null | undefined): Promise<string | null> {
  if (!qrUrl) return null;
  try {
    return await fetchImageAsBase64(qrUrl);
  } catch { return null; }
}

// ─── Main Generator ──────────────────────────────────────────

export async function generateProposalPpt(opts: ProposalPptOptions): Promise<void> {
  const {
    rows, startDate, endDate,
    companyName = "Go-Ads 360°",
    themeColor,
    companyPrefix,
    cityFilter,
    mediaTypeFilter,
    showCardRate = true,
  } = opts;

  if (rows.length === 0) return;

  const brand = (themeColor || "#1E3A8A").replace("#", "");
  const pptx = new PptxGenJS();
  pptx.author = companyName;
  pptx.company = companyName;
  pptx.title = "Media Availability Proposal";
  pptx.layout = "LAYOUT_16x9";

  const startF = formatDateIN(startDate);
  const endF = formatDateIN(endDate);
  const generatedOn = formatDateIN(format(new Date(), "yyyy-MM-dd"));

  // ===== COVER SLIDE =====
  const cover = pptx.addSlide();
  cover.background = { color: brand };

  cover.addText(sanitizePptText("MEDIA AVAILABILITY PROPOSAL"), {
    x: 0.5, y: 2.0, w: 9, h: 1.0,
    fontSize: 36, bold: true, color: "FFFFFF", align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  // Filter summary
  const filterParts: string[] = [];
  if (cityFilter && cityFilter !== "all") filterParts.push(`City: ${cityFilter}`);
  if (mediaTypeFilter && mediaTypeFilter !== "all") filterParts.push(`Type: ${mediaTypeFilter}`);
  filterParts.push(`Period: ${startF} - ${endF}`);

  cover.addText(sanitizePptText(filterParts.join("  |  ")), {
    x: 0.5, y: 3.2, w: 9, h: 0.5,
    fontSize: 16, color: "CBD5E1", align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  cover.addText(sanitizePptText(`${rows.length} Assets`), {
    x: 0.5, y: 3.9, w: 9, h: 0.4,
    fontSize: 14, color: "94A3B8", align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  cover.addText(sanitizePptText(`Generated: ${generatedOn}`), {
    x: 0.5, y: 4.4, w: 9, h: 0.3,
    fontSize: 11, color: "94A3B8", align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  // Footer
  cover.addShape("rect" as any, { x: 0, y: 6.8, w: 10, h: 0.7, fill: { color: "000000", transparency: 50 } });
  cover.addText(sanitizePptText(`${companyName} | Go-Ads 360°`), {
    x: 0.5, y: 6.9, w: 9, h: 0.4,
    fontSize: 12, color: "FFFFFF", align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  // ===== SUMMARY SLIDE =====
  const vacantNow = rows.filter(r => r.availability_status === "VACANT_NOW").length;
  const availSoon = rows.filter(r => r.availability_status === "AVAILABLE_SOON").length;
  const held = rows.filter(r => r.availability_status === "HELD").length;
  const booked = rows.length - vacantNow - availSoon - held;

  const summary = pptx.addSlide();
  summary.background = { color: "FFFFFF" };
  summary.addShape("rect" as any, { x: 0, y: 0, w: 10, h: 0.7, fill: { color: brand } });
  summary.addText(sanitizePptText("Availability Summary"), {
    x: 0.3, y: 0.15, w: 9.4, h: 0.5,
    fontSize: 22, bold: true, color: "FFFFFF", fontFace: PPT_SAFE_FONTS.primary,
  });

  const cards = [
    { label: "Total Assets", count: rows.length, color: brand },
    { label: "Available Now", count: vacantNow, color: "22C55E" },
    { label: "Available Soon", count: availSoon, color: "F59E0B" },
    { label: "Held/Blocked", count: held, color: "8B5CF6" },
    { label: "Booked", count: booked, color: "EF4444" },
  ].filter(c => c.count > 0);

  const cw = Math.min(1.7, 9 / cards.length - 0.1);
  cards.forEach((card, i) => {
    const x = 0.5 + i * (cw + 0.15);
    summary.addShape("roundRect" as any, { x, y: 1.3, w: cw, h: 1.3, fill: { color: card.color }, rectRadius: 0.08 });
    summary.addText(String(card.count), { x, y: 1.45, w: cw, h: 0.65, fontSize: 34, bold: true, color: "FFFFFF", align: "center", fontFace: PPT_SAFE_FONTS.primary });
    summary.addText(sanitizePptText(card.label), { x, y: 2.1, w: cw, h: 0.35, fontSize: 9, color: "FFFFFF", align: "center", fontFace: PPT_SAFE_FONTS.primary });
  });

  summary.addText(sanitizePptText(`Report Period: ${startF} - ${endF}`), {
    x: 0.5, y: 3.1, w: 9, h: 0.3, fontSize: 11, color: "64748B", align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  // Footer on summary
  addFooter(summary, companyName, brand, 1, Math.ceil(rows.length * 2) + 2);

  // ===== PER-ASSET SLIDES (2 per asset) =====
  const totalAssets = rows.length;

  for (let i = 0; i < totalAssets; i++) {
    const row = rows[i];
    const statusColor = getStatusColor(row.availability_status);
    const statusLabel = getStatusLabel(row);
    const displayCode = formatAssetDisplayCode({
      mediaAssetCode: row.media_asset_code,
      fallbackId: row.asset_id,
      companyPrefix,
    });

    const slideNum = 3 + i * 2; // cover=1, summary=2, then pairs
    const totalSlides = 2 + totalAssets * 2 + 1; // +1 for terms

    // ── SLIDE A: Details ──────────────────────────────
    const slideA = pptx.addSlide();
    slideA.background = { color: "FFFFFF" };

    // Border
    slideA.addShape("rect" as any, {
      x: 0.15, y: 0.15, w: 9.7, h: 7.2,
      fill: { color: "FFFFFF" },
      line: { color: brand, width: 4 },
    });

    // Asset code header
    slideA.addText(sanitizePptText(displayCode), {
      x: 0.3, y: 0.35, w: 7, h: 0.4,
      fontSize: 14, bold: true, color: "6B7280", fontFace: PPT_SAFE_FONTS.primary,
    });

    // Status badge
    slideA.addShape("rect" as any, { x: 7.3, y: 0.3, w: 2.3, h: 0.5, fill: { color: statusColor } });
    slideA.addText(
      sanitizePptText(row.availability_status === "VACANT_NOW" ? "AVAILABLE" : row.availability_status === "AVAILABLE_SOON" ? "AVAILABLE SOON" : row.availability_status === "HELD" ? "HELD" : "BOOKED"),
      { x: 7.3, y: 0.33, w: 2.3, h: 0.45, fontSize: 11, bold: true, color: "FFFFFF", align: "center", fontFace: PPT_SAFE_FONTS.primary }
    );

    // Location title
    slideA.addText(sanitizePptText(`${row.area} - ${row.location}`), {
      x: 0.3, y: 0.85, w: 9.4, h: 0.5,
      fontSize: 20, bold: true, color: brand, fontFace: PPT_SAFE_FONTS.primary,
    });

    // Details table (left-aligned, full width)
    const details: any[][] = [
      [{ text: sanitizePptText("Asset Code"), options: { bold: true } }, { text: sanitizePptText(displayCode) }],
      [{ text: sanitizePptText("Area"), options: { bold: true } }, { text: sanitizePptText(row.area) }],
      [{ text: sanitizePptText("Location"), options: { bold: true } }, { text: sanitizePptText(row.location) }],
      [{ text: sanitizePptText("Direction"), options: { bold: true } }, { text: sanitizePptText(row.direction || "N/A") }],
      [{ text: sanitizePptText("Dimensions"), options: { bold: true } }, { text: sanitizePptText(row.dimension || "N/A") }],
      [{ text: sanitizePptText("Sq.Ft"), options: { bold: true } }, { text: sanitizePptText(row.sqft?.toString() || "N/A") }],
      [{ text: sanitizePptText("Illumination"), options: { bold: true } }, { text: sanitizePptText(row.illumination || "Non-lit") }],
      [{ text: sanitizePptText("Media Type"), options: { bold: true } }, { text: sanitizePptText(row.media_type) }],
      [{ text: sanitizePptText("City"), options: { bold: true } }, { text: sanitizePptText(row.city) }],
    ];

    // Availability status
    details.push([
      { text: sanitizePptText("Availability"), options: { bold: true } },
      { text: sanitizePptText(statusLabel) },
    ]);

    // Coordinates
    if (row.latitude && row.longitude) {
      details.push([
        { text: sanitizePptText("Coordinates"), options: { bold: true } },
        { text: sanitizePptText(`${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}`) },
      ]);
    }

    // Card rate (RBAC gated)
    if (showCardRate) {
      details.push([
        { text: sanitizePptText("Card Rate"), options: { bold: true } },
        { text: sanitizePptText(`Rs. ${row.card_rate?.toLocaleString("en-IN") || "0"}/month`) },
      ]);
    }

    slideA.addTable(details, {
      x: 0.5, y: 1.5, w: 9, colW: [2.5, 6.5],
      border: { type: "solid", color: "E5E7EB", pt: 0.5 },
      fontFace: PPT_SAFE_FONTS.primary,
      fontSize: 11,
      valign: "middle",
      rowH: 0.38,
      fill: { color: "F9FAFB" },
    });

    addFooter(slideA, companyName, brand, slideNum, totalSlides);

    // ── SLIDE B: Photos + QR ─────────────────────────
    const slideB = pptx.addSlide();
    slideB.background = { color: "FFFFFF" };

    // Border
    slideB.addShape("rect" as any, {
      x: 0.15, y: 0.15, w: 9.7, h: 7.2,
      fill: { color: "FFFFFF" },
      line: { color: brand, width: 4 },
    });

    // Header
    slideB.addText(sanitizePptText(`${displayCode} - Photos`), {
      x: 0.3, y: 0.35, w: 9.4, h: 0.4,
      fontSize: 14, bold: true, color: brand, fontFace: PPT_SAFE_FONTS.primary,
    });

    // Fetch photos
    const photos = await fetchAssetPhotos(row);

    if (photos.length === 0) {
      // Single large placeholder
      const ph = getPlaceholder();
      slideB.addImage({ data: ph, x: 1.5, y: 1.2, w: 7, h: 4.5, sizing: { type: "contain", w: 7, h: 4.5 } });
    } else if (photos.length === 1) {
      // Single large image
      slideB.addImage({ data: photos[0], x: 0.5, y: 1.0, w: 6, h: 4.5, sizing: { type: "cover", w: 6, h: 4.5 } });
      // Placeholder for second
      slideB.addShape("rect" as any, { x: 6.7, y: 1.0, w: 3, h: 4.5, fill: { color: "F3F4F6" }, line: { color: "E5E7EB", width: 1 } });
      slideB.addText(sanitizePptText("Photo not\navailable"), { x: 6.7, y: 2.5, w: 3, h: 1, fontSize: 12, color: "9CA3AF", align: "center", fontFace: PPT_SAFE_FONTS.primary });
    } else {
      // Two images side by side
      slideB.addImage({ data: photos[0], x: 0.4, y: 1.0, w: 4.5, h: 4.5, sizing: { type: "cover", w: 4.5, h: 4.5 } });
      slideB.addImage({ data: photos[1], x: 5.1, y: 1.0, w: 4.5, h: 4.5, sizing: { type: "cover", w: 4.5, h: 4.5 } });
    }

    // QR code - EXACTLY ONE per asset, bottom-right
    const qrBase64 = await fetchQR(row.qr_code_url);
    if (qrBase64) {
      slideB.addImage({ data: qrBase64, x: 8.5, y: 5.7, w: 1.0, h: 1.0 });
      slideB.addText(sanitizePptText("Scan to view"), {
        x: 8.3, y: 6.72, w: 1.4, h: 0.2,
        fontSize: 7, color: "6B7280", align: "center", fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // Location info below photos
    slideB.addText(sanitizePptText(`${row.area} | ${row.location} | ${row.city}`), {
      x: 0.4, y: 5.7, w: 7.5, h: 0.3,
      fontSize: 10, color: "64748B", fontFace: PPT_SAFE_FONTS.primary,
    });

    addFooter(slideB, companyName, brand, slideNum + 1, totalSlides);
  }

  // ===== TERMS SLIDE =====
  const terms = pptx.addSlide();
  terms.background = { color: "FFFFFF" };
  terms.addShape("rect" as any, { x: 0, y: 0, w: 10, h: 0.7, fill: { color: brand } });
  terms.addText(sanitizePptText("Terms & Conditions"), {
    x: 0.3, y: 0.15, w: 9.4, h: 0.5,
    fontSize: 22, bold: true, color: "FFFFFF", fontFace: PPT_SAFE_FONTS.primary,
  });

  const termsText = [
    "1. Subject to availability at the time of confirmation",
    "2. Card rates are indicative and subject to negotiation",
    "3. Taxes & statutory charges extra as applicable",
    "4. Artwork approval is mandatory before printing",
    "5. Images shown are indicative and may vary",
    "6. Booking confirmation required within 7 days",
    "7. Installation dates subject to weather and permissions",
  ];
  termsText.forEach((t, idx) => {
    terms.addText(sanitizePptText(t), {
      x: 0.5, y: 1.2 + idx * 0.5, w: 9, h: 0.4,
      fontSize: 14, color: "374151", fontFace: PPT_SAFE_FONTS.primary,
    });
  });

  terms.addShape("rect" as any, { x: 0.5, y: 5.2, w: 9, h: 1.0, fill: { color: "F3F4F6" }, line: { color: "E5E7EB", width: 1 } });
  terms.addText(sanitizePptText(`${companyName} | OOH Media Management Platform`), {
    x: 0.6, y: 5.4, w: 8.8, h: 0.5,
    fontSize: 14, bold: true, color: brand, fontFace: PPT_SAFE_FONTS.primary,
  });

  // ===== Download =====
  const cityTag = cityFilter && cityFilter !== "all" ? cityFilter : "All";
  const startTag = startDate.replace(/-/g, "");
  const endTag = endDate.replace(/-/g, "");
  const fileName = `Vacant_Media_${cityTag}_${startTag}-${endTag}.pptx`;

  await pptx.writeFile({ fileName });
}

function addFooter(slide: any, companyName: string, brand: string, pageNum: number, totalPages: number) {
  slide.addShape("rect" as any, { x: 0.15, y: 6.85, w: 9.7, h: 0.5, fill: { color: brand } });
  slide.addText(sanitizePptText(`${companyName} | Go-Ads 360°`), {
    x: 0.3, y: 6.92, w: 7, h: 0.35,
    fontSize: 10, color: "FFFFFF", fontFace: PPT_SAFE_FONTS.primary,
  });
  slide.addText(sanitizePptText(`${pageNum} / ${totalPages}`), {
    x: 7.5, y: 6.92, w: 2.2, h: 0.35,
    fontSize: 10, color: "FFFFFF", align: "right", fontFace: PPT_SAFE_FONTS.primary,
  });
}
