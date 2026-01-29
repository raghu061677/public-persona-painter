import PptxGenJS from "pptxgenjs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fetchImageAsBase64 } from "@/lib/qrWatermark";
import { buildStreetViewUrl } from "@/lib/streetview";
import { 
  sanitizePptHyperlink, 
  sanitizePptText, 
  PPT_SAFE_FONTS 
} from "@/lib/ppt/sanitizers";

// ========== CONSTANTS ==========
const SLIDE_WIDTH = 10; // inches
const SLIDE_HEIGHT = 7.5; // inches
const MARGIN = 0.4; // inches from edge
const CONTENT_WIDTH = SLIDE_WIDTH - (MARGIN * 2); // 9.2 inches

// Colors
const PRIMARY_COLOR = "1E40AF";
const SECONDARY_COLOR = "10B981";
const MUTED_COLOR = "64748B";
const BORDER_COLOR = "E2E8F0";
const BG_LIGHT = "F8FAFC";

// Photo type configuration
const PHOTO_TYPE_CONFIG = [
  { keys: ["geo", "geotag", "Geo-Tagged", "Geo-Tagged Photo"], label: "Geo-tagged Photo", color: "10B981" },
  { keys: ["newspaper", "Newspaper", "Newspaper Photo"], label: "Newspaper Ad", color: "3B82F6" },
  { keys: ["traffic1", "traffic_left", "Traffic", "Traffic Photo 1"], label: "Traffic View 1", color: "F59E0B" },
  { keys: ["traffic2", "traffic_right", "Traffic Photo 2"], label: "Traffic View 2", color: "EF4444" },
  { keys: ["Other", "Other Photo"], label: "Other Photo", color: "6B7280" },
];

interface CampaignData {
  id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  plan_id?: string;
}

interface AssetData {
  id: string;
  asset_code: string;
  area: string;
  city: string;
  location: string;
  direction?: string;
  media_type?: string;
  qr_code_url?: string;
  latitude?: number;
  longitude?: number;
  dimensions?: string;
  total_sqft?: number | string;
  illumination_type?: string;
}

interface PhotoData {
  photo_url: string;
  category: string;
  latitude?: number;
  longitude?: number;
  uploaded_at: string;
  asset_id: string;
  campaign_asset_id: string;
}

interface GroupedPhotos {
  [campaignAssetId: string]: {
    asset: AssetData;
    photos: PhotoData[];
  };
}

