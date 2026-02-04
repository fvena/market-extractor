import type { ActionResult } from "../../types/types";
import { note } from "@clack/prompts";
import colors from "yoctocolors";
import { MARKETS } from "../../markets";
import { Timer } from "../utils/timer";

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
export function showSummary<T>(result: ActionResult<T>): void {
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

  for (const result_ of result.results) {
    const market = MARKETS[result_.marketId];
    const name = market.name;
    const duration = timer.format(result_.duration);
    const errorsLength = result_.errors.length;
    const warningsLength = result_.warnings.length;
    const productsLength = result_.products.length;
    totalCount += productsLength;

    let status: string;
    let icon: string;

    if (errorsLength > 0) {
      status = `${String(errorsLength)} errors`;
      icon = colors.red(" ✗");
    } else if (warningsLength > 0) {
      status = `${String(warningsLength)} warnings`;
      icon = colors.yellow("⚠ ");
    } else {
      status = `${String(productsLength)} products`;
      icon = colors.green(" ✓");
    }

    lines.push(
      `${icon} ${padEnd(name, nameWidth)}${padEnd(status, statusWidth)}${padStart(duration, timeWidth)}`,
    );
  }

  // Separator
  lines.push("─".repeat(nameWidth + statusWidth + timeWidth + 2));

  // Totals
  const totalDuration = timer.format(result.totalDuration);
  const totalStatus = totalCount > 0 ? `Total: ${String(totalCount)} products` : "No results";

  lines.push(
    `  ${padEnd(totalStatus, nameWidth + statusWidth)}${padStart(totalDuration, timeWidth)}`,
  );

  note(lines.join("\n"), result.action);
}
