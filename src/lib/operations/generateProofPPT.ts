import PptxGenJS from "pptxgenjs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  sanitizePptText,
  PPT_SAFE_FONTS,
} from "@/lib/ppt/sanitizers";

// ========== CONSTANTS ==========
const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 7.5;
const MARGIN = 0.4;
const CONTENT_WIDTH = SLIDE_WIDTH - MARGIN * 2;

const PRIMARY_COLOR = "1E40AF";
const SECONDARY_COLOR = "10B981";
const MUTED_COLOR = "64748B";
const BORDER_COLOR = "E2E8F0";

// The 4 mandatory proof photo slots — order matters
const PROOF_SLOTS = [
  { key: "geotag", aliases: ["geo", "geotag", "geo-tagged", "geo-tagged photo", "photo_1"], label: "Geo-tagged Photo", color: "10B981" },
  { key: "newspaper", aliases: ["newspaper", "newspaper photo", "photo_2"], label: "Newspaper Ad", color: "3B82F6" },
  { key: "traffic1", aliases: ["traffic1", "traffic_left", "traffic", "traffic photo 1", "photo_3"], label: "Traffic View 1", color: "F59E0B" },
  { key: "traffic2", aliases: ["traffic2", "traffic_right", "traffic photo 2", "photo_4"], label: "Traffic View 2", color: "EF4444" },
] as const;

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
  photos?: Record<string, string> | null;
}

// ─── Placeholder generator ───────────────────────────────────
let _placeholderDataUrl: string | null = null;
function getPlaceholderDataUrl(): string {
  if (_placeholderDataUrl) return _placeholderDataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    _placeholderDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7W2u0AAAAASUVORK5CYII=";
    return _placeholderDataUrl;
  }
  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(0, 0, 800, 600);
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Missing", 400, 280);
  ctx.font = "24px Arial";
  ctx.fillText("Photo not uploaded", 400, 330);
  _placeholderDataUrl = canvas.toDataURL("image/png");
  return _placeholderDataUrl;
}

// ─── Resolve the 4 proof photo URLs for one asset ────────────
interface ResolvedSlot {
  label: string;
  color: string;
  url: string | null; // null = missing
  source: "campaign_assets" | "media_photos" | null;
}

function resolveProofSlots(
  caPhotosJson: Record<string, string> | null | undefined,
  mediaPhotos: Array<{ photo_url: string; category: string }>
): ResolvedSlot[] {
  const result: ResolvedSlot[] = [];

  for (const slot of PROOF_SLOTS) {
    let url: string | null = null;
    let source: ResolvedSlot["source"] = null;

    // 1) Try campaign_assets.photos JSON first
    if (caPhotosJson && typeof caPhotosJson === "object") {
      for (const alias of slot.aliases) {
        const val = caPhotosJson[alias] || caPhotosJson[alias.replace(/ /g, "_")];
        if (typeof val === "string" && val.trim()) {
          url = val.trim();
          source = "campaign_assets";
          break;
        }
      }
    }

    // 2) Fallback to media_photos by category
    if (!url && mediaPhotos.length > 0) {
      for (const alias of slot.aliases) {
        const match = mediaPhotos.find(
          (p) => p.category && p.category.toLowerCase() === alias.toLowerCase()
        );
        if (match?.photo_url) {
          url = match.photo_url;
          source = "media_photos";
          break;
        }
      }
    }

    result.push({ label: slot.label, color: slot.color, url, source });
  }

  return result;
}

