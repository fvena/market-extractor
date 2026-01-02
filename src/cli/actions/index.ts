import type { MarketOperationResult } from "../../markets/types";
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
 * Box drawing characters for summary display
 */
const BOX = {
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  middleLeft: "\u251C",
  middleRight: "\u2524",
  topLeft: "\u250C",
  topRight: "\u2510",
  vertical: "\u2502",
};

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
 * Create a horizontal line
 */
function horizontalLine(width: number, left: string, right: string): string {
  return left + BOX.horizontal.repeat(width - 2) + right;
}

/**
 * Display summary of action results
 */
export function showSummary(result: ActionResult): void {
  if (result.results.length === 0) {
    console.log(colors.dim("\n  No operations performed.\n"));
    return;
  }

  const timer = new Timer();
  const width = 60;
  const nameWidth = 24;
  const statusWidth = 24;
  const timeWidth = 8;

  console.log("");

  // Top border with title
  console.log(colors.dim(horizontalLine(width, BOX.topLeft, BOX.topRight)));
  const title = ` ${result.action} `;
  const titlePadding = Math.floor((width - 2 - title.length) / 2);
  console.log(
    colors.dim(BOX.vertical) +
      " ".repeat(titlePadding) +
      colors.bold(title) +
      " ".repeat(width - 2 - titlePadding - title.length) +
      colors.dim(BOX.vertical),
  );
  console.log(colors.dim(horizontalLine(width, BOX.middleLeft, BOX.middleRight)));

  // Results
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
      status = result_.error;
      icon = colors.red("\u2717");
    } else if (result_.warnings && result_.warnings.length > 0) {
      status = result_.warnings[0] ?? "Warning";
      icon = colors.yellow("\u26A0");
    } else {
      status = "Unknown";
      icon = colors.dim("?");
    }

    const line =
      ` ${icon} ` +
      padEnd(name, nameWidth) +
      padEnd(status, statusWidth) +
      padStart(duration, timeWidth);

    console.log(colors.dim(BOX.vertical) + line + colors.dim(BOX.vertical));
  }

  // Separator
  console.log(colors.dim(horizontalLine(width, BOX.middleLeft, BOX.middleRight)));

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

  const totalLine =
    "   " + padEnd(totalStatus, nameWidth + statusWidth) + padStart(totalDuration, timeWidth);

  console.log(colors.dim(BOX.vertical) + totalLine + colors.dim(BOX.vertical));

  // Bottom border
  console.log(colors.dim(horizontalLine(width, BOX.bottomLeft, BOX.bottomRight)));
  console.log("");
}
