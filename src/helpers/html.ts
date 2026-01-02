/**
 * HTML parsing and extraction utilities
 */

/**
 * Clean text by removing extra whitespace and trimming
 */
export function cleanText(text: null | string | undefined): string {
  if (!text) return "";
  return text.replaceAll(/\s+/g, " ").trim();
}

/**
 * Extract text content from an HTML element
 */
export function extractText(element: Element | null): string {
  if (!element) return "";
  return cleanText(element.textContent);
}

/**
 * Extract href attribute from a link element
 */
export function extractHref(element: Element | null): string | undefined {
  if (!element) return undefined;
  return element.getAttribute("href") ?? undefined;
}

/**
 * Parse a sector-subsector string separated by a delimiter
 */
export function parseSectorSubsector(
  text: string,
  delimiter = " - ",
): { sector: string; subsector: string } {
  const parts = text.split(delimiter);
  return {
    sector: cleanText(parts[0]),
    subsector: cleanText(parts[1]),
  };
}
