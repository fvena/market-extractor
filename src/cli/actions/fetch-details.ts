import type { MarketId, MarketOperationResult } from "../../markets/types";
import type {
  BmeAlternativesListingItem,
  BmeContinuoListingItem,
  DetailProgressCallback,
} from "../../markets/bme/types";
import type {
  EuronextDetailProgressCallback,
  EuronextListingItem,
} from "../../markets/euronext/types";
import type {
  PortfolioDetailProgressCallback,
  PortfolioListingItem,
} from "../../markets/portfolio/types";
import type { ActionResult } from "./index";
import { log } from "@clack/prompts";
import colors from "yoctocolors";
import { selectMarkets, selectTestMode } from "../prompts";
import { createTimer } from "../utils/timer";
import { getMarket } from "../../markets/registry";
import { hasListings, loadListings, saveCorporateActions, saveDetails } from "../../storage";
import { config } from "../../config";
import {
  fetchBmeAlternativesCorporateActions,
  fetchBmeAlternativesDetails,
  fetchBmeContinuoDetails,
  fetchEuronextDetails,
  fetchPortfolioDetails,
} from "../../scrapers";
import {
  createSpinner,
  failSpinner,
  succeedSpinner,
  updateSpinner,
  warnSpinner,
} from "../utils/progress";

/**
 * Format success line
 */
function formatSuccessLine(current: number, total: number, name: string): string {
  const counter = colors.dim(`[${String(current)}/${String(total)}]`);
  return `${counter} ${name} - ${colors.dim("Done")}`;
}

/**
 * Format error line
 */
function formatErrorLine(current: number, total: number, name: string, error: string): string {
  const counter = colors.dim(`[${String(current)}/${String(total)}]`);
  return `${counter} ${name} - ${colors.red(error)}`;
}

/**
 * Fetch details for BME alternatives markets (Growth/ScaleUp)
 */
async function fetchBmeAlternativesMarketDetails(
  listings: BmeAlternativesListingItem[],
  isTestMode: boolean,
): Promise<{ details: unknown[]; errorCount: number; successCount: number; warningCount: number }> {
  const productsToFetch = isTestMode ? listings.slice(0, config.testModeLimit) : listings;
  const details: unknown[] = [];
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let index = 0; index < productsToFetch.length; index++) {
    const listing = productsToFetch[index];
    if (!listing) continue;
    const current = index + 1;
    const total = productsToFetch.length;
    const info = `${colors.dim(`[${String(current)}/${String(total)}]`)} Fetching details for ${listing.name}`;
    const spinner = createSpinner(info);

    // Create progress callback that updates the spinner
    // eslint-disable-next-line unicorn/consistent-function-scoping -- needs local scope for info/spinner variables
    const onProgress: DetailProgressCallback = (phase, detail) => {
      const detailText = detail ? ` ${colors.dim(`(${detail})`)}` : "";
      updateSpinner(spinner, `${info} - ${colors.dim(phase)}${detailText}`);
    };

    const result = await fetchBmeAlternativesDetails(listing, onProgress);

    if (result.success) {
      // Build warning message with all issues
      const warnings: string[] = [];
      if (result.missingFields && result.missingFields.length > 0) {
        warnings.push(`missing: ${result.missingFields.join(", ")}`);
      }
      if (result.fetchErrors && result.fetchErrors.length > 0) {
        warnings.push(...result.fetchErrors);
      }

      if (warnings.length > 0) {
        warningCount++;
        const counter = colors.dim(`[${String(current)}/${String(total)}]`);
        warnSpinner(spinner, `${counter} ${listing.name} - ${colors.yellow(warnings.join("; "))}`);
      } else {
        successCount++;
        succeedSpinner(spinner, formatSuccessLine(current, total, listing.name));
      }

      if (result.data) {
        details.push(result.data);
      }
    } else {
      errorCount++;
      failSpinner(
        spinner,
        formatErrorLine(current, total, listing.name, result.error ?? "Unknown error"),
      );
    }

    // Add delay between requests to avoid rate limiting
    if (index < productsToFetch.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, config.request.delayBetweenRequests));
    }
  }

  return { details, errorCount, successCount, warningCount };
}

