import type { BaseListingItem } from "../../markets/types";
import type { ActionResult } from "./index";
import * as p from "@clack/prompts";
import { searchProduct, selectProduct, selectSingleMarket } from "../prompts";
import { createTimer } from "../utils/timer";
import { createSpinner, succeedSpinner, warnSpinner } from "../utils/progress";
import { getMarket } from "../../markets/registry";
import { hasListings } from "../../storage";

/**
 * Simulate fetching delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate mock listings for simulation
 */
function generateMockListings(): BaseListingItem[] {
  const companies = [
    "Acme Corporation",
    "Global Industries",
    "Tech Solutions",
    "Alpha Holdings",
    "Beta Systems",
    "Gamma Technologies",
    "Delta Finance",
    "Epsilon Energy",
    "Zeta Pharmaceuticals",
    "Omega Retail",
  ];

  return companies.map((name, index) => ({
    id: `PROD-${String(index + 1)}`,
    name,
    url: `https://example.com/company/${String(index + 1)}`,
  }));
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

  // Search for product
  const query = await searchProduct();

  if (!query) {
    return {
      action: "Fetch Single Product",
      results: [],
      totalDuration: 0,
    };
  }

  // Stub: use mock listings for simulation
  const mockListings = generateMockListings();
  const matches = mockListings.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
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

  // Select product if multiple matches
  const selectedProduct = await selectProduct(matches);

  if (!selectedProduct) {
    return {
      action: "Fetch Single Product",
      results: [],
      totalDuration: 0,
    };
  }

  const timer = createTimer();

  // Check if implemented
  if (!market.implemented.details) {
    const spinner = createSpinner(`Fetching ${selectedProduct.name}...`);
    await delay(200);
    warnSpinner(spinner, `${selectedProduct.name} - Not implemented`);

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

  // Stub: simulate successful fetch
  const spinner = createSpinner(`Fetching ${selectedProduct.name}...`);
  await delay(300 + Math.random() * 200);
  succeedSpinner(spinner, `${selectedProduct.name} - Details fetched`);

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
