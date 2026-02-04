import type { EuronextDetails, MarketId } from "../../types/types";
import { parseIpoDate } from "../../helpers/parsing";

interface EuronextListingDates {
  /** Date when the product entered the current market (transfer or original IPO in this market) */
  marketListingDate: string;
  /** Date of the first known IPO (earliest entry in ipoEntries or fallback to details.listingDate) */
  originalListingDate: string;
}

/**
 * Market patterns for matching ipoEntries to target markets
 */
const MARKET_PATTERNS: Record<MarketId, RegExp[]> = {
  "bme-continuo": [],
  "bme-growth": [],
  "bme-scaleup": [],
  "euronext-access": [/euronext access/i, /^access$/i],
  "euronext-expand": [/euronext expand/i, /^expand$/i],
  "euronext-growth": [/euronext growth/i, /alternext/i, /^growth$/i],
  "euronext-regulated": [
    /euronext oslo/i,
    /oslo børs/i,
    /euronext paris/i,
    /euronext amsterdam/i,
    /euronext brussels/i,
    /euronext lisbon/i,
    /euronext milan/i,
    /^euronext$/i,
  ],
  portfolio: [],
};

/**
 * Check if an exchangeMarket matches the target market
 */
function matchesMarket(exchangeMarket: string | undefined, targetMarketId: MarketId): boolean {
  if (!exchangeMarket) return false;

  const patterns = MARKET_PATTERNS[targetMarketId];
  if (patterns.length === 0) return false;

  return patterns.some((pattern) => pattern.test(exchangeMarket));
}

/**
 * Calculate listing dates for Euronext products based on ipoEntries
 *
 * Logic:
 * 1. originalListingDate: The earliest IPO entry date, or details.listingDate as fallback
 * 2. marketListingDate: The date when the product entered the current market:
 *    - If there's a Transfer to the current market, use that date
 *    - Otherwise, use the earliest IPO entry for the current market
 *    - Fallback to originalListingDate if no market-specific entry found
 *
 * @param details - Product details including ipoEntries
 * @param marketId - The target market ID
 * @returns Object with marketListingDate and originalListingDate
 */
export function getEuronextListingDates(
  details: EuronextDetails,
  marketId: MarketId,
): EuronextListingDates {
  const { ipoEntries, listingDate } = details;

  // Default fallback
  const fallbackDate = listingDate;

  // No ipoEntries - use the listingDate from details for both
  if (ipoEntries.length === 0) {
    return {
      marketListingDate: fallbackDate,
      originalListingDate: fallbackDate,
    };
  }

  // Sort ipoEntries by date (oldest first), filtering entries with valid dates
  const entriesWithDates = ipoEntries.filter((entry): entry is typeof entry & { ipoDate: string } =>
    Boolean(entry.ipoDate),
  );

  const sortedEntries = [...entriesWithDates].sort((a, b) => {
    const dateA = parseIpoDate(a.ipoDate);
    const dateB = parseIpoDate(b.ipoDate);
    return dateA.localeCompare(dateB);
  });

  if (sortedEntries.length === 0) {
    return {
      marketListingDate: fallbackDate,
      originalListingDate: fallbackDate,
    };
  }

  // Original listing date: earliest entry
  const earliestEntry = sortedEntries[0];
  const originalListingDate = earliestEntry ? parseIpoDate(earliestEntry.ipoDate) : fallbackDate;

  // Find the entry for the current market
  // Priority 1: Last Transfer to this market
  // Priority 2: First IPO in this market (non-transfer)
  // Priority 3: Fall back to original listing date

  let marketListingDate = originalListingDate;

  // Look for transfers to the current market (prefer the most recent one)
  for (let index = sortedEntries.length - 1; index >= 0; index--) {
    const entry = sortedEntries[index];
    if (!entry) continue;

    const isTransfer = entry.ipoTypes.some((type) => type.toLowerCase() === "transfer");
    if (isTransfer && matchesMarket(entry.exchangeMarket, marketId)) {
      marketListingDate = parseIpoDate(entry.ipoDate);
      break;
    }
  }

  // If no transfer found, look for any entry matching this market
  if (marketListingDate === originalListingDate) {
    for (const entry of sortedEntries) {
      if (matchesMarket(entry.exchangeMarket, marketId)) {
        marketListingDate = parseIpoDate(entry.ipoDate);
        break;
      }
    }
  }

  // Special case: if listingDate from details is earlier than our calculated original,
  // it might be from a market outside Euronext, use it as the original
  if (fallbackDate < originalListingDate) {
    return {
      marketListingDate,
      originalListingDate: fallbackDate,
    };
  }

  return {
    marketListingDate,
    originalListingDate,
  };
}
