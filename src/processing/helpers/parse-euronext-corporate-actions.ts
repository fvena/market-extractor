/**
 * Parser for Euronext corporate actions from notices
 *
 * Extracts corporate action dates from notice titles using pattern matching.
 * Each corporate action type stores only an array of dates (ISO format).
 */

import type { EuronextNotice } from "../../types/euronext.types";
import type { CorporateActionType, UnifiedCorporateActions } from "../../types/types";

/**
 * Pattern matchers for each corporate action type
 * Order matters: more specific patterns should come first
 */
const CORPORATE_ACTION_PATTERNS: Record<CorporateActionType, RegExp[]> = {
  // Capital decreases
  capitalDecreases: [/capital decrease/i],

  // Capital increases - subscriptions, offerings
  capitalIncreases: [/capital increase/i, /increase with subscription/i, /subsequent offering/i],

  // Delistings
  delistings: [/delisting/i, /exclusion/i],

  // Dividends - various announcement types
  dividends: [/dividend/i, /optional dividend/i],

  // Free allocations (scrip dividends, bonus shares)
  freeAllocations: [/free allocation/i, /bonus.*shares/i],

  // Listings - IPOs, direct listings, admissions
  listings: [
    /new listing/i,
    /direct listing/i,
    /listing access/i,
    /\bipo\b/i,
    /admission.*securities/i,
  ],

  // Market changes - compartment changes, penalty bench
  marketChanges: [/change of compartment/i, /transfer to penalty/i, /penalty bench/i],

  // Name changes
  nameChanges: [/change of issuer/i, /change of.*name/i, /name change/i],

  // Reverse splits (contrasplits) - check BEFORE splits
  reverseSplits: [/reverse split/i, /contrasplit/i],

  // Splits (regular) - must not match "reverse split"
  splits: [/(?<!reverse )split/i],

  // Takeovers (OPAs)
  takeovers: [/takeover/i, /tender offer/i, /\bopa\b/i],

  // Trading resumptions (when suspension is lifted) - check BEFORE suspensions
  tradingResumptions: [/trading resumption/i, /resumption of trading/i],

  // Trading suspensions
  tradingSuspensions: [/trading suspension/i, /suspension pending/i],
};

/**
 * Classification priority order
 * More specific types should be checked first to avoid misclassification
 */
const CLASSIFICATION_ORDER: CorporateActionType[] = [
  "reverseSplits", // Must check before "splits"
  "tradingResumptions", // Must check before "tradingSuspensions"
  "dividends",
  "capitalIncreases",
  "capitalDecreases",
  "splits",
  "listings",
  "delistings",
  "takeovers",
  "tradingSuspensions",
  "marketChanges",
  "nameChanges",
  "freeAllocations",
];

/**
 * Classify a notice title into a corporate action type
 * Returns undefined if no pattern matches
 */
export function classifyNotice(title: string): CorporateActionType | undefined {
  if (!title) return undefined;

  // Clean the title (remove "Toggle Visibility " prefix if present)
  const cleanTitle = title.replace(/^Toggle Visibility\s*/i, "");

  for (const actionType of CLASSIFICATION_ORDER) {
    const patterns = CORPORATE_ACTION_PATTERNS[actionType];
    for (const pattern of patterns) {
      if (pattern.test(cleanTitle)) {
        return actionType;
      }
    }
  }

  return undefined;
}

/**
 * Create empty corporate actions structure
 */
export function emptyUnifiedCorporateActions(): UnifiedCorporateActions {
  return {
    capitalDecreases: [],
    capitalIncreases: [],
    delistings: [],
    dividends: [],
    freeAllocations: [],
    listings: [],
    marketChanges: [],
    nameChanges: [],
    reverseSplits: [],
    splits: [],
    takeovers: [],
    tradingResumptions: [],
    tradingSuspensions: [],
  };
}

/**
 * Parse notices into unified corporate actions structure
 * Extracts dates grouped by corporate action type
 */
export function parseEuronextCorporateActions(notices: EuronextNotice[]): UnifiedCorporateActions {
  const result = emptyUnifiedCorporateActions();

  if (notices.length === 0) {
    return result;
  }

  for (const notice of notices) {
    const actionType = classifyNotice(notice.title);

    if (
      actionType &&
      notice.date && // Add date to the appropriate array (avoid duplicates)
      !result[actionType].includes(notice.date)
    ) {
      result[actionType].push(notice.date);
    }
  }

  // Sort all arrays by date (oldest first)
  for (const key of Object.keys(result) as CorporateActionType[]) {
    result[key].sort();
  }

  return result;
}

/**
 * Get the earliest listing date from corporate actions
 * Useful for determining when a company first listed
 */
export function getEarliestListingDate(
  corporateActions: UnifiedCorporateActions,
): string | undefined {
  const listings = corporateActions.listings;
  return listings.length > 0 ? listings[0] : undefined;
}

/**
 * Get corporate actions summary (counts only)
 */
export function getCorporateActionsSummary(
  corporateActions: UnifiedCorporateActions,
): Record<CorporateActionType, number> {
  const summary = {} as Record<CorporateActionType, number>;

  for (const key of Object.keys(corporateActions) as CorporateActionType[]) {
    summary[key] = corporateActions[key].length;
  }

  return summary;
}
