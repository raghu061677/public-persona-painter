export interface WatermarkOptions {
  logoUrl?: string;
  organizationName?: string;
  qrCodeUrl?: string;
}

/**
 * Add watermark with company logo, timestamp, and QR code to an image
 */
export async function addWatermark(
  imageFile: File,
  logoUrl?: string,
  organizationName?: string,
  qrCodeUrl?: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const img = new Image();
    img.onload = async () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Calculate watermark dimensions and position
      const padding = Math.min(img.width, img.height) * 0.03; // 3% padding
      const watermarkHeight = Math.min(img.height * 0.08, 80); // 8% of height, max 80px
      const watermarkY = img.height - watermarkHeight - padding;

      // Draw semi-transparent background for watermark
      const bgHeight = watermarkHeight + padding;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, img.height - bgHeight, img.width, bgHeight);

      // Add timestamp
      const timestamp = new Date().toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      // Configure text style
      const fontSize = Math.max(watermarkHeight * 0.4, 14);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';

      let textX = padding * 2;

      // If logo URL is provided, try to load and draw it
      if (logoUrl) {
        try {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          
          await new Promise<void>((resolveLoad, rejectLoad) => {
            logo.onload = () => resolveLoad();
            logo.onerror = () => rejectLoad(new Error('Failed to load logo'));
            logo.src = logoUrl;
          });

          // Calculate logo dimensions maintaining aspect ratio
          const logoHeight = watermarkHeight * 0.7;
          const logoWidth = (logo.width / logo.height) * logoHeight;

          // Draw logo
          ctx.drawImage(
            logo,
            padding * 2,
            watermarkY + (watermarkHeight - logoHeight) / 2,
            logoWidth,
            logoHeight
          );

          textX = padding * 2 + logoWidth + padding;
        } catch (error) {
          console.warn('Could not load logo for watermark:', error);
        }
      }

      // Draw organization name if provided
      if (organizationName) {
        ctx.fillText(organizationName, textX, watermarkY + watermarkHeight / 3);
      }

      // Draw timestamp
      const timestampY = organizationName 
        ? watermarkY + (watermarkHeight * 2) / 3 
        : watermarkY + watermarkHeight / 2;
      
      ctx.font = `${fontSize * 0.8}px Arial`;
      ctx.fillText(timestamp, textX, timestampY);

      // Draw QR code on the right side if provided
      let qrWidth = 0;
      if (qrCodeUrl) {
        try {
          const qrImg = new Image();
          qrImg.crossOrigin = 'anonymous';
          
          await new Promise<void>((resolveLoad, rejectLoad) => {
            qrImg.onload = () => resolveLoad();
            qrImg.onerror = () => rejectLoad(new Error('Failed to load QR code'));
            qrImg.src = qrCodeUrl;
          });

          // QR code size - make it fit nicely in the watermark bar
          const qrSize = watermarkHeight * 0.9;
          qrWidth = qrSize + padding * 2;
          
          // Draw white background for QR code
          const qrX = img.width - qrSize - padding * 2;
          const qrY = watermarkY + (watermarkHeight - qrSize) / 2;
          
          ctx.fillStyle = 'white';
          ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
          
          // Draw QR code
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } catch (error) {
          console.warn('Could not load QR code for watermark:', error);
          qrWidth = 0;
        }
      }

      // Add "PROOF OF INSTALLATION" text (positioned before QR code if present)
      ctx.font = `bold ${fontSize * 0.7}px Arial`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'right';
      const proofTextX = qrWidth > 0 ? img.width - qrWidth - padding : img.width - padding * 2;
      ctx.fillText('PROOF OF INSTALLATION', proofTextX, watermarkY + watermarkHeight / 2);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const watermarkedFile = new File(
              [blob],
              imageFile.name.replace(/\.(jpg|jpeg|png)$/i, '_watermarked.$1'),
              { type: imageFile.type }
            );
            resolve(watermarkedFile);
          } else {
            reject(new Error('Failed to create watermarked image'));
          }
        },
        imageFile.type,
        0.95
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Add watermarks to multiple images
 */
export async function addWatermarkBatch(
  files: File[],
  logoUrl?: string,
  organizationName?: string,
  onProgress?: (index: number, progress: number) => void,
  qrCodeUrl?: string
): Promise<File[]> {
  const watermarkedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    if (onProgress) onProgress(i, 0);
    
    try {
      const watermarkedFile = await addWatermark(files[i], logoUrl, organizationName, qrCodeUrl);
      watermarkedFiles.push(watermarkedFile);
      
      if (onProgress) onProgress(i, 100);
    } catch (error) {
      console.error(`Failed to watermark ${files[i].name}:`, error);
      // Use original file if watermarking fails
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
