import PptxGenJS from "pptxgenjs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  sanitizePptText,
  PPT_SAFE_FONTS,
} from "@/lib/ppt/sanitizers";
import { fetchImageAsBase64 } from "@/lib/qrWatermark";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";

// ========== LAYOUT CONSTANTS ==========
const SLIDE_W = 10; // inches (16:9)
const SLIDE_H = 7.5;
const MARGIN_L = 0.4;
const MARGIN_R = 0.4;
const CONTENT_W = SLIDE_W - MARGIN_L - MARGIN_R;
const HEADER_H = 0.6;
const FOOTER_H = 0.42;
const FOOTER_Y = SLIDE_H - FOOTER_H;

// ========== BRAND COLORS ==========
const PRIMARY = "1E40AF";
const SECONDARY = "10B981";
const TEXT_DARK = "1F2937";
const TEXT_MUTED = "6B7280";
const TEXT_LIGHT = "9CA3AF";
const BORDER = "E5E7EB";
const BG_LIGHT = "F9FAFB";
const WHITE = "FFFFFF";

// ========== PROOF PHOTO SLOTS ==========
const PROOF_SLOTS = [
  { key: "geotag", aliases: ["geo", "geotag", "geo-tagged", "geo-tagged photo", "photo_1"], label: "Geo-tagged Photo", color: "10B981" },
  { key: "newspaper", aliases: ["newspaper", "newspaper photo", "photo_2"], label: "Newspaper Ad", color: "3B82F6" },
  { key: "traffic1", aliases: ["traffic1", "traffic_left", "traffic", "traffic photo 1", "photo_3"], label: "Traffic View 1", color: "F59E0B" },
  { key: "traffic2", aliases: ["traffic2", "traffic_right", "traffic photo 2", "photo_4"], label: "Traffic View 2", color: "EF4444" },
] as const;

// ========== TEXT HELPERS ==========

/** Truncate text to maxLen chars, appending ellipsis if needed */
function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1).trimEnd() + "...";
}

/** Build a pipe-separated metadata string, skipping empty values */
function joinMeta(parts: Array<string | null | undefined | false>, sep = "  |  "): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(sep);
}

// ========== IMAGE UTILITIES ==========
const imageCache = new Map<string, string>();

function parseStorageObjectUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  } catch { return null; }
}

async function toFetchableUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  if (!url.startsWith('http')) {
    const { data } = await supabase.storage.from('media-assets').createSignedUrl(url, 3600);
    return data?.signedUrl || url;
  }
  return url;
}

async function ensurePptCompatible(dataUrl: string): Promise<string | null> {
  if (!dataUrl?.startsWith('data:')) return null;
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/png')) return dataUrl;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1600;
    canvas.height = img.naturalHeight || 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch { return null; }
}

async function fetchImageBase64(url: string): Promise<string | null> {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url)!;

  try {
    const directUrl = await toFetchableUrl(url);
    const base = await fetchImageAsBase64(directUrl);
    const compat = await ensurePptCompatible(base);
    if (compat) { imageCache.set(url, compat); return compat; }
  } catch { /* try fallback */ }

  try {
    const parsed = parseStorageObjectUrl(url);
    if (!parsed) return null;
    const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
    if (!data?.signedUrl) return null;
    const base = await fetchImageAsBase64(data.signedUrl);
    const compat = await ensurePptCompatible(base);
    if (compat) { imageCache.set(url, compat); return compat; }
  } catch { /* give up */ }

  return null;
}

let _placeholderDataUrl: string | null = null;
function getPlaceholderDataUrl(): string {
  if (_placeholderDataUrl) return _placeholderDataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    _placeholderDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7W2u0AAAAASUVORK5CYII=";
    return _placeholderDataUrl;
  }
  // Neutral placeholder with centered icon-like indicator
  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(0, 0, 800, 600);
  // Soft border
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 760, 560);
  // Icon placeholder (camera outline)
  ctx.fillStyle = "#D1D5DB";
  ctx.font = "bold 44px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📷", 400, 270);
  ctx.font = "26px Arial";
  ctx.fillStyle = "#9CA3AF";
  ctx.fillText("Awaiting Upload", 400, 340);
  _placeholderDataUrl = canvas.toDataURL("image/png");
  return _placeholderDataUrl;
}

