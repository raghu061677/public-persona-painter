/**
 * Utility for downloading images with configurable watermark modes
 * 
 * Modes:
 *   - 'none'     → raw image, no watermark
 *   - 'light'    → QR top-right + small badge bottom-left (default for client-facing)
 *   - 'detailed' → QR top-right + metadata panel bottom-left (internal/admin)
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

async function drawQRTopRight(ctx: CanvasRenderingContext2D, qrCodeUrl: string, canvasW: number) {
  try {
    const qrImg = await loadImage(qrCodeUrl);
    const qrSize = Math.min(100, canvasW * 0.1);
    const pad = 16;
    const cardPad = 6;
    const labelH = 14;
    const cardW = qrSize + cardPad * 2;
    const cardH = qrSize + cardPad * 2 + labelH + 4;
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
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCAN TO VERIFY', x + cardW / 2, y + cardPad + qrSize + labelH / 2 + 4);
    ctx.textAlign = 'left';
    ctx.restore();
  } catch {
    // QR not critical, skip silently
  }
}

// ── Light badge (bottom-left) ────────────────────────────

function drawLightBadge(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  const text = 'Go-Ads 360°';
  const fontSize = Math.max(11, Math.min(14, canvasW * 0.012));
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const padX = 10;
  const padY = 6;
  const badgeW = textWidth + padX * 2;
  const badgeH = fontSize + padY * 2;
  const x = 16;
  const y = canvasH - badgeH - 16;

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x, y, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + badgeH / 2);
  ctx.restore();
}

// ── Detailed metadata panel (bottom-left) ────────────────

function drawDetailedPanel(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, assetData: AssetWatermarkData) {
  const fontSize = Math.max(12, Math.min(15, canvasW * 0.013));
  const lineH = fontSize + 10;
  const padX = 16;
  const padY = 14;

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

  const panelW = Math.min(360, canvasW * 0.35);
  const panelH = padY * 2 + lines.length * lineH + 4;
  const x = 16;
  const y = canvasH - panelH - 16;

  ctx.save();

  // Panel background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, x, y, panelW, panelH, 10);
  ctx.fill();

  // Subtle left accent
  ctx.fillStyle = 'rgba(16,185,129,0.8)';
  ctx.fillRect(x, y + 6, 3, panelH - 12);

  // Draw fields
  let ty = y + padY + fontSize;
  const labelW = 72;
  for (const line of lines) {
    // Label
    ctx.font = `600 ${fontSize - 1}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(line.label, x + padX, ty);

    // Value
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(line.value, x + padX + labelW, ty);

    ty += lineH;
  }

  ctx.restore();
}

// ── Main Export Functions ────────────────────────────────

/**
 * Download an image with the specified watermark mode.
 * Default mode: 'light' (QR + small badge, no metadata panel).
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

    // QR code — always top-right for both light and detailed
    if (qrCodeUrl) {
      await drawQRTopRight(ctx, qrCodeUrl, canvas.width);
    }

    if (mode === 'light') {
      drawLightBadge(ctx, canvas.width, canvas.height);
    } else if (mode === 'detailed') {
      drawDetailedPanel(ctx, canvas.width, canvas.height, assetData);
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
