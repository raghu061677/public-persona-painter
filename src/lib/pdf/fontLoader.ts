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
 * Loads the font once from /fonts/NotoSans-Regular.ttf.
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

  const res = await fetch('/fonts/NotoSans-Regular.ttf');
  if (!res.ok) throw new Error('Failed to load PDF font');

  const buffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  doc.addFileToVFS('NotoSans-Regular.ttf', base64);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans', 'normal');

  notoSansLoaded = true;
}
