import type {
  BmeContinuoCorporateActions,
  BmeContinuoRelatedInstrument,
  BmeDocument,
  BmePriceHistory,
  BmeYearlyData,
} from "./bme.types";
import type {
  EuronextIpoEntry,
  EuronextNotice,
  EuronextPriceHistory,
  EuronextRelatedInstrument,
} from "./euronext.types";
import type {
  IssuanceMarketBean,
  PortfolioDocumentsResponse,
  PortfolioPriceHistory,
} from "./portfolio.types";

/**
 * Market family identifiers
 * Each family may have different scraping logic and data structures
 */
export type MarketFamily = "bme" | "euronext" | "portfolio";

/**
 * Unique market identifiers
 * Used as keys throughout the application
 */
export type MarketId =
  | "bme-continuo"
  | "bme-growth"
  | "bme-scaleup"
  | "euronext-access"
  | "euronext-expand"
  | "euronext-growth"
  | "euronext-regulated"
  | "portfolio";

/**
 * Implementation status for each market capability
 */
export interface MarketImplementationStatus {
  details: boolean;
  listings: boolean;
  processing: boolean;
}

/**
 * Market definition containing metadata and configuration
 */
export interface MarketDefinition {
  family: MarketFamily;
  id: MarketId;
  name: string;
  slug: string; // Used for output folder names (e.g., 'bme-growth')
  urls: {
    api?: string; // API base URL
    base: string; // Base URL for product detail pages
    corporateActions?: string; // URL for market-wide corporate actions
    listings: string; // URL to fetch product listings
  };
}

// ============================================
// Actions Results Types
// ============================================
/**
 * Action result for a single product
 */
export interface ProductResult<T> {
  data?: T;
  error?: string;
  missingFields?: string[];
}

/**
 * Warning information for a product
 */
export interface ProductMissingFields {
  missingFields: string[];
  name: string;
}

/**
 * Error information for a product
 */
export interface ProductError {
  error: string;
  name: string;
}

/**
 * Batch action result
 */
export interface BatchProductResult<T> {
  products: T[];
  productsWithError: ProductError[];
  productsWithMissingFields: ProductMissingFields[];
}

/**
 * Action result containing all operation results
 */
export interface ActionResult<T> {
  action: string;
  results: MarketOperationResult<T>[];
  totalDuration: number;
}

/**
 * Result of a market operation (listing fetch, detail fetch, etc.)
 */
export interface MarketOperationResult<T> {
  duration: number; // milliseconds
  errors: ProductError[];
  marketId: MarketId;
  marketName: string;
  products: T[];
  warnings: ProductMissingFields[];
}

// ============================================
// Listing Products Types
// ============================================
export interface BaseListing {
  name: string;
  url: string;
}

export interface BmeAlternativesListing extends BaseListing {
  sector: string;
}

export interface BmeContinuoListing extends BaseListing {
  isin: string;
  sector: string;
  subsector: string;
}

export interface EuronextListing extends BaseListing {
  isin: string;
  markets: string[];
  ticker: string;
}

export interface PortfolioListing extends BaseListing, IssuanceMarketBean {
  ticker: string;
}

export type ProductListing =
  | BmeAlternativesListing
  | BmeContinuoListing
  | EuronextListing
  | PortfolioListing;

// ============================================
// Product Details Types
// ============================================
export interface BaseDetails {
  fetchedAt: string;
  isin: string;
  name: string;
  priceHistory: unknown;
  sector: string;
  ticker: string;
  url: string;
  website?: string;
}

export interface BmeAlternativesDetails extends BaseDetails {
  address?: string;
  auditor?: string;
  contact?: string;
  documents: BmeDocument[];
  lastPrice: number;
  liquidityProvider?: string;
  marketCap: number;
  nif?: string;
  nominal?: number;
  priceHistory: BmePriceHistory;
  registeredAdvisor?: string;
  sharesOutstanding: number;
  suspendedDate?: string;
  tradingType?: string;
  yearlyHistory: BmeYearlyData[];
}

export interface BmeContinuoDetails extends BaseDetails {
  address?: string;
  admittedCapital: number;
  companyKey: string;
  corporateActions: BmeContinuoCorporateActions;
  currency: string;
  logoUrl?: string;
  marketCap: number;
  nominal: number;
  priceHistory: BmePriceHistory;
  relatedInstruments: BmeContinuoRelatedInstrument[];
  shares: number;
  shortName: string;
  subsector?: string;
  suspendedDate?: string;
  tradingSystem: string;
  yearlyHistory: BmeYearlyData[];
}

export interface EuronextDetails extends BaseDetails {
  address?: string;
  admittedShares: number;
  city?: string;
  country?: string;
  currency: string;
  email?: string;
  ipoEntries: EuronextIpoEntry[];
  listingDate: string;
  markets: string[];
  nominalValue?: number;
  notices: EuronextNotice[];
  phone?: string;
  postalCode?: string;
  priceHistory: EuronextPriceHistory;
  relatedInstruments: EuronextRelatedInstrument[];
  subsector?: string;
  supersector?: string;
  tradingType?: string;
}

