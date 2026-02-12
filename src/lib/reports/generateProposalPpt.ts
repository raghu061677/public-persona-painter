/**
 * PREMIUM LUXURY Client Proposal PPT — Media Availability Report
 * 
 * Design: High-end corporate pitch deck (charcoal + metallic gold)
 * 
 * Structure:
 * - Cover: Dark charcoal gradient, gold accent line, elegant typography
 * - Summary: Gold-outlined metric boxes, executive look
 * - Slide A: Asset details with gold divider, large asset code
 * - Slide B: Dark-framed photos with gold borders, QR code
 * - Terms: Premium close slide
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

// Premium muted status colors (fits luxury palette)
function getStatusColor(status: string): string {
  switch (status) {
    case "VACANT_NOW": return "3D8B5E";     // muted emerald
    case "AVAILABLE_SOON": return "B8943D";  // muted gold
    case "HELD": return "6B5B8D";            // muted purple
    default: return "8B3D3D";                // muted wine
  }
}

// Premium palette constants
const CHARCOAL = "1A1A1A";
const CHARCOAL_DEEP = "111111";
const GOLD = "C6A75E";
const GOLD_LIGHT = "D4AF37";
const SOFT_WHITE = "F8F8F8";
const WARM_GRAY = "2A2A2A";
const TEXT_LIGHT = "B0A89A";
const TEXT_DIM = "7A7268";

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

/** Get premium dark placeholder PNG as base64 */
let _placeholder: string | null = null;
function getPlaceholder(): string {
  if (_placeholder) return _placeholder;
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 900;
  const ctx = c.getContext("2d")!;
  // Dark premium background
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(0, 0, 1200, 900);
  // Gold border
  ctx.strokeStyle = "#C6A75E";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 1160, 860);
  // Gold text
  ctx.fillStyle = "#C6A75E";
  ctx.font = "300 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Photo Not Available", 600, 450);
  _placeholder = c.toDataURL("image/png");
  return _placeholder;
}

/**
 * Fetch up to 2 photos for an asset (for Slide B).
 * Priority: latest campaign proofs → latest uploads (media_photos) → primary_photo_url
 */
