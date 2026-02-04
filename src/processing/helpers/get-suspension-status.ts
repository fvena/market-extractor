/**
 * Helper to determine current trading suspension status
 *
 * Different markets provide suspension information in different ways:
 * - BME Continuo: suspendedDate = "S" (flag) or empty
 * - BME Growth/ScaleUp: suspendedDate = ISO date when suspended
 * - Euronext: notices with "Trading suspension" and "Trading resumption"
 * - Portfolio: tradingInfoBean.halted (boolean) or haltedUntilDate
 */

import type { UnifiedCorporateActions } from "../../types/types";

/**
 * Determine if currently suspended based on BME data
 * BME Continuo uses "S" as a flag, BME Alternatives uses dates
 */
export function isSuspendedBme(suspendedDate: string | undefined): boolean {
  if (!suspendedDate) return false;

  // BME Continuo uses "S" as a suspension flag
  if (suspendedDate === "S") return true;

  // BME Growth/ScaleUp uses actual dates - if there's a date, it's suspended
  // (there's no separate "resumed" field, so presence of date means suspended)
  return suspendedDate.length > 0;
}

/**
 * Determine if currently suspended based on Euronext corporate actions
 * Compares the most recent suspension vs most recent resumption
 */
export function isSuspendedEuronext(corporateActions: UnifiedCorporateActions): boolean {
  const suspensions = corporateActions.tradingSuspensions;
  const resumptions = corporateActions.tradingResumptions;

  // No suspensions ever - not suspended
  if (suspensions.length === 0) return false;

  // Has suspensions but no resumptions - suspended
  if (resumptions.length === 0) return true;

  // Compare most recent dates (arrays are sorted oldest first)
  // We've already checked that both arrays have length > 0
  const lastSuspension = suspensions.at(-1);
  const lastResumption = resumptions.at(-1);

  // Guard clause (should never happen due to length checks above)
  if (!lastSuspension || !lastResumption) return false;

  // If last suspension is after last resumption - currently suspended
  // If last resumption is after or equal to last suspension - not suspended
  return lastSuspension > lastResumption;
}

/**
 * Determine if currently suspended based on Portfolio data
 * Uses halted flag or compares haltedUntilDate with current date
 */
export function isSuspendedPortfolio(
  halted: boolean | undefined,
  haltedUntilDate: string | undefined,
): boolean {
  // Explicit halted flag
  if (halted === true) return true;
  if (halted === false) return false;

  // Check haltedUntilDate if present
  if (haltedUntilDate) {
    const haltedUntil = new Date(haltedUntilDate);
    const now = new Date();

    // If haltedUntilDate is in the future, still suspended
    return haltedUntil > now;
  }

  return false;
}

/**
 * Get the suspension date for a product
 * Returns the date when suspension started, or undefined if not suspended
 */
export function getSuspensionDate(
  suspendedDate: string | undefined,
  corporateActions: UnifiedCorporateActions,
): string | undefined {
  // BME style - direct date (skip "S" flag as it's not a date)
  if (suspendedDate && suspendedDate !== "S" && suspendedDate.length >= 10) {
    return suspendedDate;
  }

  // Euronext style - get the most recent suspension date if currently suspended
  if (isSuspendedEuronext(corporateActions)) {
    const suspensions = corporateActions.tradingSuspensions;
    return suspensions.length > 0 ? suspensions.at(-1) : undefined;
  }

  return undefined;
}
