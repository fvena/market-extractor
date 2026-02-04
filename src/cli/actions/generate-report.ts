import type {
  ActionResult,
  MarketId,
  MarketOperationResult,
  ProcessedProduct,
} from "../../types/types";
import type { Tasks } from "../utils/tasks";
import { createTimer } from "../utils/timer";
import {
  createTask,
  createTasks,
  failTask,
  succeedTask,
  succeedTasks,
  warnTask,
} from "../utils/tasks";
import { marketIds, MARKETS } from "../../markets";
import { saveProductsProcessed } from "../../helpers/storage";
import { processMarkets } from "../../processing/processing";
import { buildFinalMessage, displayIncidents } from "../utils/incidents";

// ============================================
// SINGLE MARKET PROCESSING
// ============================================

/**
 * Process a single market (for parallel execution)
 * Updates the multi-spinner with progress
 */
async function processSingleMarket(
  marketId: MarketId,
  tasks: Tasks,
): Promise<MarketOperationResult<ProcessedProduct>> {
  const market = MARKETS[marketId];
  const timer = createTimer();

  // Mark as running
  const task = createTask(tasks, `Processing ${market.name}`);

  try {
    // Process market
    const result = await processMarkets(marketId);

    const totalProducts = result.products.length;
    const totalErrors = result.productsWithError.length;
    const totalWarnings = result.productsWithMissingFields.length;

    // Save processed products
    const path = await saveProductsProcessed(market.slug, result.products);

    // Update spinner item with final status
    const finalMessage = buildFinalMessage(totalProducts, totalErrors, totalWarnings, path);

    if (totalErrors > 0) {
      failTask(task, `Processing ${market.name}: ${finalMessage}`);
    } else if (totalWarnings > 0) {
      warnTask(task, `Processing ${market.name}: ${finalMessage}`);
    } else {
      succeedTask(task, `Processing ${market.name}: ${finalMessage}`);
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
    failTask(task, `Processing ${market.name}: ${errorMessage}`);

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
 * Generate report action
 * Processes details and creates normalized product files in parallel
 * @param options - Optional configuration (concurrency limit)
 */
export async function generateMarketsReport(): Promise<ActionResult<ProcessedProduct>> {
  const totalTimer = createTimer();

  // Create tasks container
  const tasks = createTasks("Generating report");

  // Create task functions for each market
  const tasksMarkets = marketIds.map((marketId) => () => processSingleMarket(marketId, tasks));

  // Process markets with optional concurrency limit
  const results = await Promise.all(tasksMarkets.map((task) => task()));

  // Stop spinner animation
  succeedTasks(tasks, "Generating report completed");

  // Display accumulated incidents at the end
  displayIncidents(results);

  return {
    action: "Generate Report",
    results,
    totalDuration: totalTimer.stop(),
  };
}
