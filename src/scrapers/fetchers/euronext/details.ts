/**
 * Fetcher for Euronext product details
 * Orchestrates fetching from multiple AJAX endpoints per product
 */

import type {
  EuronextAddress,
  EuronextContact,
  EuronextDailyPrice,
  EuronextDetailProgressCallback,
  EuronextDetails,
  EuronextIcbClassification,
  EuronextIpoEntry,
  EuronextListingItem,
  EuronextNotice,
  EuronextPriceHistory,
  EuronextQuote,
  EuronextTradingInfo,
} from "../../../markets/euronext/types";
import { EURONEXT_REQUIRED_FIELDS } from "../../../markets/euronext/types";
import { buildFormData, fetchHtml } from "../../clients/http";
import { delay } from "../../clients/browser";
import {
  buildPriceHistory,
  deduplicatePrices,
  parseAddressBlock,
  parseContactBlock,
  parseDetailedQuote,
  parseIcbBlock,
  parseIpoDateBlock,
  parseIpoShowcase,
  parseNoticesData,
  parsePriceHistoryTable,
  parseTradingInfoBlock,
  sortPricesByDate,
} from "../../parsers/euronext/details";

/** Delay between requests to avoid rate limiting */
const REQUEST_DELAY = 500;

/** Max retries for failed requests */
const MAX_RETRIES = 3;

/**
 * Result of fetching details for a single product
 */
export interface EuronextDetailResult {
  data?: EuronextDetails;
  error?: string;
  fetchErrors?: string[];
  missingFields?: string[];
  success: boolean;
}

/**
 * Build productId from listing item
 * Format: isin-market
 */
function buildProductId(listing: EuronextListingItem): string {
  return `${listing.isin}-${listing.market}`;
}

/**
 * Fetch HTML with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: { body?: string; method?: "GET" | "POST" } = {},
): Promise<{ error?: string; html?: string }> {
  let lastError = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await fetchHtml(url, options);

    if (result.html) {
      return { html: result.html };
    }

    lastError = result.error ?? "Empty response";

    // Don't retry on 404 or client errors
    if (result.status >= 400 && result.status < 500) {
      return { error: lastError };
    }

    // Wait before retry
    if (attempt < MAX_RETRIES - 1) {
      await delay(1000 * (attempt + 1));
    }
  }

  return { error: lastError };
}

/**
 * Fetch trading info from fs_tradinginfo_block
 */
async function fetchTradingInfo(
  baseUrl: string,
  productId: string,
): Promise<EuronextTradingInfo & { error?: string }> {
  const url = `${baseUrl}/en/ajax/getFactsheetInfoBlock/STOCK/${productId}/fs_tradinginfo_block`;
  const result = await fetchWithRetry(url);

  if (result.error || !result.html) {
    return { error: result.error ?? "No data" };
  }

  return parseTradingInfoBlock(result.html);
}

/**
 * Fetch IPO date from fs_tradinginfo_pea_block
 */
async function fetchIpoDate(
  baseUrl: string,
  productId: string,
): Promise<{ error?: string; ipoDate?: string }> {
  const url = `${baseUrl}/en/ajax/getFactsheetInfoBlock/STOCK/${productId}/fs_tradinginfo_pea_block`;
  const result = await fetchWithRetry(url);

  if (result.error || !result.html) {
    return { error: result.error ?? "No data" };
  }

  return { ipoDate: parseIpoDateBlock(result.html) };
}

/**
 * Fetch ICB classification from fs_icb_block
 */
async function fetchIcbClassification(
  baseUrl: string,
  productId: string,
): Promise<EuronextIcbClassification & { error?: string }> {
  const url = `${baseUrl}/en/ajax/getFactsheetInfoBlock/STOCK/${productId}/fs_icb_block`;
  const result = await fetchWithRetry(url);

  if (result.error || !result.html) {
    return { error: result.error ?? "No data" };
  }

  return parseIcbBlock(result.html);
}

/**
 * Fetch address from cofisem-public-address
 */
