export async function fetchImageAsDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  }

  const blob = await res.blob();
  const mime = blob.type || 'image/jpeg';

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.onload = () => {
      const result = String(reader.result || '');
      // result looks like: data:image/jpeg;base64,....
      if (!result.startsWith('data:')) return reject(new Error('Unexpected data URI format'));
      resolve(result);
    };
    reader.readAsDataURL(blob);
  });

  // Ensure mime is present even if FileReader returns generic
  if (base64.startsWith('data:;base64,')) {
    return `data:${mime};base64,${base64.split(',')[1] || ''}`;
  }

  return base64;
}
