/**
 * PPT XML Sanitization Utilities
 * 
 * PowerPoint PPTX files are ZIP archives containing XML files.
 * Hyperlink URLs are stored inside XML attributes like Target="...".
 * If URLs contain raw ampersands (&) or other XML special characters,
 * the resulting XML is invalid and PowerPoint shows "repair" dialogs.
 * 
 * These utilities ensure all text and URLs are safe for PPTX generation.
 */

/**
 * Sanitize a hyperlink URL for pptxgenjs.
 * 
 * pptxgenjs does NOT XML-escape hyperlink Target attributes internally.
 * Raw '&' in URLs (common in Google Maps/Street View) produces invalid XML
 * that causes PowerPoint "repair" dialogs or generation failures.
 * 
 * This function XML-escapes '&' → '&amp;' which is the ONLY character
 * that commonly appears in URLs and breaks XML. We intentionally do NOT
 * escape <, >, ", ' because they don't appear in valid URLs.
 * 
 * @param url - The raw URL
 * @returns XML-safe URL or undefined if empty/invalid
 */
export function sanitizePptHyperlink(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return undefined;
  }

  // Remove control characters
  let cleaned = url
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '')
    .trim();

  // XML-escape ampersands for pptxgenjs hyperlink Target attributes.
  // First undo any existing &amp; to avoid double-encoding, then re-encode all &.
  cleaned = cleaned
    .replace(/&amp;/g, '&')   // undo any prior encoding
    .replace(/&/g, '&amp;');   // encode all ampersands

  return cleaned;
}

/**
 * Sanitize text for use in PowerPoint slides.
 * Removes control characters and problematic Unicode that can corrupt PPTX.
 * 
 * @param text - The raw text (may contain problematic characters)
 * @returns Sanitized text safe for PPT, or empty string if null
 */
export function sanitizePptText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text
    // Replace arrows and special dashes with simple equivalents
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->')
    .replace(/–/g, '-')  // en-dash
    .replace(/—/g, '-')  // em-dash
    .replace(/'/g, "'")  // curly apostrophe
    .replace(/'/g, "'")  // curly apostrophe
    .replace(/"/g, '"')  // curly quote
    .replace(/"/g, '"')  // curly quote
    .replace(/…/g, '...')  // ellipsis
    // Remove control characters (0x00-0x1F) except newline (0x0A) and tab (0x09)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Remove other problematic Unicode
    .replace(/[\uFFFE\uFFFF]/g, '');

  return sanitized;
}

/**
 * PPT-safe fonts list.
 * PowerPoint works best with standard Windows fonts.
 * Custom/web fonts like Inter, Poppins, Roboto may not render correctly.
 */
export const PPT_SAFE_FONTS = {
  primary: 'Arial',
  secondary: 'Calibri',
  mono: 'Courier New',
} as const;

/**
 * Safely get a hyperlink object for pptxgenjs.
 * Returns undefined if URL is invalid/empty, preventing broken hyperlinks.
 * 
 * @param url - Raw URL
 * @returns Hyperlink object or undefined
 */
export function getPptHyperlink(url: string | null | undefined): { url: string } | undefined {
  const sanitized = sanitizePptHyperlink(url);
  if (!sanitized) {
    return undefined;
  }
  return { url: sanitized };
}

/**
 * Create a hyperlink config for pptxgenjs with proper sanitization.
 * Use this for all hyperlink properties in slide.addText, slide.addImage, etc.
 * 
 * @param url - Raw URL to link to
 * @returns Object with hyperlink property, or empty object if URL is invalid
 */
export function withSafeHyperlink(url: string | null | undefined): { hyperlink?: { url: string } } {
  const hyperlink = getPptHyperlink(url);
  return hyperlink ? { hyperlink } : {};
}

/**
 * Shorten a Google Maps URL if possible.
 * Long URLs with many & characters increase corruption risk.
 * This is a best-effort function - if shortening isn't possible, it sanitizes.
 * 
 * @param url - Google Maps or Street View URL
 * @returns Shortened or sanitized URL
 */
export function shortenGoogleMapsUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  // If it's already a short link, just sanitize
  if (url.includes('maps.app.goo.gl') || url.includes('goo.gl')) {
    return sanitizePptHyperlink(url);
  }
  
  // For long URLs, just sanitize them properly
  // In future, could implement server-side URL shortening
  return sanitizePptHyperlink(url);
}

/**
 * Validate a PPTX buffer for common issues.
 * This is a lightweight check that can catch obvious problems.
 * 
 * Note: Full validation requires parsing the ZIP and checking XML.
 * This function provides basic sanity checks.
 * 
 * @param buffer - PPTX file buffer
 * @returns True if basic checks pass
 */
export function validatePptxBuffer(buffer: ArrayBuffer | Blob): boolean {
  // Basic check: PPTX should start with ZIP magic bytes (PK)
  const bytes = buffer instanceof Blob ? null : new Uint8Array(buffer.slice(0, 4));
  if (bytes && bytes[0] === 0x50 && bytes[1] === 0x4B) {
    return true; // Starts with PK (ZIP signature)
  }
  return buffer instanceof Blob; // Blobs are harder to validate client-side
}
