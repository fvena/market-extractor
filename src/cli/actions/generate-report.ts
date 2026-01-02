import type { MarketOperationResult } from "../../markets/types";
import type { ActionResult } from "./index";
import { createTimer } from "../utils/timer";
import { createSpinner, succeedSpinner, warnSpinner } from "../utils/progress";
import { markets } from "../../markets/registry";
import { hasDetails } from "../../storage";

/**
 * Simulate processing delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate report action
 * Processes data and creates Excel report
 */
export async function generateReport(): Promise<ActionResult> {
  const results: MarketOperationResult[] = [];
  const totalTimer = createTimer();

  // Phase 1: Process each market's details
  let hasAnyDetails = false;

  for (const market of markets) {
    const timer = createTimer();

    const detailsExist = await hasDetails(market.slug);

    if (!detailsExist) {
      continue;
    }

    hasAnyDetails = true;

    if (!market.implemented.processing) {
      const spinner = createSpinner(`Processing ${market.name}...`);
      await delay(100);
      warnSpinner(spinner, `${market.name} - Processing not implemented`);
      results.push({
        duration: timer.stop(),
        marketId: market.id,
        success: false,
        warnings: ["Processing not implemented"],
      });
      continue;
    }

    // Stub: simulate successful processing
    const spinner = createSpinner(`Processing ${market.name}...`);
    await delay(200 + Math.random() * 300);
    const mockCount = Math.floor(20 + Math.random() * 80);
    succeedSpinner(spinner, `${market.name} - ${String(mockCount)} products processed`);

    results.push({
      count: mockCount,
      duration: timer.stop(),
      marketId: market.id,
      success: true,
    });
  }

  if (!hasAnyDetails) {
    const spinner = createSpinner("Generating report...");
    await delay(100);
    warnSpinner(spinner, 'No details found. Run "Fetch Details" first.');

    return {
      action: "Generate Report",
      results: [],
      totalDuration: totalTimer.stop(),
    };
  }

  // Phase 2: Generate Excel report
  const reportSpinner = createSpinner("Generating Excel report...");
  await delay(300 + Math.random() * 200);

  // Stub: simulate report generation
  succeedSpinner(reportSpinner, "Report generated: output/report.xlsx");

  return {
    action: "Generate Report",
    results,
    totalDuration: totalTimer.stop(),
  };
}
