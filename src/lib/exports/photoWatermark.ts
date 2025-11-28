/**
 * Add watermark to image for PDF export
 */

export async function addWatermarkToImage(
  imageUrl: string,
  watermarkText: string = "MNS – Proof of Display"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Add watermark
        ctx.save();
        
        // Position watermark diagonally
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6); // -30 degrees
        
        // Watermark styling
        ctx.globalAlpha = 0.25;
        ctx.font = `bold ${Math.max(20, canvas.width / 20)}px Arial`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw watermark with shadow
        ctx.strokeText(watermarkText, 0, 0);
        ctx.fillText(watermarkText, 0, 0);
        
        ctx.restore();
        
        // Convert to data URL
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Load image and convert to data URL for PDF embedding
 */
export async function loadImageAsDataUrl(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
