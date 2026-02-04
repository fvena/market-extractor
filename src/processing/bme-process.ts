import type {
  BmeAlternativesDetails,
  BmeAlternativesProcessed,
  BmeContinuoDetails,
  BmeContinuoProcessed,
  ProcessedProduct,
  ProductResult,
} from "../types/types";
import type { BmeCorporateActions } from "../types/bme.types";
import { getMissingRequiredFields } from "../helpers/missing-fields";
import { loadCorporateActions } from "../helpers/storage";
import { extractCityAndCountryBme } from "./helpers/get-city-country-bme";
import { getCorporateActionsForCompany } from "./helpers/get-corporate-actions-bme";
import { getMarketMigrationBmeAlternatives } from "./helpers/get-market-migrations";
import { getListingDates, getListingDatesContinuo } from "./helpers/get-listing-date-bme";
import { normalizeSector } from "./helpers/normalized-sector";
import { getRelatedInstrumentsBmeContinuo } from "./helpers/get-related-instruments";
import { getBmeYearlyMarketCap } from "./helpers/get-yearly-history";
import { getBmeLiquidity } from "./helpers/get-liquidity";
import {
  parseBmeAlternativesCorporateActions,
  parseBmeContinuoCorporateActions,
} from "./helpers/parse-bme-corporate-actions";
import { isSuspendedBme } from "./helpers/get-suspension-status";

/**
 * Process BME Alternatives (Growth/ScaleUp) details to normalized format
 */
export async function processBmeAlternatives(
  marketId: "bme-growth" | "bme-scaleup",
  details: BmeAlternativesDetails,
  requiredFields: readonly string[],
): Promise<ProductResult<ProcessedProduct>> {
  try {
    const { city, country, province } = extractCityAndCountryBme(details.address);
    const allMarketCorporateActions = await loadCorporateActions<BmeCorporateActions>(marketId);

    if (!allMarketCorporateActions) {
      throw new Error(`No corporate actions found for market ${marketId}`);
    }

    const rawCorporateActions = getCorporateActionsForCompany(
      details.isin,
      details.name,
      allMarketCorporateActions,
    );
    const corporateActions = parseBmeAlternativesCorporateActions(rawCorporateActions);
    const migrations = getMarketMigrationBmeAlternatives(details);
    const listingDate = getListingDates(rawCorporateActions.listings, details.documents);
    const { sector, subsector } = normalizeSector(marketId, details.sector);
    const yearlyHistory = getBmeYearlyMarketCap(details.yearlyHistory);

    /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
    const liquidity = getBmeLiquidity(
      listingDate!,
      details.priceHistory,
      details.sharesOutstanding,
    );
    const lastPrice = details.yearlyHistory[0]?.closePrice ?? details.lastPrice;
    const marketCap = lastPrice && lastPrice * details.sharesOutstanding;

    const product: BmeAlternativesProcessed = {
      address: details.address,
      auditor: details.auditor!,
      city: province ? `${city} - ${province}` : city,
      corporateActions: corporateActions,
      country: country,
      currency: "EUR",
      isin: details.isin,
      isSuspended: isSuspendedBme(details.suspendedDate),
      lastPrice: lastPrice,
      liquidity: liquidity,
      liquidityProvider: details.liquidityProvider,
      listingDate: listingDate!,
      marketCap: marketCap,
      marketId: marketId,
      marketListingDate: migrations[0]?.date ?? listingDate!,
      marketMigrations: migrations,
      name: details.name,
      nominalValue: details.nominal!,
      registeredAdvisor: details.registeredAdvisor,
      sector: sector,
      shares: details.sharesOutstanding,
      subsector: subsector,
      suspendedDate: details.suspendedDate,
      ticker: details.ticker,
      tradingType: details.tradingType!,
      url: details.url,
      website: details.website,
      yearlyHistory: yearlyHistory,
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    return {
      data: product,
      missingFields: getMissingRequiredFields(product, requiredFields),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process BME Continuo details to normalized format
 */
export function processBmeContinuo(
  marketId: "bme-continuo",
  details: BmeContinuoDetails,
  requiredFields: readonly string[],
): ProductResult<ProcessedProduct> {
  try {
    const { city, country, province } = extractCityAndCountryBme(details.address);
    const listingDate = getListingDatesContinuo(details.corporateActions, details.yearlyHistory);
    const { sector, subsector } = normalizeSector(marketId, details.sector, details.subsector);
    const yearlyHistory = getBmeYearlyMarketCap(details.yearlyHistory);
    const corporateActions = parseBmeContinuoCorporateActions(details.corporateActions);

    /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
    const liquidity = getBmeLiquidity(listingDate!, details.priceHistory, details.shares);
    const lastPrice = details.yearlyHistory[0]?.closePrice ?? 0;
    const marketCap = lastPrice && lastPrice * details.shares;

    const product: BmeContinuoProcessed = {
      address: details.address,
      city: province ? `${city} - ${province}` : city,
      corporateActions: corporateActions,
      country: country,
      currency: "EUR",
      isin: details.isin,
      isSuspended: isSuspendedBme(details.suspendedDate),
      lastPrice: lastPrice,
      liquidity: liquidity,
      listingDate: listingDate!,
      marketCap: marketCap,
      marketId: marketId,
      marketListingDate: listingDate!,
      name: details.name,
      nominalValue: details.nominal,
      relatedInstruments: getRelatedInstrumentsBmeContinuo(details),
      sector: sector,
      shares: details.shares,
      subsector: subsector,
      suspendedDate: details.suspendedDate,
      ticker: details.ticker,
      tradingType: details.tradingSystem,
      url: details.url,
      website: details.website,
      yearlyHistory: yearlyHistory,
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    return {
      data: product,
      missingFields: getMissingRequiredFields(product, requiredFields),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
