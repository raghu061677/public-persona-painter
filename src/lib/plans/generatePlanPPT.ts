import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';
import { validateAndFixStreetViewUrl } from '../streetview';

interface PlanAsset {
  asset_id: string;
  area: string;
  location: string;
  direction?: string;
  dimensions?: string;
  total_sqft?: number;
  illumination_type?: string;
  card_rate: number;
  media_type: string;
  latitude?: number;
  longitude?: number;
  google_street_view_url?: string;
  qr_code_url?: string;
  primary_photo_url?: string;
}

interface PlanData {
  id: string;
  plan_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  assets: PlanAsset[];
}

interface OrganizationSettings {
  organization_name?: string;
  logo_url?: string;
  primary_color?: string;
}

const DEFAULT_PLACEHOLDER = 'https://via.placeholder.com/800x600/f3f4f6/6b7280?text=No+Image+Available';

export async function generatePlanPPT(
  plan: PlanData,
  orgSettings: OrganizationSettings
): Promise<Blob> {
  const prs = new pptxgen();

  // Configure presentation
  prs.author = orgSettings.organization_name || 'Go-Ads 360°';
  prs.company = orgSettings.organization_name || 'Go-Ads 360°';
  prs.title = `${plan.plan_name} - Media Proposal`;
  prs.subject = `Media Plan Proposal for ${plan.client_name}`;

  const primaryColor = orgSettings.primary_color || '1E3A8A';
  const brandColor = primaryColor.replace('#', '');

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();

  // Background gradient
  coverSlide.background = { fill: brandColor };

  // Title
  coverSlide.addText('MEDIA PLAN PROPOSAL', {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Plan name
  coverSlide.addText(plan.plan_name, {
    x: 0.5,
    y: 3.7,
    w: 9,
    h: 0.8,
    fontSize: 28,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Client name
  coverSlide.addText(`Prepared for: ${plan.client_name}`, {
    x: 0.5,
    y: 4.7,
    w: 9,
    h: 0.5,
    fontSize: 20,
    color: 'E5E7EB',
    align: 'center',
    fontFace: 'Arial',
  });

  // Footer box
  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 6.8,
    w: 10,
    h: 0.7,
    fill: { color: '000000', transparency: 50 },
  });

  coverSlide.addText(
    `${format(new Date(), 'dd MMMM yyyy')} | ${orgSettings.organization_name || 'Go-Ads 360°'}`,
    {
      x: 0.5,
      y: 6.9,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    }
  );

  // ===== ASSET SLIDES =====
  for (const asset of plan.assets) {
    // Use primary_photo_url for presentation
    const photo1 = asset.primary_photo_url || DEFAULT_PLACEHOLDER;
    const photo2 = asset.primary_photo_url || DEFAULT_PLACEHOLDER;

    // Parse dimensions
    let width = '';
    let height = '';
    if (asset.dimensions) {
      const match = asset.dimensions.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
      if (match) {
        width = match[1];
        height = match[2];
      }
    }

    // ===== SLIDE 1: TWO-IMAGE PRESENTATION SLIDE =====
    const slide1 = prs.addSlide();

    // Border frame
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 0.2,
      w: 9.6,
      h: 7.1,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 8 },
    });

    // Header
    slide1.addText(`${asset.asset_id} – ${asset.area} – ${asset.location}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 30,
      bold: true,
      color: brandColor,
      align: 'center',
      fontFace: 'Arial',
    });

    // Image 1
    try {
      slide1.addImage({
        path: photo1,
        x: 0.5,
        y: 1.8,
        w: 4.5,
        h: 3.5,
        sizing: { type: 'contain', w: 4.5, h: 3.5 },
      });
    } catch (error) {
      console.error('Failed to add image 1:', error);
    }

    // Image 2
    try {
      slide1.addImage({
        path: photo2,
        x: 5.2,
        y: 1.8,
        w: 4.5,
        h: 3.5,
        sizing: { type: 'contain', w: 4.5, h: 3.5 },
      });
    } catch (error) {
      console.error('Failed to add image 2:', error);
    }

    // Footer
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 6.8,
      w: 9.6,
      h: 0.5,
      fill: { color: brandColor },
    });

    slide1.addText(`${plan.plan_name} | ${plan.client_name} | ${orgSettings.organization_name || 'Go-Ads 360°'} Media Proposal`, {
      x: 0.5,
      y: 6.9,
      w: 9,
      h: 0.3,
      fontSize: 14,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });

    // ===== SLIDE 2: DETAILS SLIDE =====
    const slide2 = prs.addSlide();

    // Border frame
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 0.2,
      w: 9.6,
      h: 7.1,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 8 },
    });

    // Header
    slide2.addText(`Asset Details – ${asset.asset_id}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: brandColor,
      align: 'left',
      fontFace: 'Arial',
    });

    // Add QR Code if available (top-right corner)
    if (asset.qr_code_url) {
      try {
        const qrResponse = await fetch(asset.qr_code_url);
        const qrBlob = await qrResponse.blob();
        const qrBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(qrBlob);
        });
        
        slide2.addImage({
          data: qrBase64,
          x: 9.2,
          y: 0.4,
          w: 1.2,
          h: 1.2,
        });
      } catch (error) {
        console.error('Failed to add QR code:', error);
      }
    }

    // Small thumbnail
    try {
      slide2.addImage({
        path: photo1,
        x: 0.5,
        y: 1.8,
        w: 2.2,
        h: 2.2,
        sizing: { type: 'cover', w: 2.2, h: 2.2 },
      });
    } catch (error) {
      console.error('Failed to add thumbnail:', error);
    }

    // Details box
    const detailsData = [
      { label: 'Area:', value: asset.area },
      { label: 'Location:', value: asset.location },
      { label: 'Direction:', value: asset.direction || 'N/A' },
      { label: 'Dimensions:', value: width && height ? `${width} ft × ${height} ft` : asset.dimensions || 'N/A' },
      { label: 'Total Sqft:', value: asset.total_sqft?.toString() || 'N/A' },
      { label: 'Illumination:', value: asset.illumination_type || 'Non-lit' },
      { label: 'Media Type:', value: asset.media_type },
      { label: 'Card Rate:', value: `₹${asset.card_rate.toLocaleString('en-IN')}` },
      {
        label: 'Campaign Period:',
        value: `${format(new Date(plan.start_date), 'dd MMM yyyy')} → ${format(new Date(plan.end_date), 'dd MMM yyyy')}`,
      },
    ];

    let detailY = 1.8;
    const labelWidth = 2.5;
    const valueX = 3.2 + labelWidth;

    detailsData.forEach((detail) => {
      // Label
      slide2.addText(detail.label, {
        x: 3.2,
        y: detailY,
        w: labelWidth,
        h: 0.35,
        fontSize: 16,
        bold: true,
        color: '4B5563',
        fontFace: 'Arial',
      });

      // Value
      slide2.addText(detail.value, {
        x: valueX,
        y: detailY,
        w: 6.5 - valueX,
        h: 0.35,
        fontSize: 16,
        color: '1F2937',
        fontFace: 'Arial',
      });

      detailY += 0.45;
    });

    // Street View Link - Auto-fix if needed
    const streetViewUrl = validateAndFixStreetViewUrl(
      asset.google_street_view_url,
      asset.latitude,
      asset.longitude
    );
    
    if (streetViewUrl) {
      slide2.addText('View on Google Street View', {
        x: 3.2,
        y: detailY + 0.2,
        w: 6,
        h: 0.4,
        fontSize: 14,
        color: '2563EB',
        underline: { color: '2563EB' },
        hyperlink: { url: streetViewUrl },
        fontFace: 'Arial',
      });
    }

    // GPS Coordinates
    if (asset.latitude && asset.longitude) {
      slide2.addText(`GPS: ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}`, {
        x: 0.5,
        y: 4.2,
        w: 2.2,
        h: 0.3,
        fontSize: 10,
        color: '6B7280',
        align: 'center',
        fontFace: 'Arial',
      });
    }

    // Footer
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 6.8,
      w: 9.6,
      h: 0.5,
      fill: { color: '6B7280' },
    });

    slide2.addText(`${orgSettings.organization_name || 'Go-Ads 360°'} Proposal – Confidential`, {
      x: 0.5,
      y: 6.9,
      w: 9,
      h: 0.3,
      fontSize: 14,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });
  }

  // Generate and return blob
  const pptBlob = await prs.write({ outputType: 'blob' });
  return pptBlob as Blob;
}
