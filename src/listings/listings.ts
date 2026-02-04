import type {
  BatchProductResult,
  BmeAlternativesListing,
  BmeContinuoListing,
  EuronextListing,
  MarketId,
  PortfolioListing,
  ProductListing,
  ProgressCallback,
} from "../types/types";
import type { RequiredKeys } from "../helpers/missing-fields";
import { MARKETS } from "../markets";
import {
  fetchBmeAlternativesListings,
  fetchBmeContinuoListings,
} from "./fetchers/bme-listings-fetchers";
import { fetchEuronextListings } from "./fetchers/euronext-listings-fetchers";
import { fetchPortfolioListings } from "./fetchers/portfolio-listings-fetchers";

// ============================================
// REQUIRED FIELDS
// ============================================
const REQUIRED_FIELDS_BME_CONTINUO = [
  "isin",
  "name",
  "sector",
  "subsector",
  "url",
] as const satisfies RequiredKeys<BmeContinuoListing>[];

const REQUIRED_FIELDS_BME_ALTERNATIVES = [
  "name",
  "sector",
  "url",
] as const satisfies RequiredKeys<BmeAlternativesListing>[];

const REQUIRED_FIELDS_EURONEXT = [
  "isin",
  "markets",
  "name",
  "ticker",
  "url",
] as const satisfies RequiredKeys<EuronextListing>[];

const REQUIRED_FIELDS_PORTFOLIO = [
  "organizationInfo.city",
  "organizationInfo.country",
  "currency",
  "isinCode",
  "tradingInfoBean.lastTradingPrice",
  "tradingInfoBean.tradingStartDate",
  "name",
  "directListingNominalValue",
  "tradingInfoBean.totalUnits",
  "tradingCode",
  "ticker",
  "url",
] as const satisfies RequiredKeys<PortfolioListing>[];

const REQUIRED_FIELDS_BY_MARKET = {
  "bme-continuo": REQUIRED_FIELDS_BME_CONTINUO,
  "bme-growth": REQUIRED_FIELDS_BME_ALTERNATIVES,
  "bme-scaleup": REQUIRED_FIELDS_BME_ALTERNATIVES,
  "euronext-access": REQUIRED_FIELDS_EURONEXT,
  "euronext-expand": REQUIRED_FIELDS_EURONEXT,
  "euronext-growth": REQUIRED_FIELDS_EURONEXT,
  "euronext-regulated": REQUIRED_FIELDS_EURONEXT,
  portfolio: REQUIRED_FIELDS_PORTFOLIO,
} as const;

// ============================================
// FETCH LISTINGS
// ============================================

type FetchListingFunction = (
  url: string,
  baseUrl: string,
  requiredFields: string[],
  onProgress: ProgressCallback,
) => Promise<BatchProductResult<ProductListing>>;

const MARKET_FETCH_LISTINGS: Record<MarketId, FetchListingFunction> = {
  "bme-continuo": fetchBmeContinuoListings,
  "bme-growth": fetchBmeAlternativesListings,
  "bme-scaleup": fetchBmeAlternativesListings,
  "euronext-access": fetchEuronextListings,
  "euronext-expand": fetchEuronextListings,
  "euronext-growth": fetchEuronextListings,
  "euronext-regulated": fetchEuronextListings,
  portfolio: fetchPortfolioListings,
};

export async function fetchMarketListing(
  marketId: MarketId,
  onProgress: ProgressCallback,
): Promise<BatchProductResult<ProductListing>> {
  const market = MARKETS[marketId];
  const fetchListing = MARKET_FETCH_LISTINGS[marketId];
  const requiredFields = REQUIRED_FIELDS_BY_MARKET[marketId];

  return await fetchListing(market.urls.listings, market.urls.base, requiredFields, onProgress);
}
