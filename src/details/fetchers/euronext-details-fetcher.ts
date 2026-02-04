/**
 * Fetcher for Euronext product details
 * Orchestrates fetching from multiple AJAX endpoints per product
 */
import type {
  EuronextAddress,
  EuronextContact,
  EuronextDailyPrice,
  EuronextIcbClassification,
  EuronextIpoEntry,
  EuronextNotice,
  EuronextPriceHistory,
  EuronextRelatedInstrument,
  EuronextTradingInfo,
} from "../../types/euronext.types";
import type { EuronextDetails, EuronextListing, ProductResult } from "../../types/types";
import { buildFormData, fetchHtml, fetchHtmlWithRetry } from "../../helpers/http";
import { delay } from "../../helpers/browser";
import {
  buildPriceHistory,
  deduplicatePrices,
  parseAddressBlock,
  parseContactBlock,
  parseIcbBlock,
  parseIpoDateBlock,
  parseIpoShowcase,
  parseNoticesData,
  parsePriceHistoryTable,
  parseRelatedInstruments,
  parseTradingInfoBlock,
  sortPricesByDate,
} from "../parsers/euronext-details-parser";
import { euronextAccess } from "../../markets";
import { getMissingRequiredFields } from "../../helpers/missing-fields";
import { fetchListingDateFromChart } from "./euronext-date-from-chart-fetcher";

const BASE_URL = euronextAccess.urls.base;

/**
 * Build productId from listing item
 * Format: isin-market
 */
function buildProductId(listing: EuronextListing): string {
  const market = listing.markets[0];
  if (!market) {
    throw new Error("No market found");
  }
  return `${listing.isin}-${market}`;
}

/**
 * Fetch trading info from fs_tradinginfo_block
 */
