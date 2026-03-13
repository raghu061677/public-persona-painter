/**
 * Utility for downloading images with configurable watermark modes
 * 
 * Modes:
 *   - 'none'     → raw image, no watermark
 *   - 'light'    → QR top-right only (no logo, no metadata)
 *   - 'detailed' → QR top-right + metadata panel top-left (no logo)
 * 
 * Upload images already contain Matrix branding + GPS overlays.
 * Download watermarks must NOT duplicate logos or add heavy overlays.
 */

import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export type WatermarkMode = 'none' | 'light' | 'detailed';

export interface AssetWatermarkData {
  asset_code?: string;
  city?: string;
  area?: string;
  location: string;
  direction?: string;
  dimension?: string;
  total_sqft?: number;
  illumination_type?: string;
  media_type?: string;
}

interface WatermarkOptions {
  assetData: AssetWatermarkData;
  imageUrl: string;
  category: string;
  assetId?: string;
  qrCodeUrl?: string;
  mode?: WatermarkMode;
}

// ── Helpers ──────────────────────────────────────────────

function buildFileName(assetData: AssetWatermarkData, category: string, assetId?: string, modeSuffix?: string): string {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const loc = assetData.location
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 30);

  const suffix = modeSuffix ? `-${modeSuffix}` : '';

  if (assetData.city && assetData.area) {
    return `${loc}-${assetData.area}-${assetData.city}-${category}${suffix}-${dateStr}.png`;
  }
  if (assetId) {
    return `${assetId}-${loc}-${category}${suffix}-${dateStr}.png`;
  }
  return `${loc}-${category}${suffix}-${dateStr}.png`;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

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

// ── QR Drawing (top-right) ───────────────────────────────

async function drawQRTopRight(ctx: CanvasRenderingContext2D, qrCodeUrl: string, canvasW: number, canvasH: number) {
  try {
    const qrImg = await loadImage(qrCodeUrl);
    const qrSize = Math.min(Math.max(canvasW * 0.08, 80), 130);
    const cardPad = 8;
    const labelFontSize = Math.max(8, qrSize * 0.08);
    const labelH = labelFontSize + 6;
    const cardW = qrSize + cardPad * 2;
    const cardH = qrSize + cardPad * 2 + labelH;
    const pad = Math.min(canvasW, canvasH) * 0.02;
    const x = canvasW - cardW - pad;
    const y = pad;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.stroke();

    ctx.drawImage(qrImg, x + cardPad, y + cardPad, qrSize, qrSize);

    ctx.font = `bold ${labelFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCAN TO VERIFY', x + cardW / 2, y + cardPad + qrSize + labelH / 2);
    ctx.textAlign = 'left';
    ctx.restore();
  } catch {
    // QR not critical, skip silently
  }
}

// ── Detailed metadata panel (top-left, white card) ───────

function drawDetailedPanel(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, assetData: AssetWatermarkData) {
  const fontSize = Math.max(11, Math.min(14, canvasW * 0.012));
  const lineH = fontSize + 8;
  const padX = 14;
  const padY = 12;
  const accentW = 3;

  // Collect fields that have data
  const lines: { label: string; value: string }[] = [];
  if (assetData.asset_code) lines.push({ label: 'Asset Code', value: assetData.asset_code });
  if (assetData.city && assetData.area) lines.push({ label: 'Location', value: `${assetData.city} – ${assetData.area}` });
  if (assetData.location) {
    const loc = assetData.location.length > 45 ? assetData.location.substring(0, 42) + '…' : assetData.location;
    lines.push({ label: 'Address', value: loc });
  }
  if (assetData.direction) lines.push({ label: 'Direction', value: assetData.direction });
  if (assetData.dimension) lines.push({ label: 'Dimensions', value: assetData.dimension });
  if (assetData.total_sqft) lines.push({ label: 'Area', value: `${assetData.total_sqft.toFixed(1)} sq.ft` });
  if (assetData.illumination_type) lines.push({ label: 'Illumination', value: assetData.illumination_type });
  if (assetData.media_type) lines.push({ label: 'Media Type', value: assetData.media_type });

  if (lines.length === 0) return;

  const panelW = Math.min(360, canvasW * 0.34);
  const panelH = padY * 2 + lines.length * lineH;
  const pad = Math.min(canvasW, canvasH) * 0.02;
  const x = pad;
  const y = pad;

  ctx.save();

  // White card background with shadow
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, x, y, panelW, panelH, 8);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Subtle border
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, panelW, panelH, 8);
  ctx.stroke();

  // Green accent line on left edge
  ctx.fillStyle = 'rgba(16,185,129,0.85)';
  roundRect(ctx, x + 2, y + 6, accentW, panelH - 12, 2);
  ctx.fill();

  // Draw fields
  let ty = y + padY + fontSize;
  const labelW = 80;
  for (const line of lines) {
    // Label
    ctx.font = `600 ${fontSize - 1}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(line.label, x + padX + accentW + 4, ty);

    // Value
    ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillText(line.value, x + padX + accentW + 4 + labelW, ty);

    ty += lineH;
  }

  ctx.restore();
}

// ── Main Export Functions ────────────────────────────────

/**
 * Download an image with the specified watermark mode.
 * 
 * - 'none': Raw original image
 * - 'light': QR code only at top-right (default for branded download)
 * - 'detailed': QR top-right + metadata panel top-left
 * 
 * No logos are added in any download mode — uploaded images already have branding.
 */
export async function downloadImageWithWatermark({
  assetData,
  imageUrl,
  category,
  assetId,
  qrCodeUrl,
  mode = 'light',
}: WatermarkOptions): Promise<void> {
  try {
    const modeLabel = mode === 'none' ? 'original' : mode === 'light' ? 'branded' : 'detailed';
    toast({
      title: "Preparing download…",
      description: `Downloading ${modeLabel} image`,
    });

    const img = await loadImage(imageUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(img, 0, 0);

    if (mode !== 'none') {
      // QR code — always top-right
      if (qrCodeUrl) {
        await drawQRTopRight(ctx, qrCodeUrl, canvas.width, canvas.height);
      }

      // Detailed mode: metadata panel at top-left
      if (mode === 'detailed') {
        drawDetailedPanel(ctx, canvas.width, canvas.height, assetData);
      }
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Blob failed')); return; }
        const suffix = mode === 'none' ? 'original' : mode === 'light' ? 'branded' : 'proof';
        triggerDownload(blob, buildFileName(assetData, category, assetId, suffix));
        toast({ title: "Download complete!", description: `${modeLabel.charAt(0).toUpperCase() + modeLabel.slice(1)} image saved` });
        resolve();
      }, 'image/png');
    });

  } catch (error) {
    console.error('Error downloading with watermark:', error);
    toast({
      title: "Download failed",
      description: "Could not process image",
      variant: "destructive",
    });
    throw error;
  }
}

/**
 * Fallback download without watermark
 */
export function downloadImageSimple(imageUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
