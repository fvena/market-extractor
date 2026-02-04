/**
 * Converters for BME corporate actions to unified format
 *
 * Extracts dates from BME's detailed corporate actions structures
 * to create UnifiedCorporateActions with only date arrays.
 */

import type { BmeContinuoCorporateActions, BmeCorporateActions } from "../../types/bme.types";
import type { UnifiedCorporateActions } from "../../types/types";
import { emptyUnifiedCorporateActions } from "./parse-euronext-corporate-actions";

/**
 * Convert BME Alternatives (Growth/ScaleUp) corporate actions to unified format
 */
export function parseBmeAlternativesCorporateActions(
  actions: BmeCorporateActions,
): UnifiedCorporateActions {
  const result = emptyUnifiedCorporateActions();

  // Capital increases - use periodStart as the event date
  for (const item of actions.capitalIncreases) {
    const date = item.periodStart;
    if (date && !result.capitalIncreases.includes(date)) {
      result.capitalIncreases.push(date);
    }
  }

  // Consolidations = Reverse splits
  for (const item of actions.consolidations) {
    if (item.date && !result.reverseSplits.includes(item.date)) {
      result.reverseSplits.push(item.date);
    }
  }

  // Delistings
  for (const item of actions.delistings) {
    if (item.date && !result.delistings.includes(item.date)) {
      result.delistings.push(item.date);
    }
  }

  // Dividends - use exDate
  for (const item of actions.dividends) {
    if (item.exDate && !result.dividends.includes(item.exDate)) {
      result.dividends.push(item.exDate);
    }
  }

  // Listings (admissions)
  for (const item of actions.listings) {
    if (item.date && !result.listings.includes(item.date)) {
      result.listings.push(item.date);
    }
  }

  // Special payments - classify by payment class
  for (const item of actions.specialPayments) {
    if (!item.date) continue;

    // "En Acciones" = free allocation (scrip dividend)
    // "En Efectivo" = special dividend/payment (add to dividends)
    if (item.paymentClass === "En Acciones") {
      if (!result.freeAllocations.includes(item.date)) {
        result.freeAllocations.push(item.date);
      }
    } else {
      // Treat as special dividend
      if (!result.dividends.includes(item.date)) {
        result.dividends.push(item.date);
      }
    }
  }

  // Splits
  for (const item of actions.splits) {
    if (item.date && !result.splits.includes(item.date)) {
      result.splits.push(item.date);
    }
  }

  // Sort all arrays
  sortAllArrays(result);

  return result;
}

/**
 * Convert BME Continuo corporate actions to unified format
 */
export function parseBmeContinuoCorporateActions(
  actions: BmeContinuoCorporateActions,
): UnifiedCorporateActions {
  const result = emptyUnifiedCorporateActions();

  // Capital increases - use admissionDate, convert from YYYYMMDD to YYYY-MM-DD
  for (const item of actions.capitalIncreases) {
    const date = formatBmeDate(item.admissionDate);
    if (date && !result.capitalIncreases.includes(date)) {
      result.capitalIncreases.push(date);
    }
  }

  // Delistings
  for (const item of actions.delistings) {
    const date = formatBmeDate(item.admissionDate);
    if (date && !result.delistings.includes(date)) {
      result.delistings.push(date);
    }
  }

  // Dividends - use exDate
  for (const item of actions.dividends) {
    const date = formatBmeDate(item.exDate);
    if (date && !result.dividends.includes(date)) {
      result.dividends.push(date);
    }
  }

  // Mergers = Reverse splits (contrasplits)
  for (const item of actions.mergers) {
    const date = formatBmeDate(item.date);
    if (date && !result.reverseSplits.includes(date)) {
      result.reverseSplits.push(date);
    }
  }

  // New listings
  for (const item of actions.newListings) {
    const date = formatBmeDate(item.admissionDate);
    if (date && !result.listings.includes(date)) {
      result.listings.push(date);
    }
  }

  // Other payments - treat as special dividends or free allocations
  for (const item of actions.otherPayments) {
    const date = formatBmeDate(item.exDate);
    if (!date) continue;

    // Check if it's a share-based payment (free allocation)
    if (item.class.toLowerCase().includes("acciones")) {
      if (!result.freeAllocations.includes(date)) {
        result.freeAllocations.push(date);
      }
    } else {
      // Treat as special dividend
      if (!result.dividends.includes(date)) {
        result.dividends.push(date);
      }
    }
  }

  // Public offerings - these are not listings but capital market events
  // We could add them to capitalIncreases or create a separate category
  // For now, add to listings as they represent market access events
  for (const item of actions.publicOfferings) {
    const date = formatBmeDate(item.startingDate);
    if (date && !result.listings.includes(date)) {
      result.listings.push(date);
    }
  }

  // Splits
  for (const item of actions.splits) {
    const date = formatBmeDate(item.date);
    if (date && !result.splits.includes(date)) {
      result.splits.push(date);
    }
  }

  // Takeover bids
  for (const item of actions.takeoverBids) {
    const date = formatBmeDate(item.startingDate);
    if (date && !result.takeovers.includes(date)) {
      result.takeovers.push(date);
    }
  }

  // Sort all arrays
  sortAllArrays(result);

  return result;
}

/**
 * Convert BME API date format (YYYYMMDD) to ISO format (YYYY-MM-DD)
 */
function formatBmeDate(date: string | undefined): string | undefined {
  if (date?.length !== 8) return undefined;

  // Check if already in ISO format
  if (date.includes("-")) return date;

  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Sort all arrays in the corporate actions object
 */
function sortAllArrays(actions: UnifiedCorporateActions): void {
  for (const key of Object.keys(actions) as (keyof UnifiedCorporateActions)[]) {
    actions[key].sort();
  }
}
