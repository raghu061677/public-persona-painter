/**
 * Phase-4C: Safe Navigation Helper
 * 
 * Prevents open redirect attacks by blocking external URLs
 * unless they are on an explicit allowlist.
 */

const ALLOWED_EXTERNAL_DOMAINS: string[] = [
  'go-ads.lovable.app',
  'lovable.app',
];

/**
 * Validate that a URL/path is safe to navigate to.
 * Returns the sanitized path, or a fallback if unsafe.
 */
export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!path) return fallback;

  // Trim whitespace
  const trimmed = path.trim();

  // Block empty strings
  if (!trimmed) return fallback;

  // Block protocol-based URLs (javascript:, data:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    // Allow only http/https with allowed domains
    try {
      const url = new URL(trimmed);
      if (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        ALLOWED_EXTERNAL_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
      ) {
        return trimmed;
      }
    } catch {
      // Invalid URL
    }
    return fallback;
  }

  // Block protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('//')) return fallback;

  // Block backslash tricks (\\evil.com)
  if (trimmed.startsWith('\\')) return fallback;

  // Ensure path starts with /
  if (!trimmed.startsWith('/')) return fallback;

  // Block paths with encoded characters that could bypass checks
  // Decode and re-check
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith('//') || decoded.startsWith('\\')) return fallback;
  } catch {
    // If decoding fails, the path might be malicious
    return fallback;
  }

  return trimmed;
}

/**
 * Safe wrapper for useNavigate that prevents external redirects.
 * Use this for any navigation that uses user-provided input (query params, etc.)
 */
export function safeRedirect(
  navigate: (path: string) => void,
  path: string | null | undefined,
  fallback = '/dashboard'
): void {
  const safePath = sanitizeRedirectPath(path, fallback);
  navigate(safePath);
}
