import type { Page } from "playwright";
import type { BmeAlternativesListingItem, BmeContinuoListingItem } from "../../../markets/bme/types";
import type { ProgressCallback } from "../../../markets/types";
import { initBrowser, navigateTo } from "../../clients/browser";
import { parseAlternativesTable, parseContinuoTable } from "../../parsers/bme/listings";

/**
 * Result of a BME scraping operation
 */
export interface BmeScrapingResult<T> {
  data: T[];
  error?: string;
  warnings: string[];
}

/**
 * Accepts cookies by clicking the consent button.
 */
async function acceptCookies(page: Page): Promise<void> {
  const cookieButton = page.getByRole("button", { name: "Aceptar todas las cookies" });
  if ((await cookieButton.count()) === 0) return;
  await cookieButton.click({ timeout: 5000 });
}

/**
 * Show all rows in the table
 */
async function showAllButton(page: Page): Promise<void> {
  const showAllButton = page.getByRole("link", { name: "Mostrar todo" });
  if ((await showAllButton.count()) === 0) return;
  await showAllButton.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

/**
 * Check if the next button is enabled (BME Continuo pagination)
 */
async function isNextButtonEnabled(page: Page): Promise<boolean> {
  const button = page.locator("a:has(.glyphicon-forward)");
  if ((await button.count()) === 0) return false;
  const ariaDisabled = await button.getAttribute("aria-disabled");
  return ariaDisabled === "false";
}

/**
 * Click the next button (BME Continuo pagination)
 */
async function clickNextButton(page: Page): Promise<void> {
  const button = page.locator("a:has(.glyphicon-forward)");
  await button.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

/**
 * Fetch BME Alternatives (Growth/ScaleUp) listings
 */
export async function fetchBmeAlternativesListings(
  url: string,
  baseUrl: string,
  onProgress?: ProgressCallback,
): Promise<BmeScrapingResult<BmeAlternativesListingItem>> {
  const warnings: string[] = [];
  let page: Page | undefined;

  try {
    page = await initBrowser();
    await navigateTo(page, url);

    // Loading page...
    onProgress?.(0, 1, "Loading page...");
    await acceptCookies(page);
    await showAllButton(page);

    // Parsing table...
    onProgress?.(1, 2, "Parsing table...");
    const data = await parseAlternativesTable(page, baseUrl);

    // Found items...
    onProgress?.(2, 2, `Found ${String(data.length)} items`);

    return { data, warnings };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
      warnings,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Fetch BME Continuo listings (paginated)
 */
export async function fetchBmeContinuoListings(
  url: string,
  baseUrl: string,
  onProgress?: ProgressCallback,
): Promise<BmeScrapingResult<BmeContinuoListingItem>> {
  const allData: BmeContinuoListingItem[] = [];
  const warnings: string[] = [];
  let page: Page | undefined;

  try {
    page = await initBrowser();
    await navigateTo(page, url);
    await acceptCookies(page);

    let pageNumber = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      onProgress?.(pageNumber, pageNumber + 1, `Page ${String(pageNumber)}: Parsing...`);

      const pageData = await parseContinuoTable(page, baseUrl);
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
