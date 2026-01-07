/**
 * Fetcher for BME Continuo product details
 * Uses REST API - no scraping needed
 */

import type {
  BmeContinuoCapitalIncreaseApi,
  BmeContinuoCompanyDataResponse,
  BmeContinuoCorporateActions,
  BmeContinuoDelistingApi,
  BmeContinuoDetails,
  BmeContinuoDividendApi,
  BmeContinuoHistoricalPricesResponse,
  BmeContinuoLastPeriodsResponse,
  BmeContinuoListingItem,
  BmeContinuoMergerApi,
  BmeContinuoNewListingApi,
  BmeContinuoOtherPaymentApi,
  BmeContinuoPriceDataApi,
  BmeContinuoPublicOfferingApi,
  BmeContinuoShareDetailsResponse,
  BmeContinuoSplitApi,
  BmeContinuoTakeoverBidApi,
  BmeDailyPrice,
  BmePriceHistory,
  BmeYearlyData,
  DetailProgressCallback,
} from "../../../markets/bme/types";
import { BME_CONTINUO_REQUIRED_FIELDS } from "../../../markets/bme/types";
import { fetchJson } from "../../clients/http";
import { delay } from "../../clients/browser";

// API base URL
const API_BASE = "https://apiweb.bolsasymercados.es/Market/v1/EQ";

/**
 * Result of fetching details for a single BME Continuo product
 */
export interface BmeContinuoDetailResult {
  data?: BmeContinuoDetails;
  error?: string;
  fetchErrors?: string[];
  missingFields?: string[];
  success: boolean;
}

/**
 * Extract company key from ISIN (positions 5-9)
 * Example: ES0180907000 → 80907
 */
export function extractCompanyKey(isin: string): string {
  if (isin.length < 10) return "";
  return isin.slice(4, 9);
}

/**
 * Format date to API format: YYYYMMDD
 */
function formatApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(year)}${month}${day}`;
}

/**
 * Parse API date format (YYYYMMDD) to ISO format (YYYY-MM-DD)
 */
function parseApiDate(dateString: string): string {
  if (dateString.length !== 8) return "";
  const year = dateString.slice(0, 4);
  const month = dateString.slice(4, 6);
  const day = dateString.slice(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Get date range for corporate actions (5 years back)
 */
function getCorporateActionsDateRange(): { from: string; to: string } {
  const today = new Date();
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(today.getFullYear() - 5);

  return {
    from: formatApiDate(fiveYearsAgo),
    to: formatApiDate(today),
  };
}

/**
 * Get date range for price history (last 365 days)
 */
function getPriceHistoryDateRange(): { from: string; to: string } {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(today.getDate() - 365);

  return {
    from: formatApiDate(oneYearAgo),
    to: formatApiDate(today),
  };
}

/**
 * Fetch share details from API
 */
async function fetchShareDetails(
  isin: string,
): Promise<{ data?: BmeContinuoShareDetailsResponse; error?: string }> {
  const url = `${API_BASE}/ShareDetailsInfo?isin=${isin}`;
  const result = await fetchJson<BmeContinuoShareDetailsResponse>(url);

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data };
}

/**
 * Fetch company data from API
 */
async function fetchCompanyData(
  companyKey: string,
): Promise<{ data?: BmeContinuoCompanyDataResponse; error?: string }> {
  const url = `${API_BASE}/CompanyData/AllData?companyKey=${companyKey}`;
  const result = await fetchJson<BmeContinuoCompanyDataResponse>(url);

  if (result.error) {
    return { error: result.error };
  }

  return { data: result.data };
}

/**
 * Fetch yearly history data from API
 */
async function fetchYearlyHistory(
  isin: string,
): Promise<{ data?: BmeYearlyData[]; error?: string }> {
  const url = `${API_BASE}/LastPeriods?isin=${isin}`;
  const result = await fetchJson<BmeContinuoLastPeriodsResponse>(url);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data?.data) {
    return { data: [] };
  }

  // Transform API response to BmeYearlyData[]
  const yearlyData: BmeYearlyData[] = result.data.data.map((item) => ({
    closePrice: item.close,
    marketCap: item.capitalisation,
    shares: item.shares,
    turnover: item.turnover,
    volume: item.volume,
    year: item.year,
  }));

  return { data: yearlyData };
}

/**
 * Fetch price history from API
 */
async function fetchPriceHistory(
  isin: string,
  onProgress?: DetailProgressCallback,
): Promise<{ data?: BmePriceHistory; error?: string }> {
  const { from, to } = getPriceHistoryDateRange();
  const url = `${API_BASE}/HistoricalSharesPrices?type=V&pageSize=0&ISIN=${isin}&from=${from}&to=${to}`;

  onProgress?.("Fetching price history", `${from} to ${to}`);

  const result = await fetchJson<BmeContinuoHistoricalPricesResponse>(url);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data?.data) {
    return {
      data: {
        marketDays: 0,
        periodEnd: parseApiDate(to),
        periodStart: parseApiDate(from),
        prices: [],
      },
    };
  }

  // Transform API response to BmeDailyPrice[]
  const prices: BmeDailyPrice[] = result.data.data.map((item: BmeContinuoPriceDataApi) => ({
    closePrice: item.close,
    date: parseApiDate(item.date),
    turnover: item.turnover,
    volume: item.volume,
  }));

  return {
    data: {
      marketDays: result.data.totalResults,
      periodEnd: parseApiDate(to),
      periodStart: parseApiDate(from),
      prices,
    },
  };
}

/**
 * Generic API response with data array
 */
interface ApiListResponse<T> {
  data: T[];
  hasMoreResults: boolean;
  params: Record<string, unknown>;
  totalResults: number;
}

/**
 * Fetch a single corporate action type
 */
async function fetchCorporateActionType<T>(
  endpoint: string,
  companyKey: string,
  dateRange: { from: string; to: string },
): Promise<T[]> {
  const url = `${API_BASE}/CorporateActions/${endpoint}?from=${dateRange.from}&to=${dateRange.to}&tradingSystem=SIBE&companyKey=${companyKey}&listingType=All&page=0`;

  const result = await fetchJson<ApiListResponse<T>>(url);

  if (result.error || !result.data?.data) {
    return [];
  }

  return result.data.data;
}

/**
 * Fetch all corporate actions for a company
 */
async function fetchCorporateActions(
  companyKey: string,
  isin: string,
  onProgress?: DetailProgressCallback,
): Promise<{ data: BmeContinuoCorporateActions; errors: string[] }> {
  const errors: string[] = [];
  const dateRange = getCorporateActionsDateRange();

  onProgress?.("Fetching corporate actions...");

  // Fetch all corporate action types in parallel
  const [
    dividends,
    publicOfferings,
    takeoverBids,
    newListings,
    delistings,
    capitalIncreases,
    splits,
    mergers,
    otherPayments,
  ] = await Promise.all([
    fetchCorporateActionType<BmeContinuoDividendApi>("Dividends", companyKey, dateRange),
    fetchCorporateActionType<BmeContinuoPublicOfferingApi>(
      "PublicOfferings",
      companyKey,
      dateRange,
    ),
    fetchCorporateActionType<BmeContinuoTakeoverBidApi>("TakeoverBids", companyKey, dateRange),
    fetchCorporateActionType<BmeContinuoNewListingApi>("NewListings", companyKey, dateRange),
    fetchCorporateActionType<BmeContinuoDelistingApi>("Delistings", companyKey, dateRange),
    fetchCorporateActionType<BmeContinuoCapitalIncreaseApi>(
      "CapitalIncreases",
      companyKey,
      dateRange,
    ),
    fetchCorporateActionType<BmeContinuoSplitApi>("Splits", companyKey, dateRange),
    fetchCorporateActionType<BmeContinuoMergerApi>("Mergers", companyKey, dateRange),
    fetchCorporateActionType<BmeContinuoOtherPaymentApi>("OtherPayments", companyKey, dateRange),
  ]);

  // Filter by ISIN where applicable
  const filteredDividends = dividends.filter((d) => d.isin === isin);
  const filteredNewListings = newListings.filter((l) => l.isin === isin);
  const filteredDelistings = delistings.filter((d) => d.isin === isin);
  const filteredCapitalIncreases = capitalIncreases.filter((c) => c.isin === isin);
  const filteredSplits = splits.filter((s) => s.isin === isin || s.previousIsin === isin);
  const filteredOtherPayments = otherPayments.filter((p) => p.isin === isin);

  return {
    data: {
      capitalIncreases: filteredCapitalIncreases,
      delistings: filteredDelistings,
      dividends: filteredDividends,
      mergers,
      newListings: filteredNewListings,
      otherPayments: filteredOtherPayments,
      publicOfferings,
      splits: filteredSplits,
      takeoverBids,
    },
    errors,
  };
}

/**
 * Get missing required fields
 */
function getMissingRequiredFields(details: BmeContinuoDetails): string[] {
  const missing: string[] = [];

  for (const field of BME_CONTINUO_REQUIRED_FIELDS) {
    const value = details[field as keyof BmeContinuoDetails];

    const isEmpty = value === undefined || value === "" || value === 0;
    if (isEmpty) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * Fetch complete details for a BME Continuo product
 */
export async function fetchBmeContinuoDetails(
  listing: BmeContinuoListingItem,
  onProgress?: DetailProgressCallback,
): Promise<BmeContinuoDetailResult> {
  const errors: string[] = [];

  try {
    // Use ISIN from listing
    const isin = listing.isin;

    if (!isin) {
      return {
        error: `Missing ISIN in listing: ${listing.name}`,
        success: false,
      };
    }

    const companyKey = extractCompanyKey(isin);

    if (!companyKey) {
      return {
        error: `Could not extract company key from ISIN: ${isin}`,
        success: false,
      };
    }

    // Phase 1: Fetch share details
    onProgress?.("Fetching share details...");
    const shareDetailsResult = await fetchShareDetails(isin);

    if (shareDetailsResult.error || !shareDetailsResult.data) {
      return {
        error: shareDetailsResult.error ?? "No share details returned",
        success: false,
      };
    }

    await delay(300);

    // Phase 2: Fetch company data
    onProgress?.("Fetching company data...");
    const companyDataResult = await fetchCompanyData(companyKey);

    if (companyDataResult.error) {
      errors.push(`Company data: ${companyDataResult.error}`);
    }

    await delay(300);

    // Phase 3: Fetch yearly history
    onProgress?.("Fetching yearly history...");
    const yearlyHistoryResult = await fetchYearlyHistory(isin);

    if (yearlyHistoryResult.error) {
      errors.push(`Yearly history: ${yearlyHistoryResult.error}`);
    }

    await delay(300);

    // Phase 4: Fetch price history
    const priceHistoryResult = await fetchPriceHistory(isin, onProgress);

    if (priceHistoryResult.error) {
      errors.push(`Price history: ${priceHistoryResult.error}`);
    }

    await delay(300);

    // Phase 5: Fetch corporate actions
    const corporateActionsResult = await fetchCorporateActions(companyKey, isin, onProgress);
    errors.push(...corporateActionsResult.errors);

    // Build the complete details object
    const shareDetails = shareDetailsResult.data;
    const companyData = companyDataResult.data;

    const details: BmeContinuoDetails = {
      address: companyData?.address,
      admittedCapital: shareDetails.admitedCapital,
      companyKey,
      corporateActions: corporateActionsResult.data,
      currency: shareDetails.currency,
      errors: errors.length > 0 ? errors : undefined,
      fetchedAt: new Date().toISOString(),
      isin,
      logoUrl: companyData?.logoURL
        ? `https://www.bolsasymercados.es${companyData.logoURL}`
        : undefined,
      marketCap: shareDetails.capitalisation,
      name: listing.name,
      nominal: shareDetails.nominal,
      priceHistory: priceHistoryResult.data ?? {
        marketDays: 0,
        periodEnd: parseApiDate(formatApiDate(new Date())),
        periodStart: parseApiDate(formatApiDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))),
        prices: [],
      },
      sector: listing.sector,
      shares: shareDetails.shares,
      shortName: shareDetails.shortName,
      status: "success",
      subsector: listing.subsector,
      ticker: shareDetails.ticker,
      tradingSystem: shareDetails.tradingSystem,
      url: listing.url,
      website: companyData?.websiteURL,
      yearlyHistory: yearlyHistoryResult.data ?? [],
    };

    // Determine status based on missing required fields
    const missingFields = getMissingRequiredFields(details);

    if (missingFields.length > 0) {
      if (missingFields.some((field) => ["companyKey", "isin", "ticker"].includes(field))) {
        details.status = "error";
        return {
          data: details,
          error: `Missing critical fields: ${missingFields.join(", ")}`,
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
 * Fetch details for multiple BME Continuo products
 */
export async function fetchBmeContinuoDetailsBatch(
  listings: BmeContinuoListingItem[],
  onProgress?: (current: number, total: number, name: string, phase: string) => void,
): Promise<BmeContinuoDetailResult[]> {
  const results: BmeContinuoDetailResult[] = [];

  for (let index = 0; index < listings.length; index++) {
    const listing = listings[index];
    if (!listing) continue;

    // Create a progress callback that includes the product context
    const productProgress: DetailProgressCallback = (phase, detail) => {
      const fullPhase = detail ? `${phase} (${detail})` : phase;
      onProgress?.(index + 1, listings.length, listing.name, fullPhase);
    };

    const result = await fetchBmeContinuoDetails(listing, productProgress);
    results.push(result);

    // Add delay between products to avoid rate limiting
    if (index < listings.length - 1) {
      await delay(500);
    }
  }

  return results;
}
