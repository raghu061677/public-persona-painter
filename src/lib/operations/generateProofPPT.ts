import PptxGenJS from "pptxgenjs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fetchImageAsBase64 } from "@/lib/qrWatermark";
import { buildStreetViewUrl } from "@/lib/streetview";

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

    // Fetch campaign_assets with snapshot data (area, city, location from campaign_assets)
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
        media_assets(qr_code_url)
      `)
      .eq("campaign_id", campaignId);

    if (campaignAssetsError) throw campaignAssetsError;

    // Create mapping from campaign_assets.id to asset data
    const campaignAssetMap = new Map<string, AssetData>();
    campaignAssets?.forEach(ca => {
      campaignAssetMap.set(ca.id, {
        id: ca.id,
        asset_code: ca.asset_id, // This is the actual asset code like HYD-BQS-0057
        area: ca.area || "Unknown",
        city: ca.city || "Unknown",
        location: ca.location || "Unknown",
        direction: ca.direction ?? undefined,
        media_type: ca.media_type ?? undefined,
        latitude: ca.latitude ?? undefined,
        longitude: ca.longitude ?? undefined,
        qr_code_url: (ca.media_assets as any)?.qr_code_url ?? undefined,
      });
    });

    // Fetch all photos for this campaign
    // media_photos.asset_id stores campaign_assets.id (UUID), not media_assets.id
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
      const campaignAssetId = photo.asset_id; // This is campaign_assets.id
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
    pptx.author = "Go-Ads 360°";
    pptx.company = "Go-Ads 360°";
    pptx.title = `Proof of Display - ${campaign.campaign_name}`;
    pptx.subject = "Campaign Proof of Installation";

    // Count unique assets with photos
    const assetsWithPhotos = Object.keys(grouped).length;

    // Add title slide
    await addTitleSlide(pptx, campaign, assetsWithPhotos, photos.length);

    // Add asset slides
    for (const [campaignAssetId, data] of Object.entries(grouped)) {
      await addAssetSlides(pptx, data.asset, data.photos);
    }

    // Generate and download
    const fileName = `Proof_${campaign.campaign_name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pptx`;
    await pptx.writeFile({ fileName });

  } catch (error) {
    console.error("Error generating PPT:", error);
    throw error;
  }
}

async function addTitleSlide(
  pptx: PptxGenJS,
  campaign: CampaignData,
  totalSites: number,
  totalPhotos: number
): Promise<void> {
  const slide = pptx.addSlide();
  
  // Fetch organization settings for customization
  const { data: settings } = await supabase
    .from("organization_settings")
    .select("ppt_primary_color, ppt_secondary_color, ppt_footer_text, organization_name, logo_url")
    .limit(1)
    .single();

  const primaryColor = settings?.ppt_primary_color?.replace("#", "") || "1E40AF";
  const secondaryColor = settings?.ppt_secondary_color?.replace("#", "") || "10B981";
  const orgName = settings?.organization_name || "Go-Ads 360°";
  
  // Set background color
  slide.background = { color: "F8FAFC" };

  // Title
  slide.addText("Proof of Display Report", {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1,
    fontSize: 36,
    bold: true,
    color: primaryColor,
    align: "center",
  });

  // Campaign details
  const details = [
    `Campaign: ${campaign.campaign_name}`,
    `Client: ${campaign.client_name}`,
    `Duration: ${format(new Date(campaign.start_date), 'dd MMM yyyy')} - ${format(new Date(campaign.end_date), 'dd MMM yyyy')}`,
    `Total Sites: ${totalSites}`,
    `Total Photos: ${totalPhotos}`,
  ];

  slide.addText(details.join("\n"), {
    x: 1,
    y: 3,
    w: 8,
    h: 3,
    fontSize: 18,
    color: "334155",
    align: "center",
    lineSpacing: 32,
  });

  // Branding
  slide.addText(orgName, {
    x: 8,
    y: 0.3,
    w: 1.5,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: secondaryColor,
    align: "right",
  });

  // Footer
  const footerText = settings?.ppt_footer_text || `Generated on ${format(new Date(), 'dd MMM yyyy')}`;
  slide.addText(footerText, {
    x: 0.5,
    y: 7,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: "64748B",
    align: "center",
  });
}

async function addAssetSlides(
  pptx: PptxGenJS,
  asset: AssetData,
  photos: PhotoData[]
): Promise<void> {
  // Get QR data for this asset
  const qrData = await getCachedQR(asset);

  // Process photos in batches of 2
  for (let i = 0; i < photos.length; i += 2) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Asset title - use asset_code (like HYD-BQS-0057) and location
    const title = `Asset: ${asset.asset_code} – ${asset.location}`;
    slide.addText(title, {
      x: 0.5,
      y: 0.3,
      w: 8.5,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: "1E40AF",
    });

    // Add clickable QR in header area
    if (qrData) {
      slide.addImage({
        data: qrData.base64,
        x: 9.0,
        y: 0.2,
        w: 0.8,
        h: 0.8,
        hyperlink: { url: qrData.streetViewUrl },
      });
    }

    // Asset details - show Area, City, Location, Media Type
    const details = [];
    if (asset.area && asset.area !== "Unknown") details.push(`Area: ${asset.area}`);
    if (asset.city && asset.city !== "Unknown") details.push(`City: ${asset.city}`);
    if (asset.location && asset.location !== "Unknown") details.push(`Location: ${asset.location}`);
    if (asset.direction) details.push(`Direction: ${asset.direction}`);
    if (asset.media_type) details.push(`Type: ${asset.media_type}`);

    if (details.length > 0) {
      slide.addText(details.join(" | "), {
        x: 0.5,
        y: 0.9,
        w: 9,
        h: 0.3,
        fontSize: 12,
        color: "64748B",
      });
    }

    // Add first photo with QR watermark
    const photo1 = photos[i];
    addPhotoToSlide(slide, photo1, 0.5, 1.5, 4.5, 4.5, qrData);

    // Add second photo if exists
    if (i + 1 < photos.length) {
      const photo2 = photos[i + 1];
      addPhotoToSlide(slide, photo2, 5.0, 1.5, 4.5, 4.5, qrData);
    }

    // Footer with page indicator
    slide.addText("Powered by Go-Ads 360° — OOH Media Platform", {
      x: 0.5,
      y: 7,
      w: 9,
      h: 0.3,
      fontSize: 10,
      color: "94A3B8",
      align: "center",
    });
  }
}

function addPhotoToSlide(
  slide: any,
  photo: PhotoData,
  x: number,
  y: number,
  w: number,
  h: number,
  qrData?: { base64: string; streetViewUrl: string } | null
): void {
  // Add photo
  slide.addImage({
    path: photo.photo_url,
    x,
    y,
    w,
    h,
    sizing: { type: "contain", w, h },
  });

  // Add clickable QR watermark at bottom-right of photo
  if (qrData) {
    const qrSize = 0.7;
    const qrPadding = 0.12;
    slide.addImage({
      data: qrData.base64,
      x: x + w - qrSize - qrPadding,
      y: y + h - qrSize - qrPadding,
      w: qrSize,
      h: qrSize,
      hyperlink: { url: qrData.streetViewUrl },
    });
  }

  // Add tag badge
  const tagColors: { [key: string]: string } = {
    "Traffic": "EF4444",
    "Traffic Photo 1": "EF4444",
    "Traffic Photo 2": "EF4444",
    "Newspaper": "3B82F6",
    "Newspaper Photo": "3B82F6",
    "Geo-Tagged": "10B981",
    "Geo-Tagged Photo": "10B981",
    "Other": "6B7280",
    "Other Photo": "6B7280",
  };

  const tagColor = tagColors[photo.category] || "6B7280";
  
  slide.addText(photo.category, {
    x: x + 0.1,
    y: y + 0.1,
    w: 1.5,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: "FFFFFF",
    fill: { color: tagColor },
    align: "center",
  });

  // Add GPS coordinates if available
  if (photo.latitude && photo.longitude) {
    const gpsText = `GPS: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`;
    slide.addText(gpsText, {
      x,
      y: y + h - 0.4,
      w,
      h: 0.3,
      fontSize: 8,
      color: "FFFFFF",
      fill: { color: "00000080" },
      align: "center",
    });
  }

  // Add upload date
  slide.addText(format(new Date(photo.uploaded_at), 'dd MMM yyyy'), {
    x: x + w - 1.3,
    y: y + 0.1,
    w: 1.2,
    h: 0.25,
    fontSize: 8,
    color: "FFFFFF",
    fill: { color: "00000080" },
    align: "center",
  });
}