async function fetchAddress(
  baseUrl: string,
  productId: string,
): Promise<EuronextAddress & { error?: string }> {
  const url = `${baseUrl}/en/cofisem-public-address/${productId}`;
  const result = await fetchWithRetry(url);

  if (result.error || !result.html) {
    return { error: result.error ?? "No data" };
  }

  return parseAddressBlock(result.html);
}

/**
 * Fetch contact from cofisem-public-contact
 */
async function fetchContact(
  baseUrl: string,
  productId: string,
): Promise<EuronextContact & { error?: string }> {
  const url = `${baseUrl}/en/cofisem-public-contact/${productId}`;
  const result = await fetchWithRetry(url);

  if (result.error || !result.html) {
    return { error: result.error ?? "No data" };
  }

  return parseContactBlock(result.html);
}

/**
 * Fetch detailed quote from getDetailedQuote
 */
async function fetchDetailedQuote(
  baseUrl: string,
  productId: string,
): Promise<EuronextQuote & { error?: string }> {
  const url = `${baseUrl}/en/ajax/getDetailedQuote/${productId}`;
  const result = await fetchWithRetry(url);

  if (result.error || !result.html) {
    return { error: result.error ?? "No data" };
  }

  return parseDetailedQuote(result.html);
}

/**
 * Format date as YYYY-MM-DD for API
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

/**
 * Fetch price history from getHistoricalPricePopup
 *
 * The endpoint accepts POST with:
 * - adjusted: "Y"
 * - enddate: YYYY-MM-DD (most recent date to fetch)
 * - nbSession: number of trading days to fetch backwards
 *
 * The API limits to ~510 days per request and only returns data when enddate is today or later.
 * For older data, we paginate backwards.
 */
async function fetchPriceHistory(
  baseUrl: string,
  productId: string,
  onProgress?: EuronextDetailProgressCallback,
): Promise<{ data?: EuronextPriceHistory; error?: string }> {
  const url = `${baseUrl}/en/ajax/getHistoricalPricePopup/${productId}`;
  const allPrices: EuronextDailyPrice[] = [];

  // Start from today
  const today = new Date();
  let currentEndDate = formatDateForApi(today);

  // Target: January 1, 2023 (Portfolio start date)
  const targetDate = new Date("2023-01-01");

  // Max sessions per request (API limit is ~510)
  const maxSessionsPerRequest = 600;
  let pageNumber = 0;
  const maxPages = 10;

  while (pageNumber < maxPages) {
    pageNumber++;

    // Safety limit
    onProgress?.("Fetching price history", `page ${String(pageNumber)}`);

    const formData = buildFormData({
      adjusted: "Y",
      enddate: currentEndDate,
      nbSession: String(maxSessionsPerRequest),
    });

    const result = await fetchHtml(url, {
      body: formData,
      method: "POST",
    });

    if (result.error || !result.html) {
      // If first page fails, return error
      if (allPrices.length === 0) {
        return { error: result.error ?? "No data" };
      }
      // Otherwise, return what we have
      break;
    }

    const prices = parsePriceHistoryTable(result.html);

    if (prices.length === 0) {
      // No more data available
      break;
    }

    allPrices.push(...prices);

    // Find the oldest date in this batch to set as next end date
    const firstPrice = prices[0];
    if (!firstPrice) break;

    const oldestPrice = prices.reduce(
      (oldest, p) => (p.date < oldest.date ? p : oldest),
      firstPrice,
    );

    // Move end date to the day before the oldest date in this batch
    const oldestDate = new Date(oldestPrice.date);
    oldestDate.setDate(oldestDate.getDate() - 1);

    // Check if we've gone back far enough
    if (oldestDate < targetDate) {
      break;
    }

    currentEndDate = formatDateForApi(oldestDate);

    // Delay between requests
    await delay(REQUEST_DELAY);
  }

  // Deduplicate and sort
  const uniquePrices = deduplicatePrices(allPrices);
  const sortedPrices = sortPricesByDate(uniquePrices, false); // Most recent first

  return {
    data: buildPriceHistory(sortedPrices),
  };
}

/**
 * Fetch notices with pagination
 */
