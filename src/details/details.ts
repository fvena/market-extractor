import type {
  BaseDetails,
  BatchProductResult,
  BmeAlternativesDetails,
  BmeContinuoDetails,
  EuronextDetails,
  MarketId,
  PortfolioDetails,
  ProductDetails,
  ProductError,
  ProductListing,
  ProductMissingFields,
  ProductResult,
  ProgressCallback,
} from "../types/types";
import type { RequiredKeys } from "../helpers/missing-fields";
import { MARKETS } from "../markets";
import { config } from "../config";
import { loadProductsListings } from "../helpers/storage";
import { fillMissingFieldsFromRelated } from "../helpers/fill-missing-fields-from-related";
import { fetchBmeContinuoDetails } from "./fetchers/bme-continuo-details-fetcher";
import { fetchBmeAlternativesDetails } from "./fetchers/bme-alternatives-details-fetcher";
import { fetchEuronextDetails } from "./fetchers/euronext-details-fetcher";
import { fetchPortfolioDetails } from "./fetchers/portfolio-details-fetcher";

// ============================================
// REQUIRED FIELDS
// ============================================
const REQUIRED_FIELDS_BASE = [
  "isin",
  "name",
  "priceHistory",
  "sector",
  "ticker",
  "url",
] as const satisfies RequiredKeys<BaseDetails>[];

const REQUIRED_FIELDS_BME_CONTINUO = [
  ...REQUIRED_FIELDS_BASE,
  "admittedCapital",
  "companyKey",
  "corporateActions",
  "currency",
  "marketCap",
  "nominal",
  "priceHistory",
  "shares",
  "shortName",
  "tradingSystem",
  "yearlyHistory",
] as const satisfies RequiredKeys<BmeContinuoDetails>[];

const REQUIRED_FIELDS_BME_ALTERNATIVES = [
  ...REQUIRED_FIELDS_BASE,
  "documents",
  "lastPrice",
  "marketCap",
  "priceHistory",
  "sharesOutstanding",
  "yearlyHistory",
] as const satisfies RequiredKeys<BmeAlternativesDetails>[];

const REQUIRED_FIELDS_EURONEXT = [
  ...REQUIRED_FIELDS_BASE,
  "admittedShares",
  "country",
  "currency",
  "listingDate",
  "markets",
  "notices",
  "priceHistory",
] as const satisfies RequiredKeys<EuronextDetails>[];

const REQUIRED_FIELDS_PORTFOLIO = [
  ...REQUIRED_FIELDS_BASE,
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
] as const satisfies RequiredKeys<PortfolioDetails>[];

export const REQUIRED_FIELDS_BY_MARKET = {
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
// FETCH DETAILS
// ============================================

type FetchDetailsFunction = (
  listing: ProductListing,
  requiredFields: readonly string[],
) => Promise<ProductResult<ProductDetails>>;

export const MARKET_FETCH_DETAILS: Record<MarketId, FetchDetailsFunction> = {
  "bme-continuo": fetchBmeContinuoDetails as FetchDetailsFunction,
  "bme-growth": fetchBmeAlternativesDetails as FetchDetailsFunction,
  "bme-scaleup": fetchBmeAlternativesDetails as FetchDetailsFunction,
  "euronext-access": fetchEuronextDetails as FetchDetailsFunction,
  "euronext-expand": fetchEuronextDetails as FetchDetailsFunction,
  "euronext-growth": fetchEuronextDetails as FetchDetailsFunction,
  "euronext-regulated": fetchEuronextDetails as FetchDetailsFunction,
  portfolio: fetchPortfolioDetails as FetchDetailsFunction,
};

/**
 * Fetch market details with generic callbacks (for parallel execution)
 * This version doesn't depend on tasklog and allows custom progress handling
 */
export async function fetchMarketDetails(
  marketId: MarketId,
  isTestMode: boolean,
  callback: ProgressCallback,
): Promise<BatchProductResult<ProductDetails>> {
  const market = MARKETS[marketId];
  const fetchProductDetails = MARKET_FETCH_DETAILS[marketId];
  const requiredFields = REQUIRED_FIELDS_BY_MARKET[marketId];

  // Load listings from file
  const listings = await loadProductsListings<ProductListing>(market.slug);

  if (!listings) {
    throw new Error(`No listings found for market ${market.slug}`);
  }

  const products: ProductDetails[] = [];
  const productsWithMissingFields: ProductMissingFields[] = [];
  const productsWithError: ProductError[] = [];

  // Slice listings if in test mode
  const filteredListings = isTestMode ? listings.slice(0, config.testModeLimit) : listings;

  let currentListing = 1;
  const totalListings = filteredListings.length;

  for (const listing of filteredListings) {
    // Notify start
    callback(listing.name, currentListing, totalListings);

    const result = await fetchProductDetails(listing, requiredFields);

    if (result.data) {
      products.push(result.data);

      if (result.missingFields?.length) {
        // Add product to missing fields
        productsWithMissingFields.push({
          missingFields: result.missingFields,
          name: result.data.name,
        });
      }
    } else {
      // Add product to errors
      productsWithError.push({
        error: result.error ?? "Unknown error",
        name: listing.name,
      });
    }

    currentListing++;
  }

  // Fill missing fields with related products for Euronext markets
  if (
    ["euronext-access", "euronext-expand", "euronext-growth", "euronext-regulated"].includes(
      marketId,
    )
  ) {
    const relatedProducts = fillMissingFieldsFromRelated(
      products as EuronextDetails[],
      requiredFields,
    );
    return { ...relatedProducts, productsWithError };
  }

  return { products, productsWithError, productsWithMissingFields };
}
