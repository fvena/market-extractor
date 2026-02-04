import type { MarketId, ProductListing } from "../types/types";
import * as p from "@clack/prompts";
import { MARKETS } from "../markets";
import { loadProductsListings } from "../helpers/storage";

/**
 * Menu action types
 */
export type MenuAction =
  | "clean"
  | "exit"
  | "fetch-details"
  | "fetch-listings"
  | "fetch-single"
  | "generate-report"
  | "run-all";

/**
 * Show main menu and return selected action
 */
export async function showMainMenu(): Promise<MenuAction> {
  const action = await p.select({
    message: "What would you like to do?",
    options: [
      {
        hint: "Download product listings from markets",
        label: "Fetch listings",
        value: "fetch-listings",
      },
      {
        hint: "Download and process detailed product data",
        label: "Fetch details",
        value: "fetch-details",
      },
      {
        hint: "Get details for one specific product",
        label: "Fetch single product",
        value: "fetch-single",
      },
      {
        hint: "Reprocess already fetched details and generate stats",
        label: "Generate report",
        value: "generate-report",
      },
      { hint: "Execute complete pipeline", label: "Run all", value: "run-all" },
      { hint: "Remove all generated files", label: "Clean output files", value: "clean" },
      { hint: "Close the application", label: "Exit", value: "exit" },
    ],
  });

  if (p.isCancel(action)) {
    return "exit";
  }

  return action as MenuAction;
}

/**
 * Select markets from the registry
 */
export async function selectMarkets(preselected?: MarketId[]): Promise<MarketId[]> {
  const markets = Object.values(MARKETS);
  const initialValues = preselected ?? markets.map((m) => m.id);

  const selected = await p.multiselect({
    initialValues,
    message: "Select markets to process:",
    options: markets.map((m) => ({
      label: m.name,
      value: m.id,
    })),
    required: true,
  });

  if (p.isCancel(selected)) {
    return [];
  }

  return selected;
}

/**
 * Select a single market
 */
export async function selectSingleMarket(): Promise<MarketId | undefined> {
  const markets = Object.values(MARKETS);

  const selected = await p.select({
    message: "Select a market:",
    options: markets.map((m) => ({
      label: m.name,
      value: m.id,
    })),
  });

  if (p.isCancel(selected)) {
    return;
  }

  return selected;
}

/**
 * Select between test mode (limited products) or full fetch
 */
export async function selectTestMode(): Promise<boolean> {
  const mode = await p.select({
    message: "How many products to fetch?",
    options: [
      { hint: "Complete data retrieval", label: "Fetch all products", value: "all" },
      { hint: "Quick test with limited data", label: "Test mode (5 products)", value: "test" },
    ],
  });

  if (p.isCancel(mode)) {
    return true; // Default to test mode if cancelled
  }

  return mode === "test";
}

/**
 * Search for a product by name
 */
export async function searchProduct(): Promise<string | undefined> {
  const query = await p.text({
    message: "Enter product name to search:",
    placeholder: "e.g., Company Name",
    validate: (value) => {
      if (!value || value.trim().length < 2) {
        return "Please enter at least 2 characters";
      }
    },
  });

  if (p.isCancel(query)) {
    return;
  }

  return query;
}

/**
 * Select a product from a list of matches
 */
export async function selectProduct(
  products: ProductListing[],
): Promise<ProductListing | undefined> {
  if (products.length === 0) {
    return;
  }

  if (products.length === 1) {
    return products[0];
  }

  const selected = await p.select({
    message: `Found ${String(products.length)} matches. Select one:`,
    options: products.map((product) => ({
      label: product.name,
      value: product.url,
    })),
  });

  if (p.isCancel(selected)) {
    return;
  }

  return products.find((product) => product.url === selected);
}

/**
 * Ask if user wants to continue or exit
 */
export async function askContinue(): Promise<boolean> {
  const action = await p.select({
    message: "What would you like to do next?",
    options: [
      { hint: "Return to main menu", label: "Continue", value: "continue" },
      { hint: "Close the application", label: "Exit", value: "exit" },
    ],
  });

  if (p.isCancel(action)) {
    return false;
  }

  return action === "continue";
}

/**
 * Confirm a destructive action
 */
export async function confirmAction(message: string): Promise<boolean> {
  const confirmed = await p.confirm({
    initialValue: false,
    message,
  });

  if (p.isCancel(confirmed)) {
    return false;
  }

  return confirmed;
}

export async function selectSingleProduct(): Promise<{
  marketId?: MarketId;
  product?: ProductListing;
}> {
  const marketId = await selectSingleMarket();

  if (!marketId) {
    p.log.error("No market selected");
    return {};
  }

  // Load listings for the selected market
  const market = MARKETS[marketId];
  const listings = await loadProductsListings<ProductListing>(market.slug);

  if (!listings || listings.length === 0) {
    p.log.error(`No listings found for ${market.name}`);
    return {};
  }

  // Search for a product
  const productName = await searchProduct();

  if (!productName || typeof productName !== "string") {
    p.log.error("No product name provided");
    return {};
  }

  // Find matches in real listings
  const matches = listings.filter((item) =>
    item.name.toLowerCase().includes(productName.toLowerCase()),
  );

  if (matches.length === 0) {
    p.log.error(`No products found matching "${productName}"`);
    return {};
  }

  // Select product if multiple matches
  return {
    marketId,
    product: await selectProduct(matches),
  };
}
