let notoSansLoaded = false;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Ensures Noto Sans (Unicode) is available in jsPDF so ₹ renders correctly.
 * Loads the font once from /fonts/NotoSans-Regular.ttf and /fonts/NotoSans-Bold.ttf.
 */
export async function ensurePdfUnicodeFont(doc: any): Promise<void> {
  if (notoSansLoaded) {
    try {
      doc.setFont('NotoSans', 'normal');
    } catch {
      // ignore
    }
    return;
  }

  const [regularRes, boldRes] = await Promise.all([
    fetch('/fonts/NotoSans-Regular.ttf'),
    fetch('/fonts/NotoSans-Bold.ttf'),
  ]);

  if (!regularRes.ok) throw new Error('Failed to load PDF font (NotoSans Regular)');
  if (!boldRes.ok) throw new Error('Failed to load PDF font (NotoSans Bold)');

  const [regularBuffer, boldBuffer] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);

  doc.addFileToVFS('NotoSans-Regular.ttf', arrayBufferToBase64(regularBuffer));
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');

  doc.addFileToVFS('NotoSans-Bold.ttf', arrayBufferToBase64(boldBuffer));
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

  doc.setFont('NotoSans', 'normal');
  notoSansLoaded = true;
}
