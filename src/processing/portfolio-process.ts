import type {
  PortfolioDetails,
  PortfolioProcessed,
  ProcessedProduct,
  ProductResult,
} from "../types/types";
import { getMissingRequiredFields } from "../helpers/missing-fields";
import { normalizeSector } from "./helpers/normalized-sector";
import { getPortfolioYearlyMarketCap } from "./helpers/get-yearly-history";
import { getPortfolioLiquidity } from "./helpers/get-liquidity";
import { getPortfolioMigrations } from "./helpers/get-market-migrations";
import { parsePortfolioCorporateActions } from "./helpers/parse-portfolio-corporate-actions";
import { isSuspendedPortfolio } from "./helpers/get-suspension-status";

/**
 * Process Portfolio details to normalized format
 */
export function processPortfolio(
  marketId: "portfolio",
  details: PortfolioDetails,
  requiredFields: readonly string[],
): ProductResult<ProcessedProduct> {
  try {
    const { sector, subsector } = normalizeSector(marketId, details.sector);
    const address = details.organizationInfo
      ? [
          details.organizationInfo.addressStreet,
          details.organizationInfo.addressNum,
          details.organizationInfo.addressDoor,
          details.organizationInfo.city,
          details.organizationInfo.zipCode,
          details.organizationInfo.country,
        ]
          .filter(Boolean)
          .join(", ") || undefined
      : undefined;

    /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
    const yearlyHistory = getPortfolioYearlyMarketCap(
      details.tradingInfoBean!.tradingStartDate!,
      details.tradingInfoBean!.totalUnits!,
      details.priceHistory.prices,
      details.tradingInfoBean!.referencePrice!,
    );
    const liquidity = getPortfolioLiquidity(
      details.tradingInfoBean!.tradingStartDate!,
      details.priceHistory,
      details.tradingInfoBean!.totalUnits!,
    );
    const migrations = getPortfolioMigrations(details.ticker);

    const halted = details.tradingInfoBean?.halted;
    const haltedUntilDate = details.tradingInfoBean?.haltedUntilDate;
    const isSuspended = isSuspendedPortfolio(halted, haltedUntilDate);
    // Extract date part from ISO datetime if present
    const suspendedDate = haltedUntilDate?.split("T")[0];

    const product: PortfolioProcessed = {
      address: address,
      city: details.organizationInfo!.city!,
      corporateActions: parsePortfolioCorporateActions(details.documents),
      country: details.organizationInfo!.country!,
      currency: details.currency!,
      isin: details.isinCode!,
      isSuspended: isSuspended,
      lastPrice: details.tradingInfoBean!.lastTradingPrice!,
      liquidity: liquidity,
      listingDate: details.tradingInfoBean!.tradingStartDate!,
      marketCap: details.tradingInfoBean!.lastTradingPrice! * details.tradingInfoBean!.totalUnits!,
      marketId: "portfolio",
      marketListingDate: details.tradingInfoBean!.tradingStartDate!,
      marketMigrations: migrations,
      name: details.name,
      nominalValue: details.directListingNominalValue!,
      sector: sector,
      shares: details.tradingInfoBean!.totalUnits!,
      subsector: subsector,
      suspendedDate: suspendedDate,
      ticker: details.tradingCode!,
      tradingType: "Continuous",
      url: details.url,
      website: details.organizationInfo?.website,
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
