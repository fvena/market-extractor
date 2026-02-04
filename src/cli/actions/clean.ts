import type {
  ActionResult,
  ProcessedProduct,
  ProductDetails,
  ProductListing,
} from "../../types/types";
import { confirmAction } from "../prompts";
import { createTimer } from "../utils/timer";
import { createSpinner, failSpinner, succeedSpinner } from "../utils/spinner";
import { cleanAll } from "../../helpers/storage";

/**
 * Simulate processing delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clean action
 * Removes all generated output files
 */
export async function clean(): Promise<
  ActionResult<ProcessedProduct | ProductDetails | ProductListing>
> {
  const totalTimer = createTimer();

  const confirmed = await confirmAction("This will delete all output files. Are you sure?");

  if (!confirmed) {
    return {
      action: "Clean",
      results: [],
      totalDuration: 0,
    };
  }

  const spinner = createSpinner("Cleaning output directory");

  try {
    await cleanAll();
    await delay(200);
    succeedSpinner(spinner, "Output directory cleaned");

    return {
      action: "Clean",
      results: [
        {
          duration: totalTimer.stop(),
          errors: [],
          marketId: "portfolio", // Placeholder - clean affects all
          marketName: "Portfolio",
          products: [],
          warnings: [],
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    failSpinner(spinner, `Failed to clean: ${errorMessage}`);

    return {
      action: "Clean",
      results: [
        {
          duration: totalTimer.stop(),
          errors: [{ error: errorMessage, name: "Portfolio" }],
          marketId: "portfolio",
          marketName: "Portfolio",
          products: [],
          warnings: [],
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }
}
