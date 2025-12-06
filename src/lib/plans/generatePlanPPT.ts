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

  // Header bar
  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.8,
    fill: { color: 'FFFFFF', transparency: 90 },
  });

  coverSlide.addText('MEDIA ASSET PROPOSAL', {
    x: 0.3,
    y: 0.2,
    w: 9.4,
    h: 0.5,
    fontSize: 16,
    bold: true,
    color: 'FFFFFF',
    align: 'left',
    fontFace: 'Arial',
  });

  // Title - Asset count
  coverSlide.addText(`${plan.assets.length} Premium OOH Media Assets`, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.2,
    fontSize: 42,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Client name
  coverSlide.addText(`Prepared for: ${plan.client_name}`, {
    x: 0.5,
    y: 4.0,
    w: 9,
    h: 0.6,
    fontSize: 22,
    color: 'E5E7EB',
    align: 'center',
    fontFace: 'Arial',
  });

  // Plan name
  coverSlide.addText(plan.plan_name, {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.5,
    fontSize: 18,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Footer box
  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 6.7,
    w: 10,
    h: 0.8,
    fill: { color: '000000', transparency: 50 },
  });

  coverSlide.addText(
    `${format(new Date(), 'dd MMMM yyyy')} | ${orgSettings.organization_name || 'Go-Ads 360°'}`,
    {
      x: 0.5,
      y: 6.85,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    }
  );

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.background = { color: 'FFFFFF' };

  // Header bar
  summarySlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.7,
    fill: { color: brandColor },
  });

  summarySlide.addText('Campaign Summary', {
    x: 0.3,
    y: 0.15,
    w: 9.4,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: 'FFFFFF',
    align: 'left',
    fontFace: 'Arial',
  });

  // Summary table
  const summaryData = [
    [{ text: 'Plan ID' }, { text: plan.id }],
    [{ text: 'Company' }, { text: orgSettings.organization_name || 'Go-Ads 360°' }],
    [{ text: 'Client' }, { text: plan.client_name }],
    [{ text: 'Duration' }, { text: `${Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))} days` }],
    [{ text: 'Start Date' }, { text: format(new Date(plan.start_date), 'dd/MM/yyyy') }],
    [{ text: 'End Date' }, { text: format(new Date(plan.end_date), 'dd/MM/yyyy') }],
    [{ text: 'Total Assets' }, { text: `${plan.assets.length} sites` }],
  ];

  summarySlide.addTable(summaryData, {
    x: 0.5,
    y: 1.2,
    w: 9,
    colW: [3, 6],
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    fontFace: 'Arial',
    fontSize: 14,
    valign: 'middle',
    rowH: 0.5,
    fill: { color: 'F9FAFB' },
  });

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
      x: 0.15,
      y: 0.15,
      w: 9.7,
      h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    // Asset ID header
    slide1.addText(asset.asset_id, {
      x: 0.3,
      y: 0.4,
      w: 9.4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: '6B7280',
      align: 'left',
      fontFace: 'Arial',
    });

    // Location header
    slide1.addText(`${asset.area} · ${asset.location}`, {
      x: 0.3,
      y: 0.75,
      w: 9.4,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: brandColor,
      align: 'left',
      fontFace: 'Arial',
    });

    // Image 1
    try {
      slide1.addImage({
        path: photo1,
        x: 0.4,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        sizing: { type: 'contain', w: 4.5, h: 3.8 },
      });
    } catch (error) {
      console.error('Failed to add image 1:', error);
    }

    // Image 2
    try {
      slide1.addImage({
        path: photo2,
        x: 5.1,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        sizing: { type: 'contain', w: 4.5, h: 3.8 },
      });
    } catch (error) {
      console.error('Failed to add image 2:', error);
    }

    // Footer bar
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.15,
      y: 6.85,
      w: 9.7,
      h: 0.5,
      fill: { color: brandColor },
    });

    slide1.addText(`${plan.plan_name} | ${plan.client_name} | ${orgSettings.organization_name || 'Go-Ads 360°'}`, {
      x: 0.3,
      y: 6.95,
      w: 9.4,
      h: 0.35,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });

    // ===== SLIDE 2: DETAILS SLIDE =====
    const slide2 = prs.addSlide();

    // Border frame
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.15,
      y: 0.15,
      w: 9.7,
      h: 7.2,
      fill: { color: 'FFFFFF' },
      line: { color: brandColor, width: 6 },
    });

    // Header title
    slide2.addText('Asset Specifications', {
      x: 0.3,
      y: 0.4,
      w: 9.4,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: '6B7280',
      align: 'left',
      fontFace: 'Arial',
    });

    // Asset ID badge
    slide2.addText(asset.asset_id, {
      x: 0.3,
      y: 0.85,
      w: 9.4,
      h: 0.5,
      fontSize: 26,
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
          x: 8.8,
          y: 0.35,
          w: 1.3,
          h: 1.3,
        });
      } catch (error) {
        console.error('Failed to add QR code:', error);
      }
    }

    // Small thumbnail
    try {
      slide2.addImage({
        path: photo1,
        x: 0.4,
        y: 1.6,
        w: 2.5,
        h: 2.5,
        sizing: { type: 'cover', w: 2.5, h: 2.5 },
      });
    } catch (error) {
      console.error('Failed to add thumbnail:', error);
    }

    // Details table data - use object format for table cells
    const detailsTableData = [
      [{ text: 'City', options: { bold: true } }, { text: 'Hyderabad' }],
      [{ text: 'Area', options: { bold: true } }, { text: asset.area }],
      [{ text: 'Location', options: { bold: true } }, { text: asset.location }],
      [{ text: 'Direction', options: { bold: true } }, { text: asset.direction || 'N/A' }],
      [{ text: 'Dimensions', options: { bold: true } }, { text: width && height ? `${width}X${height}` : asset.dimensions || 'N/A' }],
      [{ text: 'Total Sqft', options: { bold: true } }, { text: asset.total_sqft?.toString() || 'N/A' }],
      [{ text: 'Illumination', options: { bold: true } }, { text: asset.illumination_type || 'Non-lit' }],
    ];

    // Add details table
    slide2.addTable(detailsTableData, {
      x: 3.2,
      y: 1.6,
      w: 6.3,
      colW: [2, 4.3],
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      fontFace: 'Arial',
      fontSize: 12,
      valign: 'middle',
      rowH: 0.4,
      fill: { color: 'FFFFFF' },
    });

    // Campaign period below
    slide2.addText(`Campaign: ${format(new Date(plan.start_date), 'dd MMM yyyy')} - ${format(new Date(plan.end_date), 'dd MMM yyyy')}`, {
      x: 3.2,
      y: 4.6,
      w: 6.3,
      h: 0.35,
      fontSize: 12,
      color: '6B7280',
      fontFace: 'Arial',
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
        y: 5.0,
        w: 6.3,
        h: 0.35,
        fontSize: 12,
        color: '2563EB',
        underline: { color: '2563EB' },
        hyperlink: { url: streetViewUrl },
        fontFace: 'Arial',
      });
    }

    // GPS Coordinates below thumbnail
    if (asset.latitude && asset.longitude) {
      slide2.addText(`GPS: ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}`, {
        x: 0.4,
        y: 4.2,
        w: 2.5,
        h: 0.3,
        fontSize: 9,
        color: '6B7280',
        align: 'center',
        fontFace: 'Arial',
      });
    }

    // Footer
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.15,
      y: 6.85,
      w: 9.7,
      h: 0.5,
      fill: { color: '6B7280' },
    });

    slide2.addText(`${orgSettings.organization_name || 'Go-Ads 360°'} Proposal – Confidential`, {
      x: 0.3,
      y: 6.95,
      w: 9.4,
      h: 0.35,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });
  }

  // Generate and return blob
  const pptBlob = await prs.write({ outputType: 'blob' });
  return pptBlob as Blob;
}
