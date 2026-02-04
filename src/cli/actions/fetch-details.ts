import type {
  ActionResult,
  MarketId,
  MarketOperationResult,
  ProductDetails,
  ProgressCallback,
} from "../../types/types";
import type { Tasks } from "../utils/tasks";
import { createTimer } from "../utils/timer";
import {
  createTask,
  createTasks,
  failTask,
  succeedTask,
  succeedTasks,
  updateTask,
  warnTask,
} from "../utils/tasks";
import { MARKETS } from "../../markets";
import { saveCorporateActions, saveProductsDetails } from "../../helpers/storage";
import { fetchMarketDetails } from "../../details/details";
import { closeBrowser } from "../../helpers/browser";
import { buildFinalMessage, displayIncidents } from "../utils/incidents";
import { fetchBmeAlternativesCorporateActions } from "../../details/fetchers/bme-corporate-actions-fetcher";

// ============================================
// SINGLE MARKET FETCH
// ============================================

/**
 * Fetch corporate actions for BME alternatives markets (for parallel execution)
 */
async function fetchBmeAlternativesCorporateActionsTask(
  marketId: MarketId,
  tasks: Tasks,
): Promise<void> {
  const market = MARKETS[marketId];
  const timer = createTimer();

  // Check if this market has corporate actions URL
  if (!market.urls.corporateActions) {
    return;
  }

  // Mark as running
  const task = createTask(
    tasks,
    "Fetching corporate actions",
    `${market.name} (Corporate Actions)`,
  );

  try {
    const result = await fetchBmeAlternativesCorporateActions(market.urls.corporateActions);

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.data) {
      // Save corporate actions to file
      const path = await saveCorporateActions(market.slug, result.data);
      succeedTask(task, `Saved corporate actions to ${path}`);
    } else {
      throw new Error("No data returned");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    failTask(task, `Failed to fetch corporate actions: ${errorMessage}`);
  } finally {
    timer.stop();
  }
}

/**
 * Fetch details for a single market (for parallel execution)
 * Updates the multi-spinner with progress
 */
async function fetchSingleMarketDetails(
  marketId: MarketId,
  isTestMode: boolean,
  tasks: Tasks,
): Promise<MarketOperationResult<ProductDetails>> {
  const market = MARKETS[marketId];
  const timer = createTimer();

  // Mark as running
  const task = createTask(tasks, "Fetching details", market.name);

  try {
    const callback: ProgressCallback = (message, current, total) => {
      updateTask(task, message, current, total);
    };

    // Fetch details
    const result = await fetchMarketDetails(marketId, isTestMode, callback);

    const totalProducts = result.products.length;
    const totalErrors = result.productsWithError.length;
    const totalWarnings = result.productsWithMissingFields.length;

    // Save details to file
    const path = await saveProductsDetails(market.slug, result.products);

    // Update spinner item with final status
    const finalMessage = buildFinalMessage(totalProducts, totalErrors, totalWarnings, path);

    if (totalErrors > 0) {
      failTask(task, finalMessage);
    } else if (totalWarnings > 0) {
      warnTask(task, finalMessage);
    } else {
      succeedTask(task, finalMessage);
    }

    return {
      duration: timer.stop(),
      errors: result.productsWithError,
      marketId: market.id,
      marketName: market.name,
      products: result.products,
      warnings: result.productsWithMissingFields,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Mark as failed
    failTask(task, errorMessage);

    return {
      duration: timer.stop(),
      errors: [{ error: errorMessage, name: market.name }],
      marketId: market.id,
      marketName: market.name,
      products: [],
      warnings: [],
    };
  }
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Check if a market is a BME alternatives market that supports corporate actions
 */
function isBmeAlternativesMarket(marketId: MarketId): boolean {
  const market = MARKETS[marketId];
  return (
    (marketId === "bme-growth" || marketId === "bme-scaleup") &&
    Boolean(market.urls.corporateActions)
  );
}

/**
 * Fetch details action
 * Downloads detailed product data from selected markets in parallel
 * Also fetches corporate actions for BME alternatives markets in parallel
 * @param selectedMarkets - Array of market IDs to fetch
 * @param isTestMode - Whether to limit products (for testing)
 */
export async function fetchMarketsDetails(
  selectedMarkets: MarketId[],
  isTestMode: boolean,
): Promise<ActionResult<ProductDetails>> {
  const totalTimer = createTimer();

  // Create tasks container
  const tasks = createTasks("Fetching details");

  // Create tasks for each market details
  const tasksMarkets = selectedMarkets.map(
    (marketId) => () => fetchSingleMarketDetails(marketId, isTestMode, tasks),
  );

  // Create tasks for corporate actions of BME alternatives markets
  const tasksCorporateActions = selectedMarkets
    .filter((marketId) => {
      return isBmeAlternativesMarket(marketId);
    })
    .map((marketId) => () => fetchBmeAlternativesCorporateActionsTask(marketId, tasks));

  // Fetch markets and corporate actions in parallel
  const [results] = await Promise.all([
    Promise.all(tasksMarkets.map((task) => task())),
    Promise.all(tasksCorporateActions.map((task) => task())),
  ]);

  // Stop spinner animation
  succeedTasks(tasks, "Fetching details completed");

  // Display accumulated incidents at the end
  displayIncidents(results);

  // Close the browser when done with all browser-based markets
  await closeBrowser();

  return {
    action: "Fetch Details",
    results,
    totalDuration: totalTimer.stop(),
  };
}
