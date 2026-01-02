import type { MarketOperationResult, ProcessedProduct } from "../../markets/types";
import type { ActionResult } from "./index";
import { selectMarkets, selectTestMode } from "../prompts";
import { createTimer } from "../utils/timer";
import { createSpinner, succeedSpinner, updateSpinner, warnSpinner } from "../utils/progress";
import { successIndent, warningIndent } from "../utils/logger";
import { getMarket } from "../../markets/registry";
import { hasListings } from "../../storage";
import { config } from "../../config";
import { REQUIRED_FIELDS } from "../../markets/types";

/**
 * Simulate fetching delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate mock product data for simulation
 */
function generateMockProduct(index: number): Partial<ProcessedProduct> {
  const hasAllFields = Math.random() > 0.3;
  const product: Partial<ProcessedProduct> = {
    currency: "EUR",
    id: `PROD-${String(index)}`,
    market: "bme-growth",
    name: `Mock Company ${String(index)}`,
  };

  if (hasAllFields) {
    product.ticker = `MCK${String(index)}`;
    product.isin = `ES0000000${index.toString().padStart(3, "0")}`;
  }

  return product;
}

/**
 * Check which required fields are missing from a product
 */
function getMissingFields(product: Partial<ProcessedProduct>): string[] {
  return REQUIRED_FIELDS.filter((field) => !product[field]);
}

/**
 * Fetch details action
 * Downloads detailed product data from selected markets
 */
export async function fetchDetails(): Promise<ActionResult> {
  const selectedMarkets = await selectMarkets();

  if (selectedMarkets.length === 0) {
    return {
      action: "Fetch Details",
      results: [],
      totalDuration: 0,
    };
  }

  const isTestMode = await selectTestMode();

  const results: MarketOperationResult[] = [];
  const totalTimer = createTimer();

  for (const marketId of selectedMarkets) {
    const market = getMarket(marketId);
    if (!market) continue;

    const timer = createTimer();

    // Check if listings exist
    const listingsExist = await hasListings(market.slug);

    if (!listingsExist) {
      const spinner = createSpinner(`${market.name}...`);
      await delay(100);
      warnSpinner(spinner, `${market.name} - No listings found (run Fetch Listings first)`);
      results.push({
        duration: timer.stop(),
        marketId,
        success: false,
        warnings: ["No listings found"],
      });
      continue;
    }

    if (!market.implemented.details) {
      const spinner = createSpinner(`${market.name}...`);
      await delay(100);
      warnSpinner(spinner, `${market.name} - Not implemented`);
      results.push({
        duration: timer.stop(),
        marketId,
        success: false,
        warnings: ["Not implemented"],
      });
      continue;
    }

    // Simulate fetching details for each product
    const productCount = isTestMode ? config.testModeLimit : Math.floor(20 + Math.random() * 30);
    const warnings: string[] = [];
    let warningCount = 0;

    const spinner = createSpinner(`${market.name} (0/${String(productCount)})...`);

    for (let index = 1; index <= productCount; index++) {
      updateSpinner(
        spinner,
        `${market.name} (${String(index)}/${String(productCount)}) - Fetching...`,
      );
      await delay(50 + Math.random() * 100);

      const mockProduct = generateMockProduct(index);
      const missingFields = getMissingFields(mockProduct);

      // Stop spinner temporarily to show result
      spinner.stop();

      if (missingFields.length > 0) {
        warningIndent(
          `${mockProduct.name ?? "Unknown product"} (missing: ${missingFields.join(", ")})`,
        );
        warningCount++;
      } else {
        successIndent(mockProduct.name ?? "Unknown product");
      }

      // Restart spinner for next item
      if (index < productCount) {
        spinner.start();
      }
    }

    if (warningCount > 0) {
      warnings.push(`${String(warningCount)} products with missing fields`);
    }

    const duration = timer.stop();

    // Show final result
    const finalSpinner = createSpinner("");
    if (warningCount > 0) {
      warnSpinner(
        finalSpinner,
        `${market.name} - ${String(productCount)} products (${String(warningCount)} warnings)`,
      );
    } else {
      succeedSpinner(finalSpinner, `${market.name} - ${String(productCount)} products`);
    }

    results.push({
      count: productCount,
      duration,
      marketId,
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  }

  return {
    action: "Fetch Details",
    results,
    totalDuration: totalTimer.stop(),
  };
}
