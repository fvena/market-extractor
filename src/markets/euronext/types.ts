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

// ============================================
// TRADING INFO (from fs_tradinginfo_block)
// ============================================

export interface EuronextTradingInfo {
  admittedShares?: number;
  nominalValue?: number;
  tradingCurrency?: string;
  tradingType?: string;
}

// ============================================
// ICB CLASSIFICATION (from fs_icb_block)
// ============================================

export interface EuronextIcbClassification {
  sector?: string;
  subsector?: string;
  supersector?: string;
}

// ============================================
// ADDRESS & CONTACT
// ============================================

export interface EuronextAddress {
  address?: string;
  country?: string;
  website?: string;
}

export interface EuronextContact {
  email?: string;
  phone?: string;
}

// ============================================
// QUOTE DATA (from getDetailedQuote)
// ============================================

export interface EuronextQuote {
  lastTradedPrice?: number;
  marketName?: string;
  valuationClose?: number;
}

// ============================================
// PRICE HISTORY (from getHistoricalPricePopup)
// ============================================

export interface EuronextDailyPrice {
  closePrice: number;
  date: string; // ISO format (YYYY-MM-DD)
  turnover: number; // Calculated: closePrice * volume
  volume: number;
}

export interface EuronextPriceHistory {
  periodEnd: string; // ISO date
  periodStart: string; // ISO date
  prices: EuronextDailyPrice[];
  tradingDays: number;
}

// ============================================
// NOTICES & DOCUMENTS (from getNoticePublicData)
// ============================================

export interface EuronextNotice {
  date: string; // ISO format (YYYY-MM-DD)
  noticeNumber: string;
  title: string;
  url?: string;
}

// ============================================
// MARKET MIGRATIONS (from ipo-new-issue/showcase)
// ============================================

export interface EuronextIpoEntry {
  exchangeMarket?: string;
  ipoDate?: string;
  ipoTypes: string[];
  marketOrganization?: string;
  tradingLocation?: string;
  transferDetails?: string;
}

// ============================================
// COMPLETE PRODUCT DETAILS
// ============================================

/** Required fields for Euronext details - missing these triggers error status */
export const EURONEXT_REQUIRED_FIELDS = ["name", "ticker", "isin", "currency"] as const;

/** Optional fields - missing these triggers warning status */
export const EURONEXT_OPTIONAL_FIELDS = [
  "sector",
  "subsector",
  "supersector",
  "lastTradedPrice",
  "admittedShares",
  "listingDate",
  "address",
  "country",
] as const;

export interface EuronextDetails {
  // === From cofisem-public-address ===
  address?: string;
  // === From fs_tradinginfo_block ===
  admittedShares?: number;
  city?: string;
  country?: string;
  currency: string;

  // === From cofisem-public-contact ===
  email?: string;
  // === Metadata ===
  errors?: string[];
  fetchedAt: string; // ISO timestamp
  // === IPO entries ===
  ipoEntries: EuronextIpoEntry[];

  // === From listing ===
  isin: string;

  // === From getDetailedQuote ===
  lastTradedPrice?: number;
  // === From fs_tradinginfo_pea_block ===
  listingDate?: string; // IPO date
  market: string;

  marketName?: string;
  name: string;
  nominalValue?: number;
  // === Notices and documents ===
  notices: EuronextNotice[];

  phone?: string;
  postalCode?: string;
  // === Price history ===
  priceHistory: EuronextPriceHistory;

  // === From fs_icb_block ===
  sector?: string;
  status: "error" | "success" | "warning";
  subsector?: string;

  supersector?: string;

  ticker: string;

  tradingType?: string;

  url: string;
  valuationClose?: number;
  website?: string;
}

/** Progress callback for detail fetching with phases */
export type EuronextDetailProgressCallback = (phase: string, detail?: string) => void;