async function fetchTradingInfo(
  baseUrl: string,
  productId: string,
): Promise<{ data?: EuronextTradingInfo; error?: string }> {
  const url = `${baseUrl}/en/ajax/getFactsheetInfoBlock/STOCK/${productId}/fs_tradinginfo_block`;
  const result = await fetchHtmlWithRetry(url);

  if (result.error) {
    return { error: result.error ?? "No data" };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that the html is not undefined
  return { data: parseTradingInfoBlock(result.html!) };
}

/**
 * Fetch IPO date from fs_tradinginfo_pea_block
 */
async function fetchIpoDate(
  baseUrl: string,
  productId: string,
): Promise<{ error?: string; ipoDate?: string }> {
  const url = `${baseUrl}/en/ajax/getFactsheetInfoBlock/STOCK/${productId}/fs_tradinginfo_pea_block`;
  const result = await fetchHtmlWithRetry(url);

  if (result.error) {
    return { error: result.error ?? "No data" };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that the html is not undefined
  return { ipoDate: parseIpoDateBlock(result.html!) };
}

/**
 * Fetch ICB classification from fs_icb_block
 */
async function fetchIcbClassification(
  baseUrl: string,
  productId: string,
): Promise<{ data?: EuronextIcbClassification; error?: string }> {
  const url = `${baseUrl}/en/ajax/getFactsheetInfoBlock/STOCK/${productId}/fs_icb_block`;
  const result = await fetchHtmlWithRetry(url);

  if (result.error) {
    return { error: result.error ?? "No data" };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that the html is not undefined
  return { data: parseIcbBlock(result.html!) };
}

/**
 * Fetch address from cofisem-public-address
 */
async function fetchAddress(
  baseUrl: string,
  productId: string,
): Promise<{ data?: EuronextAddress; error?: string }> {
  const url = `${baseUrl}/en/cofisem-public-address/${productId}`;
  const result = await fetchHtmlWithRetry(url);

  if (result.error) {
    return { error: result.error ?? "No data" };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that the html is not undefined
  return { data: parseAddressBlock(result.html!) };
}

/**
 * Fetch contact from cofisem-public-contact
 */
async function fetchContact(
  baseUrl: string,
  productId: string,
): Promise<{ data?: EuronextContact; error?: string }> {
  const url = `${baseUrl}/en/cofisem-public-contact/${productId}`;
  const result = await fetchHtmlWithRetry(url);

  if (result.error) {
    return { error: result.error ?? "No data" };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that the html is not undefined
  return { data: parseContactBlock(result.html!) };
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
  let pageNumber = 1;
  const maxPages = 10;

  while (pageNumber <= maxPages) {
    pageNumber++;

    // Safety limit
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
    await delay(500);
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
    const url = `${baseUrl}/en/ajax/getNoticePublicData/${productId}?alias=1&pageSize=${String(pageSize)}&pageNum=${String(pageNumber)}`;
    const result = await fetchHtmlWithRetry(url);

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

    await delay(500);
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
  const result = await fetchHtmlWithRetry(url);

  if (result.error || !result.html) {
    return { data: [], error: result.error };
  }

  return { data: parseIpoShowcase(result.html) };
}

/**
 * Fetch related instruments for a product
 *
 * @param baseUrl - Base URL (e.g., "https://live.euronext.com")
 * @param productId - Product ID in format "ISIN-MIC" (e.g., "XS2845835318-XMOT")
 * @param ticker - Ticker of the product
 */
export async function fetchRelatedInstruments(
  baseUrl: string,
  productId: string,
  ticker: string,
): Promise<{ data: EuronextRelatedInstrument[]; error?: string }> {
  const url = `${baseUrl}/en/ajax/related-instruments-off-canvas-content/equities/${productId}/securities1?currentPage=1`;
  const result = await fetchHtmlWithRetry(url);

  if (result.error || !result.html) {
    return { data: [], error: result.error };
  }

  const instruments = parseRelatedInstruments(result.html);
  const filteredInstruments = instruments.filter((instrument) => instrument.symbol !== ticker);

  return { data: filteredInstruments };
}

/**
 * Fetch complete details for a Euronext product
 * Uses parallel fetching for independent endpoints to improve performance
 */
export async function fetchEuronextDetails(
  listing: EuronextListing,
  requiredFields: readonly string[],
): Promise<ProductResult<EuronextDetails>> {
  const errors: string[] = [];
  const productId = buildProductId(listing);

  try {
    // ==========================================================================
    // PHASE 1: Parallel fetch of all independent endpoints
    // These endpoints don't depend on each other, so we can fetch them together
    // ==========================================================================
    const [
      tradingInfoResult,
      ipoResult,
      icbResult,
      addressResult,
      contactResult,
      priceHistoryResult,
      noticesResult,
      ipoEntriesResult,
      relatedInstrumentsResult,
    ] = await Promise.all([
      fetchTradingInfo(BASE_URL, productId),
      fetchIpoDate(BASE_URL, productId),
      fetchIcbClassification(BASE_URL, productId),
      fetchAddress(BASE_URL, productId),
      fetchContact(BASE_URL, productId),
      fetchPriceHistory(BASE_URL, productId),
      fetchNotices(BASE_URL, productId),
      fetchIpoShowcase(BASE_URL, listing.isin),
      fetchRelatedInstruments(BASE_URL, productId, listing.ticker),
    ]);

    // Collect errors from parallel fetches
    if (tradingInfoResult.error) errors.push(`Trading info: ${tradingInfoResult.error}`);
    if (ipoResult.error) errors.push(`IPO date: ${ipoResult.error}`);
    if (icbResult.error) errors.push(`ICB: ${icbResult.error}`);
    if (addressResult.error) errors.push(`Address: ${addressResult.error}`);
    if (contactResult.error) errors.push(`Contact: ${contactResult.error}`);
    if (priceHistoryResult.error) errors.push(`Price history: ${priceHistoryResult.error}`);
    if (noticesResult.error) errors.push(`Notices: ${noticesResult.error}`);
    if (ipoEntriesResult.error) errors.push(`IPO entries: ${ipoEntriesResult.error}`);
    if (relatedInstrumentsResult.error)
      errors.push(`Related instruments: ${relatedInstrumentsResult.error}`);

    // ==========================================================================
    // PHASE 2: Conditional fetch - listing date from chart (only if IPO date missing)
    // ==========================================================================
    let listingDate = ipoResult.ipoDate;
    if (!listingDate) {
      await delay(300); // Small delay before fallback request
      const chartResult = await fetchListingDateFromChart(BASE_URL, productId);
      if (chartResult.error) {
        errors.push(`Listing date from chart: ${chartResult.error}`);
      } else {
        listingDate = chartResult.listingDate;
      }
    }

    // If there are errors, return an error result
    if (errors.length > 0) {
      return {
        error: errors.join(", "),
      };
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
    const tradingInfo = tradingInfoResult.data!;
    const icb = icbResult.data!;
    const address = addressResult.data!;
    const contact = contactResult.data!;
    const priceHistory = priceHistoryResult.data!;
    const notices = noticesResult.data;
    const ipoEntries = ipoEntriesResult.data;
    const relatedInstruments = relatedInstrumentsResult.data;

    // Build the complete details object
    const details: EuronextDetails = {
      address: address.address,
      admittedShares: tradingInfo.admittedShares!,
      country: address.country,
      currency: tradingInfo.tradingCurrency ?? "EUR",
      email: contact.email,
      fetchedAt: new Date().toISOString(),
      ipoEntries,
      isin: listing.isin,
      listingDate: listingDate!,
      markets: listing.markets,
      name: listing.name,
      nominalValue: tradingInfo.nominalValue,
      notices: notices,
      phone: contact.phone,
      priceHistory,
      relatedInstruments,
      sector: icb.sector!,
      subsector: icb.subsector,
      supersector: icb.supersector,
      ticker: listing.ticker,
      tradingType: tradingInfo.tradingType,
      url: listing.url,
      website: address.website,
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    return {
      data: details,
      missingFields: getMissingRequiredFields(details, requiredFields),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
