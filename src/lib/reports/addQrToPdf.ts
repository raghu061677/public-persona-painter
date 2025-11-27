/**
 * Helper utility to add QR codes to PDF documents
 * Compatible with jsPDF and similar PDF generation libraries
 */

export async function fetchQrAsDataUrl(qrUrl: string): Promise<string | null> {
  try {
    const response = await fetch(qrUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch QR image: ${response.status}`);
      return null;
    }
    
    const blob = await response.blob();
    
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching QR code as data URL:', error);
    return null;
  }
}

/**
 * Add QR code to a jsPDF document at specified coordinates
 * @param doc - jsPDF instance
 * @param qrUrl - Public URL of the QR code image
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param size - Size of QR code in mm (default: 30)
 */
export async function addQrToPdfPage(
  doc: any,
  qrUrl: string | null | undefined,
  x: number = 160,
  y: number = 15,
  size: number = 30
): Promise<boolean> {
  if (!qrUrl) return false;

  try {
    const dataUrl = await fetchQrAsDataUrl(qrUrl);
    if (!dataUrl) return false;

    doc.addImage(dataUrl, 'PNG', x, y, size, size);
    return true;
  } catch (error) {
    console.error('Error adding QR to PDF:', error);
    return false;
  }
}