// ========== RESOLVE PROOF SLOTS ==========
interface ResolvedSlot {
  label: string;
  color: string;
  url: string | null;
  base64: string | null;
}

function resolveProofSlotUrls(
  caPhotosJson: Record<string, string> | null | undefined,
  mediaPhotos: Array<{ photo_url: string; category: string }>
): { label: string; color: string; url: string | null }[] {
  const result: { label: string; color: string; url: string | null }[] = [];

  for (const slot of PROOF_SLOTS) {
    let url: string | null = null;

    if (caPhotosJson && typeof caPhotosJson === "object") {
      for (const alias of slot.aliases) {
        const val = caPhotosJson[alias] || caPhotosJson[alias.replace(/ /g, "_")];
        if (typeof val === "string" && val.trim()) { url = val.trim(); break; }
      }
    }

    if (!url && mediaPhotos.length > 0) {
      for (const alias of slot.aliases) {
        const match = mediaPhotos.find(p => p.category?.toLowerCase() === alias.toLowerCase());
        if (match?.photo_url) { url = match.photo_url; break; }
      }
    }

    result.push({ label: slot.label, color: slot.color, url });
  }

  return result;
}

// ========== SLIDE HELPERS ==========

function addSlideHeader(
  slide: any,
  pptx: PptxGenJS,
  brandColor: string,
  campaignName: string,
  companyName: string,
  logoBase64: string | null,
) {
  // Header bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
    fill: { color: brandColor },
  });

  // Company logo (left)
  if (logoBase64) {
    try {
      slide.addImage({
        data: logoBase64,
        x: 0.2, y: 0.08, w: 0.45, h: 0.45,
        sizing: { type: "contain", w: 0.45, h: 0.45 },
      });
    } catch { /* skip logo */ }
  }

  const textX = logoBase64 ? 0.75 : 0.3;

  // Campaign name in header — truncate to prevent overflow, allow shrinkFit
  slide.addText(sanitizePptText(truncate(campaignName, 80)), {
    x: textX, y: 0.05, w: SLIDE_W - textX - 0.5, h: 0.5,
    fontSize: 13, bold: true, color: WHITE, align: "left", valign: "middle",
    fontFace: PPT_SAFE_FONTS.primary,
    shrinkText: true,
  });
}

