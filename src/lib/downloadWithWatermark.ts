/**
 * Utility for downloading images with asset watermarks
 * Adds location, dimension, and other asset details to images
 */

import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

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
}

/**
 * Downloads an image with asset details watermarked on it
 * Filename format: {City}-{Area}-{Location}-{Category}-{Date}.png
 */
export async function downloadImageWithWatermark({
  assetData,
  imageUrl,
  category,
  assetId
}: WatermarkOptions): Promise<void> {
  try {
    toast({
      title: "Preparing download...",
      description: "Adding watermark to image",
    });

    // Create a canvas to composite the watermark
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the original image
    ctx.drawImage(img, 0, 0);

    // Watermark styling
    const padding = 30;
    const lineHeight = 28;
    const panelHeight = assetData.illumination_type ? 190 : 170;
    const panelWidth = 380;
    
    // Draw semi-transparent overlay panel (bottom-right)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(
      canvas.width - panelWidth - padding,
      canvas.height - panelHeight - padding,
      panelWidth,
      panelHeight
    );

    // Draw accent border (emerald green)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      canvas.width - panelWidth - padding,
      canvas.height - panelHeight - padding,
      panelWidth,
      panelHeight
    );

    let y = canvas.height - panelHeight - padding + 35;
    const x = canvas.width - panelWidth - padding + 20;

    // Helper function to draw text
    const drawText = (label: string, value: string, yPos: number) => {
      // Label
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(label, x, yPos);
      
      // Value
      ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.fillText(value, x + 100, yPos);
    };

    // Draw asset details
    if (assetData.city && assetData.area) {
      drawText('Location:', `${assetData.city} - ${assetData.area}`, y);
      y += lineHeight;
    }

    if (assetData.location) {
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const locationText = assetData.location.length > 40 
        ? assetData.location.substring(0, 37) + '...'
        : assetData.location;
      ctx.fillText(locationText, x + 100, y);
      y += lineHeight;
    }

    if (assetData.direction) {
      drawText('Direction:', assetData.direction, y);
      y += lineHeight;
    }

    if (assetData.dimension) {
      drawText('Size:', assetData.dimension, y);
      y += lineHeight;
    }

    if (assetData.total_sqft) {
      drawText('Area:', `${assetData.total_sqft.toFixed(2)} sq.ft`, y);
      y += lineHeight;
    }

    if (assetData.illumination_type) {
      drawText('Illumination:', assetData.illumination_type, y);
    }

    // Convert canvas to blob and download
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename: {City}-{Area}-{Location}-{Category}-{Date}.png
        const dateStr = format(new Date(), 'yyyyMMdd');
        const locationPart = assetData.location
          .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim()
          .substring(0, 30); // Limit length
        
        let fileName: string;
        if (assetData.city && assetData.area) {
          fileName = `${assetData.city}-${assetData.area}-${locationPart}-${category}-${dateStr}.png`;
        } else if (assetId) {
          fileName = `${assetId}-${locationPart}-${category}-${dateStr}.png`;
        } else {
          fileName = `${locationPart}-${category}-${dateStr}.png`;
        }
        
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download complete!",
          description: "Image with watermark saved",
        });

        resolve();
      }, 'image/png');
    });

  } catch (error) {
    console.error('Error downloading with watermark:', error);
    toast({
      title: "Download failed",
      description: "Could not add watermark to image",
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
