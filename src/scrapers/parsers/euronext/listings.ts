import type { Locator, Page } from "playwright";
import type { EuronextListingItem } from "../../../markets/euronext/types";

/**
 * Extract text content from a locator, returns empty string if not found
 */
async function getTextContent(locator: Locator): Promise<string> {
  const text = await locator.textContent();
  return text?.trim() ?? "";
}

/**
 * Parse Euronext table rows using Playwright locators
 * Column 0: Checkbox (skip)
 * Column 1: Name + link
 * Column 2: ISIN
 * Column 3: Ticker
 * Column 4: Market
 */
export async function parseEuronextTable(
  page: Page,
  baseUrl: string,
): Promise<EuronextListingItem[]> {
  const items: EuronextListingItem[] = [];

  const table = page.locator("#stocks-data-table-es");
  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();

  for (let index = 0; index < rowCount; index++) {
    const row = rows.nth(index);
    const cells = row.locator("td");
    const cellCount = await cells.count();

    if (cellCount < 5) continue;

    // Column 1 contains the link
    const nameCell = cells.nth(1);
    const isinCell = cells.nth(2);
    const tickerCell = cells.nth(3);
    const marketCell = cells.nth(4);

    const link = nameCell.locator("a").first();
    if ((await link.count()) === 0) continue;

    const href = await link.getAttribute("href");
    const name = await getTextContent(link);
    const isin = await getTextContent(isinCell);
    const ticker = await getTextContent(tickerCell);
    const market = await getTextContent(marketCell);

    if (href && name) {
      const url = href.startsWith("http") ? href : baseUrl + href;
      items.push({ isin, market, name, ticker, url });
    }
  }

  return items;
}
