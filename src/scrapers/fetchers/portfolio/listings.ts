import type { IssuanceMarketBean, PortfolioListingItem } from "../../../markets/portfolio/types";
import type { ProgressCallback } from "../../../markets/types";
import { fetchJson } from "../../clients/http";

/**
 * Result of a Portfolio scraping operation
 */
export interface PortfolioScrapingResult {
  data: PortfolioListingItem[];
  error?: string;
  warnings: string[];
}

/**
 * Base URL for constructing product detail URLs
 */
const PORTFOLIO_DETAIL_BASE = "https://api.portfolio.exchange/open/market";

/**
 * Construct the product detail URL from an issuance ID
 */
function buildProductUrl(id: number | undefined): string {
  if (id === undefined) return "";
  return `${PORTFOLIO_DETAIL_BASE}/${String(id)}`;
}

/**
 * Fetch Portfolio listings via REST API
 */
export async function fetchPortfolioListings(
  url: string,
  onProgress?: ProgressCallback,
): Promise<PortfolioScrapingResult> {
  const warnings: string[] = [];

  onProgress?.(0, 1, "Fetching from API...");

  const result = await fetchJson<IssuanceMarketBean[]>(url);

  if (result.error) {
    return {
      data: [],
      error: result.error,
      warnings,
    };
  }

  if (!result.data || !Array.isArray(result.data)) {
    return {
      data: [],
      error: "Invalid API response: expected an array",
      warnings,
    };
  }

  onProgress?.(1, 2, `Processing ${String(result.data.length)} items...`);

  // Add the constructed URL to each item
  const data: PortfolioListingItem[] = result.data.map((item) => ({
    ...item,
    url: buildProductUrl(item.id),
  }));

  onProgress?.(2, 2, `Complete: ${String(data.length)} items`);

  return { data, warnings };
}