export interface PortfolioDetails extends BaseDetails, PortfolioListing {
  documents?: PortfolioDocumentsResponse;
  priceHistory: PortfolioPriceHistory;
}

export type ProductDetails =
  | BmeAlternativesDetails
  | BmeContinuoDetails
  | EuronextDetails
  | PortfolioDetails;

// ============================================
// Processed Product Types
// ============================================

export interface BaseProcessed {
  /** Company registered address */
  address?: string;
  /** Corporate actions (dates only) */
  corporateActions: UnifiedCorporateActions;
  /** Company headquarters country */
  country: string;
  /** Trading currency (ISO 4217 code: EUR, USD, GBP, etc.) */
  currency: string;
  /** International Securities Identification Number */
  isin: string;
  /** Whether trading is currently suspended */
  isSuspended: boolean;
  /** Last traded price */
  lastPrice: number;
  /** Liquidity */
  liquidity: Liquidity;
  /** Initial listing/IPO date (ISO 8601) */
  listingDate: string;
  /** Market capitalization in currency units */
  marketCap: number;
  /** Market ID */
  marketId: MarketId;
  /** Market listing date (ISO 8601) */
  marketListingDate: string;
  /** Full company/security name */
  name: string;
  /** Nominal/par value per share */
  nominalValue?: number;
  /** Industry sector (ICB/GICS classification) */
  sector: UnifiedSector;
  /** Total shares outstanding */
  shares: number;
  /** Industry subsector (ICB/GICS classification) */
  subsector: UnifiedSubsector;
  /** Date when suspension started (if suspended) */
  suspendedDate?: string;
  /** Exchange trading symbol */
  ticker: string;
  /** Trading type */
  tradingType: string;
  /** Source URL for the product data */
  url: string;
  /** Company website URL */
  website?: string;
  /** Yearly history */
  yearlyHistory: YearlyMarketCap[];
}

export interface BmeAlternativesProcessed extends BaseProcessed {
  /** Auditor */
  auditor: string;
  /** City */
  city: string;
  /** Liquidity provider */
  liquidityProvider?: string;
  /** Market ID */
  marketId: "bme-growth" | "bme-scaleup";
  /** Market migrations */
  marketMigrations: MarketMigration[];
  /** Registered advisor */
  registeredAdvisor?: string;
}

export interface BmeContinuoProcessed extends BaseProcessed {
  /** City */
  city: string;
  /** Market ID */
  marketId: "bme-continuo";
  /** Related instruments */
  relatedInstruments: RelatedInstrument[];
}

export interface EuronextProcessed extends BaseProcessed {
  /** Market ID */
  marketId: "euronext-access" | "euronext-expand" | "euronext-growth" | "euronext-regulated";
  /** Market migrations */
  marketMigrations: MarketMigration[];
  /** Market name */
  marketsNames: string[];
  /** Original listing date (first IPO, may differ from listingDate if product migrated between markets) */
  originalListingDate: string;
  /** Related instruments */
  relatedInstruments: RelatedInstrument[];
}

export interface PortfolioProcessed extends BaseProcessed {
  /** City */
  city: string;
  /** Market ID */
  marketId: "portfolio";
  /** Market migrations */
  marketMigrations: MarketMigration[];
}

export type ProcessedProduct =
  | BmeAlternativesProcessed
  | BmeContinuoProcessed
  | EuronextProcessed
  | PortfolioProcessed;

// ============================================
// Market Operation Types
// ============================================

/**
 * Progress callback for operations that process multiple items
 */
export type ProgressCallback = (message: string, current?: number, total?: number) => void;

// =============================================================================
// MARKET MIGRATION
// =============================================================================
export type MarketMigrationId =
  | "alternext"
  | "euronext-access+"
  | "euronext-derivative"
  | "euronext-miv"
  | "euronext-oslo-bors"
  | "marche-libre"
  | "unknown"
  | MarketId;

export interface MarketMigration {
  date: string;
  from: MarketMigrationId;
  name: string;
  ticker?: string;
  to: MarketMigrationId;
}

// =============================================================================
// RELATED INSTRUMENTS
// =============================================================================
export interface RelatedInstrument {
  isin: string;
  name: string;
  ticker: string;
}

// =============================================================================
// YEARLY HISTORY
// =============================================================================
export interface YearlyMarketCap {
  marketCap: number;
  year: number;
}

