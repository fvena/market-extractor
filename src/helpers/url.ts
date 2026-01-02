/**
 * URL utilities for handling relative and absolute URLs
 */

/**
 * Convert a relative URL to an absolute URL using a base URL
 */
export function toAbsoluteUrl(href: string, baseUrl: string): string {
  if (!href) return "";

  // Already absolute
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  // Remove trailing slash from base URL
  const base = baseUrl.replace(/\/$/, "");

  // Handle absolute path
  if (href.startsWith("/")) {
    return base + href;
  }

  // Handle relative path
  return base + "/" + href;
}

/**
 * Extract the base URL (protocol + host) from a full URL
 */
export function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

/**
 * Build a URL with query parameters
 */
export function buildUrl(base: string, parameters: Record<string, number | string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}
