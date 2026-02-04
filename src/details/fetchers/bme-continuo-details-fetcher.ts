import type {
  BmeContinuoCapitalIncreaseApi,
  BmeContinuoCompanyDataResponse,
  BmeContinuoCorporateActions,
  BmeContinuoDelistingApi,
  BmeContinuoDividendApi,
  BmeContinuoHistoricalPricesResponse,
  BmeContinuoLastPeriodsResponse,
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
} from "../../types/bme.types";
import type { BmeContinuoDetails, BmeContinuoListing, ProductResult } from "../../types/types";
import { fetchJson } from "../../helpers/http";
import { delay } from "../../helpers/browser";
import { getMissingRequiredFields } from "../../helpers/missing-fields";
import { bmeContinuo } from "../../markets";

/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that the API base URL is not undefined */
const API_BASE = bmeContinuo.urls.api!;

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
): Promise<{ data?: BmePriceHistory; error?: string }> {
  const { from, to } = getPriceHistoryDateRange();
  const url = `${API_BASE}/HistoricalSharesPrices?type=V&pageSize=0&ISIN=${isin}&from=${from}&to=${to}`;

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
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- we need to use the type parameter to get the correct type from the API response
async function fetchCorporateActionType<T>(
  endpoint: string,
  companyKey: string,
  dateRange: { from: string; to: string },
): Promise<{ data?: T[]; error?: string }> {
  const url = `${API_BASE}/CorporateActions/${endpoint}?from=${dateRange.from}&to=${dateRange.to}&tradingSystem=SIBE&companyKey=${companyKey}&listingType=All&page=0`;

  const result = await fetchJson<ApiListResponse<T>>(url);

  if (result.error || !result.data?.data) {
    return { data: [], error: result.error };
  }

  return { data: result.data.data };
}

/**
 * Fetch all corporate actions for a company
 */
async function fetchCorporateActions(
  companyKey: string,
  isin: string,
): Promise<{ data: BmeContinuoCorporateActions; errors: string[] }> {
  const errors: string[] = [];
  const dateRange = getCorporateActionsDateRange();

  // Fetch all corporate action types in parallel
  const [
    dividendsResult,
    publicOfferingsResult,
    takeoverBidsResult,
    newListingsResult,
    delistingsResult,
    capitalIncreasesResult,
    splitsResult,
    mergersResult,
    otherPaymentsResult,
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

  if (dividendsResult.error || !dividendsResult.data)
    errors.push(`Dividends: ${dividendsResult.error ?? "No dividends returned"}`);
  if (newListingsResult.error || !newListingsResult.data)
    errors.push(`New listings: ${newListingsResult.error ?? "No new listings returned"}`);
  if (delistingsResult.error || !delistingsResult.data)
    errors.push(`Delistings: ${delistingsResult.error ?? "No delistings returned"}`);
  if (capitalIncreasesResult.error || !capitalIncreasesResult.data)
    errors.push(
      `Capital increases: ${capitalIncreasesResult.error ?? "No capital increases returned"}`,
    );
  if (splitsResult.error || !splitsResult.data)
    errors.push(`Splits: ${splitsResult.error ?? "No splits returned"}`);
  if (otherPaymentsResult.error || !otherPaymentsResult.data)
    errors.push(`Other payments: ${otherPaymentsResult.error ?? "No other payments returned"}`);
  if (mergersResult.error || !mergersResult.data)
    errors.push(`Mergers: ${mergersResult.error ?? "No mergers returned"}`);
  if (publicOfferingsResult.error || !publicOfferingsResult.data)
    errors.push(
      `Public offerings: ${publicOfferingsResult.error ?? "No public offerings returned"}`,
    );
  if (takeoverBidsResult.error || !takeoverBidsResult.data)
    errors.push(`Takeover bids: ${takeoverBidsResult.error ?? "No takeover bids returned"}`);

  /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
  const dividends = dividendsResult.data!;
  const newListings = newListingsResult.data!;
  const delistings = delistingsResult.data!;
  const capitalIncreases = capitalIncreasesResult.data!;
  const splits = splitsResult.data!;
  const otherPayments = otherPaymentsResult.data!;
  const mergers = mergersResult.data!;
  const publicOfferings = publicOfferingsResult.data!;
  const takeoverBids = takeoverBidsResult.data!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

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
 * Fetch complete details for a BME Continuo product
 */
export async function fetchBmeContinuoDetails(
  listing: BmeContinuoListing,
  requiredFields: readonly string[],
): Promise<ProductResult<BmeContinuoDetails>> {
  const errors: string[] = [];

  try {
    const isin = listing.isin;

    // Phase 1: Fetch share details
    const shareDetailsResult = await fetchShareDetails(isin);

    if (shareDetailsResult.error || !shareDetailsResult.data) {
      throw new Error(`Share details: ${shareDetailsResult.error ?? "No share details returned"}`);
    }

    const companyKey = shareDetailsResult.data.issuerCode;

    await delay(300);

    // Phase 2: Fetch company data
    const companyDataResult = await fetchCompanyData(companyKey);

    if (companyDataResult.error || !companyDataResult.data) {
      errors.push(`Company data: ${companyDataResult.error ?? "No company data returned"}`);
    }

    await delay(300);

    // Phase 3: Fetch yearly history
    const yearlyHistoryResult = await fetchYearlyHistory(isin);

    if (yearlyHistoryResult.error || !yearlyHistoryResult.data) {
      errors.push(`Yearly history: ${yearlyHistoryResult.error ?? "No yearly history returned"}`);
    }

    await delay(300);

    // Phase 4: Fetch price history
    const priceHistoryResult = await fetchPriceHistory(isin);

    if (priceHistoryResult.error || !priceHistoryResult.data) {
      errors.push(`Price history: ${priceHistoryResult.error ?? "No price history returned"}`);
    }

    await delay(300);

    // Phase 5: Fetch corporate actions
    const corporateActionsResult = await fetchCorporateActions(companyKey, isin);

    if (corporateActionsResult.errors.length > 0) {
      errors.push(...corporateActionsResult.errors);
    }

    // If there are errors, return an error result
    if (errors.length > 0) {
      return {
        error: errors.join(", "),
      };
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
    const shareDetails = shareDetailsResult.data;
    const companyData = companyDataResult.data!;
    const yearlyHistory = yearlyHistoryResult.data!;
    const priceHistory = priceHistoryResult.data!;
    const corporateActions = corporateActionsResult.data;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    const logoUrl = companyData.logoURL && `https://www.bolsasymercados.es${companyData.logoURL}`;

    // Build the complete details object
    const details: BmeContinuoDetails = {
      address: companyData.address,
      admittedCapital: shareDetails.admitedCapital,
      companyKey,
      corporateActions,
      currency: shareDetails.currency,
      fetchedAt: new Date().toISOString(),
      isin,
      logoUrl,
      marketCap: shareDetails.capitalisation,
      name: listing.name,
      nominal: shareDetails.nominal,
      priceHistory,
      relatedInstruments: shareDetails.otherShares ?? [],
      sector: listing.sector,
      shares: shareDetails.shares,
      shortName: shareDetails.shortName,
      subsector: listing.subsector,
      suspendedDate: shareDetails.active,
      ticker: shareDetails.ticker,
      tradingSystem: shareDetails.tradingSystem,
      url: listing.url,
      website: companyData.websiteURL,
      yearlyHistory,
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