// ─── Main export ─────────────────────────────────────────────
export async function generateProofOfDisplayPPT(campaignId: string): Promise<void> {
  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Fetch campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*, company_id, campaign_code")
    .eq("id", campaignId)
    .single();
  if (campaignError) throw campaignError;
  if (!campaign) throw new Error("Campaign not found");

  // Verify access
  const { data: userCompany } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("company_id", campaign.company_id)
    .single();
  if (!userCompany) throw new Error("You don't have access to this campaign");

  // Company info
  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url")
    .eq("id", campaign.company_id)
    .single();

  const companyName = company?.name || "Go-Ads 360°";
  const campaignCode = campaign.campaign_code || campaign.id;

  // Fetch campaign_assets (includes photos JSON)
  const { data: campaignAssets, error: caError } = await supabase
    .from("campaign_assets")
    .select(
      `id, asset_id, area, city, location, direction, media_type, dimensions,
       total_sqft, illumination_type, latitude, longitude, mounter_name,
       completed_at, status, photos`
    )
    .eq("campaign_id", campaignId)
    .order("city", { ascending: true })
    .order("area", { ascending: true });
  if (caError) throw caError;

  if (!campaignAssets || campaignAssets.length === 0) {
    throw new Error("No assets found for this campaign");
  }

  // Fetch media_photos for this campaign (supplementary source)
  const { data: mediaPhotos } = await supabase
    .from("media_photos")
    .select("photo_url, category, asset_id")
    .eq("campaign_id", campaignId)
    .eq("company_id", campaign.company_id);

  // Group media_photos by campaign_asset_id
  const mediaPhotosByAsset = new Map<string, Array<{ photo_url: string; category: string }>>();
  (mediaPhotos || []).forEach((p: any) => {
    const list = mediaPhotosByAsset.get(p.asset_id) || [];
    list.push({ photo_url: p.photo_url, category: p.category || "" });
    mediaPhotosByAsset.set(p.asset_id, list);
  });

  // ─── Build PPT ─────────────────────────────────────────────
  const pptx = new PptxGenJS();
  pptx.author = companyName;
  pptx.company = companyName;
  pptx.title = `Proof of Display - ${campaign.campaign_name}`;
  pptx.subject = "Campaign Proof of Installation";
  pptx.layout = "LAYOUT_16x9";

  const footerY = SLIDE_HEIGHT - 0.55;

  // ══════ COVER SLIDE ══════
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: PRIMARY_COLOR };

  coverSlide.addText(sanitizePptText(campaign.campaign_name), {
    x: MARGIN,
    y: 2.0,
    w: CONTENT_WIDTH,
    h: 1.2,
    fontSize: 44,
    bold: true,
    color: "FFFFFF",
    align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText("Proof of Performance Report", {
    x: MARGIN,
    y: 3.2,
    w: CONTENT_WIDTH,
    h: 0.6,
    fontSize: 24,
    color: "E0E7FF",
    align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 3.5,
    y: 4.0,
    w: 3,
    h: 0.02,
    fill: { color: SECONDARY_COLOR },
  });

  coverSlide.addText(sanitizePptText(`Campaign: ${campaignCode}  |  Assets: ${campaignAssets.length}`), {
    x: MARGIN,
    y: 4.3,
    w: CONTENT_WIDTH,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: "FFFFFF",
    align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  coverSlide.addText(sanitizePptText(companyName), {
    x: MARGIN,
    y: footerY,
    w: CONTENT_WIDTH,
    h: 0.4,
    fontSize: 12,
    color: "B0C4DE",
    align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // ══════ SUMMARY SLIDE ══════
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: "FFFFFF" };

  summarySlide.addText("Campaign Summary", {
    x: MARGIN,
    y: 0.4,
    w: CONTENT_WIDTH,
    h: 0.7,
    fontSize: 28,
    bold: true,
    color: PRIMARY_COLOR,
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // Count stats
  let totalSlotsFilled = 0;
  let totalSlotsMissing = 0;
  const verifiedCount = campaignAssets.filter(
    (ca) => ca.status === "Verified" || ca.status === "Completed"
  ).length;

  // Pre-resolve all slots for stats
  const assetSlots = campaignAssets.map((ca) => {
    const photos = ca.photos as Record<string, string> | null;
    const mp = mediaPhotosByAsset.get(ca.id) || [];
    const slots = resolveProofSlots(photos, mp);
    const filled = slots.filter((s) => s.url !== null).length;
    totalSlotsFilled += filled;
    totalSlotsMissing += 4 - filled;
    return { ca, slots };
  });

  const startDate = format(new Date(campaign.start_date), "dd MMM yyyy");
  const endDate = format(new Date(campaign.end_date), "dd MMM yyyy");

  const summaryTableData: any[][] = [
    [
      { text: "Metric", options: { bold: true, fill: { color: PRIMARY_COLOR }, color: "FFFFFF" } },
      { text: "Value", options: { bold: true, fill: { color: PRIMARY_COLOR }, color: "FFFFFF" } },
    ],
    ["Campaign ID", campaignCode],
    ["Client", campaign.client_name || "N/A"],
    ["Period", `${startDate} – ${endDate}`],
    ["Total Assets", campaignAssets.length.toString()],
    ["Photos Uploaded", totalSlotsFilled.toString()],
    ["Photos Missing", totalSlotsMissing.toString()],
    ["Verified Assets", verifiedCount.toString()],
  ];

  summarySlide.addTable(summaryTableData, {
    x: 1.5,
    y: 1.4,
    w: 7,
    colW: [4.5, 2.5],
    border: { type: "solid", color: BORDER_COLOR, pt: 0.5 },
    fontFace: PPT_SAFE_FONTS.primary,
    fontSize: 14,
    align: "left",
    valign: "middle",
    rowH: 0.45,
  });

  summarySlide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
    x: MARGIN,
    y: footerY,
    w: CONTENT_WIDTH,
    h: 0.3,
    fontSize: 10,
    color: MUTED_COLOR,
    align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // ══════ ASSET SLIDES (1 slide per asset, 4-photo grid) ══════
  const placeholderData = getPlaceholderDataUrl();
  const dateStamp = format(new Date(), "dd MMM yyyy");

  for (const { ca, slots } of assetSlots) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // ── Header ──
    const cityArea = `${ca.city || "N/A"}, ${ca.area || "N/A"}`;
    const headerText = `${ca.asset_id} — ${cityArea}`;
    slide.addText(sanitizePptText(headerText), {
      x: MARGIN,
      y: 0.2,
      w: CONTENT_WIDTH,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: PRIMARY_COLOR,
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Detail line
    const detailParts: string[] = [];
    if (ca.location) detailParts.push(ca.location);
    if (ca.direction) detailParts.push(`Dir: ${ca.direction}`);
    if (ca.dimensions) detailParts.push(ca.dimensions);
    if (ca.illumination_type) detailParts.push(ca.illumination_type);
    slide.addText(sanitizePptText(detailParts.join(" | ").substring(0, 120)), {
      x: MARGIN,
      y: 0.6,
      w: CONTENT_WIDTH,
      h: 0.25,
      fontSize: 10,
      color: MUTED_COLOR,
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // ── 2x2 Photo Grid ──
    const gridTop = 1.0;
    const gridGap = 0.2;
    const cellW = (CONTENT_WIDTH - gridGap) / 2;
    const cellH = 2.6;
    const labelH = 0.3;

    const positions = [
      { x: MARGIN, y: gridTop },                          // top-left: geotag
      { x: MARGIN + cellW + gridGap, y: gridTop },        // top-right: newspaper
      { x: MARGIN, y: gridTop + cellH + labelH + gridGap }, // bottom-left: traffic1
      { x: MARGIN + cellW + gridGap, y: gridTop + cellH + labelH + gridGap }, // bottom-right: traffic2
    ];

    for (let i = 0; i < 4; i++) {
      const slot = slots[i];
      const pos = positions[i];
      const imgH = cellH - labelH - 0.05;

      // Border frame
      slide.addShape(pptx.ShapeType.rect, {
        x: pos.x,
        y: pos.y,
        w: cellW,
        h: cellH,
        line: { color: BORDER_COLOR, width: 1 },
        fill: { color: "FFFFFF" },
      });

      // Image or placeholder
      if (slot.url) {
        try {
          slide.addImage({
            path: slot.url,
            x: pos.x,
            y: pos.y,
            w: cellW,
            h: imgH,
            sizing: { type: "contain", w: cellW, h: imgH },
          });
        } catch (err) {
          console.warn(`Failed to add image for ${slot.label}:`, err);
          slide.addImage({
            data: placeholderData,
            x: pos.x,
            y: pos.y,
            w: cellW,
            h: imgH,
            sizing: { type: "contain", w: cellW, h: imgH },
          });
        }
      } else {
        // Missing placeholder
        slide.addImage({
          data: placeholderData,
          x: pos.x,
          y: pos.y,
          w: cellW,
          h: imgH,
          sizing: { type: "contain", w: cellW, h: imgH },
        });
      }

      // Category label badge
      const badgeY = pos.y + imgH + 0.05;
      const badgeColor = slot.url ? slot.color : "9CA3AF";
      slide.addShape(pptx.ShapeType.rect, {
        x: pos.x,
        y: badgeY,
        w: cellW,
        h: labelH,
        fill: { color: badgeColor },
      });
      slide.addText(sanitizePptText(slot.url ? slot.label : `${slot.label} — MISSING`), {
        x: pos.x,
        y: badgeY,
        w: cellW,
        h: labelH,
        fontSize: 10,
        bold: true,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
        fontFace: PPT_SAFE_FONTS.primary,
      });
    }

    // ── Footer: Campaign ID + Asset Code + Date ──
    const footerLine = `${campaignCode}  |  ${ca.asset_id}  |  ${dateStamp}`;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: footerY - 0.05,
      w: SLIDE_WIDTH,
      h: 0.45,
      fill: { color: PRIMARY_COLOR },
    });
    slide.addText(sanitizePptText(footerLine), {
      x: MARGIN,
      y: footerY,
      w: CONTENT_WIDTH / 2,
      h: 0.3,
      fontSize: 10,
      color: "FFFFFF",
      align: "left",
      fontFace: PPT_SAFE_FONTS.primary,
    });
    slide.addText(sanitizePptText(companyName), {
      x: SLIDE_WIDTH / 2,
      y: footerY,
      w: CONTENT_WIDTH / 2,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: "FFFFFF",
      align: "right",
      fontFace: PPT_SAFE_FONTS.primary,
    });
  }

  // ─── Save file ─────────────────────────────────────────────
  const safeName = campaign.campaign_name.replace(/[^a-z0-9]/gi, "_");
  const fileName = `${safeName}-Proof-Report.pptx`;
  await pptx.writeFile({ fileName });
}
