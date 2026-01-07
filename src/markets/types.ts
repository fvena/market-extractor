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
  implemented: MarketImplementationStatus;
  name: string;
  slug: string; // Used for output folder names (e.g., 'bme-growth')
  urls: {
    base: string; // Base URL for product detail pages
    corporateActions?: string; // URL for market-wide corporate actions
    listings: string; // URL to fetch product listings
  };
}

/**
 * Base interface for listing items (raw data from scraping)
 * Each market family extends this with specific fields
 */
export interface BaseListingItem {
  id: string;
  name: string;
  url: string;
}

/**
 * Base interface for product details (raw data from scraping)
 * Each market family extends this with specific fields
 */
export interface BaseProductDetails {
  fetchedAt: string; // ISO timestamp
  id: string;
  name: string;
}

/**
 * Normalized product data (same structure for all markets)
 * Result of processing raw data from different sources
 */
export interface ProcessedProduct {
  currency: string;
  description?: string;
  id: string;
  isin: string;
  listingDate?: string;
  market: MarketId;
  marketCap?: number;
  name: string;
  sector?: string;
  subsector?: string;
  ticker: string;
  website?: string;
}

/**
 * Required fields that should be present in processed products
 * Used for validation warnings
 */
export const REQUIRED_FIELDS: (keyof ProcessedProduct)[] = [
  "id",
  "name",
  "ticker",
  "isin",
  "market",
  "currency",
];

/**
 * Result of a market operation (listing fetch, detail fetch, etc.)
 */
export interface MarketOperationResult {
  count?: number;
  duration: number; // milliseconds
  error?: string;
  marketId: MarketId;
  success: boolean;
  warnings?: string[];
}

/**
 * Progress callback for operations that process multiple items
 */
export type ProgressCallback = (current: number, total: number, itemName: string) => void;