async function fetchNotices(
  baseUrl: string,
  productId: string,
  onProgress?: EuronextDetailProgressCallback,
): Promise<{ data: EuronextNotice[]; error?: string }> {
  const allNotices: EuronextNotice[] = [];
  const existingNumbers = new Set<string>();
  const pageSize = 50;
  const maxPages = 20;
  let pageNumber = 1;
  let total = 0;
  let hasMorePages = true;

  while (hasMorePages && pageNumber < maxPages) {
    // Safety limit
    onProgress?.("Fetching notices", `page ${String(pageNumber + 1)}`);

    const url = `${baseUrl}/en/ajax/getNoticePublicData/${productId}?alias=1&pageSize=${String(pageSize)}&pageNum=${String(pageNumber)}`;
    const result = await fetchWithRetry(url);

    if (result.error || !result.html) {
      // If first page fails, report error
      if (allNotices.length === 0 && result.error) {
        return { data: [], error: result.error };
      }
      break;
    }

    const { notices, total: responseTotal } = parseNoticesData(result.html);

    // First page gives us the total count
    if (pageNumber === 1) {
      total = responseTotal;
    }

    if (notices.length === 0) {
      break;
    }

    // Deduplicate by notice number
    for (const notice of notices) {
      if (!existingNumbers.has(notice.noticeNumber)) {
        existingNumbers.add(notice.noticeNumber);
        allNotices.push(notice);
      }
    }

    // Check if we need more pages
    const fetched = pageNumber * pageSize;
    if (fetched >= total) {
      hasMorePages = false;
    } else {
      pageNumber++;
    }

    await delay(REQUEST_DELAY);
  }

  return { data: allNotices };
}

/**
 * Fetch market migrations
 */
async function fetchIpoShowcase(
  baseUrl: string,
  isin: string,
): Promise<{ data: EuronextIpoEntry[]; error?: string }> {
  const url = `${baseUrl}/en/ajax/ipo-new-issue/showcase/${isin}`;
  const result = await fetchWithRetry(url);

  if (result.error || !result.html) {
    return { data: [], error: result.error };
  }

  return { data: parseIpoShowcase(result.html) };
}

/**
 * Get list of missing required fields
 */
