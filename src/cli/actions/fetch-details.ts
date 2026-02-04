import type {
  ActionResult,
  MarketId,
  MarketOperationResult,
  ProcessedProduct,
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
import {
  loadProductsProcessed,
  saveCorporateActions,
  saveMarketStats,
  saveProductsDetails,
  saveProductsProcessed,
} from "../../helpers/storage";
import { fetchMarketDetails } from "../../details/details";
import { closeBrowser } from "../../helpers/browser";
import { buildFinalMessage, displayIncidents } from "../utils/incidents";
import { fetchBmeAlternativesCorporateActions } from "../../details/fetchers/bme-corporate-actions-fetcher";
import { processMarkets } from "../../processing/processing";
import { generateMarketStats } from "../../processing/market-stats";

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
// SINGLE MARKET PROCESSING
// ============================================

/**
 * Process a single market after fetching details
 * Updates the multi-spinner with progress
 */
async function processSingleMarket(
  marketId: MarketId,
  tasks: Tasks,
): Promise<MarketOperationResult<ProcessedProduct>> {
  const market = MARKETS[marketId];
  const timer = createTimer();

  // Mark as running
  const task = createTask(tasks, "Processing", market.name);

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
 * Then processes the details to generate normalized output
 * @param selectedMarkets - Array of market IDs to fetch
 * @param isTestMode - Whether to limit products (for testing)
 */
export async function fetchMarketsDetails(
  selectedMarkets: MarketId[],
  isTestMode: boolean,
): Promise<ActionResult<ProcessedProduct>> {
  const totalTimer = createTimer();

  // ============================================
  // PHASE 1: FETCH DETAILS
  // ============================================
  const fetchTasks = createTasks("Fetching details");

  // Create tasks for each market details
  const tasksMarkets = selectedMarkets.map(
    (marketId) => () => fetchSingleMarketDetails(marketId, isTestMode, fetchTasks),
  );

  // Create tasks for corporate actions of BME alternatives markets
  const tasksCorporateActions = selectedMarkets
    .filter((marketId) => {
      return isBmeAlternativesMarket(marketId);
    })
    .map((marketId) => () => fetchBmeAlternativesCorporateActionsTask(marketId, fetchTasks));

  // Fetch markets and corporate actions in parallel
  const [fetchResults] = await Promise.all([
    Promise.all(tasksMarkets.map((task) => task())),
    Promise.all(tasksCorporateActions.map((task) => task())),
  ]);

  // Stop spinner animation
  succeedTasks(fetchTasks, "Fetching details completed");

  // Display accumulated incidents for fetch phase
  displayIncidents(fetchResults);

  // Close the browser when done with all browser-based markets
  await closeBrowser();

  // ============================================
  // PHASE 2: PROCESS DETAILS
  // ============================================
  const processTasks = createTasks("Processing markets");

  // Process each market in parallel
  const processResults = await Promise.all(
    selectedMarkets.map((marketId) => processSingleMarket(marketId, processTasks)),
  );

  // Stop spinner animation
  succeedTasks(processTasks, "Processing completed");

  // Display accumulated incidents for process phase
  displayIncidents(processResults);

  // ============================================
  // PHASE 3: GENERATE MARKET STATS
  // ============================================
  const statsTasks = createTasks("Generating market statistics");

  // Generate stats for each market in parallel
  await Promise.all(
    selectedMarkets.map((marketId) => generateSingleMarketStats(marketId, statsTasks)),
  );

  // Stop spinner animation
  succeedTasks(statsTasks, "Market statistics generated");

  return {
    action: "Fetch Details",
    results: processResults,
    totalDuration: totalTimer.stop(),
  };
}
