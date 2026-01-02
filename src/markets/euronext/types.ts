import type { BaseProductDetails } from "../types";

/**
 * Euronext listing item
 * Extracted from table with id "stocks-data-table-es"
 * Common structure for Access, Expand, Growth, and Regulated markets
 */
export interface EuronextListingItem {
  isin: string;
  market: string;
  name: string;
  ticker: string;
  url: string;
}

/**
 * Euronext-specific product details
 * Raw data structure from Euronext product pages
 */
export interface EuronextProductDetails extends BaseProductDetails {
  country?: string;
  currency: string;
  industry?: string;
  isin: string;
  lei?: string;
  listingDate?: string;
  marketCap?: number;
  sector?: string;
  ticker: string;
  website?: string;
}