function getMissingRequiredFields(details: EuronextDetails): string[] {
  const missing: string[] = [];

  for (const field of EURONEXT_REQUIRED_FIELDS) {
    const value = details[field as keyof EuronextDetails];
    const isEmpty = value === undefined || value === "" || value === 0;

    if (isEmpty) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * Fetch complete details for a Euronext product
 */
export async function fetchEuronextDetails(
  listing: EuronextListingItem,
  baseUrl: string,
  onProgress?: EuronextDetailProgressCallback,
): Promise<EuronextDetailResult> {
  const errors: string[] = [];
  const productId = buildProductId(listing);

  try {
    // Phase 1: Fetch trading info
    onProgress?.("Fetching trading info...");
    const tradingInfo = await fetchTradingInfo(baseUrl, productId);
    if (tradingInfo.error) errors.push(`Trading info: ${tradingInfo.error}`);
    await delay(REQUEST_DELAY);

    // Phase 2: Fetch IPO date
    onProgress?.("Fetching IPO date...");
    const ipoResult = await fetchIpoDate(baseUrl, productId);
    if (ipoResult.error) errors.push(`IPO date: ${ipoResult.error}`);
    await delay(REQUEST_DELAY);

    // Phase 3: Fetch ICB classification
    onProgress?.("Fetching sector info...");
    const icbResult = await fetchIcbClassification(baseUrl, productId);
    if (icbResult.error) errors.push(`ICB: ${icbResult.error}`);
    await delay(REQUEST_DELAY);

    // Phase 4: Fetch address
    onProgress?.("Fetching address...");
    const addressResult = await fetchAddress(baseUrl, productId);
    if (addressResult.error) errors.push(`Address: ${addressResult.error}`);
    await delay(REQUEST_DELAY);

    // Phase 5: Fetch contact
    onProgress?.("Fetching contact...");
    const contactResult = await fetchContact(baseUrl, productId);
    if (contactResult.error) errors.push(`Contact: ${contactResult.error}`);
    await delay(REQUEST_DELAY);

    // Phase 6: Fetch detailed quote
    onProgress?.("Fetching quote...");
    const quoteResult = await fetchDetailedQuote(baseUrl, productId);
    if (quoteResult.error) errors.push(`Quote: ${quoteResult.error}`);
    await delay(REQUEST_DELAY);

    // Phase 7: Fetch price history
    onProgress?.("Fetching price history...");
    const priceResult = await fetchPriceHistory(baseUrl, productId, onProgress);
    if (priceResult.error) errors.push(`Price history: ${priceResult.error}`);
    await delay(REQUEST_DELAY);

    // Phase 8: Fetch notices
    onProgress?.("Fetching notices...");
    const noticesResult = await fetchNotices(baseUrl, productId, onProgress);
    if (noticesResult.error) errors.push(`Notices: ${noticesResult.error}`);
    await delay(REQUEST_DELAY);

    // Phase 9: Fetch migrations
    onProgress?.("Fetching migrations...");
    const ipoEntriesResult = await fetchIpoShowcase(baseUrl, listing.isin);
    if (ipoEntriesResult.error) errors.push(`IPO entries: ${ipoEntriesResult.error}`);

    // Build the complete details object
    const details: EuronextDetails = {
      // From address
      address: addressResult.address,
      // From trading info
      admittedShares: tradingInfo.admittedShares,
      country: addressResult.country,
      currency: tradingInfo.tradingCurrency ?? "EUR",

      // From contact
      email: contactResult.email,
      // Metadata
      errors: errors.length > 0 ? errors : undefined,
      fetchedAt: new Date().toISOString(),
      // Migrations
      ipoEntries: ipoEntriesResult.data,

      // From listing
      isin: listing.isin,

      // From quote
      lastTradedPrice: quoteResult.lastTradedPrice,
      // From IPO block
      listingDate: ipoResult.ipoDate,
      market: listing.market,

      marketName: quoteResult.marketName,
      name: listing.name,
      nominalValue: tradingInfo.nominalValue,
      // Notices
      notices: noticesResult.data,

      phone: contactResult.phone,
      // Price history
      priceHistory: priceResult.data ?? {
        periodEnd: new Date().toISOString().split("T")[0] ?? "",
        periodStart:
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? "",
        prices: [],
        tradingDays: 0,
      },

      // From ICB block
      sector: icbResult.sector,
      status: "success",
      subsector: icbResult.subsector,

      supersector: icbResult.supersector,

      ticker: listing.ticker,

      tradingType: tradingInfo.tradingType,

      url: listing.url,
      valuationClose: quoteResult.valuationClose,
      website: addressResult.website,
    };

    // Determine status based on missing required fields
    const missingFields = getMissingRequiredFields(details);

    if (missingFields.length > 0) {
      if (missingFields.some((field) => ["isin", "ticker"].includes(field))) {
        details.status = "error";
        return {
          data: details,
          error: `Missing critical fields: ${missingFields.join(", ")}`,
          fetchErrors: errors.length > 0 ? errors : undefined,
          missingFields,
          success: false,
        };
      }
      details.status = "warning";
    }

    return {
      data: details,
      fetchErrors: errors.length > 0 ? errors : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      success: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Fetch details for multiple products
 */
export async function fetchEuronextDetailsBatch(
  listings: EuronextListingItem[],
  baseUrl: string,
  onProgress?: (current: number, total: number, name: string, phase: string) => void,
): Promise<EuronextDetailResult[]> {
  const results: EuronextDetailResult[] = [];

  for (let index = 0; index < listings.length; index++) {
    const listing = listings[index];
    if (!listing) continue;

    // Create a progress callback that includes the product context
    const productProgress: EuronextDetailProgressCallback = (phase, detail) => {
      const fullPhase = detail ? `${phase} (${detail})` : phase;
      onProgress?.(index + 1, listings.length, listing.name, fullPhase);
    };

    const result = await fetchEuronextDetails(listing, baseUrl, productProgress);
    results.push(result);

    // Delay between products
    if (index < listings.length - 1) {
      await delay(REQUEST_DELAY * 2);
    }
  }

  return results;
}
