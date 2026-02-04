import type { Page } from "playwright";
import type {
  BatchProductResult,
  BmeAlternativesListing,
  BmeContinuoListing,
  ProductMissingFields,
  ProgressCallback,
} from "../../types/types";
import { initBrowser, navigateTo } from "../../helpers/browser";
import { parseAlternativesTable, parseContinuoTable } from "../parsers/bme-listings-parsers";
import { getMissingRequiredFields } from "../../helpers/missing-fields";

// ============================================
// HELPER FUNCTIONS
// ============================================
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

// ============================================
// BME FETCH FUNCTIONS
// ============================================
/**
 * Fetch BME Alternatives (Growth/ScaleUp) listings
 */
export async function fetchBmeAlternativesListings(
  url: string,
  baseUrl: string,
  requiredFields: string[],
): Promise<BatchProductResult<BmeAlternativesListing>> {
  let page: Page | undefined;

  try {
    // Initialize browser
    page = await initBrowser();

    // Navigate to the page
    await navigateTo(page, url);
    await acceptCookies(page);
    await showAllButton(page);

    // Parsing table...
    const products = await parseAlternativesTable(page, baseUrl);

    const productsWithMissingFields: ProductMissingFields[] = products.flatMap((product) => {
      const missingFields = getMissingRequiredFields(product, requiredFields);
      if (missingFields.length > 0) {
        return [{ missingFields, name: product.name, ticker: "" }];
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

/**
 * Fetch BME Continuo listings (paginated)
 */
export async function fetchBmeContinuoListings(
  url: string,
  baseUrl: string,
  requiredFields: string[],
  onProgress: ProgressCallback,
): Promise<BatchProductResult<BmeContinuoListing>> {
  const products: BmeContinuoListing[] = [];
  let page: Page | undefined;

  try {
    // Initialize browser
    page = await initBrowser();

    // Navigate to the page
    await navigateTo(page, url);
    await acceptCookies(page);

    let pageNumber = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      onProgress(`parsing page ${String(pageNumber)}`);

      const pageData = await parseContinuoTable(page, baseUrl);
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
        return [{ missingFields, name: product.name }];
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
