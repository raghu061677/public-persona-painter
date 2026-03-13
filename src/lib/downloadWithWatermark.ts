/**
 * Utility for downloading images with configurable watermark modes
 * 
 * Visual system matches upload watermark (imageWatermark.ts):
 *   - QR code: always top-right in white rounded card
 *   - Logo: bottom-left in white rounded card (no company name text)
 *   - No heavy dark footer bar
 * 
 * Modes:
 *   - 'none'     → raw image, no watermark
 *   - 'light'    → QR top-right + logo bottom-left (default for client-facing)
 *   - 'detailed' → QR top-right + logo bottom-left + metadata panel bottom-left (internal/admin)
 */

import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type WatermarkMode = 'none' | 'light' | 'detailed';

export interface AssetWatermarkData {
  city?: string;
  area?: string;
  location: string;
  direction?: string;
  dimension?: string;
  total_sqft?: number;
  illumination_type?: string;
}

interface WatermarkOptions {
  assetData: AssetWatermarkData;
  imageUrl: string;
  category: string;
  assetId?: string;
  qrCodeUrl?: string;
  logoUrl?: string;
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

// ── QR Drawing (top-right) — matches upload watermark ────

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

// ── Logo (bottom-left) — matches upload watermark ────────

async function drawLogoBottomLeft(ctx: CanvasRenderingContext2D, logoUrl: string, canvasW: number, canvasH: number, yOffset = 0) {
  try {
    const logo = await loadImage(logoUrl);
    const maxLogoH = Math.min(Math.max(canvasH * 0.06, 36), 56);
    const logoH = maxLogoH;
    const logoW = (logo.width / logo.height) * logoH;
    const cardPad = 6;
    const cardW = logoW + cardPad * 2;
    const cardH = logoH + cardPad * 2;
    const pad = Math.min(canvasW, canvasH) * 0.02;
    const x = pad;
    const y = canvasH - cardH - pad - yOffset;

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

    return cardH + 8; // return height so metadata panel can stack above
  } catch {
    return 0;
  }
}

// ── Detailed metadata panel (bottom-left, above logo) ────

function drawDetailedPanel(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, assetData: AssetWatermarkData, bottomOffset: number) {
  const fontSize = Math.max(11, Math.min(14, canvasW * 0.012));
  const lineH = fontSize + 8;
  const padX = 14;
  const padY = 12;

  // Collect fields that have data
  const lines: { label: string; value: string }[] = [];
  if (assetData.city && assetData.area) lines.push({ label: 'Location', value: `${assetData.city} – ${assetData.area}` });
  if (assetData.location) {
    const loc = assetData.location.length > 45 ? assetData.location.substring(0, 42) + '…' : assetData.location;
    lines.push({ label: 'Address', value: loc });
  }
  if (assetData.direction) lines.push({ label: 'Direction', value: assetData.direction });
  if (assetData.dimension) lines.push({ label: 'Size', value: assetData.dimension });
  if (assetData.total_sqft) lines.push({ label: 'Area', value: `${assetData.total_sqft.toFixed(1)} sq.ft` });
  if (assetData.illumination_type) lines.push({ label: 'Type', value: assetData.illumination_type });

  if (lines.length === 0) return;

  const panelW = Math.min(340, canvasW * 0.32);
  const panelH = padY * 2 + lines.length * lineH;
  const pad = Math.min(canvasW, canvasH) * 0.02;
  const x = pad;
  const y = canvasH - panelH - pad - bottomOffset;

  ctx.save();

  // Panel background
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, x, y, panelW, panelH, 8);
  ctx.fill();

  // Subtle left accent
  ctx.fillStyle = 'rgba(16,185,129,0.8)';
  roundRect(ctx, x, y + 4, 3, panelH - 8, 2);
  ctx.fill();

  // Draw fields
  let ty = y + padY + fontSize;
  const labelW = 68;
  for (const line of lines) {
    ctx.font = `600 ${fontSize - 1}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(line.label, x + padX, ty);

    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(line.value, x + padX + labelW, ty);

    ty += lineH;
  }

  ctx.restore();
}

// ── Main Export Functions ────────────────────────────────

/**
 * Fetch organization logo URL from settings.
 * Cached for the session.
 */
let _cachedLogoUrl: string | null | undefined = undefined;

async function getOrgLogoUrl(): Promise<string | null> {
  if (_cachedLogoUrl !== undefined) return _cachedLogoUrl;
  try {
    const { data } = await supabase
      .from('organization_settings')
      .select('logo_url')
      .limit(1)
      .single();
    _cachedLogoUrl = data?.logo_url || null;
  } catch {
    _cachedLogoUrl = null;
  }
  return _cachedLogoUrl;
}

/**
 * Download an image with the specified watermark mode.
 * Default mode: 'light' (QR + logo, no metadata panel).
 * 
 * Visual system:
 *   - QR: top-right (white card)
 *   - Logo: bottom-left (white card, no text)
 *   - Detailed: metadata panel stacked above logo at bottom-left
 */
export async function downloadImageWithWatermark({
  assetData,
  imageUrl,
  category,
  assetId,
  qrCodeUrl,
  logoUrl,
  mode = 'light',
}: WatermarkOptions): Promise<void> {
  try {
    const modeLabel = mode === 'none' ? 'original' : mode === 'light' ? 'branded' : 'detailed';
    toast({
      title: "Preparing download…",
      description: `Downloading ${modeLabel} image`,
    });

    const img = await loadImage(imageUrl);

    // For 'none' mode, just download the raw image
    if (mode === 'none') {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Blob failed')); return; }
          triggerDownload(blob, buildFileName(assetData, category, assetId, 'original'));
          toast({ title: "Download complete", description: "Original image saved" });
          resolve();
        }, 'image/png');
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(img, 0, 0);

    // QR code — always top-right
    if (qrCodeUrl) {
      await drawQRTopRight(ctx, qrCodeUrl, canvas.width, canvas.height);
    }

    // Resolve logo URL
    const resolvedLogoUrl = logoUrl || await getOrgLogoUrl();

    // Logo — always bottom-left
    let logoHeight = 0;
    if (resolvedLogoUrl) {
      logoHeight = await drawLogoBottomLeft(ctx, resolvedLogoUrl, canvas.width, canvas.height, 0);
    }

    // Detailed mode: metadata panel stacked above logo
    if (mode === 'detailed') {
      drawDetailedPanel(ctx, canvas.width, canvas.height, assetData, logoHeight);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Blob failed')); return; }
        const suffix = mode === 'light' ? 'branded' : 'proof';
        triggerDownload(blob, buildFileName(assetData, category, assetId, suffix));
        toast({ title: "Download complete!", description: `${mode === 'light' ? 'Branded' : 'Detailed proof'} image saved` });
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
