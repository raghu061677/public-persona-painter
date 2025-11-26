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
  illumination: string | null;
  latitude: number | null;
  longitude: number | null;
  is_multi_face: boolean | null;
  faces: any;
  image_urls?: string[];
  images?: {
    photos?: Array<{ url: string; tag: string }>;
  };
}

const DEFAULT_PLACEHOLDER = 'https://via.placeholder.com/800x600/f3f4f6/6b7280?text=No+Image+Available';
const GOADS_WATERMARK_TEXT = 'Go-Ads 360° | www.goads.in';
const GOADS_COLOR = '1E3A8A'; // Deep blue

/**
 * Add Go-Ads watermark to image URL by creating a canvas overlay
 */
async function addWatermarkToImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(imageUrl); // Return original if canvas fails
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Calculate watermark dimensions
      const padding = Math.min(img.width, img.height) * 0.03;
      const watermarkHeight = Math.min(img.height * 0.08, 80);
      const watermarkY = img.height - watermarkHeight - padding;
      
      // Draw semi-transparent background
      const bgHeight = watermarkHeight + padding;
      ctx.fillStyle = 'rgba(30, 58, 138, 0.7)';
      ctx.fillRect(0, img.height - bgHeight, img.width, bgHeight);
      
      // Add Go-Ads watermark text
      const fontSize = Math.max(watermarkHeight * 0.4, 16);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';
      ctx.fillText(GOADS_WATERMARK_TEXT, padding * 2, watermarkY + watermarkHeight / 2);
      
      // Add timestamp
      const timestamp = new Date().toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      
      ctx.font = `${fontSize * 0.7}px Arial`;
      ctx.textAlign = 'right';
      ctx.fillText(timestamp, img.width - padding * 2, watermarkY + watermarkHeight / 2);
      
      // Convert to data URL
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    
    img.onerror = () => {
      resolve(imageUrl); // Return original if loading fails
    };
    
    img.src = imageUrl;
  });
}

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
    // Handle different photo storage formats
    let photoUrls: string[] = [];
    
    // Check for image_urls array (preferred format)
    if (Array.isArray(asset.image_urls) && asset.image_urls.length > 0) {
      photoUrls = asset.image_urls.filter(url => url && url.trim() !== '');
    }
    // Fallback to images.photos format
    else if (asset.images?.photos && Array.isArray(asset.images.photos)) {
      photoUrls = asset.images.photos.map((p: any) => p.url).filter(Boolean);
    }
    
    // Ensure we have at least placeholder images
    const photo1Url = photoUrls[0] || DEFAULT_PLACEHOLDER;
    const photo2Url = photoUrls[1] || photoUrls[0] || DEFAULT_PLACEHOLDER;

    // Add watermarks to images
    let photo1 = photo1Url;
    let photo2 = photo2Url;
    
    try {
      if (photo1Url !== DEFAULT_PLACEHOLDER) {
        photo1 = await addWatermarkToImage(photo1Url);
      }
      if (photo2Url !== DEFAULT_PLACEHOLDER) {
        photo2 = await addWatermarkToImage(photo2Url);
      }
    } catch (error) {
      console.error('Error watermarking images:', error);
      // Use originals if watermarking fails
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

    // Image 1 - adjusted positioning
    try {
      slide1.addImage({
        data: photo1,
        x: 0.5,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        sizing: { type: 'contain', w: 4.5, h: 3.8 },
      });
    } catch (error) {
      console.error('Failed to add image 1:', error);
    }

    // Image 2 - adjusted positioning
    try {
      slide1.addImage({
        data: photo2,
        x: 5.2,
        y: 1.5,
        w: 4.5,
        h: 3.8,
        sizing: { type: 'contain', w: 4.5, h: 3.8 },
      });
    } catch (error) {
      console.error('Failed to add image 2:', error);
    }

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

    // Thumbnail with watermark
    try {
      slide2.addImage({
        data: photo1,
        x: 0.5,
        y: 1.8,
        w: 2.5,
        h: 2.5,
        sizing: { type: 'cover', w: 2.5, h: 2.5 },
      });
    } catch (error) {
      console.error('Failed to add thumbnail:', error);
    }

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

    // Number of faces
    let facesInfo = '1 Face';
    if (asset.is_multi_face && asset.faces) {
      const facesData = typeof asset.faces === 'string' ? JSON.parse(asset.faces) : asset.faces;
      if (Array.isArray(facesData)) {
        facesInfo = `${facesData.length} Faces`;
        facesData.forEach((face: any, idx: number) => {
          if (face.size) {
            facesInfo += ` | Face ${idx + 1}: ${face.size}`;
          }
        });
      }
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
      { label: 'Illumination:', value: asset.illumination || 'Non-lit' },
      { label: 'Number of Faces:', value: facesInfo },
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
        fontSize: 11,
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
        fontSize: 11,
        color: '1F2937',
        fontFace: 'Arial',
        valign: 'top',
        breakLine: true,
      });

      detailY += 0.4;
    });

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
      fontSize: 10,
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
