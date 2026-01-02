import type { Page } from "playwright";
import type { EuronextListingItem } from "../../../markets/euronext/types";
import type { ProgressCallback } from "../../../markets/types";
import { initBrowser, navigateTo } from "../../clients/browser";
import { parseEuronextTable } from "../../parsers/euronext/listings";

/**
 * Result of a Euronext scraping operation
 */
export interface EuronextScrapingResult {
  data: EuronextListingItem[];
  error?: string;
  warnings: string[];
}

/**
   * Accepts cookies by clicking the consent button.
   */
async function acceptCookies(page: Page): Promise<void> {
  const cookieButton = page.getByRole("button", { name: "I Accept" });
  if ((await cookieButton.count()) === 0) return
  await cookieButton.click({ timeout: 5000 });
}

/**
 * Check if the next button is enabled (Euronext pagination)
 */
async function isNextButtonEnabled(page: Page): Promise<boolean> {
  const button = page.locator("#stocks-data-table-es_next");
  if ((await button.count()) === 0) return false;
  const ariaDisabled = await button.getAttribute("aria-disabled");
  if (!ariaDisabled) return true; // If aria-disabled is not set, the button is enabled
  return ariaDisabled === "false";
}

/**
 * Click the next button (Euronext pagination)
 */
async function clickNextButton(page: Page): Promise<void> {
  const button = page.locator("#stocks-data-table-es_next");
  await button.click();
  // Wait for table data to update
  await page.waitForTimeout(1000);
  await page.waitForSelector("table#stocks-data-table-es tbody tr", { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
}

/**
 * Fetch Euronext listings (works for Access, Expand, Growth, Regulated)
 */
export async function fetchEuronextListings(
  url: string,
  baseUrl: string,
  onProgress?: ProgressCallback,
): Promise<EuronextScrapingResult> {
  const warnings: string[] = [];
  let page: Page | undefined;
  const allData: EuronextListingItem[] = [];

  try {
    page = await initBrowser();
    await navigateTo(page, url);
    await acceptCookies(page);

    let pageNumber = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      onProgress?.(pageNumber, pageNumber + 1, `Page ${String(pageNumber)}: Parsing...`);

      const pageData = await parseEuronextTable(page, baseUrl);
      allData.push(...pageData);

      onProgress?.(
        pageNumber,
        pageNumber + 1,
        `Page ${String(pageNumber)}: ${String(pageData.length)} items`,
      );

      hasNextPage = await isNextButtonEnabled(page);
      if (hasNextPage) {
        await clickNextButton(page);
        pageNumber++;
      }
    }

    onProgress?.(pageNumber, pageNumber, `Complete: ${String(allData.length)} total items`);

    return { data: allData, warnings };
  } catch (error) {
    return {
      data: allData,
      error: error instanceof Error ? error.message : "Unknown error",
      warnings,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}
