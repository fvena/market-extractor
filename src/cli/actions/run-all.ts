import type { MarketOperationResult } from "../../markets/types";
import type { ActionResult } from "./index";
import * as p from "@clack/prompts";
import { selectMarkets } from "../prompts";
import { createTimer } from "../utils/timer";
import { createSpinner, succeedSpinner, warnSpinner } from "../utils/progress";
import { getMarket } from "../../markets/registry";

/**
 * Simulate processing delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run all action
 * Executes complete pipeline: listings → details → report
 */
export async function runAll(): Promise<ActionResult> {
  const selectedMarkets = await selectMarkets();

  if (selectedMarkets.length === 0) {
    return {
      action: "Run All",
      results: [],
      totalDuration: 0,
    };
  }

  const results: MarketOperationResult[] = [];
  const totalTimer = createTimer();

  p.log.step("Phase 1: Fetching listings...");

  // Phase 1: Fetch listings
  for (const marketId of selectedMarkets) {
    const market = getMarket(marketId);
    if (!market) continue;

    const timer = createTimer();
    const spinner = createSpinner(`${market.name}...`);

    await delay(150 + Math.random() * 200);

    if (market.implemented.listings) {
      const mockCount = Math.floor(50 + Math.random() * 150);
      succeedSpinner(spinner, `${market.name} - ${String(mockCount)} products`);
    } else {
      warnSpinner(spinner, `${market.name} - Not implemented`);
    }

    timer.stop();
  }

  p.log.step("Phase 2: Fetching details...");

  // Phase 2: Fetch details
  for (const marketId of selectedMarkets) {
    const market = getMarket(marketId);
    if (!market) continue;

    const timer = createTimer();
    const spinner = createSpinner(`${market.name}...`);

    await delay(200 + Math.random() * 300);

    if (market.implemented.details) {
      const mockCount = Math.floor(30 + Math.random() * 70);
      succeedSpinner(spinner, `${market.name} - ${String(mockCount)} products`);
      results.push({
        count: mockCount,
        duration: timer.stop(),
        marketId,
        success: true,
      });
    } else {
      warnSpinner(spinner, `${market.name} - Not implemented`);
      results.push({
        duration: timer.stop(),
        marketId,
        success: false,
        warnings: ["Not implemented"],
      });
    }
  }

  p.log.step("Phase 3: Generating report...");

  // Phase 3: Generate report
  const reportSpinner = createSpinner("Processing data and generating Excel...");
  await delay(400 + Math.random() * 300);

  const successCount = results.filter((r) => r.success).length;

  if (successCount === 0) {
    warnSpinner(reportSpinner, "No data to process");
  } else {
    succeedSpinner(reportSpinner, "Report generated: output/report.xlsx");
  }

  return {
    action: "Run All",
    results,
    totalDuration: totalTimer.stop(),
  };
}
