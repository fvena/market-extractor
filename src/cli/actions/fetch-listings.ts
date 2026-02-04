import type {
  ActionResult,
  MarketId,
  MarketOperationResult,
  ProductListing,
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
import { saveProductsListings } from "../../helpers/storage";
import { fetchMarketListing } from "../../listings/listings";
import { closeBrowser } from "../../helpers/browser";
import { displayIncidents } from "../utils/incidents";

/**
 * Fetch a single market's listings (for parallel execution)
 * Updates the multi-spinner with progress
 */
async function fetchSingleMarketListings(
  marketId: MarketId,
  tasks: Tasks,
): Promise<MarketOperationResult<ProductListing>> {
  const market = MARKETS[marketId];
  const timer = createTimer();

  // Mark as running
  const task = createTask(tasks, `Fetching listings for ${market.name}`);

  try {
    // Create progress callback that updates this market's spinner item
    const onProgress: ProgressCallback = (message) => {
      updateTask(task, `Fetching listings for ${market.name}: ${message}`);
    };

    // Fetch listings
    const result = await fetchMarketListing(marketId, onProgress);

    const totalProducts = result.products.length;
    const totalErrors = result.productsWithError.length;
    const totalWarnings = result.productsWithMissingFields.length;

    // Save processed products
    const path = await saveProductsListings(market.slug, result.products);

    // Update spinner item with final status
    const resultMessage = `${String(totalProducts)} products - Saved to ${path}`;

    if (totalErrors > 0) {
      failTask(task, `Fetching listings for ${market.name}: ${resultMessage}`);
    } else if (totalWarnings > 0) {
      warnTask(task, `Fetching listings for ${market.name}: ${resultMessage}`);
    } else {
      succeedTask(task, `Fetching listings for ${market.name}: ${resultMessage}`);
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
    failTask(task, `Fetching listings for ${market.name}: ${errorMessage}`);

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

/**
 * Fetch listings action
 * Downloads product listings from selected markets in parallel
 * @param selectedMarkets - Array of market IDs to fetch
 */
export async function fetchMarketsListings(
  selectedMarkets: MarketId[],
): Promise<ActionResult<ProductListing>> {
  const totalTimer = createTimer();

  // Create tasks container
  const tasks = createTasks("Fetching listings");

  // Create task functions for each market
  const tasksMarkets = selectedMarkets.map(
    (marketId) => () => fetchSingleMarketListings(marketId, tasks),
  );

  // Fetch markets with optional concurrency limit
  const results = await Promise.all(tasksMarkets.map((task) => task()));

  // Stop spinner animation
  succeedTasks(tasks, "Fetching listings completed");

  // Display accumulated incidents at the end
  displayIncidents(results);

  // Close the browser when done with all browser-based markets
  await closeBrowser();

  return {
    action: "Fetch Listings",
    results,
    totalDuration: totalTimer.stop(),
  };
}
