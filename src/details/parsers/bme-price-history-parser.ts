/**
 * Parser for BME Alternatives (Growth/ScaleUp) price history pages
 */

import type { BmeDailyPrice } from "../../types/bme.types";
import { JSDOM } from "jsdom";
import { cleanText, parseSpanishDate, parseSpanishNumber } from "../../helpers/parsing";

export interface ParsedPriceHistoryPage {
  errors: string[];
  hasNextPage: boolean;
  prices: BmeDailyPrice[];
  totalRows: number;
}

/**
 * Parse the price history page HTML
 */
export function parsePriceHistoryPage(html: string): ParsedPriceHistoryPage {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const errors: string[] = [];
  const prices: BmeDailyPrice[] = [];

  // Find the price table - BME uses a table with caption containing "Precios del Mercado"
  const table =
    document.querySelector("table[summary*='Precios'], table caption")?.closest("table") ??
    document.querySelector("#Contenido_Tbl, .tabla-precios, table.precios") ??
    document.querySelector("table");

  if (!table) {
    errors.push("Could not find price history table");
    return { errors, hasNextPage: false, prices, totalRows: 0 };
  }

  const rows = table.querySelectorAll("tr");
  let totalRows = 0;

  // Detect column structure from header row
  const headerRow = rows[0];
  const headers = headerRow
    ? [...headerRow.querySelectorAll("th, td")].map((h) =>
        cleanText(h.textContent || "").toLowerCase(),
      )
    : [];

  // Find column indices based on headers
  // BME structure: Fecha | Último | Volumen | Efectivo | Cierre (5 columns)
  // Or fallback: Fecha | Cierre | Volumen | Efectivo (4 columns)
  let dateCol = headers.findIndex((h) => h.includes("fecha"));
  let closePriceCol = headers.findIndex((h) => h === "cierre" || h.includes("cierre"));
  let volumeCol = headers.findIndex((h) => h.includes("volumen"));
  let turnoverCol = headers.findIndex((h) => h.includes("efectivo"));

  // Default positions if headers not found
  if (dateCol === -1) dateCol = 0;
  if (closePriceCol === -1) closePriceCol = headers.length > 4 ? 4 : 1; // Last column for 5-col, second for 4-col
  if (volumeCol === -1) volumeCol = 2;
  if (turnoverCol === -1) turnoverCol = 3;

  // Skip header row
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;
    const cells = row.querySelectorAll("td");

    if (cells.length < 4) continue;

    const dateText = cleanText(cells[dateCol]?.textContent ?? "");
    const date = parseSpanishDate(dateText);

    if (!date) continue;

    // Count all market days (rows with valid dates)
    totalRows++;

    const closePrice = parseSpanishNumber(cells[closePriceCol]?.textContent ?? "");
    const volume = parseSpanishNumber(cells[volumeCol]?.textContent ?? "");
    const turnover = parseSpanishNumber(cells[turnoverCol]?.textContent ?? "");

    // Include all days that have a close price, regardless of volume
    // Days without trading activity will have volume=0 but still have a closePrice
    if (closePrice !== undefined && closePrice > 0) {
      prices.push({
        closePrice,
        date,
        turnover: turnover ?? 0,
        volume: volume ?? 0,
      });
    }
  }

  // Check for pagination - look for "Siguiente" button
  const hasNextPage = checkHasNextPage(document);

  return { errors, hasNextPage, prices, totalRows };
}

/**
 * Check if there's a next page button
 */
function checkHasNextPage(document: Document): boolean {
  // Look for "Siguiente" link or button
  const nextButton = document.querySelector(
    "#Contenido_Siguiente, [id*='Siguiente'], a:contains('Siguiente'), input[value*='Siguiente']",
  );

  if (nextButton) {
    // Check if it's not disabled
    const isDisabled =
      nextButton.hasAttribute("disabled") ||
      nextButton.classList.contains("disabled") ||
      Boolean(nextButton.getAttribute("style")?.includes("display: none")) ||
      Boolean(nextButton.getAttribute("style")?.includes("visibility: hidden"));

    return !isDisabled;
  }

  // Try alternative approach - look for text "Siguiente"
  const links = document.querySelectorAll("a, input[type='submit']");
  for (const link of links) {
    const text = cleanText(link.textContent || (link.getAttribute("value") ?? ""));
    if (text.toLowerCase().includes("siguiente")) {
      return true;
    }
  }

  return false;
}

/**
 * Extract pagination info from page
 */
export function extractPaginationInfo(html: string): { currentPage: number; totalPages: number } {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Look for pagination text like "Página 1 de 5"
  const pageText = document.body.textContent || "";
  const pageMatch = /[Pp]ágina\s+(\d+)\s+de\s+(\d+)/.exec(pageText);

  if (pageMatch?.[1] && pageMatch[2]) {
    return {
      currentPage: Number.parseInt(pageMatch[1], 10),
      totalPages: Number.parseInt(pageMatch[2], 10),
    };
  }

  // Try alternative patterns
  const altMatch = /(\d+)\s*\/\s*(\d+)\s*[Pp]ág/.exec(pageText);
  if (altMatch?.[1] && altMatch[2]) {
    return {
      currentPage: Number.parseInt(altMatch[1], 10),
      totalPages: Number.parseInt(altMatch[2], 10),
    };
  }

  return { currentPage: 1, totalPages: 1 };
}

/**
 * Deduplicate prices by date (keep first occurrence)
 */
export function deduplicatePrices(prices: BmeDailyPrice[]): BmeDailyPrice[] {
  const seen = new Set<string>();
  const unique: BmeDailyPrice[] = [];

  for (const price of prices) {
    if (!seen.has(price.date)) {
      seen.add(price.date);
      unique.push(price);
    }
  }

  return unique;
}

/**
 * Sort prices by date (newest first)
 */
export function sortPricesByDate(prices: BmeDailyPrice[], ascending = false): BmeDailyPrice[] {
  return [...prices].sort((a, b) => {
    const comparison = a.date.localeCompare(b.date);
    return ascending ? comparison : -comparison;
  });
}
