import type {
  ActionResult,
  MarketId,
  MarketOperationResult,
  ProcessedProduct,
  ProductDetails,
  ProductListing,
} from "../../types/types";
import { createTimer } from "../utils/timer";
import { createSpinner, succeedSpinner, updateSpinner } from "../utils/spinner";
import { MARKETS } from "../../markets";

/**
 * Run all action
 * Executes complete pipeline: listings → details → report
 */
export function runAll(
  selectedMarkets: MarketId[],
): ActionResult<ProcessedProduct | ProductDetails | ProductListing> {
  const results: MarketOperationResult<ProcessedProduct | ProductDetails | ProductListing>[] = [];
  const totalTimer = createTimer();
  const spinner = createSpinner("Running all actions");

  updateSpinner(spinner, "Phase 1: Fetching listings");

  // Phase 1: Fetch listings
  for (const marketId of selectedMarkets) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- market is used for logging
    const market = MARKETS[marketId];

    // TODO: Fetch listings
  }

  updateSpinner(spinner, "Phase 2: Fetching details");

  // Phase 2: Fetch details
  for (const marketId of selectedMarkets) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- market is used for logging
    const market = MARKETS[marketId];

    // TODO: Fetch details
  }

  updateSpinner(spinner, "Phase 3: Generating report");

  // Phase 3: Generate report
  // TODO: Generate report

  succeedSpinner(spinner, "All actions completed successfully");

  return {
    action: "Run All",
    results,
    totalDuration: totalTimer.stop(),
  };
}
