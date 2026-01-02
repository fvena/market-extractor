import type { BaseListingItem, BaseProductDetails } from "../types";

/**
 * Euronext-specific listing item
 * Raw data structure from Euronext market listings
 */
export interface EuronextListingItem extends BaseListingItem {
  isin: string;
  market: string; // Sub-market within Euronext
  ticker: string;
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
  lei?: string; // Legal Entity Identifier
  listingDate?: string;
  marketCap?: number;
  sector?: string;
  ticker: string;
  website?: string;
}