/**
 * Fetch details for BME Continuo market
 */
async function fetchBmeContinuoMarketDetails(
  listings: BmeContinuoListingItem[],
  isTestMode: boolean,
): Promise<{ details: unknown[]; errorCount: number; successCount: number; warningCount: number }> {
  const productsToFetch = isTestMode ? listings.slice(0, config.testModeLimit) : listings;
  const details: unknown[] = [];
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let index = 0; index < productsToFetch.length; index++) {
    const listing = productsToFetch[index];
    if (!listing) continue;
    const current = index + 1;
    const total = productsToFetch.length;
    const info = `${colors.dim(`[${String(current)}/${String(total)}]`)} Fetching details for ${listing.name}`;
    const spinner = createSpinner(info);

    // Create progress callback that updates the spinner
    // eslint-disable-next-line unicorn/consistent-function-scoping -- needs local scope for info/spinner variables
    const onProgress: DetailProgressCallback = (phase, detail) => {
      const detailText = detail ? ` ${colors.dim(`(${detail})`)}` : "";
      updateSpinner(spinner, `${info} - ${colors.dim(phase)}${detailText}`);
    };

    const result = await fetchBmeContinuoDetails(listing, onProgress);

    if (result.success) {
      // Build warning message with all issues
      const warnings: string[] = [];
      if (result.missingFields && result.missingFields.length > 0) {
        warnings.push(`missing: ${result.missingFields.join(", ")}`);
      }
      if (result.fetchErrors && result.fetchErrors.length > 0) {
        warnings.push(...result.fetchErrors);
      }

      if (warnings.length > 0) {
        warningCount++;
        const counter = colors.dim(`[${String(current)}/${String(total)}]`);
        warnSpinner(spinner, `${counter} ${listing.name} - ${colors.yellow(warnings.join("; "))}`);
      } else {
        successCount++;
        succeedSpinner(spinner, formatSuccessLine(current, total, listing.name));
      }

      if (result.data) {
        details.push(result.data);
      }
    } else {
      errorCount++;
      failSpinner(
        spinner,
        formatErrorLine(current, total, listing.name, result.error ?? "Unknown error"),
      );
    }

    // Add delay between requests to avoid rate limiting
    if (index < productsToFetch.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, config.request.delayBetweenRequests));
    }
  }

  return { details, errorCount, successCount, warningCount };
}

/**
 * Fetch details for Euronext markets
 */
async function fetchEuronextMarketDetails(
  listings: EuronextListingItem[],
  baseUrl: string,
  isTestMode: boolean,
): Promise<{ details: unknown[]; errorCount: number; successCount: number; warningCount: number }> {
  const productsToFetch = isTestMode ? listings.slice(0, config.testModeLimit) : listings;
  const details: unknown[] = [];
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let index = 0; index < productsToFetch.length; index++) {
    const listing = productsToFetch[index];
    if (!listing) continue;
    const current = index + 1;
    const total = productsToFetch.length;
    const info = `${colors.dim(`[${String(current)}/${String(total)}]`)} Fetching details for ${listing.name}`;
    const spinner = createSpinner(info);

    // Create progress callback that updates the spinner
    // eslint-disable-next-line unicorn/consistent-function-scoping -- needs local scope for info/spinner variables
    const onProgress: EuronextDetailProgressCallback = (phase, detail) => {
      const detailText = detail ? ` ${colors.dim(`(${detail})`)}` : "";
      updateSpinner(spinner, `${info} - ${colors.dim(phase)}${detailText}`);
    };

    const result = await fetchEuronextDetails(listing, baseUrl, onProgress);

    if (result.success) {
      // Build warning message with all issues
      const warnings: string[] = [];
      if (result.missingFields && result.missingFields.length > 0) {
        warnings.push(`missing: ${result.missingFields.join(", ")}`);
      }
      if (result.fetchErrors && result.fetchErrors.length > 0) {
        warnings.push(...result.fetchErrors);
      }

      if (warnings.length > 0) {
        warningCount++;
        const counter = colors.dim(`[${String(current)}/${String(total)}]`);
        warnSpinner(spinner, `${counter} ${listing.name} - ${colors.yellow(warnings.join("; "))}`);
      } else {
        successCount++;
        succeedSpinner(spinner, formatSuccessLine(current, total, listing.name));
      }

      if (result.data) {
        details.push(result.data);
      }
    } else {
      errorCount++;
      failSpinner(
        spinner,
        formatErrorLine(current, total, listing.name, result.error ?? "Unknown error"),
      );
    }

    // Add delay between requests to avoid rate limiting
    if (index < productsToFetch.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, config.request.delayBetweenRequests));
    }
  }

  return { details, errorCount, successCount, warningCount };
}

