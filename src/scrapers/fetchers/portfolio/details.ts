/**
 * Fetcher for Portfolio Stock Exchange product details
 * Uses REST API - no scraping needed
 */
import type {
  PortfolioDetailProgressCallback,
  PortfolioListingItem,
  PortfolioPriceHistory,
  PortfolioProductDetails,
  PostTradeResponse,
} from "../../../markets/portfolio/types";
import { fetchJson } from "../../clients/http";
import { buildPriceHistory } from "../../parsers/portfolio/details";

/**
 * Complete Portfolio details combining listing data with price history
 */
export interface PortfolioDetailResult {
  data?: PortfolioProductDetails;
  error?: string;
  fetchErrors?: string[];
  missingFields?: string[];
  success: boolean;
}

/**
 * Fetch price history for a Portfolio product
 */
async function fetchPriceHistory(
  productUrl: string,
  onProgress?: PortfolioDetailProgressCallback,
): Promise<{ data?: PortfolioPriceHistory; error?: string }> {
  const today = new Date();
  const fromDate = "2023-01-01";
  const toDate = today.toISOString().split("T")[0] ?? "";
  const yearsFromDate = today.getFullYear() - new Date(fromDate).getFullYear();
  const size = yearsFromDate * 255; // 255 business days per year

  const url = `${productUrl}/post-trade?from=${fromDate}&to=${toDate}&page=0&size=${String(size)}`;

  onProgress?.("Fetching price history", `${fromDate} to ${toDate}`);

  const result = await fetchJson<PostTradeResponse>(url);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data?.content || !Array.isArray(result.data.content)) {
    return { error: `Invalid price history response: ${JSON.stringify(result.data)}` };
  }

  onProgress?.("Processing price history", `${String(result.data.content.length)} trades`);

  return {
    data: {
      periodEnd: toDate,
      periodStart: fromDate,
      prices: buildPriceHistory(result.data.content),
      tradingDays: result.data.content.length,
    },
  };
}

/**
 * Fetch details for a single Portfolio product
 * Uses listing data as base and fetches price history from API
 */
export async function fetchPortfolioDetails(
  listing: PortfolioListingItem,
  onProgress?: PortfolioDetailProgressCallback,
): Promise<PortfolioDetailResult> {
  try {
    // Fetch price history
    onProgress?.("Fetching post-trade transactions...");
    const priceHistoryResult = await fetchPriceHistory(listing.url, onProgress);
    if (priceHistoryResult.error || !priceHistoryResult.data) {
      return {
        error: priceHistoryResult.error ?? "No data returned",
        success: false,
      };
    }

    const priceHistory = priceHistoryResult.data;

    const details: PortfolioListingItem & { priceHistory: PortfolioPriceHistory } = {
      ...listing,
      priceHistory,
    };

    return { data: details, success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}
