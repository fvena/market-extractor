import type { MarketOperationResult } from "../../markets/types";
import { note } from "@clack/prompts";
import colors from "yoctocolors";
import { getMarket } from "../../markets/registry";
import { Timer } from "../utils/timer";

export { clean } from "./clean";
export { fetchDetails } from "./fetch-details";
export { fetchListings } from "./fetch-listings";
export { fetchSingleProduct } from "./fetch-single";
export { generateReport } from "./generate-report";
export { runAll } from "./run-all";

/**
 * Action result containing all operation results
 */
export interface ActionResult {
  action: string;
  results: MarketOperationResult[];
  totalDuration: number;
}

/**
 * Pad or truncate string to fixed width
 */
function padEnd(string_: string, width: number): string {
  if (string_.length >= width) {
    return string_.slice(0, width - 1) + "\u2026";
  }
  return string_ + " ".repeat(width - string_.length);
}

/**
 * Pad string to fixed width (right align)
 */
function padStart(string_: string, width: number): string {
  if (string_.length >= width) {
    return string_;
  }
  return " ".repeat(width - string_.length) + string_;
}

/**
 * Display summary of action results using clack prompts note()
 */
export function showSummary(result: ActionResult): void {
  if (result.results.length === 0) {
    note("No operations performed.", result.action);
    return;
  }

  const timer = new Timer();
  const nameWidth = 20;
  const statusWidth = 18;
  const timeWidth = 8;

  const lines: string[] = [];

  let totalCount = 0;
  let successCount = 0;

  for (const result_ of result.results) {
    const market = getMarket(result_.marketId);
    const name = market?.name ?? result_.marketId;
    const duration = timer.format(result_.duration);

    let status: string;
    let icon: string;

    if (result_.success) {
      successCount++;
      if (result_.count === undefined) {
        status = "Success";
      } else {
        totalCount += result_.count;
        status = `${String(result_.count)} products`;
      }
      icon = colors.green("\u2713");
    } else if (result_.error) {
      status = result_.error.length > 15 ? result_.error.slice(0, 14) + "\u2026" : result_.error;
      icon = colors.red("\u2717");
    } else if (result_.warnings && result_.warnings.length > 0) {
      status = result_.warnings[0] ?? "Warning";
      icon = colors.yellow("\u26A0");
    } else {
      status = "Unknown";
      icon = colors.dim("?");
    }

    lines.push(
      `${icon} ${padEnd(name, nameWidth)}${padEnd(status, statusWidth)}${padStart(duration, timeWidth)}`,
    );
  }

  // Separator
  lines.push("\u2500".repeat(nameWidth + statusWidth + timeWidth + 2));

  // Totals
  const totalDuration = timer.format(result.totalDuration);
  let totalStatus: string;

  if (totalCount > 0) {
    totalStatus = `Total: ${String(totalCount)} products`;
  } else if (successCount > 0) {
    totalStatus = `${String(successCount)}/${String(result.results.length)} successful`;
  } else {
    totalStatus = "No results";
  }

  lines.push(`  ${padEnd(totalStatus, nameWidth + statusWidth)}${padStart(totalDuration, timeWidth)}`);

  note(lines.join("\n"), result.action);
}