// Truncate long text
function truncateText(text: string, maxLength: number): string {
  const sanitized = sanitizePptText(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.substring(0, maxLength - 3) + "...";
}

// Get photo config by category
function getPhotoConfig(category: string): { label: string; color: string } {
  for (const config of PHOTO_TYPE_CONFIG) {
    if (config.keys.some(key => category.toLowerCase().includes(key.toLowerCase()))) {
      return { label: config.label, color: config.color };
    }
  }
  return { label: category || "Photo", color: "6B7280" };
}

// QR cache
const qrCache = new Map<string, { base64: string; streetViewUrl: string }>();

async function getCachedQR(asset: AssetData): Promise<{ base64: string; streetViewUrl: string } | null> {
  if (!asset.qr_code_url) return null;
  
  if (qrCache.has(asset.id)) {
    return qrCache.get(asset.id)!;
  }

  try {
    const streetViewUrl = asset.latitude && asset.longitude 
      ? buildStreetViewUrl(asset.latitude, asset.longitude)
      : null;
    
    if (!streetViewUrl) return null;

    const base64 = await fetchImageAsBase64(asset.qr_code_url);
    const result = { base64, streetViewUrl };
    qrCache.set(asset.id, result);
    return result;
  } catch (error) {
    console.warn(`Failed to fetch QR for asset ${asset.id}:`, error);
    return null;
  }
}

export async function generateProofOfDisplayPPT(campaignId: string): Promise<void> {
  try {
    // Get current user and their company
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    // Fetch campaign data with company verification
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, company_id")
      .eq("id", campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) throw new Error("Campaign not found");

    // Verify user has access to this campaign's company
    const { data: userCompany } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("company_id", campaign.company_id)
      .single();

    if (!userCompany) {
      throw new Error("You don't have access to this campaign");
    }

    // Fetch company details
    const { data: company } = await supabase
      .from("companies")
      .select("name, logo_url")
      .eq("id", campaign.company_id)
      .single();

    // Fetch campaign_assets with snapshot data
    const { data: campaignAssets, error: campaignAssetsError } = await supabase
      .from("campaign_assets")
      .select(`
        id,
        asset_id,
        area,
        city,
        location,
        direction,
        media_type,
        latitude,
        longitude,
        dimensions,
        total_sqft,
        illumination_type,
        mounter_name,
        completed_at,
        status,
        media_assets(qr_code_url, area, city, location, direction, media_type, dimensions, total_sqft, illumination_type)
      `)
      .eq("campaign_id", campaignId)
      .order("city", { ascending: true })
      .order("area", { ascending: true });

    if (campaignAssetsError) throw campaignAssetsError;

    // Create mapping from campaign_assets.id to asset data
    const campaignAssetMap = new Map<string, AssetData & { mounter_name?: string; completed_at?: string; status?: string }>();
    campaignAssets?.forEach(ca => {
      const master = (ca.media_assets as any) || {};
      campaignAssetMap.set(ca.id, {
        id: ca.id,
        asset_code: ca.asset_id,
        area: ca.area || master.area || "Unknown",
        city: ca.city || master.city || "Unknown",
        location: ca.location || master.location || "Unknown",
        direction: ca.direction || master.direction || undefined,
        media_type: ca.media_type || master.media_type || undefined,
        latitude: ca.latitude ?? undefined,
        longitude: ca.longitude ?? undefined,
        qr_code_url: master.qr_code_url ?? undefined,
        dimensions: (ca as any).dimensions || master.dimensions || undefined,
        total_sqft: (ca as any).total_sqft || master.total_sqft || undefined,
        illumination_type: (ca as any).illumination_type || master.illumination_type || undefined,
        mounter_name: (ca as any).mounter_name,
        completed_at: (ca as any).completed_at,
        status: (ca as any).status,
      });
    });

    // Fetch all photos for this campaign
    const { data: photos, error: photosError } = await supabase
      .from("media_photos")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("company_id", campaign.company_id)
      .order("asset_id", { ascending: true })
      .order("uploaded_at", { ascending: true });

    if (photosError) throw photosError;
    if (!photos || photos.length === 0) {
      throw new Error("No photos available for this campaign");
    }

    // Group photos by campaign_assets.id
    const grouped: GroupedPhotos = {};
    
    photos.forEach((photo: any) => {
      const campaignAssetId = photo.asset_id;
      const assetData = campaignAssetMap.get(campaignAssetId);
      
      if (!grouped[campaignAssetId]) {
        grouped[campaignAssetId] = {
          asset: assetData || {
            id: campaignAssetId,
            asset_code: campaignAssetId,
            area: "Unknown",
            city: "Unknown",
            location: "Unknown",
          },
          photos: [],
        };
      }
      grouped[campaignAssetId].photos.push({
        ...photo,
        campaign_asset_id: campaignAssetId,
      });
    });

    // Generate PPT
    const pptx = new PptxGenJS();
    
    // Configure presentation
    pptx.author = company?.name || "Go-Ads 360°";
    pptx.company = company?.name || "Go-Ads 360°";
    pptx.title = `Proof of Display - ${campaign.campaign_name}`;
    pptx.subject = "Campaign Proof of Installation";
    pptx.layout = "LAYOUT_16x9";

    const footerY = SLIDE_HEIGHT - 0.6;

    // ==================== SLIDE 1: COVER ====================
    const coverSlide = pptx.addSlide();
    coverSlide.background = { color: PRIMARY_COLOR };

    // Campaign name (centered, large)
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

    // Subtitle
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

    // Horizontal divider
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 3.5,
      y: 4.0,
      w: 3,
      h: 0.02,
      fill: { color: SECONDARY_COLOR },
    });

    // Total Assets badge
    const assetsWithPhotos = Object.keys(grouped).length;
    coverSlide.addText(`Total Assets: ${assetsWithPhotos}`, {
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

    // Footer with company branding
    coverSlide.addText(sanitizePptText(company?.name || "Go-Ads 360°"), {
      x: MARGIN,
      y: footerY,
      w: CONTENT_WIDTH,
      h: 0.4,
      fontSize: 12,
      color: "B0C4DE",
      align: "center",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // ==================== SLIDE 2: SUMMARY ====================
    const summarySlide = pptx.addSlide();
    summarySlide.background = { color: "FFFFFF" };

    // Summary title
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

    // Calculate stats
    const totalAssets = Object.keys(grouped).length;
    const totalPhotos = photos.length;
    const verifiedAssets = Object.values(grouped).filter(g => {
      const assetData = g.asset as any;
      return assetData?.status === "Verified" || assetData?.status === "Completed";
    }).length;

    // Summary table
    const summaryTableData: any[][] = [
      [
        { text: "Metric", options: { bold: true, fill: { color: PRIMARY_COLOR }, color: "FFFFFF" } }, 
        { text: "Value", options: { bold: true, fill: { color: PRIMARY_COLOR }, color: "FFFFFF" } }
      ],
      ["Total Assets", totalAssets.toString()],
      ["Assets with Photos", totalAssets.toString()],
      ["Total Photos Uploaded", totalPhotos.toString()],
      ["Verified Assets", verifiedAssets.toString()],
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
      rowH: 0.5,
    });

    // Campaign period info
    const startDate = format(new Date(campaign.start_date), "dd MMM yyyy");
    const endDate = format(new Date(campaign.end_date), "dd MMM yyyy");
    
    summarySlide.addText(`Campaign Period: ${startDate} - ${endDate}`, {
      x: MARGIN,
      y: 5.0,
      w: CONTENT_WIDTH,
      h: 0.4,
      fontSize: 14,
      color: MUTED_COLOR,
      align: "center",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    summarySlide.addText(`Client: ${sanitizePptText(campaign.client_name)}`, {
      x: MARGIN,
      y: 5.5,
      w: CONTENT_WIDTH,
      h: 0.4,
      fontSize: 14,
      color: MUTED_COLOR,
      align: "center",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Footer
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

    // ==================== ASSET SLIDES ====================
    for (const [campaignAssetId, data] of Object.entries(grouped)) {
      await addAssetSlides(pptx, data.asset, data.photos, company?.name || "Go-Ads 360°");
    }

    // Generate and download
    const fileName = `${campaign.campaign_name.replace(/[^a-z0-9]/gi, "_")}-Proof-Report.pptx`;
    await pptx.writeFile({ fileName });

  } catch (error) {
    console.error("Error generating PPT:", error);
    throw error;
  }
}

async function addAssetSlides(
  pptx: PptxGenJS,
  asset: AssetData,
  photos: PhotoData[],
  companyName: string
): Promise<void> {
  const footerY = SLIDE_HEIGHT - 0.6;

  // Process photos in pairs (2 per slide)
  for (let i = 0; i < photos.length; i += 2) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // ========== HEADER SECTION ==========
    const cityArea = `${asset.city}, ${asset.area}`;
    const locationText = truncateText(asset.location, 50);
    const headerTitle = `Asset: ${asset.asset_code} – ${cityArea}, ${locationText}`;
    
    slide.addText(truncateText(headerTitle, 85), {
      x: MARGIN,
      y: 0.25,
      w: CONTENT_WIDTH - 0.2,
      h: 0.45,
      fontSize: 18,
      bold: true,
      color: PRIMARY_COLOR,
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Details line
    const detailParts: string[] = [];
    if (asset.location) {
      detailParts.push(`Location: ${truncateText(asset.location, 35)}`);
    }
    if (asset.direction) {
      detailParts.push(`Direction: ${sanitizePptText(asset.direction)}`);
    }
    if (asset.dimensions) {
      detailParts.push(`Dimension: ${sanitizePptText(asset.dimensions)}`);
    }
    if (asset.illumination_type) {
      detailParts.push(sanitizePptText(asset.illumination_type));
    }

    const detailsText = truncateText(detailParts.join(" | "), 120);
    slide.addText(detailsText, {
      x: MARGIN,
      y: 0.75,
      w: CONTENT_WIDTH,
      h: 0.3,
      fontSize: 11,
      color: MUTED_COLOR,
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // ========== PHOTO SECTION ==========
    const photoAreaY = 1.15;
    const photoAreaHeight = 4.6;
    const photoWidth = 4.3;
    const photoHeight = photoAreaHeight;
    const photoGap = 0.3;
    const photoStartX = MARGIN + 0.1;

    // Photo 1 (left)
    const photo1 = photos[i];
    if (photo1) {
      await addPhotoWithFrame(slide, pptx, photo1, photoStartX, photoAreaY, photoWidth, photoHeight);
    }

    // Photo 2 (right) if exists
    if (i + 1 < photos.length) {
      const photo2 = photos[i + 1];
      const photo2X = photoStartX + photoWidth + photoGap;
      await addPhotoWithFrame(slide, pptx, photo2, photo2X, photoAreaY, photoWidth, photoHeight);
    }

    // ========== FOOTER SECTION ==========
    const assetData = asset as any;
    const mounterName = assetData.mounter_name || "N/A";
    const completedDate = assetData.completed_at 
      ? format(new Date(assetData.completed_at), "dd MMM yyyy")
      : "Pending";
    
    slide.addText(sanitizePptText(`Installed by: ${mounterName} | Completed: ${completedDate}`), {
      x: MARGIN,
      y: 5.9,
      w: 4.5,
      h: 0.25,
      fontSize: 9,
      italic: true,
      color: MUTED_COLOR,
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Company branding
    slide.addText(sanitizePptText(companyName), {
      x: 5.5,
      y: 5.9,
      w: 4,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: PRIMARY_COLOR,
      align: "right",
      fontFace: PPT_SAFE_FONTS.primary,
    });

    // Powered by footer
    slide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
      x: MARGIN,
      y: footerY,
      w: CONTENT_WIDTH,
      h: 0.3,
      fontSize: 10,
      color: MUTED_COLOR,
      align: "center",
      fontFace: PPT_SAFE_FONTS.primary,
    });
  }
}

async function addPhotoWithFrame(
  slide: any,
  pptx: PptxGenJS,
  photo: PhotoData,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<void> {
  const borderWidth = 0.03;
  const labelHeight = 0.35;
  const imageHeight = h - labelHeight - 0.1;

  const photoConfig = getPhotoConfig(photo.category);

  // Outer border/frame
  slide.addShape(pptx.ShapeType.rect, {
    x: x - borderWidth,
    y: y - borderWidth,
    w: w + (borderWidth * 2),
    h: h + (borderWidth * 2),
    line: { color: BORDER_COLOR, width: 1.5 },
    fill: { color: "FFFFFF" },
  });

  // Photo image - use path for URL-based images
  slide.addImage({
    path: photo.photo_url,
    x: x,
    y: y,
    w: w,
    h: imageHeight,
    sizing: { type: "contain", w, h: imageHeight },
  });

  // Category label badge at bottom
  const labelY = y + imageHeight + 0.05;
  slide.addShape(pptx.ShapeType.rect, {
    x: x,
    y: labelY,
    w: w,
    h: labelHeight,
    fill: { color: photoConfig.color },
  });

  slide.addText(sanitizePptText(photoConfig.label), {
    x: x,
    y: labelY,
    w: w,
    h: labelHeight,
    fontSize: 11,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
    fontFace: PPT_SAFE_FONTS.primary,
  });

  // GPS coordinates if available
  if (photo.latitude && photo.longitude) {
    slide.addText(sanitizePptText(`GPS: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`), {
      x: x,
      y: y + 0.1,
      w: w,
      h: 0.25,
      fontSize: 8,
      color: "FFFFFF",
      fill: { color: "00000080" },
      align: "center",
      fontFace: PPT_SAFE_FONTS.primary,
    });
  }

  // Upload date badge
  slide.addText(format(new Date(photo.uploaded_at), "dd MMM yyyy"), {
    x: x + w - 1.2,
    y: y + imageHeight - 0.35,
    w: 1.1,
    h: 0.25,
    fontSize: 8,
    color: "FFFFFF",
    fill: { color: "00000080" },
    align: "center",
    fontFace: PPT_SAFE_FONTS.primary,
  });
}