async function fetchAssetPhotos(row: ProposalRow): Promise<string[]> {
  const photos: string[] = [];

  // 1) Latest campaign proof photos FIRST (from campaign_assets.photos JSON)
  // Photos JSON can use keys: photo_1..photo_N, geotag, geo, traffic1, traffic2, newspaper
  try {
    const { data: campAssets } = await supabase
      .from("campaign_assets")
      .select("photos")
      .eq("asset_id", row.asset_id)
      .not("photos", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);
    if (campAssets) {
      for (const ca of campAssets) {
        if (photos.length >= 2) break;
        if (ca.photos && typeof ca.photos === "object") {
          const p = ca.photos as Record<string, string>;
          // Extract ALL non-empty URL values from photos JSON (handles any key naming)
          const urls = Object.values(p).filter((v): v is string => typeof v === "string" && v.length > 0);
          for (const url of urls) {
            if (photos.length >= 2) break;
            const img = await fetchImg(url);
            if (img) photos.push(img);
          }
        }
      }
    }
  } catch {}

  // 2) Latest uploads from media_photos library
  if (photos.length < 2) {
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
  }

  // 3) Fallback: primary_photo_url
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
    companyPrefix,
    cityFilter,
    mediaTypeFilter,
    showCardRate = true,
  } = opts;

  if (rows.length === 0) return;

  const pptx = new PptxGenJS();
  pptx.author = companyName;
  pptx.company = companyName;
  pptx.title = "Media Availability Proposal — Premium";
  pptx.layout = "LAYOUT_16x9";

  const startF = formatDateIN(startDate);
  const endF = formatDateIN(endDate);
  const generatedOn = formatDateIN(format(new Date(), "yyyy-MM-dd"));
  const totalAssets = rows.length;
  const totalSlides = 2 + totalAssets * 2 + 1; // cover + summary + pairs + terms

  // ═══════════════════════════════════════════════════════════════
  // COVER SLIDE — Luxury dark charcoal + gold accent
  // ═══════════════════════════════════════════════════════════════
  const cover = pptx.addSlide();
  cover.background = { color: CHARCOAL_DEEP };

  // Subtle diagonal gold accent line (top-left to mid-right)
  cover.addShape("line" as any, {
    x: 0, y: 1.5, w: 10, h: 0,
    line: { color: GOLD, width: 1.5, transparency: 60 },
  });
  cover.addShape("line" as any, {
    x: 0, y: 5.8, w: 10, h: 0,
    line: { color: GOLD, width: 1.0, transparency: 70 },
  });

  // Small gold bar accent
  cover.addShape("rect" as any, { x: 4.2, y: 2.2, w: 1.6, h: 0.04, fill: { color: GOLD } });

  // Title — Large elegant
  cover.addText(sanitizePptText("MEDIA AVAILABILITY"), {
    x: 0.5, y: 2.5, w: 9, h: 0.7,
    fontSize: 38, bold: true, color: SOFT_WHITE, align: "center",
    fontFace: PPT_SAFE_FONTS.primary, charSpacing: 6,
  });
  cover.addText(sanitizePptText("P R O P O S A L"), {
    x: 0.5, y: 3.2, w: 9, h: 0.5,
    fontSize: 18, color: GOLD, align: "center",
    fontFace: PPT_SAFE_FONTS.primary, charSpacing: 8,
  });

  // Filter summary
  const filterParts: string[] = [];
  if (cityFilter && cityFilter !== "all") filterParts.push(cityFilter);
  if (mediaTypeFilter && mediaTypeFilter !== "all") filterParts.push(mediaTypeFilter);
  filterParts.push(`${startF} — ${endF}`);

  cover.addText(sanitizePptText(filterParts.join("  ·  ")), {
    x: 0.5, y: 4.1, w: 9, h: 0.35,
    fontSize: 13, color: TEXT_LIGHT, align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  cover.addText(sanitizePptText(`${rows.length} Assets  ·  Generated ${generatedOn}`), {
    x: 0.5, y: 4.55, w: 9, h: 0.3,
    fontSize: 11, color: TEXT_DIM, align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  // Bottom bar
  cover.addShape("rect" as any, { x: 0, y: 6.95, w: 10, h: 0.55, fill: { color: CHARCOAL } });
  cover.addShape("rect" as any, { x: 0, y: 6.93, w: 10, h: 0.02, fill: { color: GOLD } });
  cover.addText(sanitizePptText(`${companyName}  ·  Go-Ads 360°`), {
    x: 0.5, y: 7.03, w: 9, h: 0.35,
    fontSize: 10, color: GOLD, align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY SLIDE — Executive look, gold-outlined metric boxes
  // ═══════════════════════════════════════════════════════════════
  const vacantNow = rows.filter(r => r.availability_status === "VACANT_NOW").length;
  const availSoon = rows.filter(r => r.availability_status === "AVAILABLE_SOON").length;
  const held = rows.filter(r => r.availability_status === "HELD").length;
  const booked = rows.length - vacantNow - availSoon - held;

  const summary = pptx.addSlide();
  summary.background = { color: CHARCOAL_DEEP };

  // Gold accent line at top
  summary.addShape("rect" as any, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: GOLD } });

  summary.addText(sanitizePptText("EXECUTIVE SUMMARY"), {
    x: 0.5, y: 0.4, w: 9, h: 0.5,
    fontSize: 20, bold: true, color: GOLD, fontFace: PPT_SAFE_FONTS.primary, charSpacing: 4,
  });

  // Gold-outlined metric cards
  const metrics = [
    { label: "Available", count: vacantNow, accent: "3D8B5E" },
    { label: "Available Soon", count: availSoon, accent: "B8943D" },
    { label: "Held / Blocked", count: held, accent: "6B5B8D" },
    { label: "Booked", count: booked, accent: "8B3D3D" },
  ].filter(m => m.count > 0);

  const cardW = 2.0;
  const gap = 0.3;
  const totalW = metrics.length * cardW + (metrics.length - 1) * gap;
  const startX = (10 - totalW) / 2;

  metrics.forEach((m, i) => {
    const x = startX + i * (cardW + gap);
    // Gold outlined box
    summary.addShape("roundRect" as any, {
      x, y: 1.5, w: cardW, h: 2.2,
      fill: { color: CHARCOAL_DEEP },
      line: { color: GOLD, width: 1.5 },
      rectRadius: 0.06,
    });
    // Accent dot
    summary.addShape("rect" as any, { x: x + cardW / 2 - 0.15, y: 1.75, w: 0.3, h: 0.04, fill: { color: m.accent } });
    // Large number
    summary.addText(String(m.count), {
      x, y: 2.0, w: cardW, h: 0.8,
      fontSize: 42, bold: true, color: SOFT_WHITE, align: "center", fontFace: PPT_SAFE_FONTS.primary,
    });
    // Label
    summary.addText(sanitizePptText(m.label), {
      x, y: 2.9, w: cardW, h: 0.4,
      fontSize: 10, color: TEXT_LIGHT, align: "center", fontFace: PPT_SAFE_FONTS.primary,
    });
  });

  // Total assets centered below
  summary.addText(sanitizePptText(`${rows.length} Total Assets`), {
    x: 0.5, y: 4.1, w: 9, h: 0.35,
    fontSize: 14, color: GOLD, align: "center", fontFace: PPT_SAFE_FONTS.primary, charSpacing: 2,
  });

  summary.addText(sanitizePptText(`Report Period: ${startF} — ${endF}`), {
    x: 0.5, y: 4.6, w: 9, h: 0.3,
    fontSize: 10, color: TEXT_DIM, align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  addPremiumFooter(summary, companyName, 2, totalSlides);

  // ═══════════════════════════════════════════════════════════════
  // PER-ASSET SLIDES (2 per asset)
  // ═══════════════════════════════════════════════════════════════
  for (let i = 0; i < totalAssets; i++) {
    const row = rows[i];
    const statusColor = getStatusColor(row.availability_status);
    const statusLabel = getStatusLabel(row);
    const displayCode = formatAssetDisplayCode({
      mediaAssetCode: row.media_asset_code,
      fallbackId: row.asset_id,
      companyPrefix,
    });

    const slideNum = 3 + i * 2;

    // ── SLIDE A: Asset Details (Luxury) ────────────────────────
    const slideA = pptx.addSlide();
    slideA.background = { color: SOFT_WHITE };

    // Top gold accent
    slideA.addShape("rect" as any, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: GOLD } });

    // Asset code — large, centered, gold accent
    slideA.addText(sanitizePptText(displayCode), {
      x: 0.5, y: 0.4, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: CHARCOAL_DEEP, align: "center",
      fontFace: PPT_SAFE_FONTS.primary, charSpacing: 3,
    });

    // Gold bar below code
    slideA.addShape("rect" as any, { x: 3.5, y: 1.05, w: 3, h: 0.03, fill: { color: GOLD } });

    // Status badge — minimal, right-aligned
    slideA.addShape("roundRect" as any, {
      x: 7.0, y: 0.45, w: 2.5, h: 0.45,
      fill: { color: statusColor },
      rectRadius: 0.04,
    });
    slideA.addText(
      sanitizePptText(
        row.availability_status === "VACANT_NOW" ? "AVAILABLE" :
        row.availability_status === "AVAILABLE_SOON" ? "AVAILABLE SOON" :
        row.availability_status === "HELD" ? "HELD" : "BOOKED"
      ),
      { x: 7.0, y: 0.47, w: 2.5, h: 0.42, fontSize: 10, bold: true, color: SOFT_WHITE, align: "center", fontFace: PPT_SAFE_FONTS.primary }
    );

    // Left panel — Details (no table grid lines, clean list)
    const leftX = 0.6;
    const leftW = 5.5;
    let yPos = 1.4;

    const detailRows: [string, string][] = [
      ["Location", `${row.area} — ${row.location}`],
      ["Direction", row.direction || "—"],
      ["Media Type", row.media_type],
      ["Dimensions", row.dimension || "—"],
      ["Sq.Ft", row.sqft?.toString() || "—"],
      ["Illumination", row.illumination || "Non-lit"],
      ["City", row.city],
      ["Availability", statusLabel],
    ];

    if (row.latitude && row.longitude) {
      detailRows.push(["Coordinates", `${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}`]);
    }

    if (showCardRate && row.card_rate) {
      detailRows.push(["Card Rate", `₹ ${row.card_rate?.toLocaleString("en-IN")}/month`]);
    }

    detailRows.forEach(([label, value]) => {
      // Label
      slideA.addText(sanitizePptText(label.toUpperCase()), {
        x: leftX, y: yPos, w: 1.8, h: 0.38,
        fontSize: 8, bold: true, color: TEXT_DIM,
        fontFace: PPT_SAFE_FONTS.primary, charSpacing: 1,
      });
      // Value
      slideA.addText(sanitizePptText(value), {
        x: leftX + 1.9, y: yPos, w: leftW - 1.9, h: 0.38,
        fontSize: 11, color: CHARCOAL_DEEP, fontFace: PPT_SAFE_FONTS.primary,
      });
      // Subtle separator
      slideA.addShape("line" as any, {
        x: leftX, y: yPos + 0.38, w: leftW, h: 0,
        line: { color: "E0DDD8", width: 0.5 },
      });
      yPos += 0.42;
    });

    // Right panel — Gold vertical divider
    slideA.addShape("line" as any, {
      x: 6.4, y: 1.3, w: 0, h: yPos - 1.3,
      line: { color: GOLD, width: 1.5 },
    });

    // Right side — asset number & asset count
    slideA.addText(sanitizePptText(`Asset ${i + 1} of ${totalAssets}`), {
      x: 6.7, y: 1.5, w: 3, h: 0.35,
      fontSize: 10, color: TEXT_DIM, fontFace: PPT_SAFE_FONTS.primary,
    });

    slideA.addText(sanitizePptText(displayCode), {
      x: 6.7, y: 2.0, w: 3, h: 0.5,
      fontSize: 16, bold: true, color: GOLD, fontFace: PPT_SAFE_FONTS.primary,
    });

    if (showCardRate && row.card_rate) {
      slideA.addShape("roundRect" as any, {
        x: 6.7, y: 3.0, w: 2.8, h: 0.8,
        fill: { color: CHARCOAL_DEEP },
        line: { color: GOLD, width: 1 },
        rectRadius: 0.05,
      });
      slideA.addText(sanitizePptText("CARD RATE"), {
        x: 6.7, y: 3.05, w: 2.8, h: 0.3,
        fontSize: 8, color: GOLD, align: "center", fontFace: PPT_SAFE_FONTS.primary, charSpacing: 2,
      });
      slideA.addText(sanitizePptText(`₹ ${row.card_rate?.toLocaleString("en-IN")}`), {
        x: 6.7, y: 3.35, w: 2.8, h: 0.35,
        fontSize: 18, bold: true, color: SOFT_WHITE, align: "center", fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // QR code on Slide A — bottom-right of details slide, gold frame
    const qrBase64 = await fetchQR(row.qr_code_url);
    if (qrBase64) {
      slideA.addShape("rect" as any, {
        x: 8.35, y: 5.7, w: 1.15, h: 1.15,
        fill: { color: CHARCOAL_DEEP },
        line: { color: GOLD, width: 1 },
      });
      slideA.addImage({ data: qrBase64, x: 8.42, y: 5.77, w: 1.0, h: 1.0 });
    }

    addPremiumFooter(slideA, companyName, slideNum, totalSlides);

    // ── SLIDE B: Photos (Dark frame) ──────────────────────────
    const slideB = pptx.addSlide();
    slideB.background = { color: CHARCOAL_DEEP };

    // Top gold accent
    slideB.addShape("rect" as any, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: GOLD } });

    // Header
    slideB.addText(sanitizePptText(displayCode), {
      x: 0.5, y: 0.2, w: 9, h: 0.4,
      fontSize: 14, bold: true, color: GOLD, fontFace: PPT_SAFE_FONTS.primary, charSpacing: 2,
    });

    // Fetch photos
    const photos = await fetchAssetPhotos(row);

    if (photos.length === 0) {
      const ph = getPlaceholder();
      slideB.addImage({ data: ph, x: 1.5, y: 1.0, w: 7, h: 4.8, sizing: { type: "contain", w: 7, h: 4.8 } });
    } else if (photos.length === 1) {
      slideB.addShape("rect" as any, {
        x: 0.8, y: 0.9, w: 7.2, h: 5.0,
        fill: { color: CHARCOAL },
        line: { color: GOLD, width: 1.5 },
      });
      slideB.addImage({ data: photos[0], x: 0.9, y: 1.0, w: 7.0, h: 4.8, sizing: { type: "cover", w: 7.0, h: 4.8 } });
    } else {
      slideB.addShape("rect" as any, {
        x: 0.35, y: 0.9, w: 4.6, h: 5.0,
        fill: { color: CHARCOAL },
        line: { color: GOLD, width: 1.5 },
      });
      slideB.addImage({ data: photos[0], x: 0.45, y: 1.0, w: 4.4, h: 4.8, sizing: { type: "cover", w: 4.4, h: 4.8 } });

      slideB.addShape("rect" as any, {
        x: 5.1, y: 0.9, w: 4.6, h: 5.0,
        fill: { color: CHARCOAL },
        line: { color: GOLD, width: 1.5 },
      });
      slideB.addImage({ data: photos[1], x: 5.2, y: 1.0, w: 4.4, h: 4.8, sizing: { type: "cover", w: 4.4, h: 4.8 } });
    }

    // Location info below photos
    slideB.addText(sanitizePptText(`${row.area}  ·  ${row.location}  ·  ${row.city}`), {
      x: 0.4, y: 6.1, w: 7.5, h: 0.3,
      fontSize: 10, color: TEXT_LIGHT, fontFace: PPT_SAFE_FONTS.primary,
    });

    addPremiumFooter(slideB, companyName, slideNum + 1, totalSlides);
  }

  // ═══════════════════════════════════════════════════════════════
  // TERMS SLIDE — Premium close
  // ═══════════════════════════════════════════════════════════════
  const terms = pptx.addSlide();
  terms.background = { color: CHARCOAL_DEEP };

  terms.addShape("rect" as any, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: GOLD } });

  terms.addText(sanitizePptText("TERMS & CONDITIONS"), {
    x: 0.5, y: 0.5, w: 9, h: 0.5,
    fontSize: 18, bold: true, color: GOLD, fontFace: PPT_SAFE_FONTS.primary, charSpacing: 4,
  });

  // Gold bar
  terms.addShape("rect" as any, { x: 0.5, y: 1.1, w: 2, h: 0.03, fill: { color: GOLD } });

  const termsText = [
    "Subject to availability at the time of confirmation",
    "Card rates are indicative and subject to negotiation",
    "Taxes & statutory charges extra as applicable",
    "Artwork approval is mandatory before printing",
    "Images shown are indicative and may vary",
    "Booking confirmation required within 7 days",
    "Installation dates subject to weather and permissions",
  ];
  termsText.forEach((t, idx) => {
    terms.addText(sanitizePptText(`${idx + 1}.  ${t}`), {
      x: 0.7, y: 1.4 + idx * 0.5, w: 8.6, h: 0.4,
      fontSize: 12, color: TEXT_LIGHT, fontFace: PPT_SAFE_FONTS.primary,
    });
  });

  // Company branding box
  terms.addShape("rect" as any, {
    x: 2.5, y: 5.3, w: 5, h: 0.9,
    fill: { color: CHARCOAL },
    line: { color: GOLD, width: 1 },
  });
  terms.addText(sanitizePptText(`${companyName}`), {
    x: 2.5, y: 5.4, w: 5, h: 0.35,
    fontSize: 14, bold: true, color: GOLD, align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });
  terms.addText(sanitizePptText("OOH Media Management Platform"), {
    x: 2.5, y: 5.78, w: 5, h: 0.3,
    fontSize: 9, color: TEXT_DIM, align: "center", fontFace: PPT_SAFE_FONTS.primary,
  });

  addPremiumFooter(terms, companyName, totalSlides, totalSlides);

  // ═══════════════════════════════════════════════════════════════
  // DOWNLOAD — Premium filename
  // ═══════════════════════════════════════════════════════════════
  const cityTag = cityFilter && cityFilter !== "all" ? cityFilter : "All";
  const startTag = startDate.replace(/-/g, "").slice(6, 8) + startDate.replace(/-/g, "").slice(4, 6) + startDate.replace(/-/g, "").slice(0, 4);
  const endTag = endDate.replace(/-/g, "").slice(6, 8) + endDate.replace(/-/g, "").slice(4, 6) + endDate.replace(/-/g, "").slice(0, 4);
  const fileName = `Vacant_Media_Proposal_Premium_${cityTag}_${startTag}-${endTag}.pptx`;

  await pptx.writeFile({ fileName });
}

function addPremiumFooter(slide: any, companyName: string, pageNum: number, totalPages: number) {
  // Gold line
  slide.addShape("rect" as any, { x: 0, y: 6.93, w: 10, h: 0.02, fill: { color: GOLD } });
  // Dark footer bar
  slide.addShape("rect" as any, { x: 0, y: 6.95, w: 10, h: 0.55, fill: { color: CHARCOAL_DEEP } });
  // Company name
  slide.addText(sanitizePptText(`${companyName}  ·  Go-Ads 360°`), {
    x: 0.5, y: 7.02, w: 7, h: 0.35,
    fontSize: 9, color: GOLD, fontFace: PPT_SAFE_FONTS.primary,
  });
  // Page number
  slide.addText(sanitizePptText(`${pageNum} / ${totalPages}`), {
    x: 7.5, y: 7.02, w: 2.2, h: 0.35,
    fontSize: 9, color: TEXT_DIM, align: "right", fontFace: PPT_SAFE_FONTS.primary,
  });
}
