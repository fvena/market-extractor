import type {
  MarketId,
  MarketOperationResult,
  ProductError,
  ProductMissingFields,
} from "../../types/types";
import colors from "yoctocolors";
import { log } from "@clack/prompts";
import { failSubtask, warnSubtask } from "./tasks";

// ============================================
// TYPES
// ============================================

export interface MarketIncidents {
  marketId: MarketId;
  marketName: string;
  productsWithError: ProductError[];
  productsWithMissingFields: ProductMissingFields[];
}

// ============================================
// INCIDENT DISPLAY
// ============================================

/**
 * Display accumulated incidents for all markets
 * Shows warnings and errors grouped by market
 */
export function displayIncidents<T>(allIncidents: MarketOperationResult<T>[]): void {
  for (const incidents of allIncidents) {
    const hasWarnings = incidents.warnings.length > 0;
    const hasErrors = incidents.errors.length > 0;

    if (!hasWarnings && !hasErrors) continue;

    // Show market header
    if (hasErrors) {
      log.error(`${incidents.marketName}:`);
    } else {
      log.warn(`${incidents.marketName}:`);
    }

    // Show products with warnings
    if (hasWarnings) {
      for (const [index, product] of incidents.warnings.entries()) {
        const isLast = !hasErrors && index === incidents.warnings.length - 1;
        const text = `${product.name} ${colors.dim(`- missing fields:`)} ${colors.yellow(product.missingFields.join(", "))}`;
        warnSubtask(text, isLast);
      }
    }

    // Show products with errors
    if (hasErrors) {
      for (const [index, product] of incidents.errors.entries()) {
        const isLast = index === incidents.errors.length - 1;
        const text = `${product.name} ${colors.dim(`- error:`)} ${colors.red(product.error)}`;
        failSubtask(text, isLast);
      }
    }
  }
}

// ============================================
// MESSAGE BUILDERS
// ============================================

/**
 * Build a final status message with colored counts
 * Products in green, warnings in yellow, errors in red, path in dim
 */
export function buildFinalMessage(
  totalProducts: number,
  totalErrors: number,
  totalWarnings: number,
  path: string,
): string {
  const parts: string[] = [colors.green(`${String(totalProducts)} products`)];

  if (totalErrors > 0) {
    parts.push(colors.red(`${String(totalErrors)} errors`));
  }

  if (totalWarnings > 0) {
    parts.push(colors.yellow(`${String(totalWarnings)} warnings`));
  }

  return `${parts.join(", ")} - ${colors.dim(`Saved to ${path}`)}`;
}
