import type { MarketId, MarketOperationResult, ProgressCallback } from "../../markets/types";
import type { ActionResult } from "./index";
import colors from "yoctocolors";
import { selectMarkets } from "../prompts";
import { createTimer } from "../utils/timer";
import {
  createSpinner,
  failSpinner,
  succeedSpinner,
  updateSpinner,
  warnSpinner,
} from "../utils/progress";
import { getMarket } from "../../markets/registry";
import { saveListings } from "../../storage";
import {
  closeBrowser,
  fetchBmeAlternativesListings,
  fetchBmeContinuoListings,
  fetchEuronextListings,
  fetchPortfolioListings,
} from "../../scrapers";

/**
 * Fetch listings for a specific market
 */
async function fetchMarketListings(
  marketId: MarketId,
  url: string,
  baseUrl: string,
  onProgress: ProgressCallback,
): Promise<{ data: unknown[]; error?: string; warnings: string[] }> {
  switch (marketId) {
    case "bme-continuo": {
      return fetchBmeContinuoListings(url, baseUrl, onProgress);
    }
    case "bme-growth":
    case "bme-scaleup": {
      return fetchBmeAlternativesListings(url, baseUrl, onProgress);
    }
    case "euronext-access":
    case "euronext-expand":
    case "euronext-growth":
    case "euronext-regulated": {
      return fetchEuronextListings(url, baseUrl, onProgress);
    }
    case "portfolio": {
      return fetchPortfolioListings(url, onProgress);
    }
    default: {
      return { data: [], error: "Unknown market", warnings: [] };
    }
  }
}

/**
 * Fetch listings action
 * Downloads product listings from selected markets
 */
export async function fetchListings(): Promise<ActionResult> {
  const selectedMarkets = await selectMarkets();

  if (selectedMarkets.length === 0) {
    return {
      action: "Fetch Listings",
      results: [],
      totalDuration: 0,
    };
  }

  const results: MarketOperationResult[] = [];
  const totalTimer = createTimer();

  for (const marketId of selectedMarkets) {
    const market = getMarket(marketId);
    if (!market) continue;

    const timer = createTimer();
    const spinner = createSpinner(`Fetching listings from ${market.name}...`);

    if (!market.implemented.listings) {
      warnSpinner(spinner, `${market.name} - Not implemented`);
      results.push({
        duration: timer.stop(),
        marketId,
        success: false,
        warnings: ["Not implemented"],
      });
      continue;
    }

    try {
      // Create progress callback that updates the spinner
      const onProgress: ProgressCallback = (current, total, message) => {
        updateSpinner(spinner, `Fetching listings from ${market.name}: ${colors.dim(message)}`);
      };

      const result = await fetchMarketListings(
        marketId,
        market.urls.listings,
        market.urls.base,
        onProgress,
      );

      const duration = timer.stop();

      if (result.error) {
        failSpinner(spinner, `Error fetching listings from ${market.name}: ${result.error}`);
        results.push({
          duration,
          error: result.error,
          marketId,
          success: false,
          warnings: result.warnings,
        });
        continue;
      }

      // Save the listings to JSON file
      await saveListings(market.slug, result.data);

      if (result.warnings.length > 0) {
        warnSpinner(
          spinner,
          `Fetched listings from ${market.name} ${colors.dim(`- ${String(result.data.length)} products (${String(result.warnings.length)} warnings)`)}`,
        );
      } else {
        succeedSpinner(
          spinner,
          `Fetched listings from ${market.name} ${colors.dim(`${String(result.data.length)} products`)}`,
        );
      }

      results.push({
        count: result.data.length,
        duration,
        marketId,
        success: true,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
      });
    } catch (error) {
      const duration = timer.stop();
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      failSpinner(spinner, `${market.name} - Error: ${errorMessage}`);
      results.push({
        duration,
        error: errorMessage,
        marketId,
        success: false,
      });
    }
  }

  // Close the browser when done with all browser-based markets
  await closeBrowser();

  return {
    action: "Fetch Listings",
    results,
    totalDuration: totalTimer.stop(),
  };
}
