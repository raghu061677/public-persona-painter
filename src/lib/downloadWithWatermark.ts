/**
 * Utility for downloading images with asset watermarks
 * Adds location, dimension, and other asset details to images
 */

import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface WatermarkSettings {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  background_color: string;
  text_color: string;
  border_color: string;
  show_logo: boolean;
  logo_url?: string;
  fields_to_show: string[];
  panel_width: number;
  panel_padding: number;
  font_size: number;
}

/**
 * Fetch watermark settings from database
 */
async function getWatermarkSettings(): Promise<WatermarkSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!companyUser) throw new Error('No company found');

    const { data, error } = await supabase
      .from('watermark_settings')
      .select('*')
      .eq('company_id', companyUser.company_id)
      .single();

    if (error) throw error;

    return {
      position: data.position as any,
      background_color: data.background_color,
      text_color: data.text_color,
      border_color: data.border_color,
      show_logo: data.show_logo,
      logo_url: data.logo_url,
      fields_to_show: data.fields_to_show as string[],
      panel_width: data.panel_width,
      panel_padding: data.panel_padding,
      font_size: data.font_size,
    };
  } catch (error) {
    console.error('Error fetching watermark settings:', error);
    // Return default settings
    return {
      position: 'bottom-right',
      background_color: 'rgba(0, 0, 0, 0.75)',
      text_color: 'rgba(255, 255, 255, 1)',
      border_color: 'rgba(16, 185, 129, 0.8)',
      show_logo: false,
      fields_to_show: ['location', 'address', 'direction', 'dimension', 'area', 'illumination'],
      panel_width: 380,
      panel_padding: 30,
      font_size: 16,
    };
  }
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

    // Fetch watermark settings
    const settings = await getWatermarkSettings();

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

    // Use custom settings
    const padding = settings.panel_padding;
    const lineHeight = settings.font_size + 12;
    const fieldsToShow = settings.fields_to_show;
    
    // Calculate panel height based on fields to show
    let fieldCount = 0;
    if (fieldsToShow.includes('location') && assetData.city && assetData.area) fieldCount++;
    if (fieldsToShow.includes('address') && assetData.location) fieldCount++;
    if (fieldsToShow.includes('direction') && assetData.direction) fieldCount++;
    if (fieldsToShow.includes('dimension') && assetData.dimension) fieldCount++;
    if (fieldsToShow.includes('area') && assetData.total_sqft) fieldCount++;
    if (fieldsToShow.includes('illumination') && assetData.illumination_type) fieldCount++;
    
    const panelHeight = 35 + (fieldCount * lineHeight) + 20;
    const panelWidth = settings.panel_width;
    
    // Calculate position based on settings
    let panelX: number, panelY: number;
    
    switch (settings.position) {
      case 'bottom-right':
        panelX = canvas.width - panelWidth - padding;
        panelY = canvas.height - panelHeight - padding;
        break;
      case 'bottom-left':
        panelX = padding;
        panelY = canvas.height - panelHeight - padding;
        break;
      case 'top-right':
        panelX = canvas.width - panelWidth - padding;
        panelY = padding;
        break;
      case 'top-left':
        panelX = padding;
        panelY = padding;
        break;
    }

    // Draw semi-transparent overlay panel
    ctx.fillStyle = settings.background_color;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw border
    ctx.strokeStyle = settings.border_color;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Load and draw logo if enabled
    if (settings.show_logo && settings.logo_url) {
      try {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
          logo.src = settings.logo_url!;
        });
        
        const logoSize = 40;
        ctx.drawImage(logo, panelX + 20, panelY + 15, logoSize, logoSize);
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    let y = panelY + 35;
    const x = panelX + 20;

    // Helper function to draw text with custom colors
    const drawText = (label: string, value: string, yPos: number) => {
      // Label
      ctx.font = `bold ${settings.font_size - 2}px Inter, system-ui, sans-serif`;
      const labelColor = settings.text_color.replace('1)', '0.7)');
      ctx.fillStyle = labelColor;
      ctx.fillText(label, x, yPos);
      
      // Value
      ctx.font = `${settings.font_size}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = settings.text_color;
      ctx.fillText(value, x + 100, yPos);
    };

    // Draw asset details based on selected fields
    if (fieldsToShow.includes('location') && assetData.city && assetData.area) {
      drawText('Location:', `${assetData.city} - ${assetData.area}`, y);
      y += lineHeight;
    }

    if (fieldsToShow.includes('address') && assetData.location) {
      ctx.font = `${settings.font_size - 3}px Inter, system-ui, sans-serif`;
      const labelColor = settings.text_color.replace('1)', '0.85)');
      ctx.fillStyle = labelColor;
      const locationText = assetData.location.length > 40 
        ? assetData.location.substring(0, 37) + '...'
        : assetData.location;
      ctx.fillText(locationText, x + 100, y);
      y += lineHeight;
    }

    if (fieldsToShow.includes('direction') && assetData.direction) {
      drawText('Direction:', assetData.direction, y);
      y += lineHeight;
    }

    if (fieldsToShow.includes('dimension') && assetData.dimension) {
      drawText('Size:', assetData.dimension, y);
      y += lineHeight;
    }

    if (fieldsToShow.includes('area') && assetData.total_sqft) {
      drawText('Area:', `${assetData.total_sqft.toFixed(2)} sq.ft`, y);
      y += lineHeight;
    }

    if (fieldsToShow.includes('illumination') && assetData.illumination_type) {
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