/**
 * Fetch details for Portfolio markets
 */
async function fetchPortfolioMarketDetails(
  listings: PortfolioListingItem[],
  isTestMode: boolean,
): Promise<{ details: unknown[]; errorCount: number; successCount: number; warningCount: number }> {
  const productsToFetch = isTestMode ? listings.slice(0, config.testModeLimit) : listings;
  const details: unknown[] = [];
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let index = 0; index < productsToFetch.length; index++) {
    const listing = productsToFetch[index];
    if (!listing) continue;
    const current = index + 1;
    const total = productsToFetch.length;
    const name = listing.name ?? "Unknown";
    const info = `${colors.dim(`[${String(current)}/${String(total)}]`)} Fetching details for ${name}`;
    const spinner = createSpinner(info);

    // Create progress callback that updates the spinner
    // eslint-disable-next-line unicorn/consistent-function-scoping -- needs local scope for info/spinner variables
    const onProgress: PortfolioDetailProgressCallback = (phase, detail) => {
      const detailText = detail ? ` ${colors.dim(`(${detail})`)}` : "";
      updateSpinner(spinner, `${info} - ${colors.dim(phase)}${detailText}`);
    };

    const result = await fetchPortfolioDetails(listing, onProgress);

    if (result.success) {
      // Build warning message with all issues
      const warnings: string[] = [];
      if (result.missingFields && result.missingFields.length > 0) {
        warnings.push(`missing: ${result.missingFields.join(", ")}`);
      }
      if (result.fetchErrors && result.fetchErrors.length > 0) {
        warnings.push(...result.fetchErrors);
      }

      if (warnings.length > 0) {
        warningCount++;
        const counter = colors.dim(`[${String(current)}/${String(total)}]`);
        warnSpinner(spinner, `${counter} ${name} - ${colors.yellow(warnings.join("; "))}`);
      } else {
        successCount++;
        succeedSpinner(spinner, formatSuccessLine(current, total, name));
      }

      if (result.data) {
        details.push(result.data);
      }
    } else {
      errorCount++;
      failSpinner(spinner, formatErrorLine(current, total, name, result.error ?? "Unknown error"));
    }

    // Add delay between requests to avoid rate limiting
    if (index < productsToFetch.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, config.request.delayBetweenRequests));
    }
  }

  return { details, errorCount, successCount, warningCount };
}

/**
 * Fetch details for a specific market
 */
