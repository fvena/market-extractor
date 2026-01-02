import type { ActionResult } from "./index";
import { confirmAction } from "../prompts";
import { createTimer } from "../utils/timer";
import { createSpinner, failSpinner, succeedSpinner } from "../utils/progress";
import { cleanAll } from "../../storage";

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
export async function clean(): Promise<ActionResult> {
  const totalTimer = createTimer();

  const confirmed = await confirmAction("This will delete all output files. Are you sure?");

  if (!confirmed) {
    return {
      action: "Clean",
      results: [],
      totalDuration: 0,
    };
  }

  const spinner = createSpinner("Cleaning output directory...");

  try {
    await cleanAll();
    await delay(200);
    succeedSpinner(spinner, "Output directory cleaned");

    return {
      action: "Clean",
      results: [
        {
          duration: totalTimer.stop(),
          marketId: "portfolio", // Placeholder - clean affects all
          success: true,
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
          error: errorMessage,
          marketId: "portfolio",
          success: false,
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }
}
