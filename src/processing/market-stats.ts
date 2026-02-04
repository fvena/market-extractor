/**
 * Market-level statistics processor
 *
 * Aggregates product-level data into market statistics.
 */

import type {
  CorporateActionsSummary,
  CountryDistribution,
  MarketLiquidity,
  MarketStats,
  SectorDistribution,
  SubsectorDistribution,
  SuspensionStats,
  YearlyMarketStats,
} from "../types/market-stats.types";
import type {
  CorporateActionType,
  MarketDefinition,
  ProcessedProduct,
  UnifiedSector,
  UnifiedSubsector,
} from "../types/types";

/**
 * Generate market statistics from processed products
 */
export function generateMarketStats(
  market: MarketDefinition,
  products: ProcessedProduct[],
): MarketStats {
  const productCount = products.length;
  const totalMarketCap = products.reduce((sum, p) => sum + (p.marketCap || 0), 0);

  return {
    corporateActions: calculateCorporateActionsSummary(products),
    countryDistribution: calculateCountryDistribution(products, productCount, totalMarketCap),
    fetchedAt: new Date().toISOString(),
    liquidity: calculateMarketLiquidity(products),
    marketFamily: market.family,
    marketId: market.id,
    marketName: market.name,
    productCount,
    sectorDistribution: calculateSectorDistribution(products, productCount, totalMarketCap),
    subsectorDistribution: calculateSubsectorDistribution(products, productCount, totalMarketCap),
    suspensions: calculateSuspensionStats(products),
    totalMarketCap,
    yearlyEvolution: calculateYearlyEvolution(products),
  };
}

/**
 * Calculate yearly market evolution
 */
function calculateYearlyEvolution(products: ProcessedProduct[]): YearlyMarketStats[] {
  // Collect all years from all products
  const yearData = new Map<number, { count: number; totalMcap: number }>();

  for (const product of products) {
    for (const yh of product.yearlyHistory) {
      const existing = yearData.get(yh.year) ?? { count: 0, totalMcap: 0 };
      existing.totalMcap += yh.marketCap;
      existing.count++;
      yearData.set(yh.year, existing);
    }
  }

  // Convert to array and sort by year
  return [...yearData.entries()]
    .map(([year, data]) => ({
      averageMarketCap: data.count > 0 ? data.totalMcap / data.count : 0,
      productCount: data.count,
      totalMarketCap: data.totalMcap,
      year,
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Calculate aggregated market liquidity
 */
function calculateMarketLiquidity(products: ProcessedProduct[]): MarketLiquidity {
  let totalTurnover = 0;
  let totalVolume = 0;
  let sumTradingDaysRatio = 0;
  let sumTurnoverVelocity = 0;
  let sumDailyTurnover = 0;

  for (const product of products) {
    totalTurnover += product.liquidity.turnover;
    totalVolume += product.liquidity.volume;
    sumTradingDaysRatio += product.liquidity.tradingDaysRatio;
    sumTurnoverVelocity += product.liquidity.turnoverVelocity;
    sumDailyTurnover += product.liquidity.avgDailyTurnover;
  }

  const count = products.length;

  return {
    averageDailyTurnover: count > 0 ? sumDailyTurnover / count : 0,
    averageTradingDaysRatio: count > 0 ? sumTradingDaysRatio / count : 0,
    averageTurnoverVelocity: count > 0 ? sumTurnoverVelocity / count : 0,
    totalTurnover,
    totalVolume,
  };
}

/**
 * Calculate sector distribution
 */
function calculateSectorDistribution(
  products: ProcessedProduct[],
  totalProducts: number,
  totalMarketCap: number,
): SectorDistribution[] {
  const sectorData = new Map<UnifiedSector, { count: number; marketCap: number }>();

  for (const product of products) {
    const existing = sectorData.get(product.sector) ?? { count: 0, marketCap: 0 };
    existing.count++;
    existing.marketCap += product.marketCap;
    sectorData.set(product.sector, existing);
  }

  return [...sectorData.entries()]
    .map(([sector, data]) => ({
      marketCap: data.marketCap,
      percentageByCount: totalProducts > 0 ? (data.count / totalProducts) * 100 : 0,
      percentageByValue: totalMarketCap > 0 ? (data.marketCap / totalMarketCap) * 100 : 0,
      productCount: data.count,
      sector,
    }))
    .sort((a, b) => b.marketCap - a.marketCap);
}

/**
 * Calculate subsector distribution
 */
function calculateSubsectorDistribution(
  products: ProcessedProduct[],
  totalProducts: number,
  totalMarketCap: number,
): SubsectorDistribution[] {
  const subsectorData = new Map<UnifiedSubsector, { count: number; marketCap: number }>();

  for (const product of products) {
    const existing = subsectorData.get(product.subsector) ?? { count: 0, marketCap: 0 };
    existing.count++;
    existing.marketCap += product.marketCap;
    subsectorData.set(product.subsector, existing);
  }

  return [...subsectorData.entries()]
    .map(([subsector, data]) => ({
      marketCap: data.marketCap,
      percentageByCount: totalProducts > 0 ? (data.count / totalProducts) * 100 : 0,
      percentageByValue: totalMarketCap > 0 ? (data.marketCap / totalMarketCap) * 100 : 0,
      productCount: data.count,
      subsector,
    }))
    .sort((a, b) => b.marketCap - a.marketCap);
}

/**
 * Calculate country distribution
 */
function calculateCountryDistribution(
  products: ProcessedProduct[],
  totalProducts: number,
  totalMarketCap: number,
): CountryDistribution[] {
  const countryData = new Map<string, { count: number; marketCap: number }>();

  for (const product of products) {
    const existing = countryData.get(product.country) ?? { count: 0, marketCap: 0 };
    existing.count++;
    existing.marketCap += product.marketCap;
    countryData.set(product.country, existing);
  }

  return [...countryData.entries()]
    .map(([country, data]) => ({
      country,
      marketCap: data.marketCap,
      percentageByCount: totalProducts > 0 ? (data.count / totalProducts) * 100 : 0,
      percentageByValue: totalMarketCap > 0 ? (data.marketCap / totalMarketCap) * 100 : 0,
      productCount: data.count,
    }))
    .sort((a, b) => b.marketCap - a.marketCap);
}

/**
 * Calculate suspension statistics
 */
function calculateSuspensionStats(products: ProcessedProduct[]): SuspensionStats {
  const suspendedCount = products.filter((p) => p.isSuspended).length;
  const totalCount = products.length;

  return {
    suspendedCount,
    suspendedPercentage: totalCount > 0 ? (suspendedCount / totalCount) * 100 : 0,
  };
}

/**
 * Calculate corporate actions summary
 */
function calculateCorporateActionsSummary(products: ProcessedProduct[]): CorporateActionsSummary {
  const actionTypes: CorporateActionType[] = [
    "capitalDecreases",
    "capitalIncreases",
    "delistings",
    "dividends",
    "freeAllocations",
    "listings",
    "marketChanges",
    "nameChanges",
    "reverseSplits",
    "splits",
    "takeovers",
    "tradingResumptions",
    "tradingSuspensions",
  ];

  const summary = {} as CorporateActionsSummary;

  for (const actionType of actionTypes) {
    summary[actionType] = products.reduce(
      (sum, p) => sum + p.corporateActions[actionType].length,
      0,
    );
  }

  return summary;
}
