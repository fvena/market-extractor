import type { BaseListingItem, BaseProductDetails } from "../types";

/**
 * BME-specific listing item
 * Raw data structure from BME market listings
 */
export interface BmeListingItem extends BaseListingItem {
  isin?: string;
  ticker: string;
}

/**
 * BME-specific product details
 * Raw data structure from BME product pages
 */
export interface BmeProductDetails extends BaseProductDetails {
  address?: string;
  currency: string;
  description?: string;
  isin: string;
  listingDate?: string;
  marketCap?: number;
  sector?: string;
  subsector?: string;
  ticker: string;
  website?: string;
}
