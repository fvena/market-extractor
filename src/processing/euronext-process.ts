import type {
  EuronextDetails,
  EuronextProcessed,
  ProcessedProduct,
  ProductResult,
} from "../types/types";
import { getMicCountryName, getMicMarketNames } from "../helpers/mic";
import { getMissingRequiredFields } from "../helpers/missing-fields";
import { normalizeSector } from "./helpers/normalized-sector";
import { getMarketMigrationEuronext } from "./helpers/get-market-migrations";
import { getRelatedInstrumentsEuronext } from "./helpers/get-related-instruments";
import { getEuronextYearlyMarketCap } from "./helpers/get-yearly-history";
import { getEuronextLiquidity } from "./helpers/get-liquidity";
import { parseEuronextCorporateActions } from "./helpers/parse-euronext-corporate-actions";
import { getSuspensionDate, isSuspendedEuronext } from "./helpers/get-suspension-status";

/**
 * Process Euronext details to normalized format
 */
export function processEuronext(
  marketId: "euronext-access" | "euronext-expand" | "euronext-growth" | "euronext-regulated",
  details: EuronextDetails,
  requiredFields: readonly string[],
): ProductResult<ProcessedProduct> {
  try {
    // Infer listing date from available data sources
    // const inferredListingDate = inferEuronextListingDate(details);

    // Infer country from first MIC code if not available
    const firstMic = details.markets[0];
    const inferredCountry = details.country ?? (firstMic ? getMicCountryName(firstMic) : undefined);

    const { sector, subsector } = normalizeSector(marketId, details.sector, details.subsector);

    const marketMigrations = getMarketMigrationEuronext(details);
    const yearlyHistory = getEuronextYearlyMarketCap(
      details.priceHistory.prices,
      details.listingDate,
      details.admittedShares,
    );
    const liquidity = getEuronextLiquidity(
      details.listingDate,
      details.priceHistory,
      details.admittedShares,
    );
    const corporateActions = parseEuronextCorporateActions(details.notices);

    /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
    const lastPrice = details.priceHistory.prices[0]?.closePrice;
    const marketCap = lastPrice && lastPrice * details.admittedShares;

    const isSuspended = isSuspendedEuronext(corporateActions);
    const suspendedDate = getSuspensionDate(undefined, corporateActions);

    const product: EuronextProcessed = {
      address: details.address,
      corporateActions: corporateActions,
      country: inferredCountry!,
      currency: details.currency,
      isin: details.isin,
      isSuspended: isSuspended,
      lastPrice: lastPrice!,
      liquidity: liquidity,
      listingDate: details.listingDate,
      marketCap: marketCap!,
      marketId: marketId,
      marketListingDate: details.listingDate,
      marketMigrations: marketMigrations,
      marketsNames: getMicMarketNames(details.markets),
      name: details.name,
      nominalValue: details.nominalValue!,
      relatedInstruments: getRelatedInstrumentsEuronext(details),
      sector: sector,
      shares: details.admittedShares,
      subsector: subsector,
      suspendedDate: suspendedDate,
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
