import type { ActionResult } from "./actions";
import { intro, outro } from "@clack/prompts";
import { showBanner } from "./banner";
import { askContinue, showMainMenu } from "./prompts";
import {
  clean,
  fetchDetails,
  fetchListings,
  fetchSingleProduct,
  generateReport,
  runAll,
  showSummary,
} from "./actions";

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

    let result: ActionResult | undefined;

    switch (action) {
      case "clean": {
        result = await clean();
        break;
      }
      case "fetch-details": {
        result = await fetchDetails();
        break;
      }
      case "fetch-listings": {
        result = await fetchListings();
        break;
      }
      case "fetch-single": {
        result = await fetchSingleProduct();
        break;
      }
      case "generate-report": {
        result = await generateReport();
        break;
      }
      case "run-all": {
        result = await runAll();
        break;
      }
      case "exit": {
        running = false;
        continue;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- result is not always defined
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
