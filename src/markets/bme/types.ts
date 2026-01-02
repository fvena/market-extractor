import type { BaseProductDetails } from "../types";

/**
 * BME Growth and ScaleUp listing item
 * Extracted from table with id "Contenido_Tbl"
 */
export interface BmeAlternativesListingItem {
  name: string;
  sector: string;
  url: string;
}

/**
 * BME Continuo listing item
 * Extracted from paginated table
 */
export interface BmeContinuoListingItem {
  name: string;
  sector: string;
  subsector: string;
  url: string;
}

/**
 * Union type for all BME listing items
 */
export type BmeListingItem = BmeAlternativesListingItem | BmeContinuoListingItem;

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
