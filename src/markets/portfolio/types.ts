import type { BaseListingItem, BaseProductDetails } from "../types";

/**
 * Portfolio-specific listing item
 * Raw data structure from Portfolio Stock Exchange listings
 */
export interface PortfolioListingItem extends BaseListingItem {
  isin: string;
  ticker: string;
  type: string; // e.g., 'SOCIMI', 'Corporate'
}

/**
 * Portfolio-specific product details
 * Raw data structure from Portfolio product pages
 */
export interface PortfolioProductDetails extends BaseProductDetails {
  advisors?: string[];
  currency: string;
  description?: string;
  isin: string;
  listingDate?: string;
  marketCap?: number;
  sector?: string;
  ticker: string;
  type: string;
  website?: string;
}
