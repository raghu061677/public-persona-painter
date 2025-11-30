import pptxgen from 'pptxgenjs';
import { format } from 'date-fns';

interface MarketplaceAsset {
  id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  total_sqft: number | null;
  direction: string | null;
  illumination_type: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_photo_url?: string | null;
  qr_code_url?: string | null;
  google_street_view_url?: string | null;
  location_url?: string | null;
}

const DEFAULT_PLACEHOLDER = 'https://via.placeholder.com/800x600/f3f4f6/6b7280?text=No+Image+Available';
const GOADS_WATERMARK_TEXT = 'Go-Ads 360° | www.goads.in';
const GOADS_COLOR = '1E3A8A'; // Deep blue

export async function generateMarketplacePPT(
  assets: MarketplaceAsset[],
  visitorInfo?: {
    name: string;
    company?: string;
    email: string;
    phone?: string;
  }
): Promise<Blob> {
  const prs = new pptxgen();

  // Configure presentation
  prs.author = 'Go-Ads 360°';
  prs.company = 'Go-Ads 360°';
  prs.title = 'Media Asset Proposal';
  prs.subject = 'OOH Media Assets Proposal';

  // ===== COVER SLIDE =====
  const coverSlide = prs.addSlide();
  coverSlide.background = { fill: GOADS_COLOR };

  // Title
  coverSlide.addText('MEDIA ASSET PROPOSAL', {
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

  // Subtitle
  coverSlide.addText(`${assets.length} Premium OOH Media Assets`, {
    x: 0.5,
    y: 3.7,
    w: 9,
    h: 0.8,
    fontSize: 28,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Prepared for
  if (visitorInfo) {
    let preparedForText = `Prepared for: ${visitorInfo.name}`;
    if (visitorInfo.company) {
      preparedForText += ` | ${visitorInfo.company}`;
    }
    
    coverSlide.addText(preparedForText, {
      x: 0.5,
      y: 4.7,
      w: 9,
      h: 0.5,
      fontSize: 20,
      color: 'E5E7EB',
      align: 'center',
      fontFace: 'Arial',
    });
  }

  // Footer with watermark
  coverSlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 6.8,
    w: 10,
    h: 0.7,
    fill: { color: '000000', transparency: 50 },
  });

  coverSlide.addText(
    `${format(new Date(), 'dd MMMM yyyy')} | Go-Ads 360° | www.goads.in`,
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
  for (const asset of assets) {
    // Get photos from primary_photo_url
    const photo1 = asset.primary_photo_url || DEFAULT_PLACEHOLDER;
    const photo2 = asset.primary_photo_url || DEFAULT_PLACEHOLDER;

    // ===== SLIDE 1: TWO-IMAGE PRESENTATION SLIDE =====
    const slide1 = prs.addSlide();

    // Border frame
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 0.2,
      w: 9.6,
      h: 7.1,
      fill: { color: 'FFFFFF' },
      line: { color: GOADS_COLOR, width: 8 },
    });

    // Header - smaller font for better fit
    slide1.addText(`${asset.id} – ${asset.area} – ${asset.location}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: GOADS_COLOR,
      align: 'center',
      fontFace: 'Arial',
    });

    // Image 1 with watermark overlay
    slide1.addImage({
      path: photo1,
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 3.8,
      sizing: { type: 'contain', w: 4.5, h: 3.8 },
    });

    // Watermark overlay for image 1
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.5,
      y: 5.1,
      w: 4.5,
      h: 0.2,
      fill: { color: GOADS_COLOR, transparency: 30 },
    });
    slide1.addText(GOADS_WATERMARK_TEXT, {
      x: 0.6,
      y: 5.12,
      w: 4.3,
      h: 0.16,
      fontSize: 8,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });

    // Image 2 with watermark overlay
    slide1.addImage({
      path: photo2,
      x: 5.2,
      y: 1.5,
      w: 4.5,
      h: 3.8,
      sizing: { type: 'contain', w: 4.5, h: 3.8 },
    });

    // Watermark overlay for image 2
    slide1.addShape(prs.ShapeType.rect, {
      x: 5.2,
      y: 5.1,
      w: 4.5,
      h: 0.2,
      fill: { color: GOADS_COLOR, transparency: 30 },
    });
    slide1.addText(GOADS_WATERMARK_TEXT, {
      x: 5.3,
      y: 5.12,
      w: 4.3,
      h: 0.16,
      fontSize: 8,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });

    // Footer with Go-Ads watermark
    slide1.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 6.8,
      w: 9.6,
      h: 0.5,
      fill: { color: GOADS_COLOR },
    });

    slide1.addText('Go-Ads 360° Media Proposal | www.goads.in | For Pricing Contact: info@goads.in', {
      x: 0.5,
      y: 6.9,
      w: 9,
      h: 0.3,
      fontSize: 10,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });

    // ===== SLIDE 2: DETAILS SLIDE WITH SPECIFICATIONS =====
    const slide2 = prs.addSlide();

    // Border frame
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 0.2,
      w: 9.6,
      h: 7.1,
      fill: { color: 'FFFFFF' },
      line: { color: GOADS_COLOR, width: 8 },
    });

    // Header - smaller font
    slide2.addText(`Asset Specifications – ${asset.id}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: GOADS_COLOR,
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

    // Thumbnail with watermark overlay
    slide2.addImage({
      path: photo1,
      x: 0.5,
      y: 1.8,
      w: 2.5,
      h: 2.5,
      sizing: { type: 'cover', w: 2.5, h: 2.5 },
    });

    // Watermark overlay for thumbnail
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.5,
      y: 4.1,
      w: 2.5,
      h: 0.2,
      fill: { color: GOADS_COLOR, transparency: 30 },
    });
    slide2.addText(GOADS_WATERMARK_TEXT, {
      x: 0.6,
      y: 4.12,
      w: 2.3,
      h: 0.16,
      fontSize: 7,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });

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

    // Generate location URL for QR
    let locationUrl = '';
    if (asset.google_street_view_url) {
      locationUrl = asset.google_street_view_url;
    } else if (asset.location_url) {
      locationUrl = asset.location_url;
    } else if (asset.latitude && asset.longitude) {
      locationUrl = `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`;
    }

    // Specifications
    const detailsData = [
      { label: 'City:', value: asset.city },
      { label: 'Area:', value: asset.area },
      { label: 'Location:', value: asset.location },
      { label: 'Direction:', value: asset.direction || 'N/A' },
      { label: 'Media Type:', value: asset.media_type },
      { label: 'Dimensions:', value: width && height ? `${width} ft × ${height} ft` : asset.dimensions || 'N/A' },
      { label: 'Total Sqft:', value: asset.total_sqft?.toString() || 'N/A' },
      { label: 'Illumination:', value: asset.illumination_type || 'Non-lit' },
      { label: 'GPS Coordinates:', value: asset.latitude && asset.longitude ? `${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}` : 'N/A' },
    ];

    let detailY = 1.8;
    const labelWidth = 2.5;
    const valueX = 3.5 + labelWidth;

    detailsData.forEach((detail) => {
      // Label - smaller font, better alignment
      slide2.addText(detail.label, {
        x: 3.5,
        y: detailY,
        w: labelWidth,
        h: 0.35,
        fontSize: 10,
        bold: true,
        color: '4B5563',
        fontFace: 'Arial',
        valign: 'top',
      });

      // Value - smaller font
      slide2.addText(detail.value, {
        x: valueX,
        y: detailY,
        w: 9.5 - valueX,
        h: 0.35,
        fontSize: 10,
        color: '1F2937',
        fontFace: 'Arial',
        valign: 'top',
        breakLine: true,
      });

      detailY += 0.38;
    });

    // Add QR Code section if asset has QR or location
    if (asset.qr_code_url || locationUrl) {
      // QR Code title
      slide2.addText('Scan for Location:', {
        x: 0.5,
        y: 4.7,
        w: 2.5,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: GOADS_COLOR,
        align: 'center',
        fontFace: 'Arial',
      });

      // Add QR code image if available
      if (asset.qr_code_url) {
        slide2.addImage({
          path: asset.qr_code_url,
          x: 0.8,
          y: 5.1,
          w: 1.9,
          h: 1.9,
          sizing: { type: 'contain', w: 1.9, h: 1.9 },
        });
      } else if (locationUrl) {
        // Add text-based location link if no QR
        slide2.addText('Location Link:', {
          x: 0.5,
          y: 5.2,
          w: 2.5,
          h: 0.8,
          fontSize: 8,
          color: '6B7280',
          align: 'center',
          fontFace: 'Arial',
          breakLine: true,
        });
      }
    }

    // Footer with Go-Ads watermark
    slide2.addShape(prs.ShapeType.rect, {
      x: 0.2,
      y: 6.8,
      w: 9.6,
      h: 0.5,
      fill: { color: '6B7280' },
    });

    slide2.addText('Go-Ads 360° – Confidential | Contact: info@goads.in | +91-XXX-XXX-XXXX', {
      x: 0.5,
      y: 6.9,
      w: 9,
      h: 0.3,
      fontSize: 9,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
    });
  }

  // ===== SUMMARY SLIDE =====
  const summarySlide = prs.addSlide();
  summarySlide.background = { fill: 'F8F9FA' };

  summarySlide.addText('SUMMARY', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: GOADS_COLOR,
    align: 'center',
    fontFace: 'Arial',
  });

  summarySlide.addText(`Total Assets Selected: ${assets.length}`, {
    x: 1,
    y: 2,
    w: 8,
    h: 0.5,
    fontSize: 24,
    color: '1F2937',
    fontFace: 'Arial',
  });

  // Group by city
  const cityCounts = assets.reduce((acc: any, asset) => {
    acc[asset.city] = (acc[asset.city] || 0) + 1;
    return acc;
  }, {});

  summarySlide.addText('Assets by City:', {
    x: 1,
    y: 2.8,
    w: 8,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: '4B5563',
    fontFace: 'Arial',
  });

  let cityY = 3.4;
  Object.entries(cityCounts).forEach(([city, count]) => {
    summarySlide.addText(`• ${city}: ${count} assets`, {
      x: 1.5,
      y: cityY,
      w: 7,
      h: 0.4,
      fontSize: 18,
      color: '1F2937',
      fontFace: 'Arial',
    });
    cityY += 0.5;
  });

  // Contact info
  summarySlide.addText('For Pricing & Booking Enquiries:', {
    x: 1,
    y: cityY + 0.5,
    w: 8,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: GOADS_COLOR,
    fontFace: 'Arial',
  });

  summarySlide.addText('📧 Email: info@goads.in\n📱 Phone: +91-XXX-XXX-XXXX\n🌐 Website: www.goads.in', {
    x: 1,
    y: cityY + 1.2,
    w: 8,
    h: 1.2,
    fontSize: 16,
    color: '1F2937',
    fontFace: 'Arial',
  });

  // Footer
  summarySlide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 6.8,
    w: 10,
    h: 0.7,
    fill: { color: GOADS_COLOR },
  });

  summarySlide.addText('Go-Ads 360° | OOH Media Management Platform | www.goads.in', {
    x: 0.5,
    y: 6.9,
    w: 9,
    h: 0.5,
    fontSize: 14,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Generate and return blob
  const pptBlob = await prs.write({ outputType: 'blob' });
  return pptBlob as Blob;
}