// =============================================================================
// LIQUIDITY
// =============================================================================
export interface Liquidity {
  /** Average daily liquidity: turnover / market days (EUR/day) */
  avgDailyTurnover: number;
  /** Activity frequency: trading days / market days (ratio, e.g.: 0.8 = 80% of active days) */
  tradingDaysRatio: number;
  /** Total turnover in the year (EUR) */
  turnover: number;
  /** Capital turnover: turnover / avgMarketCap (ratio, e.g.: 0.15 = 15% of the market turnover) */
  turnoverVelocity: number;
  /** Total volume in the year */
  volume: number;
}

// =============================================================================
// UNIFIED CORPORATE ACTIONS
// =============================================================================

/**
 * Unified corporate actions structure (arrays of dates only)
 * Used for cross-market comparison - stores only event dates (ISO format)
 */
export interface UnifiedCorporateActions {
  /** Capital decrease dates */
  capitalDecreases: string[];
  /** Capital increase dates */
  capitalIncreases: string[];
  /** Delisting dates */
  delistings: string[];
  /** Dividend payment dates (ex-dates) */
  dividends: string[];
  /** Free allocation / scrip dividend dates */
  freeAllocations: string[];
  /** New listing / admission dates */
  listings: string[];
  /** Market/compartment change dates */
  marketChanges: string[];
  /** Company name change dates */
  nameChanges: string[];
  /** Reverse split (contrasplit) dates */
  reverseSplits: string[];
  /** Split dates */
  splits: string[];
  /** Takeover bid dates */
  takeovers: string[];
  /** Trading resumption dates (when suspension is lifted) */
  tradingResumptions: string[];
  /** Trading suspension dates */
  tradingSuspensions: string[];
}

/**
 * Corporate action type identifiers
 */
export type CorporateActionType = keyof UnifiedCorporateActions;

// ============================================================================
// UNIFIED TAXONOMY - LEVEL 1: SECTORS (20)
// ============================================================================

export type UnifiedSector =
  | "Automobiles and Parts"
  | "Banks"
  | "Basic Resources"
  | "Chemicals"
  | "Construction and Materials"
  | "Consumer Products and Services"
  | "Energy"
  | "Financial Services"
  | "Food and Beverages"
  | "Health Care"
  | "Industrial Goods and Services"
  | "Insurance"
  | "Media"
  | "Other"
  | "Real Estate"
  | "Retail"
  | "Technology"
  | "Telecommunications"
  | "Travel and Leisure"
  | "Utilities";

// ============================================================================
// UNIFIED TAXONOMY - LEVEL 2: SUBSECTORS (~70)
// ============================================================================

/* eslint-disable perfectionist/sort-union-types -- we want to keep the order of the subsectors */
export type UnifiedSubsector =
  // Automobiles and Parts
  | "Automobiles"
  | "Auto Parts"
  | "Auto Services"

  // Banks
  | "Banks"
  | "Savings Banks"

  // Basic Resources
  | "Mining"
  | "Metals"
  | "Forestry and Paper"

  // Chemicals
  | "Chemicals"
  | "Specialty Chemicals"

  // Construction and Materials
  | "Construction"
  | "Building Materials"
  | "Engineering and Contracting"

  // Consumer Products and Services
  | "Household Goods"
  | "Personal Goods"
  | "Consumer Electronics"
  | "Consumer Services"
  | "Education Services"

  // Energy
  | "Oil and Gas"
  | "Oil Equipment and Services"
  | "Renewable Energy"

  // Financial Services
  | "Investment Services"
  | "Asset Management"
  | "Financial Technology"
  | "Holding Companies"
  | "Closed End Investments"

  // Food and Beverages
  | "Food Producers"
  | "Beverages"
  | "Food Retail"

  // Health Care
  | "Pharmaceuticals"
  | "Biotechnology"
  | "Medical Equipment"
  | "Health Care Services"

  // Industrial Goods and Services
  | "Aerospace and Defense"
  | "Industrial Engineering"
  | "Industrial Equipment"
  | "Industrial Transportation"
  | "Business Support Services"
  | "Diversified Industrials"

  // Insurance
  | "Life Insurance"
  | "Non-life Insurance"
  | "Insurance Brokers"
  | "Reinsurance"

  // Media
  | "Broadcasting"
  | "Publishing"
  | "Entertainment"
  | "Advertising"

  // Real Estate
  | "Real Estate Development"
  | "Real Estate Services"
  | "REITs"
  | "SOCIMI"

  // Retail
  | "General Retail"
  | "Specialty Retail"
  | "E-commerce"

  // Technology
  | "Software"
  | "IT Services"
  | "Hardware"
  | "Semiconductors"

  // Telecommunications
  | "Telecom Services"
  | "Telecom Equipment"

  // Travel and Leisure
  | "Airlines"
  | "Hotels and Lodging"
  | "Restaurants"
  | "Leisure and Recreation"
  | "Travel Services"

  // Utilities
  | "Electricity"
  | "Gas Utilities"
  | "Water"
  | "Waste Management"
  | "Multi-utilities"

  // Other
  | "Other";
/* eslint-enable perfectionist/sort-union-types */
