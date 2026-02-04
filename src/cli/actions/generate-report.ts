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
import {
  loadProductsProcessed,
  saveMarketStats,
  saveProductsProcessed,
} from "../../helpers/storage";
import { processMarkets } from "../../processing/processing";
import { generateMarketStats } from "../../processing/market-stats";
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
// SINGLE MARKET STATS GENERATION
// ============================================

/**
 * Generate stats for a single market
 */
async function generateSingleMarketStats(marketId: MarketId, tasks: Tasks): Promise<void> {
  const market = MARKETS[marketId];
  const task = createTask(tasks, "Generating stats", market.name);

  try {
    // Load processed products
    const products = await loadProductsProcessed(market.slug);

    if (!products || products.length === 0) {
      failTask(task, "No processed products found");
      return;
    }

    // Generate and save market stats
    const stats = generateMarketStats(market, products);
    const path = await saveMarketStats(market.slug, stats);

    const summary = `${String(stats.productCount)} products, ${(stats.totalMarketCap / 1e9).toFixed(1)}B EUR → ${path}`;
    succeedTask(task, summary);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    failTask(task, errorMessage);
  }
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Generate report action
 * Processes already fetched details and generates market stats for all markets
 */
export async function generateMarketsReport(): Promise<ActionResult<ProcessedProduct>> {
  const totalTimer = createTimer();

  // ============================================
  // PHASE 1: PROCESS DETAILS
  // ============================================
  const processTasks = createTasks("Processing markets");

  // Create task functions for all markets
  const tasksMarkets = marketIds.map(
    (marketId) => () => processSingleMarket(marketId, processTasks),
  );

  // Process markets in parallel
  const results = await Promise.all(tasksMarkets.map((task) => task()));

  // Stop spinner animation
  succeedTasks(processTasks, "Processing completed");

  // Display accumulated incidents
  displayIncidents(results);

  // ============================================
  // PHASE 2: GENERATE MARKET STATS
  // ============================================
  const statsTasks = createTasks("Generating market statistics");

  // Generate stats for all markets in parallel
  await Promise.all(
    marketIds.map((marketId) => generateSingleMarketStats(marketId, statsTasks)),
  );

  // Stop spinner animation
  succeedTasks(statsTasks, "Market statistics generated");

  return {
    action: "Generate Report",
    results,
    totalDuration: totalTimer.stop(),
  };
}
