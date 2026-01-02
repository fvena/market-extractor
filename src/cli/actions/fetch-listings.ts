import type { MarketOperationResult } from "../../markets/types";
import type { ActionResult } from "./index";
import { selectMarkets } from "../prompts";
import { createTimer } from "../utils/timer";
import { createSpinner, succeedSpinner, warnSpinner } from "../utils/progress";
import { getMarket } from "../../markets/registry";

/**
 * Simulate fetching delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    // Simulate fetch delay
    await delay(200 + Math.random() * 300);

    const duration = timer.stop();

    if (market.implemented.listings) {
      // Stub: simulate successful fetch with mock count
      const mockCount = Math.floor(50 + Math.random() * 200);
      succeedSpinner(spinner, `${market.name} - ${String(mockCount)} products`);
      results.push({
        count: mockCount,
        duration,
        marketId,
        success: true,
      });
    } else {
      warnSpinner(spinner, `${market.name} - Not implemented`);
      results.push({
        duration,
        marketId,
        success: false,
        warnings: ["Not implemented"],
      });
    }
  }

  return {
    action: "Fetch Listings",
    results,
    totalDuration: totalTimer.stop(),
  };
}
