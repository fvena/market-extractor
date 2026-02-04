import type { Locator, Page } from "playwright";
import type { BmeAlternativesListing, BmeContinuoListing } from "../../types/types";

/**
 * Extract text content from a locator, returns empty string if not found
 */
async function getTextContent(locator: Locator): Promise<string> {
  const text = await locator.textContent();
  return text?.trim() ?? "";
}

/**
 * Extract ISIN from BME Continuo URL
 * URL format: .../Ficha/Company-Name-ES0125220311 or .../Ficha/ES0125220311
 */
function extractIsinFromUrl(url: string): string {
  // ISIN pattern: 2 letters + 10 alphanumeric characters at the end of the URL
  const match = /([A-Z]{2}[\dA-Z]{10})$/.exec(url);
  return match?.[1] ?? "";
}

/**
 * Parse BME Alternatives Markets (ScaleUp & Growth) table rows
 * Uses Playwright locators for reliable element selection
 */
export async function parseAlternativesTable(
  page: Page,
  baseUrl: string,
): Promise<BmeAlternativesListing[]> {
  const items: BmeAlternativesListing[] = [];

  // Get the table by ID and all rows from tbody
  const table = page.locator("#Contenido_Tbl");
  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();

  for (let index = 0; index < rowCount; index++) {
    const row = rows.nth(index);
    const cells = row.locator("td");
    const cellCount = await cells.count();

    // Skip rows with insufficient cells
    if (cellCount < 3) continue;

    // First cell contains the link
    const firstCell = cells.nth(0);
    const link = firstCell.locator("a").first();

    // Skip if no link found
    if ((await link.count()) === 0) continue;

    const name = await getTextContent(link);
    const detailUrl = await link.getAttribute("href");

    // BME Growth has 6+ columns (name, tradingType, capitalization, volume, sector, web)
    // BME ScaleUp has 4 columns (name, capitalization, sector, web)
    const sectorCellIndex = cellCount >= 6 ? 4 : 2;
    const sector = await getTextContent(cells.nth(sectorCellIndex));

    // Skip invalid rows but continue processing
    if (!name || !detailUrl) continue;

    const url = detailUrl.startsWith("http") ? detailUrl : baseUrl + detailUrl;
    items.push({ name, sector, url });
  }

  return items;
}

/**
 * Parse BME Continuo table rows using Playwright locators
 * Column 0: Company link (href + text)
 * Column 1: Sector - Subsector (separated by " - ")
 */
export async function parseContinuoTable(
  page: Page,
  baseUrl: string,
): Promise<BmeContinuoListing[]> {
  const items: BmeContinuoListing[] = [];

  const table = page.locator("table");
  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();

  for (let index = 0; index < rowCount; index++) {
    const row = rows.nth(index);
    const cells = row.locator("td");
    const cellCount = await cells.count();

    if (cellCount < 2) continue;

    const firstCell = cells.nth(0);
    const sectorCell = cells.nth(1);
    const link = firstCell.locator("a").first();

    if ((await link.count()) === 0) continue;

    const href = await link.getAttribute("href");
    const name = await getTextContent(link);
    const sectorSubsector = await getTextContent(sectorCell);
    const [sector = "", subsector = ""] = sectorSubsector.split(" - ");

    if (href && name) {
      const url = href.startsWith("http") ? href : baseUrl + href;
      const isin = extractIsinFromUrl(url);
      items.push({
        isin,
        name,
        sector: sector.trim(),
        subsector: subsector.trim(),
        url,
      });
    }
  }

  return items;
}
