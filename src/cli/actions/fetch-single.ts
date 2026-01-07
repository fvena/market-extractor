import type {
  BmeAlternativesDetails,
  BmeAlternativesListingItem,
  BmeContinuoDetails,
  BmeContinuoListingItem,
  DetailProgressCallback,
} from "../../markets/bme/types";
import type {
  EuronextDetailProgressCallback,
  EuronextDetails,
  EuronextListingItem,
} from "../../markets/euronext/types";
import type {
  PortfolioDetailProgressCallback,
  PortfolioListingItem,
  PortfolioProductDetails,
} from "../../markets/portfolio/types";
import type { MarketDefinition, MarketFamily } from "../../markets/types";
import type { ActionResult } from "./index";
import * as p from "@clack/prompts";
import colors from "yoctocolors";
import { searchProduct, selectProduct, selectSingleMarket } from "../prompts";
import { createTimer } from "../utils/timer";
import { getMarket } from "../../markets/registry";
import { hasListings, loadDetails, loadListings, saveDetails } from "../../storage";
import {
  fetchBmeAlternativesDetails,
  fetchBmeContinuoDetails,
  fetchEuronextDetails,
  fetchPortfolioDetails,
} from "../../scrapers";

/** Union type for all detail types */
type AnyDetails =
  | BmeAlternativesDetails
  | BmeContinuoDetails
  | EuronextDetails
  | PortfolioProductDetails;

/** Union type for all listing types */
type AnyListingItem =
  | BmeAlternativesListingItem
  | BmeContinuoListingItem
  | EuronextListingItem
  | PortfolioListingItem;

/** Generic detail result */
interface DetailResult {
  data?: AnyDetails;
  error?: string;
  fetchErrors?: string[];
  missingFields?: string[];
  success: boolean;
}

/** Progress callback type */
type ProgressCallback = (phase: string, detail?: string) => void;

/**
 * Type guard for Portfolio listings
 */
function isPortfolioListing(listing: AnyListingItem): listing is PortfolioListingItem {
  return "instrumentCode" in listing || "isinCode" in listing;
}

/**
 * Get the name field from any listing type
 * Portfolio listings may have optional name, fallback to instrumentCode or isinCode
 */
function getListingName(listing: AnyListingItem): string {
  if (isPortfolioListing(listing)) {
    // Portfolio listing - name is optional
    return listing.name ?? listing.instrumentCode ?? listing.isinCode ?? "Unknown";
  }
  // BME and Euronext listings have required name field
  return listing.name;
}

/**
 * Get the URL field from any listing type
 */
function getListingUrl(listing: AnyListingItem): string {
  return listing.url;
}

/**
 * Fetch details for a single product based on market family
 */
async function fetchProductDetails(
  market: MarketDefinition,
  listing: AnyListingItem,
  onProgress?: ProgressCallback,
): Promise<DetailResult> {
  switch (market.family) {
    case "bme": {
      if (market.id === "bme-continuo") {
        return fetchBmeContinuoDetails(
          listing as BmeContinuoListingItem,
          onProgress as DetailProgressCallback,
        );
      }
      // BME Growth and ScaleUp use the same fetcher
      return fetchBmeAlternativesDetails(
        listing as BmeAlternativesListingItem,
        onProgress as DetailProgressCallback,
      );
    }
    case "euronext": {
      return fetchEuronextDetails(
        listing as EuronextListingItem,
        market.urls.base,
        onProgress as EuronextDetailProgressCallback,
      );
    }
    case "portfolio": {
      return fetchPortfolioDetails(
        listing as PortfolioListingItem,
        onProgress as PortfolioDetailProgressCallback,
      );
    }
    default: {
      // Exhaustive check - this should never be reached
      const _exhaustive: never = market.family;
      return {
        error: `Unsupported market family: ${_exhaustive as MarketFamily}`,
        success: false,
      };
    }
  }
}

/**
 * Load existing details for a market
 */
async function loadExistingDetails(slug: string): Promise<AnyDetails[]> {
  return (await loadDetails<AnyDetails>(slug)) ?? [];
}

/**
 * Fetch single product action
 * Downloads details for one specific product
 */
