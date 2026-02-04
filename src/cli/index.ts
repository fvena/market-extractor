import type {
  ActionResult,
  ProcessedProduct,
  ProductDetails,
  ProductListing,
} from "../types/types";
import { intro, outro } from "@clack/prompts";
import * as p from "@clack/prompts";
import { showBanner } from "./utils/banner";
import {
  askContinue,
  selectMarkets,
  selectSingleProduct,
  selectTestMode,
  showMainMenu,
} from "./prompts";
import { showSummary } from "./utils/summary";
import { fetchMarketsListings } from "./actions/fetch-listings";
import { fetchMarketsDetails } from "./actions/fetch-details";
import { generateMarketsReport } from "./actions/generate-report";
import { fetchSingleProduct } from "./actions/fetch-single";
import { runAll } from "./actions/run-all";
import { clean } from "./actions/clean";

// Read version from package.json
async function getVersion(): Promise<string> {
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const packageJson = require("../../package.json") as { version: string };
    return packageJson.version;
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<void> {
  const version = await getVersion();

  console.clear();
  showBanner(version);

  intro("Welcome to Market Extractor");

  let running = true;

  while (running) {
    const action = await showMainMenu();

    let result: ActionResult<ProcessedProduct | ProductDetails | ProductListing> | undefined;

    switch (action) {
      case "clean": {
        result = await clean();
        break;
      }
      case "fetch-details": {
        const selectedMarkets = await selectMarkets();
        const isTestMode = await selectTestMode();
        result = await fetchMarketsDetails(selectedMarkets, isTestMode);
        break;
      }
      case "fetch-listings": {
        const selectedMarkets = await selectMarkets();
        result = await fetchMarketsListings(selectedMarkets);
        break;
      }
      case "fetch-single": {
        const { marketId, product } = await selectSingleProduct();
        if (!marketId || !product) {
          p.log.error("No product selected");
          break;
        }
        result = await fetchSingleProduct(marketId, product);
        break;
      }
      case "generate-report": {
        result = await generateMarketsReport();
        break;
      }
      case "run-all": {
        const selectedMarkets = await selectMarkets();
        result = runAll(selectedMarkets);
        break;
      }
      case "exit": {
        running = false;
        continue;
      }
    }

    if (result) {
      showSummary(result);
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- running is not always true
    if (running) {
      running = await askContinue();
    }
  }

  outro("Thanks for using Market Extractor!");
}

await main().catch(console.error);