async function fetchMarketDetails(
  marketId: MarketId,
  isTestMode: boolean,
): Promise<{
  details: unknown[];
  error?: string;
  errorCount: number;
  successCount: number;
  warningCount: number;
}> {
  // Load listings for this market
  const market = getMarket(marketId);
  if (!market) {
    return {
      details: [],
      error: "Market not found",
      errorCount: 0,
      successCount: 0,
      warningCount: 0,
    };
  }

  // Route to appropriate fetcher based on market family
  switch (market.family) {
    case "bme": {
      if (marketId === "bme-growth" || marketId === "bme-scaleup") {
        const listings = await loadListings<BmeAlternativesListingItem>(market.slug);
        if (!listings || listings.length === 0) {
          return {
            details: [],
            error: "No listings found",
            errorCount: 0,
            successCount: 0,
            warningCount: 0,
          };
        }
        log.info(
          `${colors.bold(`Fetching details for ${market.name}`)} ${colors.dim(`(${String(listings.length)} products${isTestMode ? `, test mode: ${String(config.testModeLimit)}` : ""})`)}`,
        );
        return fetchBmeAlternativesMarketDetails(listings, isTestMode);
      }
      if (marketId === "bme-continuo") {
        const listings = await loadListings<BmeContinuoListingItem>(market.slug);
        if (!listings || listings.length === 0) {
          return {
            details: [],
            error: "No listings found",
            errorCount: 0,
            successCount: 0,
            warningCount: 0,
          };
        }
        log.info(
          `${colors.bold(`Fetching details for ${market.name}`)} ${colors.dim(`(${String(listings.length)} products${isTestMode ? `, test mode: ${String(config.testModeLimit)}` : ""})`)}`,
        );
        return fetchBmeContinuoMarketDetails(listings, isTestMode);
      }
      return {
        details: [],
        error: "Not implemented for this BME market",
        errorCount: 0,
        successCount: 0,
        warningCount: 0,
      };
    }
    case "euronext": {
      const listings = await loadListings<EuronextListingItem>(market.slug);
      if (!listings || listings.length === 0) {
        return {
          details: [],
          error: "No listings found",
          errorCount: 0,
          successCount: 0,
          warningCount: 0,
        };
      }
      log.info(
        `${colors.bold(`Fetching details for ${market.name}`)} ${colors.dim(`(${String(listings.length)} products${isTestMode ? `, test mode: ${String(config.testModeLimit)}` : ""})`)}`,
      );
      return fetchEuronextMarketDetails(listings, market.urls.base, isTestMode);
    }
    case "portfolio": {
      const listings = await loadListings<PortfolioListingItem>(market.slug);
      if (!listings || listings.length === 0) {
        return {
          details: [],
          error: "No listings found",
          errorCount: 0,
          successCount: 0,
          warningCount: 0,
        };
      }
      log.info(
        `${colors.bold(`Fetching details for ${market.name}`)} ${colors.dim(`(${String(listings.length)} products${isTestMode ? `, test mode: ${String(config.testModeLimit)}` : ""})`)}`,
      );
      return fetchPortfolioMarketDetails(listings, isTestMode);
    }
    default: {
      return {
        details: [],
        error: "Not implemented",
        errorCount: 0,
        successCount: 0,
        warningCount: 0,
      };
    }
  }
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
      log.warning(`${market.name} - No listings found (run Fetch Listings first)`);
      results.push({
        duration: timer.stop(),
        marketId,
        success: false,
        warnings: ["No listings found"],
      });
      continue;
    }

    if (!market.implemented.details) {
      log.warning(`${market.name} - Not implemented`);
      results.push({
        duration: timer.stop(),
        marketId,
        success: false,
        warnings: ["Not implemented"],
      });
      continue;
    }

    try {
      const result = await fetchMarketDetails(marketId, isTestMode);
      const duration = timer.stop();

      if (result.error) {
        log.error(`${market.name} - ${result.error}`);
        results.push({
          duration,
          error: result.error,
          marketId,
          success: false,
        });
        continue;
      }

      // Save details to file
      await saveDetails(market.slug, result.details);

      const warnings: string[] = [];
      if (result.warningCount > 0) {
        warnings.push(`${String(result.warningCount)} products with missing fields`);
      }
      if (result.errorCount > 0) {
        warnings.push(`${String(result.errorCount)} products failed`);
      }

      // Fetch corporate actions
      if (market.urls.corporateActions) {
        log.info(`Fetching corporate actions for ${market.name}`);
        const corporateActionsResult = await fetchBmeAlternativesCorporateActions(
          market.urls.corporateActions,
        );
        if (corporateActionsResult.data) {
          await saveCorporateActions(market.slug, corporateActionsResult.data);
        } else if (corporateActionsResult.error) {
          log.error(
            `${market.name} - Failed to fetch corporate actions: ${corporateActionsResult.error}`,
          );
        }
      }

      log.success(
        `${market.name} - ${colors.dim(`${String(result.details.length)} products saved`)}`,
      );

      results.push({
        count: result.details.length,
        duration,
        marketId,
        success: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      const duration = timer.stop();
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      log.error(`${market.name} - ${errorMessage}`);
      results.push({
        duration,
        error: errorMessage,
        marketId,
        success: false,
      });
    }
  }

  return {
    action: "Fetch Details",
    results,
    totalDuration: totalTimer.stop(),
  };
}