export async function fetchSingleProduct(): Promise<ActionResult> {
  const totalTimer = createTimer();

  // Select market
  const marketId = await selectSingleMarket();

  if (!marketId) {
    return {
      action: "Fetch Single Product",
      results: [],
      totalDuration: 0,
    };
  }

  const market = getMarket(marketId);
  if (!market) {
    return {
      action: "Fetch Single Product",
      results: [],
      totalDuration: 0,
    };
  }

  // Check if listings exist
  const listingsExist = await hasListings(market.slug);

  if (!listingsExist) {
    p.log.warn(`No listings found for ${market.name}. Run "Fetch Listings" first.`);
    return {
      action: "Fetch Single Product",
      results: [
        {
          duration: totalTimer.stop(),
          marketId,
          success: false,
          warnings: ["No listings found"],
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }

  // Load actual listings (as generic type)
  const listings = await loadListings<AnyListingItem>(market.slug);

  if (!listings || listings.length === 0) {
    p.log.error(`No listings found for ${market.name}`);
    return {
      action: "Fetch Single Product",
      results: [
        {
          duration: totalTimer.stop(),
          error: "No listings found",
          marketId,
          success: false,
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }

  // Search for product
  const query = await searchProduct();

  if (!query) {
    return {
      action: "Fetch Single Product",
      results: [],
      totalDuration: 0,
    };
  }

  // Find matches in real listings
  const matches = listings.filter((item) =>
    getListingName(item).toLowerCase().includes(query.toLowerCase()),
  );

  if (matches.length === 0) {
    p.log.error(`No products found matching "${query}"`);
    return {
      action: "Fetch Single Product",
      results: [
        {
          duration: totalTimer.stop(),
          error: `No products found matching "${query}"`,
          marketId,
          success: false,
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }

  // Convert to the format expected by selectProduct
  const matchItems = matches.map((m) => ({
    id: getListingUrl(m), // Use URL as ID
    name: getListingName(m),
    url: getListingUrl(m),
  }));

  // Select product if multiple matches
  const selectedProduct = await selectProduct(matchItems);

  if (!selectedProduct) {
    return {
      action: "Fetch Single Product",
      results: [],
      totalDuration: 0,
    };
  }

  // Find the original listing
  const listing = matches.find((m) => getListingUrl(m) === selectedProduct.id);

  if (!listing) {
    return {
      action: "Fetch Single Product",
      results: [],
      totalDuration: 0,
    };
  }

  const timer = createTimer();

  // Check if implemented
  if (!market.implemented.details) {
    p.log.warn(`${selectedProduct.name} - Not implemented`);

    return {
      action: "Fetch Single Product",
      results: [
        {
          duration: timer.stop(),
          marketId,
          success: false,
          warnings: ["Not implemented"],
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }

  // Fetch the product details
  console.log(`\n${colors.dim("Fetching")} ${selectedProduct.name}${colors.dim("...")}`);

  const result = await fetchProductDetails(market, listing, (phase, detail) => {
    const fullPhase = detail ? `${phase} (${detail})` : phase;
    process.stdout.write(`\r${colors.dim(fullPhase)}${"".padEnd(30)}`);
  });

  // Clear the progress line
  process.stdout.write("\r" + " ".repeat(80) + "\r");

  if (!result.success) {
    console.log(
      `${colors.red("✗")} ${selectedProduct.name} - ${colors.red(result.error ?? "Unknown error")}`,
    );

    return {
      action: "Fetch Single Product",
      results: [
        {
          duration: timer.stop(),
          error: result.error,
          marketId,
          success: false,
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }

  // Load existing details to merge
  const existingDetails = await loadExistingDetails(market.slug);

  // Find and replace the product, or add it
  if (result.data) {
    // Find by URL (common field across all detail types)
    const productUrl = getListingUrl(listing);
    const productIndex = existingDetails.findIndex((d) => {
      // All detail types have a 'url' field
      return "url" in d && d.url === productUrl;
    });

    if (productIndex === -1) {
      existingDetails.push(result.data);
    } else {
      existingDetails[productIndex] = result.data;
    }
  }

  // Save updated details
  await saveDetails(market.slug, existingDetails);

  if (result.missingFields && result.missingFields.length > 0) {
    console.log(
      `${colors.yellow("⚠")} ${selectedProduct.name} - ${colors.yellow(`missing: ${result.missingFields.join(", ")}`)}`,
    );
    console.log(colors.dim(`Details saved to output/details/${market.slug}.json`));

    return {
      action: "Fetch Single Product",
      results: [
        {
          count: 1,
          duration: timer.stop(),
          marketId,
          success: true,
          warnings: [`Missing fields: ${result.missingFields.join(", ")}`],
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }

  console.log(`${colors.green("✓")} ${selectedProduct.name} - ${colors.dim("Details fetched")}`);
  console.log(colors.dim(`Details saved to output/details/${market.slug}.json`));

  return {
    action: "Fetch Single Product",
    results: [
      {
        count: 1,
        duration: timer.stop(),
        marketId,
        success: true,
      },
    ],
    totalDuration: totalTimer.stop(),
  };
}
