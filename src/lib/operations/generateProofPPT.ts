import PptxGenJS from "pptxgenjs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
  area: string;
  location: string;
  direction?: string;
  media_id?: string;
}

interface PhotoData {
  photo_url: string;
  tag: string;
  latitude?: number;
  longitude?: number;
  uploaded_at: string;
  asset_id: string;
}

interface GroupedPhotos {
  [assetId: string]: {
    asset: AssetData;
    photos: PhotoData[];
  };
}

export async function generateProofOfDisplayPPT(campaignId: string): Promise<void> {
  try {
    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) throw new Error("Campaign not found");

    // Fetch all photos for this campaign
    const { data: photos, error: photosError } = await supabase
      .from("operations_photos")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("asset_id", { ascending: true })
      .order("uploaded_at", { ascending: true });

    if (photosError) throw photosError;
    if (!photos || photos.length === 0) {
      throw new Error("No photos available for this campaign");
    }

    // Get unique asset IDs
    const assetIds = [...new Set(photos.map(p => p.asset_id))];

    // Fetch asset details
    const { data: assets, error: assetsError } = await supabase
      .from("media_assets")
      .select("*")
      .in("id", assetIds);

    if (assetsError) throw assetsError;

    // Group photos by asset
    const grouped: GroupedPhotos = {};
    
    photos.forEach((photo) => {
      if (!grouped[photo.asset_id]) {
        const asset = assets?.find(a => a.id === photo.asset_id);
        grouped[photo.asset_id] = {
          asset: asset || {
            id: photo.asset_id,
            area: "Unknown",
            location: "Unknown",
          },
          photos: [],
        };
      }
      grouped[photo.asset_id].photos.push(photo);
    });

    // Generate PPT
    const pptx = new PptxGenJS();
    
    // Configure presentation
    pptx.author = "Go-Ads 360°";
    pptx.company = "Go-Ads 360°";
    pptx.title = `Proof of Display - ${campaign.campaign_name}`;
    pptx.subject = "Campaign Proof of Installation";

    // Add title slide
    addTitleSlide(pptx, campaign, assetIds.length, photos.length);

    // Add asset slides
    Object.entries(grouped).forEach(([assetId, data]) => {
      addAssetSlides(pptx, data.asset, data.photos);
    });

    // Generate and download
    const fileName = `Proof_${campaign.campaign_name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pptx`;
    await pptx.writeFile({ fileName });

  } catch (error) {
    console.error("Error generating PPT:", error);
    throw error;
  }
}

function addTitleSlide(
  pptx: PptxGenJS,
  campaign: CampaignData,
  totalSites: number,
  totalPhotos: number
): void {
  const slide = pptx.addSlide();
  
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
    color: "1E40AF",
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
  slide.addText("Go-Ads 360°", {
    x: 8,
    y: 0.3,
    w: 1.5,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: "10B981",
    align: "right",
  });

  // Footer
  slide.addText(`Generated on ${format(new Date(), 'dd MMM yyyy')}`, {
    x: 0.5,
    y: 7,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: "64748B",
    align: "center",
  });
}

function addAssetSlides(
  pptx: PptxGenJS,
  asset: AssetData,
  photos: PhotoData[]
): void {
  // Process photos in batches of 2
  for (let i = 0; i < photos.length; i += 2) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Asset title
    const title = `Asset: ${asset.id} – ${asset.location}`;
    slide.addText(title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: "1E40AF",
    });

    // Asset details
    const details = [];
    if (asset.area) details.push(`Area: ${asset.area}`);
    if (asset.location) details.push(`Location: ${asset.location}`);
    if (asset.direction) details.push(`Direction: ${asset.direction}`);
    if (asset.media_id) details.push(`Media ID: ${asset.media_id}`);

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

    // Add first photo
    const photo1 = photos[i];
    addPhotoToSlide(slide, photo1, 0.5, 1.5, 4.5, 4.5);

    // Add second photo if exists
    if (i + 1 < photos.length) {
      const photo2 = photos[i + 1];
      addPhotoToSlide(slide, photo2, 5.0, 1.5, 4.5, 4.5);
    }

    // Footer
    slide.addText("Go-Ads 360° - Proof of Display", {
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
  h: number
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

  const tagColor = tagColors[photo.tag] || "6B7280";
  
  slide.addText(photo.tag, {
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
