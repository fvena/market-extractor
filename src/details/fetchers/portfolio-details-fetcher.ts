/**
 * Fetcher for Portfolio Stock Exchange product details
 * Uses REST API - no scraping needed
 */
import type {
  PortfolioDocumentsResponse,
  PortfolioPriceHistory,
  PostTradeResponse,
} from "../../types/portfolio.types";
import type { PortfolioDetails, PortfolioListing, ProductResult } from "../../types/types";
import { fetchJson } from "../../helpers/http";
import { buildPriceHistory } from "../parsers/portfolio-details-parser";
import { getMissingRequiredFields } from "../../helpers/missing-fields";

/**
 * Complete Portfolio details combining listing data with price history
 */
export interface PortfolioDetailResult {
  data?: PortfolioDetails;
  error?: string;
  fetchErrors?: string[];
  missingFields?: string[];
  success: boolean;
}

/**
 * Estimate market days between two dates.
 * Counts weekdays (Mon-Fri) and applies a correction factor for public holidays
 * (~250 market days/year vs ~260 weekdays/year in European markets).
 */
function estimateMarketDays(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  let weekdays = 0;

  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      weekdays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return Math.round(weekdays * (250 / 260));
}

/**
 * Fetch documents for a Portfolio product
 */
async function fetchDocuments(
  productUrl: string,
): Promise<{ data?: PortfolioDocumentsResponse; error?: string }> {
  const url = `${productUrl}/documents`;
  const result = await fetchJson<PortfolioDocumentsResponse>(url);

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data };
}

/**
 * Fetch price history for a Portfolio product
 */
async function fetchPriceHistory(
  productUrl: string,
  tradingStartDate: string,
): Promise<{ data?: PortfolioPriceHistory; error?: string }> {
  const today = new Date();
  const fromDate = tradingStartDate;
  const toDate = today.toISOString().split("T")[0] ?? "";
  const yearsFromDate = today.getFullYear() - new Date(fromDate).getFullYear();
  const size = yearsFromDate * 255; // 255 business days per year

  const url = `${productUrl}/post-trade?from=${fromDate}&to=${toDate}&page=0&size=${String(size)}`;

  const result = await fetchJson<PostTradeResponse>(url);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data?.content || !Array.isArray(result.data.content)) {
    return { error: `Invalid price history response: ${JSON.stringify(result.data)}` };
  }

  return {
    data: {
      periodEnd: toDate,
      periodStart: fromDate,
      prices: buildPriceHistory(result.data.content),
      tradingDays: estimateMarketDays(fromDate, toDate),
    },
  };
}

/**
 * Fetch details for a single Portfolio product
 * Uses listing data as base and fetches price history from API
 */
export async function fetchPortfolioDetails(
  listing: PortfolioListing,
  requiredFields: readonly string[],
): Promise<ProductResult<PortfolioDetails>> {
  try {
    // Validate required trading info
    const tradingStartDate = listing.tradingInfoBean?.tradingStartDate;
    if (!tradingStartDate) {
      return { error: "Missing tradingStartDate in tradingInfoBean" };
    }

    // Fetch price history and documents in parallel
    const [priceHistoryResult, documentsResult] = await Promise.all([
      fetchPriceHistory(listing.url, tradingStartDate),
      fetchDocuments(listing.url),
    ]);

    if (priceHistoryResult.error || !priceHistoryResult.data) {
      return { error: `Price history: ${priceHistoryResult.error ?? "No data returned"}` };
    }

    const priceHistory = priceHistoryResult.data;

    // Documents are optional - log warning but continue if fetch fails
    const documents = documentsResult.data;

    const details: PortfolioDetails = {
      ...listing,
      documents,
      fetchedAt: new Date().toISOString(),
      isin: listing.isinCode ?? "",
      priceHistory,
      sector: "SOCIMI",
    };

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