function addSlideFooter(
  slide: any,
  pptx: PptxGenJS,
  brandColor: string,
  companyName: string,
  slideNum: number,
  totalSlides: number,
  exportDate: string,
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: FOOTER_Y, w: SLIDE_W, h: FOOTER_H,
    fill: { color: brandColor },
  });

  // Subtle top divider line above footer for definition
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: FOOTER_Y - 0.02, w: SLIDE_W, h: 0.02,
    fill: { color: SECONDARY },
  });

  slide.addText(sanitizePptText(`Generated by Go-Ads  |  ${exportDate}`), {
    x: MARGIN_L, y: FOOTER_Y + 0.06, w: CONTENT_W * 0.5, h: 0.3,
    fontSize: 8, color: "B0C4DE", align: "left",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  slide.addText(sanitizePptText(`${truncate(companyName, 40)}  |  ${slideNum} / ${totalSlides}`), {
    x: SLIDE_W / 2, y: FOOTER_Y + 0.06, w: CONTENT_W * 0.5, h: 0.3,
    fontSize: 8, bold: true, color: WHITE, align: "right",
    fontFace: PPT_SAFE_FONTS.primary,
  });
}

// ========== INTERFACE ==========
interface CampaignAssetRow {
  id: string;
  asset_id: string;
  area: string;
  city: string;
  location: string;
  direction?: string;
  media_type?: string;
  dimensions?: string;
  total_sqft?: number | string;
  illumination_type?: string;
  latitude?: number;
  longitude?: number;
  mounter_name?: string;
  completed_at?: string;
  status?: string;
  photos?: Record<string, string> | null | any;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
export async function generateProofOfDisplayPPT(campaignId: string): Promise<void> {
  // ── Auth ──
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // ── Campaign ──
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*, company_id, campaign_code")
    .eq("id", campaignId)
    .single();
  if (campaignError) throw campaignError;
  if (!campaign) throw new Error("Campaign not found");

  // ── Access check ──
  const { data: userCompany } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("company_id", campaign.company_id)
    .single();
  if (!userCompany) throw new Error("You don't have access to this campaign");

  // ── Company + Org settings ──
  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url")
    .eq("id", campaign.company_id)
    .single();

  const { data: orgSettings } = await supabase
    .from("organization_settings")
    .select("organization_name, logo_url, primary_color")
    .limit(1)
    .single();

  const { data: codeSettings } = await supabase
    .from("company_code_settings")
    .select("use_custom_asset_codes, asset_code_prefix")
    .eq("company_id", campaign.company_id)
    .maybeSingle();

  const companyName = orgSettings?.organization_name || company?.name || "Go-Ads 360°";
  const brandColor = (orgSettings?.primary_color || PRIMARY).replace("#", "");
  const campaignCode = campaign.campaign_code || campaign.id;
  const logoUrl = orgSettings?.logo_url || company?.logo_url;

  // Fetch logo as base64
  let logoBase64: string | null = null;
  if (logoUrl) {
    logoBase64 = await fetchImageBase64(logoUrl);
  }

  // ── Campaign Assets ──
  const { data: campaignAssets, error: caError } = await supabase
    .from("campaign_assets")
    .select(
      `id, asset_id, area, city, location, direction, media_type, dimensions,
       total_sqft, illumination_type, latitude, longitude, mounter_name,
       completed_at, status, photos`
    )
    .eq("campaign_id", campaignId)
    .eq("is_removed", false)
    .order("city", { ascending: true })
    .order("area", { ascending: true });
  if (caError) throw caError;
  if (!campaignAssets || campaignAssets.length === 0) {
    throw new Error("No assets found for this campaign");
  }

  // ── Media Photos fallback ──
  const { data: mediaPhotos } = await supabase
    .from("media_photos")
    .select("photo_url, category, asset_id")
    .eq("campaign_id", campaignId)
    .eq("company_id", campaign.company_id);

  const mediaPhotosByAsset = new Map<string, Array<{ photo_url: string; category: string }>>();
  (mediaPhotos || []).forEach((p: any) => {
    const list = mediaPhotosByAsset.get(p.asset_id) || [];
    list.push({ photo_url: p.photo_url, category: p.category || "" });
    mediaPhotosByAsset.set(p.asset_id, list);
  });

  // ── Pre-resolve all slots + fetch images ──
  const placeholder = getPlaceholderDataUrl();
  let totalSlotsFilled = 0;
  let totalSlotsMissing = 0;
  const verifiedCount = campaignAssets.filter(
    ca => ca.status === "Verified" || ca.status === "Completed"
  ).length;

  const assetSlots: Array<{
    ca: CampaignAssetRow;
    displayCode: string;
    slots: ResolvedSlot[];
    filledCount: number;
  }> = [];

  for (const ca of campaignAssets) {
    const photos = ca.photos as Record<string, string> | null;
    const mp = mediaPhotosByAsset.get(ca.id) || [];
    const rawSlots = resolveProofSlotUrls(photos, mp);

    // Fetch all images as base64 in parallel
    const resolvedSlots: ResolvedSlot[] = await Promise.all(
      rawSlots.map(async (s) => {
        let base64: string | null = null;
        if (s.url) {
          base64 = await fetchImageBase64(s.url);
        }
        if (s.url) totalSlotsFilled++;
        else totalSlotsMissing++;
        return { ...s, base64 };
      })
    );

    const displayCode = formatAssetDisplayCode({
      mediaAssetCode: undefined,
      fallbackId: ca.asset_id,
      companyPrefix: codeSettings?.asset_code_prefix,
    });

    const filledCount = resolvedSlots.filter(s => s.url !== null).length;
    assetSlots.push({ ca, displayCode, slots: resolvedSlots, filledCount });
  }

  // ── Calculate total slides for footer numbering ──
  const totalSlides = 3 + assetSlots.length;
  const startDate = format(new Date(campaign.start_date), "dd MMM yyyy");
  const endDate = format(new Date(campaign.end_date), "dd MMM yyyy");
  const exportDate = format(new Date(), "dd MMM yyyy");
  const campaignNameSafe = truncate(campaign.campaign_name, 60);

  // ─── BUILD PPT ─────────────────────────────────────────────
  const pptx = new PptxGenJS();
  pptx.author = companyName;
  pptx.company = companyName;
  pptx.title = `Proof of Execution - ${campaign.campaign_name}`;
  pptx.subject = "Campaign Proof of Display Report";
  pptx.layout = "LAYOUT_16x9";

  // ══════════════════════════════════════════════════════════
  // SLIDE 1 — COVER
  // ══════════════════════════════════════════════════════════
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: brandColor };

  // Semi-transparent overlay strip at top
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: 0.8,
    fill: { color: "000000", transparency: 80 },
  });

  // Company logo on cover
  if (logoBase64) {
    try {
      coverSlide.addImage({
        data: logoBase64,
        x: 0.4, y: 0.12, w: 0.55, h: 0.55,
        sizing: { type: "contain", w: 0.55, h: 0.55 },
      });
    } catch { /* skip */ }
  }

  coverSlide.addText(sanitizePptText(truncate(companyName, 50)), {
    x: logoBase64 ? 1.1 : 0.4, y: 0.15, w: 8, h: 0.5,
    fontSize: 16, bold: true, color: WHITE, align: "left",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Main title — fixed position, wraps within box
  coverSlide.addText(sanitizePptText("Proof of Execution"), {
    x: MARGIN_L, y: 1.8, w: CONTENT_W, h: 0.8,
    fontSize: 40, bold: true, color: WHITE, align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Campaign name — allow 2-line wrap for long names
  coverSlide.addText(sanitizePptText(truncate(campaign.campaign_name, 90)), {
    x: 0.8, y: 2.7, w: SLIDE_W - 1.6, h: 0.9,
    fontSize: 24, color: "E0E7FF", align: "center", valign: "middle",
    fontFace: PPT_SAFE_FONTS.primary,
    shrinkText: true,
  });

  // Accent divider
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 3.5, y: 3.75, w: 3, h: 0.04,
    fill: { color: SECONDARY },
  });

  // Campaign details grid — all values truncated
  const cities = [...new Set(campaignAssets.map(a => a.city).filter(Boolean))].join(", ");
  const coverDetails = [
    ["Client", truncate(campaign.client_name || "N/A", 50)],
    ["Duration", `${startDate} - ${endDate}`],
    ["Media Type", campaignAssets[0]?.media_type || "Mixed"],
    ["City", truncate(cities || "N/A", 50)],
    ["Total Sites", `${campaignAssets.length}`],
  ];

  let detailY = 4.05;
  for (const [label, value] of coverDetails) {
    coverSlide.addText(sanitizePptText(`${label}:`), {
      x: 2.2, y: detailY, w: 2.5, h: 0.32,
      fontSize: 12, bold: true, color: "B0C4DE", align: "right",
      fontFace: PPT_SAFE_FONTS.primary,
    });
    coverSlide.addText(sanitizePptText(value), {
      x: 4.85, y: detailY, w: 3.8, h: 0.32,
      fontSize: 12, color: WHITE, align: "left",
      fontFace: PPT_SAFE_FONTS.primary,
    });
    detailY += 0.34;
  }

  // Cover footer
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: FOOTER_Y, w: SLIDE_W, h: FOOTER_H,
    fill: { color: "000000", transparency: 60 },
  });
  coverSlide.addText(sanitizePptText(`${exportDate}  |  Confidential  |  ${truncate(companyName, 40)}`), {
    x: MARGIN_L, y: FOOTER_Y + 0.06, w: CONTENT_W, h: 0.3,
    fontSize: 9, color: "B0C4DE", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // ══════════════════════════════════════════════════════════
  // SLIDE 2 — CAMPAIGN SUMMARY
  // ══════════════════════════════════════════════════════════
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: WHITE };

  addSlideHeader(summarySlide, pptx, brandColor, "Campaign Summary", companyName, logoBase64);

  // Section title with subtle background
  summarySlide.addShape(pptx.ShapeType.rect, {
    x: MARGIN_L, y: 0.75, w: CONTENT_W, h: 0.55,
    fill: { color: BG_LIGHT },
    rectRadius: 0.04,
  });
  summarySlide.addText(sanitizePptText("Campaign Overview"), {
    x: MARGIN_L + 0.15, y: 0.78, w: CONTENT_W - 0.3, h: 0.5,
    fontSize: 22, bold: true, color: TEXT_DARK,
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Summary table with alternating row fills
  const summaryRows: any[][] = [
    [
      { text: "Detail", options: { bold: true, fill: { color: brandColor }, color: WHITE, fontSize: 12 } },
      { text: "Information", options: { bold: true, fill: { color: brandColor }, color: WHITE, fontSize: 12 } },
    ],
    [{ text: "Campaign ID", options: { bold: true, color: TEXT_DARK } }, sanitizePptText(truncate(String(campaignCode), 50))],
    [{ text: "Client Name", options: { bold: true, color: TEXT_DARK } }, sanitizePptText(truncate(campaign.client_name || "N/A", 60))],
    [{ text: "Campaign Period", options: { bold: true, color: TEXT_DARK } }, `${startDate}  to  ${endDate}`],
    [{ text: "Media Type", options: { bold: true, color: TEXT_DARK } }, campaignAssets[0]?.media_type || "Mixed"],
    [{ text: "Cities", options: { bold: true, color: TEXT_DARK } }, sanitizePptText(truncate(cities || "N/A", 60))],
    [{ text: "Total Sites", options: { bold: true, color: TEXT_DARK } }, `${campaignAssets.length}`],
    [{ text: "Photos Uploaded", options: { bold: true, color: TEXT_DARK } }, `${totalSlotsFilled} of ${totalSlotsFilled + totalSlotsMissing}`],
    [{ text: "Verified Sites", options: { bold: true, color: TEXT_DARK } }, `${verifiedCount} of ${campaignAssets.length}`],
  ];

  // Apply alternating row fill for readability
  for (let r = 1; r < summaryRows.length; r++) {
    const rowFill = r % 2 === 0 ? BG_LIGHT : WHITE;
    for (let c = 0; c < summaryRows[r].length; c++) {
      const cell = summaryRows[r][c];
      if (typeof cell === "object" && cell.options) {
        cell.options.fill = { color: rowFill };
      } else if (typeof cell === "string") {
        summaryRows[r][c] = { text: cell, options: { fill: { color: rowFill } } };
      }
    }
  }

  summarySlide.addTable(summaryRows, {
    x: 0.8, y: 1.5, w: 8.4,
    colW: [3.5, 4.9],
    border: { type: "solid", color: BORDER, pt: 0.5 },
    fontFace: PPT_SAFE_FONTS.primary,
    fontSize: 13,
    align: "left",
    valign: "middle",
    rowH: 0.42,
  });

  addSlideFooter(summarySlide, pptx, brandColor, companyName, 2, totalSlides, exportDate);

  // ══════════════════════════════════════════════════════════
  // SLIDES 3+ — ASSET PROOF SLIDES (1 per asset, 2x2 grid)
  // ══════════════════════════════════════════════════════════
  let slideNum = 3;

  for (const { ca, displayCode, slots, filledCount } of assetSlots) {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };

    addSlideHeader(slide, pptx, brandColor, campaignNameSafe, companyName, logoBase64);

    // ── Asset identification bar ──
    const assetBarY = HEADER_H + 0.08;
    // Subtle background for asset bar
    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN_L, y: assetBarY, w: CONTENT_W, h: 0.7,
      fill: { color: BG_LIGHT },
      line: { color: BORDER, width: 0.5 },
      rectRadius: 0.05,
    });

    // Asset code badge
    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN_L + 0.08, y: assetBarY + 0.06, w: 2.3, h: 0.28,
      fill: { color: brandColor },
      rectRadius: 0.04,
    });
    slide.addText(sanitizePptText(truncate(displayCode, 30)), {
      x: MARGIN_L + 0.08, y: assetBarY + 0.06, w: 2.3, h: 0.28,
      fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Location — two-line capable area
    const cityArea = [ca.city, ca.area].filter(Boolean).join(", ");
    const locLine1 = truncate(cityArea, 55);
    const locParts = [ca.location, ca.direction ? `Dir: ${ca.direction}` : ""].filter(Boolean);
    const locLine2 = truncate(locParts.join("  |  "), 70);

    slide.addText(sanitizePptText(locLine1), {
      x: MARGIN_L + 2.55, y: assetBarY + 0.04, w: CONTENT_W - 2.7, h: 0.28,
      fontSize: 10, bold: true, color: TEXT_DARK, align: "left", valign: "middle",
      fontFace: PPT_SAFE_FONTS.primary,
    });
    if (locLine2) {
      slide.addText(sanitizePptText(locLine2), {
        x: MARGIN_L + 2.55, y: assetBarY + 0.32, w: CONTENT_W - 2.7, h: 0.28,
        fontSize: 9, color: TEXT_MUTED, align: "left", valign: "middle",
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // ── Photo status indicator (filled count) ──
    const statusText = `${filledCount}/4 photos`;
    const statusColor = filledCount === 4 ? SECONDARY : filledCount >= 2 ? "F59E0B" : "EF4444";
    slide.addText(sanitizePptText(statusText), {
      x: MARGIN_L + 0.08, y: assetBarY + 0.38, w: 2.3, h: 0.22,
      fontSize: 8, bold: true, color: statusColor, align: "center",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // ── 2×2 Photo Grid ──
    const gridTop = assetBarY + 0.78 + 0.06;
    const gridGap = 0.12;
    const cellW = (CONTENT_W - gridGap) / 2;
    const metaRowH = 0.28; // reserved for metadata below grid
    const availableH = FOOTER_Y - gridTop - metaRowH - 0.08;
    const labelH = 0.26;
    const cellH = (availableH - gridGap) / 2;
    const imgH = cellH - labelH - 0.04;

    const positions = [
      { x: MARGIN_L, y: gridTop },
      { x: MARGIN_L + cellW + gridGap, y: gridTop },
      { x: MARGIN_L, y: gridTop + cellH + gridGap },
      { x: MARGIN_L + cellW + gridGap, y: gridTop + cellH + gridGap },
    ];

    for (let i = 0; i < 4; i++) {
      const slot = slots[i];
      const pos = positions[i];
      const hasImage = slot.url !== null && slot.base64 !== null;

      // Photo container — slightly darker bg for missing, clean for present
      slide.addShape(pptx.ShapeType.rect, {
        x: pos.x, y: pos.y, w: cellW, h: imgH,
        fill: { color: hasImage ? WHITE : BG_LIGHT },
        line: { color: hasImage ? BORDER : TEXT_LIGHT, width: hasImage ? 0.5 : 0.75 },
        rectRadius: 0.04,
      });

      // Image — "contain" preserves aspect ratio for both portrait and landscape
      const imgData = slot.base64 || placeholder;
      try {
        slide.addImage({
          data: imgData,
          x: pos.x, y: pos.y, w: cellW, h: imgH,
          sizing: { type: "contain", w: cellW, h: imgH },
        });
      } catch {
        slide.addImage({
          data: placeholder,
          x: pos.x, y: pos.y, w: cellW, h: imgH,
          sizing: { type: "contain", w: cellW, h: imgH },
        });
      }

      // Category badge — muted for missing, colored for present
      const badgeY = pos.y + imgH + 0.02;
      const badgeColor = hasImage ? slot.color : TEXT_LIGHT;
      slide.addShape(pptx.ShapeType.rect, {
        x: pos.x, y: badgeY, w: cellW, h: labelH,
        fill: { color: badgeColor },
        rectRadius: 0.04,
      });
      slide.addText(sanitizePptText(hasImage ? slot.label : `${slot.label} - Pending`), {
        x: pos.x, y: badgeY, w: cellW, h: labelH,
        fontSize: 8, bold: true, color: WHITE, align: "center", valign: "middle",
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // ── Metadata row — only show fields that have values ──
    const metaY = positions[2].y + cellH + gridGap + 0.02;
    const metaParts: string[] = [];
    if (ca.completed_at) {
      try { metaParts.push(`Installed: ${format(new Date(ca.completed_at), "dd MMM yyyy")}`); } catch { /* skip bad date */ }
    }
    if (ca.status && ca.status !== "Pending") metaParts.push(`Status: ${ca.status}`);
    if (ca.latitude && ca.longitude) metaParts.push(`GPS: ${Number(ca.latitude).toFixed(5)}, ${Number(ca.longitude).toFixed(5)}`);
    if (ca.dimensions) metaParts.push(ca.dimensions);
    if (ca.illumination_type) metaParts.push(ca.illumination_type);

    // Only render metadata if there's something to show
    if (metaParts.length > 0) {
      // Subtle divider above metadata
      slide.addShape(pptx.ShapeType.rect, {
        x: MARGIN_L + 0.5, y: metaY - 0.04, w: CONTENT_W - 1.0, h: 0.01,
        fill: { color: BORDER },
      });
      slide.addText(sanitizePptText(truncate(metaParts.join("   |   "), 120)), {
        x: MARGIN_L, y: metaY, w: CONTENT_W, h: metaRowH,
        fontSize: 8, color: TEXT_MUTED, align: "center", valign: "middle",
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    addSlideFooter(slide, pptx, brandColor, companyName, slideNum, totalSlides, exportDate);
    slideNum++;
  }

  // ══════════════════════════════════════════════════════════
  // FINAL SLIDE — THANK YOU
  // ══════════════════════════════════════════════════════════
  const thankSlide = pptx.addSlide();
  thankSlide.background = { color: brandColor };

  if (logoBase64) {
    try {
      thankSlide.addImage({
        data: logoBase64,
        x: 4.0, y: 1.5, w: 2.0, h: 2.0,
        sizing: { type: "contain", w: 2.0, h: 2.0 },
      });
    } catch { /* skip */ }
  }

  const tyBaseY = logoBase64 ? 3.7 : 2.5;

  thankSlide.addText(sanitizePptText("Thank You"), {
    x: MARGIN_L, y: tyBaseY, w: CONTENT_W, h: 0.8,
    fontSize: 36, bold: true, color: WHITE, align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  thankSlide.addText(sanitizePptText(truncate(companyName, 50)), {
    x: MARGIN_L, y: tyBaseY + 0.85, w: CONTENT_W, h: 0.5,
    fontSize: 18, color: "E0E7FF", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Accent divider
  thankSlide.addShape(pptx.ShapeType.rect, {
    x: 3.8, y: tyBaseY + 1.5, w: 2.4, h: 0.03,
    fill: { color: SECONDARY },
  });

  thankSlide.addText(sanitizePptText("For queries, please contact your account manager"), {
    x: MARGIN_L, y: tyBaseY + 1.7, w: CONTENT_W, h: 0.4,
    fontSize: 11, color: "B0C4DE", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Footer on thank-you
  thankSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: FOOTER_Y, w: SLIDE_W, h: FOOTER_H,
    fill: { color: "000000", transparency: 60 },
  });
  thankSlide.addText(sanitizePptText(`Report generated on ${exportDate}  |  Powered by Go-Ads`), {
    x: MARGIN_L, y: FOOTER_Y + 0.06, w: CONTENT_W, h: 0.3,
    fontSize: 8, color: "B0C4DE", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // ─── Save file ─────────────────────────────────────────────
  const safeName = campaign.campaign_name.replace(/[^a-z0-9]/gi, "_").substring(0, 40);
  const fileName = `${safeName}-Proof-of-Execution.pptx`;
  await pptx.writeFile({ fileName });
}
