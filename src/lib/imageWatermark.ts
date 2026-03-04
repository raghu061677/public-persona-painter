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

/**
 * Add watermark with company logo, timestamp, and QR code to an image.
 * Footer layout: 3-column grid with fixed widths:
 *   Left (40%) — logo + org name + timestamp
 *   Center (30%) — "PROOF OF INSTALLATION"
 *   Right (30%) — single QR code card
 */
export async function addWatermark(
  imageFile: File,
  options: WatermarkOptions = {}
): Promise<File> {
  const { logoUrl, organizationName, campaignId, assetId, streetViewUrl } = options;

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

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // ── Dimensions ────────────────────────────────────────
      const W = img.width;
      const H = img.height;
      const padding = Math.min(W, H) * 0.02;
      const qrDisplaySize = Math.min(Math.max(W * 0.1, 120), 170);
      const qrCardPad = 12;
      const qrCardSize = qrDisplaySize + qrCardPad * 2;
      const watermarkHeight = Math.max(qrCardSize + padding * 2 + 20, H * 0.14);
      const footerHeight = Math.min(H * 0.025, 28);
      const totalBarHeight = watermarkHeight + footerHeight;
      const barY = H - totalBarHeight;

      // ── Column boundaries (2-column: left 65%, right 35%) ──
      const colLeftStart = 0;
      const colLeftEnd = W * 0.65;
      const colRightStart = colLeftEnd;
      const colRightEnd = W;

      // ── Background bar ────────────────────────────────────
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, barY, W, totalBarHeight);

      // ── Font sizes ────────────────────────────────────────
      const orgFontSize = Math.max(watermarkHeight * 0.16, 13);
      const timestampFontSize = Math.max(orgFontSize * 0.85, 11);
      const proofFontSize = Math.max(orgFontSize * 0.95, 14);
      const labelFontSize = Math.max(orgFontSize * 0.6, 9);

      // ── Timestamp ─────────────────────────────────────────
      const timestamp = new Date().toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const colCenterY = barY + watermarkHeight / 2;

      // ════════════════════════════════════════════════════════
      // COLUMN 1 — LEFT (0% to 40%): Logo + Org Name + Timestamp
      // ════════════════════════════════════════════════════════
      ctx.save();
      ctx.beginPath();
      ctx.rect(colLeftStart, barY, colLeftEnd - colLeftStart, watermarkHeight);
      ctx.clip();

      let textX = colLeftStart + padding * 2;

      if (logoUrl) {
        try {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            logo.onload = () => res();
            logo.onerror = () => rej(new Error('Logo load failed'));
            logo.src = logoUrl;
          });

          const logoH = watermarkHeight * 0.55;
          const logoW = (logo.width / logo.height) * logoH;
          const logoCardX = colLeftStart + padding;
          const logoCardY = colCenterY - logoH / 2 - 6;
          const logoCardW = logoW + 12;
          const logoCardH = logoH + 12;
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.roundRect(logoCardX, logoCardY, logoCardW, logoCardH, 6);
          ctx.fill();

          ctx.drawImage(logo, logoCardX + 6, logoCardY + 6, logoW, logoH);
          textX = logoCardX + logoCardW + padding;
        } catch {
          // skip logo
        }
      }

      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      if (organizationName) {
        ctx.font = `bold ${orgFontSize}px Arial`;
        ctx.fillText(organizationName, textX, colCenterY - timestampFontSize * 0.7);
      }

      ctx.font = `${timestampFontSize}px Arial`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(timestamp, textX, colCenterY + orgFontSize * 0.7);

      ctx.restore();

      // CENTER COLUMN REMOVED — "PROOF OF INSTALLATION" no longer rendered

      // ════════════════════════════════════════════════════════
      // COLUMN 2 — RIGHT (65% to 100%): Single QR Code in white card
      // ════════════════════════════════════════════════════════
      if (streetViewUrl) {
        try {
          const qrDataUrl = await generateStreetViewQRDataUrl(streetViewUrl);

          const qrImg = new Image();
          qrImg.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            qrImg.onload = () => res();
            qrImg.onerror = () => rej(new Error('QR load failed'));
            qrImg.src = qrDataUrl;
          });

          // Center the QR card within the right column
          const rightColWidth = colRightEnd - colRightStart;
          const totalCardHeight = qrCardSize + labelFontSize + 10;
          const cardX = colRightStart + (rightColWidth - qrCardSize) / 2;
          const cardY = colCenterY - totalCardHeight / 2;

          // Shadow
          ctx.shadowColor = 'rgba(0,0,0,0.25)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;

          // White rounded card
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, qrCardSize, totalCardHeight, 10);
          ctx.fill();

          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Draw QR inside card
          ctx.drawImage(qrImg, cardX + qrCardPad, cardY + qrCardPad, qrDisplaySize, qrDisplaySize);

          // Label below QR inside card
          ctx.fillStyle = '#333';
          ctx.font = `bold ${labelFontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SCAN FOR STREET VIEW', cardX + qrCardSize / 2, cardY + qrCardPad + qrDisplaySize + labelFontSize);
        } catch {
          console.warn('Could not render QR code in watermark');
        }
      }

      // ════════════════════════════════════════════════════════
      // FOOTER — "Powered by Go-Ads 360 — OOH Media Platform"
      // ════════════════════════════════════════════════════════
      const footerFontSize = Math.max(timestampFontSize * 0.9, 12);
      ctx.font = `${footerFontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Powered by Go-Ads 360 — OOH Media Platform',
        W / 2,
        barY + watermarkHeight + footerHeight / 2
      );

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
