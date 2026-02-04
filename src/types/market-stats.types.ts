/**
 * Market-level statistics types
 *
 * Aggregated data for each market, providing a unified view
 * of market size, evolution, liquidity, and composition.
 */

import type {
  CorporateActionType,
  MarketFamily,
  MarketId,
  UnifiedSector,
  UnifiedSubsector,
} from "./types";

/**
 * Yearly market statistics
 */
export interface YearlyMarketStats {
  /** Average market cap per product */
  averageMarketCap: number;
  /** Number of products with data for this year */
  productCount: number;
  /** Total market capitalization */
  totalMarketCap: number;
  /** Year */
  year: number;
}

/**
 * Sector distribution entry
 */
export interface SectorDistribution {
  /** Market cap in this sector */
  marketCap: number;
  /** Percentage of total product count */
  percentageByCount: number;
  /** Percentage of total market cap */
  percentageByValue: number;
  /** Number of products in this sector */
  productCount: number;
  /** Sector name */
  sector: UnifiedSector;
}

/**
 * Subsector distribution entry
 */
export interface SubsectorDistribution {
  /** Market cap in this subsector */
  marketCap: number;
  /** Percentage of total product count */
  percentageByCount: number;
  /** Percentage of total market cap */
  percentageByValue: number;
  /** Number of products in this subsector */
  productCount: number;
  /** Subsector name */
  subsector: UnifiedSubsector;
}

/**
 * Country distribution entry
 */
export interface CountryDistribution {
  /** Country name */
  country: string;
  /** Market cap from this country */
  marketCap: number;
  /** Percentage of total product count */
  percentageByCount: number;
  /** Percentage of total market cap */
  percentageByValue: number;
  /** Number of products from this country */
  productCount: number;
}

/**
 * Aggregated liquidity metrics for the market
 */
export interface MarketLiquidity {
  /** Average daily turnover across all products (EUR/day) */
  averageDailyTurnover: number;
  /** Average trading days ratio across products */
  averageTradingDaysRatio: number;
  /** Average turnover velocity across products */
  averageTurnoverVelocity: number;
  /** Total turnover (EUR) */
  totalTurnover: number;
  /** Total trading volume */
  totalVolume: number;
}

/**
 * Corporate actions summary at market level
 */
export type CorporateActionsSummary = Record<CorporateActionType, number>;

/**
 * Suspension statistics
 */
export interface SuspensionStats {
  /** Number of currently suspended products */
  suspendedCount: number;
  /** Percentage of suspended products */
  suspendedPercentage: number;
}

/**
 * Complete market statistics
 */
export interface MarketStats {
  /** Corporate actions totals */
  corporateActions: CorporateActionsSummary;
  /** Distribution by country */
  countryDistribution: CountryDistribution[];
  /** ISO timestamp when stats were generated */
  fetchedAt: string;
  /** Market liquidity metrics */
  liquidity: MarketLiquidity;
  /** Market family */
  marketFamily: MarketFamily;
  /** Market identifier */
  marketId: MarketId;
  /** Human-readable market name */
  marketName: string;
  /** Number of products in the market */
  productCount: number;
  /** Distribution by sector */
  sectorDistribution: SectorDistribution[];
  /** Distribution by subsector */
  subsectorDistribution: SubsectorDistribution[];
  /** Suspension statistics */
  suspensions: SuspensionStats;
  /** Total market capitalization (EUR) */
  totalMarketCap: number;
  /** Yearly evolution */
  yearlyEvolution: YearlyMarketStats[];
}
