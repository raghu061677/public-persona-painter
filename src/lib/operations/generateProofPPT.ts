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
const MARGIN_T = 0.5;
const MARGIN_B = 0.4;
const CONTENT_W = SLIDE_W - MARGIN_L - MARGIN_R;
const HEADER_H = 0.6;
const FOOTER_H = 0.45;
const FOOTER_Y = SLIDE_H - FOOTER_H;

// ========== BRAND COLORS ==========
const PRIMARY = "1E40AF";
const PRIMARY_LIGHT = "3B82F6";
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
  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(0, 0, 800, 600);
  ctx.fillStyle = "#D1D5DB";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Photo Not Available", 400, 280);
  ctx.font = "24px Arial";
  ctx.fillText("Upload required", 400, 340);
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

  // Campaign name in header
  slide.addText(sanitizePptText(campaignName), {
    x: textX, y: 0.1, w: SLIDE_W - textX - 0.5, h: 0.4,
    fontSize: 14, bold: true, color: WHITE, align: "left",
    fontFace: PPT_SAFE_FONTS.primary,
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

  slide.addText(sanitizePptText(`Generated by Go-Ads  |  ${exportDate}`), {
    x: MARGIN_L, y: FOOTER_Y + 0.07, w: CONTENT_W * 0.5, h: 0.3,
    fontSize: 9, color: "B0C4DE", align: "left",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  slide.addText(sanitizePptText(`${companyName}  |  Slide ${slideNum} of ${totalSlides}`), {
    x: SLIDE_W / 2, y: FOOTER_Y + 0.07, w: CONTENT_W * 0.5, h: 0.3,
    fontSize: 9, bold: true, color: WHITE, align: "right",
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

    assetSlots.push({ ca, displayCode, slots: resolvedSlots });
  }

  // ── Calculate total slides for footer numbering ──
  // Cover + Summary + (1 per asset) + Thank You = 3 + assets.length
  const totalSlides = 3 + assetSlots.length;
  const startDate = format(new Date(campaign.start_date), "dd MMM yyyy");
  const endDate = format(new Date(campaign.end_date), "dd MMM yyyy");
  const exportDate = format(new Date(), "dd MMM yyyy");

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

  // Semi-transparent overlay strip
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

  coverSlide.addText(sanitizePptText(companyName), {
    x: logoBase64 ? 1.1 : 0.4, y: 0.15, w: 8, h: 0.5,
    fontSize: 18, bold: true, color: WHITE, align: "left",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Main title
  coverSlide.addText(sanitizePptText("Proof of Execution"), {
    x: MARGIN_L, y: 2.0, w: CONTENT_W, h: 0.8,
    fontSize: 40, bold: true, color: WHITE, align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Campaign name
  coverSlide.addText(sanitizePptText(campaign.campaign_name), {
    x: MARGIN_L, y: 2.9, w: CONTENT_W, h: 0.7,
    fontSize: 28, color: "E0E7FF", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Accent divider
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 3.5, y: 3.75, w: 3, h: 0.04,
    fill: { color: SECONDARY },
  });

  // Campaign details grid
  const coverDetails = [
    ["Client", campaign.client_name || "N/A"],
    ["Duration", `${startDate} - ${endDate}`],
    ["Media Type", campaignAssets[0]?.media_type || "Mixed"],
    ["City", [...new Set(campaignAssets.map(a => a.city).filter(Boolean))].join(", ") || "N/A"],
    ["Total Sites", `${campaignAssets.length}`],
  ];

  let detailY = 4.1;
  for (const [label, value] of coverDetails) {
    coverSlide.addText(sanitizePptText(`${label}:`), {
      x: 2.5, y: detailY, w: 2.2, h: 0.35,
      fontSize: 13, bold: true, color: "B0C4DE", align: "right",
      fontFace: PPT_SAFE_FONTS.primary,
    });
    coverSlide.addText(sanitizePptText(value), {
      x: 4.85, y: detailY, w: 3.5, h: 0.35,
      fontSize: 13, color: WHITE, align: "left",
      fontFace: PPT_SAFE_FONTS.primary,
    });
    detailY += 0.35;
  }

  // Cover footer
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: FOOTER_Y, w: SLIDE_W, h: FOOTER_H,
    fill: { color: "000000", transparency: 60 },
  });
  coverSlide.addText(sanitizePptText(`${exportDate}  |  Confidential  |  ${companyName}`), {
    x: MARGIN_L, y: FOOTER_Y + 0.07, w: CONTENT_W, h: 0.3,
    fontSize: 10, color: "B0C4DE", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // ══════════════════════════════════════════════════════════
  // SLIDE 2 — CAMPAIGN SUMMARY
  // ══════════════════════════════════════════════════════════
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: WHITE };

  addSlideHeader(summarySlide, pptx, brandColor, "Campaign Summary", companyName, logoBase64);

  // Summary title
  summarySlide.addText(sanitizePptText("Campaign Overview"), {
    x: MARGIN_L, y: 0.85, w: CONTENT_W, h: 0.5,
    fontSize: 24, bold: true, color: TEXT_DARK,
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Summary table
  const summaryTableRows: any[][] = [
    [
      { text: "Detail", options: { bold: true, fill: { color: brandColor }, color: WHITE, fontSize: 12 } },
      { text: "Information", options: { bold: true, fill: { color: brandColor }, color: WHITE, fontSize: 12 } },
    ],
    [{ text: "Campaign ID", options: { bold: true, color: TEXT_DARK } }, campaignCode],
    [{ text: "Client Name", options: { bold: true, color: TEXT_DARK } }, campaign.client_name || "N/A"],
    [{ text: "Campaign Period", options: { bold: true, color: TEXT_DARK } }, `${startDate}  to  ${endDate}`],
    [{ text: "Media Type", options: { bold: true, color: TEXT_DARK } }, campaignAssets[0]?.media_type || "Mixed"],
    [{ text: "Cities", options: { bold: true, color: TEXT_DARK } }, [...new Set(campaignAssets.map(a => a.city).filter(Boolean))].join(", ") || "N/A"],
    [{ text: "Total Sites", options: { bold: true, color: TEXT_DARK } }, `${campaignAssets.length}`],
    [{ text: "Photos Uploaded", options: { bold: true, color: TEXT_DARK } }, `${totalSlotsFilled} of ${totalSlotsFilled + totalSlotsMissing}`],
    [{ text: "Verified Sites", options: { bold: true, color: TEXT_DARK } }, `${verifiedCount} of ${campaignAssets.length}`],
  ];

  summarySlide.addTable(summaryTableRows, {
    x: 0.8, y: 1.5, w: 8.4,
    colW: [3.5, 4.9],
    border: { type: "solid", color: BORDER, pt: 0.5 },
    fontFace: PPT_SAFE_FONTS.primary,
    fontSize: 13,
    align: "left",
    valign: "middle",
    rowH: 0.45,
  });

  addSlideFooter(summarySlide, pptx, brandColor, companyName, 2, totalSlides, exportDate);

  // ══════════════════════════════════════════════════════════
  // SLIDES 3+ — ASSET PROOF SLIDES (1 per asset, 2x2 grid)
  // ══════════════════════════════════════════════════════════
  let slideNum = 3;

  for (const { ca, displayCode, slots } of assetSlots) {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };

    addSlideHeader(slide, pptx, brandColor, campaign.campaign_name, companyName, logoBase64);

    // ── Asset identification bar ──
    const assetBarY = HEADER_H + 0.1;
    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN_L, y: assetBarY, w: CONTENT_W, h: 0.55,
      fill: { color: BG_LIGHT },
      line: { color: BORDER, width: 0.5 },
      rectRadius: 0.05,
    });

    // Asset code badge
    slide.addShape(pptx.ShapeType.rect, {
      x: MARGIN_L + 0.1, y: assetBarY + 0.08, w: 2.2, h: 0.38,
      fill: { color: brandColor },
      rectRadius: 0.04,
    });
    slide.addText(sanitizePptText(displayCode), {
      x: MARGIN_L + 0.1, y: assetBarY + 0.08, w: 2.2, h: 0.38,
      fontSize: 12, bold: true, color: WHITE, align: "center",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Location text
    const locText = [ca.location, ca.direction ? `Dir: ${ca.direction}` : ""].filter(Boolean).join("  |  ");
    slide.addText(sanitizePptText(`${ca.city || ""}, ${ca.area || ""}  —  ${locText}`.substring(0, 100)), {
      x: MARGIN_L + 2.5, y: assetBarY + 0.05, w: CONTENT_W - 2.7, h: 0.45,
      fontSize: 10, color: TEXT_MUTED, align: "left", valign: "middle",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // ── 2×2 Photo Grid ──
    const gridTop = assetBarY + 0.65 + 0.1;
    const gridGap = 0.15;
    const cellW = (CONTENT_W - gridGap) / 2;
    const availableH = FOOTER_Y - gridTop - 0.55; // leave room for metadata
    const cellH = (availableH - gridGap) / 2;
    const labelH = 0.28;
    const imgH = cellH - labelH - 0.05;

    const positions = [
      { x: MARGIN_L, y: gridTop },
      { x: MARGIN_L + cellW + gridGap, y: gridTop },
      { x: MARGIN_L, y: gridTop + cellH + gridGap },
      { x: MARGIN_L + cellW + gridGap, y: gridTop + cellH + gridGap },
    ];

    for (let i = 0; i < 4; i++) {
      const slot = slots[i];
      const pos = positions[i];

      // Photo container with border
      slide.addShape(pptx.ShapeType.rect, {
        x: pos.x, y: pos.y, w: cellW, h: imgH,
        fill: { color: BG_LIGHT },
        line: { color: BORDER, width: 0.75 },
        rectRadius: 0.04,
      });

      // Image
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

      // Category badge
      const badgeY = pos.y + imgH + 0.03;
      const badgeColor = slot.url ? slot.color : TEXT_LIGHT;
      slide.addShape(pptx.ShapeType.rect, {
        x: pos.x, y: badgeY, w: cellW, h: labelH,
        fill: { color: badgeColor },
        rectRadius: 0.04,
      });
      slide.addText(sanitizePptText(slot.url ? slot.label : `${slot.label} — MISSING`), {
        x: pos.x, y: badgeY, w: cellW, h: labelH,
        fontSize: 9, bold: true, color: WHITE, align: "center", valign: "middle",
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // ── Metadata row below grid ──
    const metaY = positions[2].y + cellH + gridGap - 0.05;
    const metaParts: string[] = [];
    if (ca.completed_at) metaParts.push(`Installed: ${format(new Date(ca.completed_at), "dd MMM yyyy")}`);
    if (ca.status) metaParts.push(`Status: ${ca.status}`);
    if (ca.latitude && ca.longitude) metaParts.push(`GPS: ${ca.latitude.toFixed(5)}, ${ca.longitude.toFixed(5)}`);
    if (ca.dimensions) metaParts.push(ca.dimensions);
    if (ca.illumination_type) metaParts.push(ca.illumination_type);

    if (metaParts.length > 0) {
      slide.addText(sanitizePptText(metaParts.join("    |    ")), {
        x: MARGIN_L, y: metaY, w: CONTENT_W, h: 0.3,
        fontSize: 8, color: TEXT_MUTED, align: "center",
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

  thankSlide.addText(sanitizePptText("Thank You"), {
    x: MARGIN_L, y: logoBase64 ? 3.7 : 2.5, w: CONTENT_W, h: 0.8,
    fontSize: 36, bold: true, color: WHITE, align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  thankSlide.addText(sanitizePptText(companyName), {
    x: MARGIN_L, y: logoBase64 ? 4.5 : 3.5, w: CONTENT_W, h: 0.5,
    fontSize: 20, color: "E0E7FF", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Accent divider
  thankSlide.addShape(pptx.ShapeType.rect, {
    x: 3.8, y: logoBase64 ? 5.15 : 4.2, w: 2.4, h: 0.03,
    fill: { color: SECONDARY },
  });

  thankSlide.addText(sanitizePptText("For queries, please contact your account manager"), {
    x: MARGIN_L, y: logoBase64 ? 5.4 : 4.5, w: CONTENT_W, h: 0.4,
    fontSize: 12, color: "B0C4DE", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  thankSlide.addText(sanitizePptText(`Report generated on ${exportDate}  |  Powered by Go-Ads`), {
    x: MARGIN_L, y: FOOTER_Y + 0.05, w: CONTENT_W, h: 0.3,
    fontSize: 9, color: "B0C4DE", align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // ─── Save file ─────────────────────────────────────────────
  const safeName = campaign.campaign_name.replace(/[^a-z0-9]/gi, "_").substring(0, 40);
  const fileName = `${safeName}-Proof-of-Execution.pptx`;
  await pptx.writeFile({ fileName });
}
