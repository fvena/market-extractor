/**
 * Parsing utilities for Spanish format numbers and dates
 */

/**
 * Parse Spanish number format: "2.698.182,10 Euros" → 2698182.10
 * Handles: thousands separator (.), decimal separator (,), currency suffix
 */
export function parseSpanishNumber(text: string): number | undefined {
  if (!text) return undefined;

  // Clean the text
  const cleaned = text
    .replaceAll(/[^\d.,-]/g, "") // Remove everything except digits, dots, commas, minus
    .replaceAll(".", "") // Remove thousands separators
    .replace(",", "."); // Convert decimal separator

  if (!cleaned || cleaned === "-") return undefined;

  const value = Number.parseFloat(cleaned);
  return Number.isNaN(value) ? undefined : value;
}

/**
 * Parse Spanish date format: "29/04/2019" → "2019-04-29"
 */
export function parseSpanishDate(text: string): string | undefined {
  if (!text) return undefined;

  const cleaned = cleanText(text);
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(cleaned);

  if (!match?.[1] || !match[2] || !match[3]) return undefined;

  const day = match[1];
  const month = match[2];
  const year = match[3];
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Parse Spanish datetime format: "29/04/2019 12:30:45" → "2019-04-29"
 * Ignores the time portion
 */
export function parseSpanishDateTime(text: string): string | undefined {
  if (!text) return undefined;

  // Extract just the date part
  const cleaned = cleanText(text);
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(cleaned);

  if (!match?.[1] || !match[2] || !match[3]) return undefined;

  const day = match[1];
  const month = match[2];
  const year = match[3];
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Clean text: remove extra whitespace, newlines, tabs
 */
export function cleanText(text: string): string {
  if (!text) return "";
  return text.replaceAll(/\s+/g, " ").trim();
}

/**
 * Parse value or return undefined if empty/placeholder
 * Returns undefined for: "-", empty, whitespace-only
 */
export function parseValueOrUndefined(text: string): string | undefined {
  if (!text) return undefined;

  const cleaned = cleanText(text);
  if (!cleaned || cleaned === "-" || cleaned === "—") return undefined;

  return cleaned;
}

/**
 * Extract period from text: "01/01/2024 - 31/12/2024"
 */
export function parsePeriod(text: string): undefined | { end: string; start: string } {
  if (!text) return undefined;

  const cleaned = cleanText(text);
  const match = /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/.exec(cleaned);

  if (!match?.[1] || !match[2]) return undefined;

  const start = parseSpanishDate(match[1]);
  const end = parseSpanishDate(match[2]);

  if (!start || !end) return undefined;

  return { end, start };
}

/**
 * Format date for form submission: Date → "dd/mm/yyyy"
 */
export function formatSpanishDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString();
  return `${day}/${month}/${year}`;
}

/**
 * Get date N days ago
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Parse ratio string: "1 x 20"
 */
export function parseRatio(text: string): undefined | { left: number; right: number } {
  if (!text) return undefined;

  const cleaned = cleanText(text);
  const match = /(\d+)\s*[xX]\s*(\d+)/.exec(cleaned);

  if (!match?.[1] || !match[2]) return undefined;

  return {
    left: Number.parseInt(match[1], 10),
    right: Number.parseInt(match[2], 10),
  };
}

/**
 * Extract suspended date from text containing "Suspendido DD/MM/YYYY"
 */
export function parseSuspendedDate(text: string): string | undefined {
  if (!text) return undefined;

  const cleaned = cleanText(text);
  const match = /[Ss]uspendid[oa]\s*(\d{1,2}\/\d{1,2}\/\d{4})/.exec(cleaned);

  if (!match?.[1]) return undefined;

  return parseSpanishDate(match[1]);
}
