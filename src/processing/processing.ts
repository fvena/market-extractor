/**
 * Processing module
 *
 * Transforms raw market details into normalized ProcessedProduct format
 * for consistent analysis across all markets.
 */
import type {
  BaseProcessed,
  BatchProductResult,
  BmeAlternativesProcessed,
  BmeContinuoProcessed,
  EuronextProcessed,
  MarketId,
  PortfolioProcessed,
  ProcessedProduct,
  ProductDetails,
  ProductError,
  ProductMissingFields,
  ProductResult,
} from "../types/types";
import type { RequiredKeys } from "../helpers/missing-fields";
import { MARKETS } from "../markets";
import { loadProductsDetails } from "../helpers/storage";
import { processBmeAlternatives, processBmeContinuo } from "./bme-process";
import { processEuronext } from "./euronext-process";
import { processPortfolio } from "./portfolio-process";

// ============================================
// REQUIRED FIELDS
// ============================================
const REQUIRED_FIELDS_BASE = [
  "country",
  "currency",
  "isin",
  "lastPrice",
  "liquidity",
  "listingDate",
  "marketCap",
  "marketId",
  "marketListingDate",
  "name",
  "sector",
  "shares",
  "subsector",
  "ticker",
  "tradingType",
  "url",
  "yearlyHistory",
] as const satisfies readonly RequiredKeys<BaseProcessed>[];

const REQUIRED_FIELDS_BME_ALTERNATIVES = [
  ...REQUIRED_FIELDS_BASE,
  "city",
] as const satisfies readonly RequiredKeys<BmeAlternativesProcessed>[];

const REQUIRED_FIELDS_EURONEXT = [
  ...REQUIRED_FIELDS_BASE,
  "marketsNames",
] as const satisfies readonly RequiredKeys<EuronextProcessed>[];

const REQUIRED_FIELDS_PORTFOLIO = [
  ...REQUIRED_FIELDS_BASE,
  "city",
] as const satisfies readonly RequiredKeys<PortfolioProcessed>[];

const REQUIRED_FIELDS_BME_CONTINUO = [
  ...REQUIRED_FIELDS_BASE,
  "city",
] as const satisfies readonly RequiredKeys<BmeContinuoProcessed>[];

const REQUIRED_KEYS_BY_MARKET = {
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
// BATCH PROCESSING
// ============================================

type ProcessorFunction = (
  marketId: MarketId,
  detail: ProductDetails,
  requiredFields: readonly string[],
) => Promise<ProductResult<ProcessedProduct>>;

const MARKET_PROCESSORS: Record<MarketId, ProcessorFunction> = {
  "bme-continuo": processBmeContinuo as ProcessorFunction,
  "bme-growth": processBmeAlternatives as ProcessorFunction,
  "bme-scaleup": processBmeAlternatives as ProcessorFunction,
  "euronext-access": processEuronext as ProcessorFunction,
  "euronext-expand": processEuronext as ProcessorFunction,
  "euronext-growth": processEuronext as ProcessorFunction,
  "euronext-regulated": processEuronext as ProcessorFunction,
  portfolio: processPortfolio as ProcessorFunction,
};

export async function processMarkets(
  marketId: MarketId,
): Promise<BatchProductResult<ProcessedProduct>> {
  const market = MARKETS[marketId];
  const processMarket = MARKET_PROCESSORS[marketId];
  const requiredFields = REQUIRED_KEYS_BY_MARKET[marketId];

  // Load details from file
  const details = await loadProductsDetails<ProductDetails>(market.slug);

  if (!details) {
    throw new Error(`No details found for market ${market.slug}`);
  }

  const products: ProcessedProduct[] = [];
  const productsWithMissingFields: ProductMissingFields[] = [];
  const productsWithError: ProductError[] = [];

  for (const detail of details) {
    const result = await processMarket(marketId, detail, requiredFields);

    if (result.data) {
      products.push(result.data);

      if (result.missingFields?.length) {
        productsWithMissingFields.push({
          missingFields: result.missingFields,
          name: result.data.name,
        });
      }
    } else {
      /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
      productsWithError.push({
        error: result.error!,
        name: detail.name,
      });
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    }
  }

  return { products, productsWithError, productsWithMissingFields };
}
