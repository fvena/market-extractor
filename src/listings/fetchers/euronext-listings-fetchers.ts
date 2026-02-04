import type { Page } from "playwright";
import type {
  BatchProductResult,
  EuronextListing,
  ProductMissingFields,
  ProgressCallback,
} from "../../types/types";
import { initBrowser, navigateTo } from "../../helpers/browser";
import { parseEuronextTable } from "../parsers/euronext-listings-parsers";
import { getMissingRequiredFields } from "../../helpers/missing-fields";

// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Accepts cookies by clicking the consent button.
 */
async function acceptCookies(page: Page): Promise<void> {
  const cookieButton = page.getByRole("button", { name: "I Accept" });
  if ((await cookieButton.count()) === 0) return;
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

// ============================================
// EURONEXT FETCH FUNCTIONS
// ============================================
/**
 * Fetch Euronext listings (works for Access, Expand, Growth, Regulated)
 */
export async function fetchEuronextListings(
  url: string,
  baseUrl: string,
  requiredFields: string[],
  onProgress: ProgressCallback,
): Promise<BatchProductResult<EuronextListing>> {
  let page: Page | undefined;
  const products: EuronextListing[] = [];

  try {
    page = await initBrowser();
    await navigateTo(page, url);
    await acceptCookies(page);

    let pageNumber = 1;
    let hasNextPage = true;

    // Fetch all pages
    while (hasNextPage) {
      onProgress(`parsing page ${String(pageNumber)}`);

      const pageData = await parseEuronextTable(page, baseUrl);
      products.push(...pageData);

      hasNextPage = await isNextButtonEnabled(page);
      if (hasNextPage) {
        await clickNextButton(page);
        pageNumber++;
      }
    }

    const productsWithMissingFields: ProductMissingFields[] = products.flatMap((product) => {
      const missingFields = getMissingRequiredFields(product, requiredFields);
      if (missingFields.length > 0) {
        return [{ missingFields, name: product.name, ticker: product.ticker }];
      }
      return [];
    });

    await page.close();

    return { products, productsWithError: [], productsWithMissingFields };
  } catch (error) {
    throw new Error(
      `Error fetching listings: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
