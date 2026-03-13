import QRCode from 'qrcode';

export interface WatermarkOptions {
  logoUrl?: string;
  organizationName?: string;
  campaignId?: string;
  assetId?: string;
  /** Pre-fetched Google Street View URL or QR code URL for the asset */
  streetViewUrl?: string;
}

/**
 * Generate a QR code data URL encoding a Google Street View link
 */
async function generateStreetViewQRDataUrl(streetViewUrl: string): Promise<string> {
  return QRCode.toDataURL(streetViewUrl, {
    width: 320,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
}

/** Draw a rounded rect path (does NOT fill/stroke) */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw QR code at top-right corner in a white rounded card.
 */
async function drawQRTopRight(ctx: CanvasRenderingContext2D, streetViewUrl: string, canvasW: number) {
  try {
    const qrDataUrl = await generateStreetViewQRDataUrl(streetViewUrl);

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    await new Promise<void>((res, rej) => {
      qrImg.onload = () => res();
      qrImg.onerror = () => rej(new Error('QR load failed'));
      qrImg.src = qrDataUrl;
    });

    const qrSize = Math.min(Math.max(canvasW * 0.08, 80), 130);
    const cardPad = 8;
    const labelFontSize = Math.max(8, qrSize * 0.08);
    const labelH = labelFontSize + 6;
    const cardW = qrSize + cardPad * 2;
    const cardH = qrSize + cardPad * 2 + labelH;
    const pad = Math.min(canvasW, ctx.canvas.height) * 0.02;
    const x = canvasW - cardW - pad;
    const y = pad;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // White rounded card
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Subtle border
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.stroke();

    // QR image
    ctx.drawImage(qrImg, x + cardPad, y + cardPad, qrSize, qrSize);

    // Label
    ctx.font = `bold ${labelFontSize}px Arial`;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCAN FOR STREET VIEW', x + cardW / 2, y + cardPad + qrSize + labelH / 2);
    ctx.restore();
  } catch {
    console.warn('Could not render QR code in watermark');
  }
}

/**
 * Draw company logo at bottom-left in a small white rounded card.
 * Logo only — no company name text.
 */
async function drawLogoBottomLeft(ctx: CanvasRenderingContext2D, logoUrl: string, canvasW: number, canvasH: number) {
  try {
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    await new Promise<void>((res, rej) => {
      logo.onload = () => res();
      logo.onerror = () => rej(new Error('Logo load failed'));
      logo.src = logoUrl;
    });

    const maxLogoH = Math.min(Math.max(canvasH * 0.06, 36), 56);
    const logoH = maxLogoH;
    const logoW = (logo.width / logo.height) * logoH;
    const cardPad = 6;
    const cardW = logoW + cardPad * 2;
    const cardH = logoH + cardPad * 2;
    const pad = Math.min(canvasW, canvasH) * 0.02;
    const x = pad;
    const y = canvasH - cardH - pad;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, x, y, cardW, cardH, 6);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.drawImage(logo, x + cardPad, y + cardPad, logoW, logoH);
    ctx.restore();
  } catch {
    // Logo loading failed — skip silently
  }
}

/**
 * Light watermark: QR top-right + logo bottom-left.
 * No dark footer bar, no company name text, no metadata panel.
 * Preserves native GPS/camera overlays on geotag images.
 */
export async function addWatermark(
  imageFile: File,
  options: WatermarkOptions = {}
): Promise<File> {
  const { logoUrl, streetViewUrl } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const img = new Image();
    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image — preserving any native GPS/camera overlay
      ctx.drawImage(img, 0, 0);

      // QR code at top-right
      if (streetViewUrl) {
        await drawQRTopRight(ctx, streetViewUrl, canvas.width);
      }

      // Company logo at bottom-left (no text)
      if (logoUrl) {
        await drawLogoBottomLeft(ctx, logoUrl, canvas.width, canvas.height);
      }

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(
              new File(
                [blob],
                imageFile.name.replace(/\.(jpg|jpeg|png)$/i, '_watermarked.$1'),
                { type: imageFile.type }
              )
            );
          } else {
            reject(new Error('Failed to create watermarked image'));
          }
        },
        imageFile.type,
        0.95
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Add watermarks to multiple images
 */
export async function addWatermarkBatch(
  files: File[],
  options: WatermarkOptions = {},
  onProgress?: (index: number, progress: number) => void
): Promise<File[]> {
  const watermarkedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    if (onProgress) onProgress(i, 0);

    try {
      const watermarkedFile = await addWatermark(files[i], options);
      watermarkedFiles.push(watermarkedFile);
      if (onProgress) onProgress(i, 100);
    } catch (error) {
      console.error(`Failed to watermark ${files[i].name}:`, error);
      watermarkedFiles.push(files[i]);
      if (onProgress) onProgress(i, 100);
    }
  }

  return watermarkedFiles;
}

/**
 * Create a preview URL for a file
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke preview URLs to free memory
 */
export function revokePreviewUrls(urls: string[]): void {
  urls.forEach(url => URL.revokeObjectURL(url));
}
