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
// RELATED INSTRUMENTS (from related-instruments-off-canvas-content)
// ============================================

export interface EuronextRelatedInstrument {
  instrumentType: string; // Stock, Bond, etc.
  isin: string;
  mic: string;
  name: string;
  symbol: string;
  url: string;
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
