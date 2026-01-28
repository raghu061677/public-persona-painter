export type ProofPhotoEntry = {
  key: string;
  label: string;
  url: string;
};

// campaign_assets.photos can be:
// - { photo_1: url, photo_2: url, ... }
// - { geo: url, newspaper: url, traffic1: url, traffic2: url }
// - possibly other keys (legacy)
export function getCampaignAssetProofPhotos(photos: unknown): ProofPhotoEntry[] {
  if (!photos || typeof photos !== 'object') return [];

  const obj = photos as Record<string, unknown>;

  const mapping: Array<{ keys: string[]; label: string }> = [
    { keys: ['geo', 'geotag', 'photo_1'], label: 'Geo-tagged Photo' },
    { keys: ['newspaper', 'photo_2'], label: 'Newspaper Ad' },
    { keys: ['traffic1', 'traffic_left', 'photo_3'], label: 'Traffic View 1' },
    { keys: ['traffic2', 'traffic_right', 'photo_4'], label: 'Traffic View 2' },
  ];

  const usedKeys = new Set<string>();
  const result: ProofPhotoEntry[] = [];

  // 1) Preferred 4-slot mapping
  for (const slot of mapping) {
    const key = slot.keys.find((k) => typeof obj[k] === 'string' && String(obj[k]).trim() !== '');
    if (!key) continue;
    usedKeys.add(key);
    result.push({ key, label: slot.label, url: String(obj[key]) });
  }

  // 2) Include any extra keys (so nothing is silently dropped)
  for (const [key, value] of Object.entries(obj)) {
    if (usedKeys.has(key)) continue;
    if (typeof value !== 'string') continue;
    const url = value.trim();
    if (!url) continue;
    result.push({ key, label: key.replace(/_/g, ' '), url });
  }

  return result;
}
