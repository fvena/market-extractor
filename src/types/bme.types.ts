// ============================================
// DOCUMENTS
// ============================================

export interface BmeDocument {
  date: string; // ISO format (YYYY-MM-DD)
  description: string; // Clean summary
  issuer: string; // Issuer
  relatedTo?: string; // Related document URL
  replaces?: string; // Replaced document URL
  type: string; // Document type
  url: string; // PDF URL
}

// ============================================
// YEARLY HISTORY (summary table in product page)
// ============================================

export interface BmeYearlyData {
  closePrice: number; // Period close price
  marketCap: number; // Calculated: shares * closePrice
  shares: number; // Number of shares (value * 1000)
  turnover: number; // Effective (value in thousands EUR)
  volume: number; // Volume (in thousands of shares)
  year: number;
}

// ============================================
// DAILY PRICE HISTORY (last year)
// ============================================

export interface BmeDailyPrice {
  closePrice: number; // Close price
  date: string; // ISO format (YYYY-MM-DD)
  turnover: number; // Traded amount (EUR)
  volume: number; // Volume (shares)
}

export interface BmePriceHistory {
  marketDays: number; // Total market days (includes no-activity days)
  periodEnd: string; // ISO date
  periodStart: string; // ISO date
  prices: BmeDailyPrice[]; // Only days WITH trading activity
}

// ============================================
// CORPORATE ACTIONS / FINANCIAL OPERATIONS
// ============================================

/** Listing admission */
export interface BmeListing {
  date: string; // Admission date (YYYY-MM-DD)
  effectiveAmount?: number; // Effective amount
  exchangeCode: string; // Exchange code
  isin: string;
  issuer?: string; // Issuer name (Entidad) for matching
  nominalAmount?: number; // Nominal amount
  notes?: string; // Observations
  shares?: number; // Number of titles
  tradingUnit?: number; // Trading unit
  type: string; // "Nueva Adm.", "Integr.Titulos"
}

/** Dividend */
export interface BmeDividend {
  exDate: string; // Ex-dividend date (YYYY-MM-DD)
  fiscalYear: string; // Fiscal year ("A cuenta 2024", "Complementario 2023")
  grossAmount?: number; // Gross amount per share
  isin: string;
  issuer: string; // Issuer
  paymentDate?: string; // Payment date (YYYY-MM-DD) - Fecha Abono
  securityName: string; // Security name
  type: string; // "Ord.", "Ext."
}

/** Delisting */
export interface BmeDelisting {
  date: string; // Delisting date (YYYY-MM-DD)
  exchangeCode: string; // Exchange code
  isin: string;
  issuer?: string; // Issuer name (Entidad) for matching
  nominalAmount?: number; // Nominal amount
  reason?: string; // Reason
  shares?: number; // Number of titles
}

/** Consolidation (reverse split) */
export interface BmeConsolidation {
  date: string; // Date (YYYY-MM-DD)
  equivalence: string; // Ratio ("1 x 20")
  isin: string;
  issuer?: string; // Issuer name (Emisora) for matching
  securityName: string; // Security name
}

/** Capital increase */
export interface BmeCapitalIncrease {
  disbursement?: number; // Disbursement
  dividendBenefitDate?: string; // Dividend benefit date (YYYY-MM-DD)
  issuer?: string; // Issuer name (Emisora) for matching
  nature: string; // Nature: "Port.", "Nomin."
  notes?: string; // Observations
  periodEnd?: string; // Subscription end (YYYY-MM-DD)
  periodStart?: string; // Subscription start (YYYY-MM-DD)
  price?: number; // Subscription price
  ratio: string; // Proportion ("1 x 10")
  shares?: number; // Number of titles
  tradableRights: boolean; // If rights are tradable
  type: string; // "Prima", "Liberada", "Mixta"
}

/** Special payment */
export interface BmeSpecialPayment {
  date: string; // Discount date (YYYY-MM-DD)
  grossAmount?: number; // Gross amount
  issuer: string; // Issuer
  notes?: string; // Observations
  paymentClass: string; // Class: "En Efectivo", "En Acciones"
  paymentDate?: string; // Payment date (YYYY-MM-DD) - Fecha Abono
  type: string; // Type (e.g., "Prima de emisión")
}

/** Split */
export interface BmeSplit {
  date: string; // Date (YYYY-MM-DD)
  equivalence: string; // Ratio ("10 x 1")
  issuer?: string; // Issuer name (Emisora) for matching
  newIsin: string; // New ISIN
  nominal?: number; // New nominal
  previousIsin: string; // Previous ISIN
  securityName: string; // Security name
}

/** Container for all corporate actions */
export interface BmeCorporateActions {
  capitalIncreases: BmeCapitalIncrease[];
  consolidations: BmeConsolidation[]; // Reverse splits
  delistings: BmeDelisting[];
  dividends: BmeDividend[];
  listings: BmeListing[]; // Admissions
  specialPayments: BmeSpecialPayment[];
  splits: BmeSplit[];
}

// ============================================
// BME CONTINUO API TYPES
// ============================================

/**
 * Response from /Market/v1/EQ/ShareDetailsInfo
 */
export interface BmeContinuoShareDetailsResponse {
  active: string;
  admitedCapital: number;
  capitalisation: number;
  currency: string;
  isin: string;
  issuerCode: string;
  market: string;
  name: string;
  nominal: number;
  otherShares?: {
    isin: string;
    issuerCode: string;
    name: string;
    shortName: string;
    ticker: string;
  }[];
  shares: number;
  shortName: string;
  ticker: string;
  tradingSystem: string;
  tradingUnit: number;
}

/**
 * Response from /Market/v1/EQ/CompanyData/AllData
 */
export interface BmeContinuoCompanyDataResponse {
  address: string;
  capitalCurrency: string;
  companyKey: string;
  exclusionDate: string;
  listed: boolean;
  listedCapital: number;
  logoURL: string;
  mainShareISIN: string;
  maximunCapital: null | number;
  minimunCapital: null | number;
  name: string;
  tradingSystem: string;
  websiteURL: string;
}

/**
 * Single period data from LastPeriods API
 */
export interface BmeContinuoYearlyDataApi {
  admittedCapital: number;
  capitalisation: number;
  change: string;
  close: number;
  closeDate: string;
  date: string;
  high: number;
  last: number;
  low: number;
  nominal: number;
  reference: number;
  shares: number;
  turnover: number;
  volume: number;
  year: number;
}

/**
 * Response from /Market/v1/EQ/LastPeriods
 */
export interface BmeContinuoLastPeriodsResponse {
  data: BmeContinuoYearlyDataApi[];
  hasMoreResults: boolean;
  params: {
    isin: string;
  };
  totalResults: number;
}

/**
 * Single price entry from HistoricalSharesPrices API
 */
export interface BmeContinuoPriceDataApi {
  average: number;
  close: number;
  date: string; // YYYYMMDD format
  diff: number;
  facDivi: number;
  facMult: number;
  high: number;
  last: number;
  low: number;
  previous: number;
  reference: number;
  tendency: number;
  turnover: number;
  volume: number;
}

/**
 * Response from /Market/v1/EQ/HistoricalSharesPrices
 */
export interface BmeContinuoHistoricalPricesResponse {
  data: BmeContinuoPriceDataApi[];
  details: {
    isin: string;
    market: string;
    name: string;
    ticker: string;
    tradingSystem: string;
  };
  hasMoreResults: boolean;
  params: {
    from: string;
    isin: string;
    page: number;
    pageSize: number;
    to: string;
    type: string;
  };
  totalResults: number;
}

// ============================================
// BME CONTINUO CORPORATE ACTIONS API TYPES
// ============================================

/**
 * Dividend from /CorporateActions/Dividends
 */
export interface BmeContinuoDividendApi {
  company: string;
  concept: string;
  conceptText: string;
  currency: string;
  exDate: string; // YYYYMMDD
  grossAmount: number;
  isin: string;
  netAmount: number;
  paymentDate: string; // YYYYMMDD
  share: string;
  tradingUnit: number;
  type: string;
  typeText: string;
  year: string;
}

/**
 * Public Offering from /CorporateActions/PublicOfferings
 */
export interface BmeContinuoPublicOfferingApi {
  authorisationDate: string;
  companyKey: string;
  companyName: string;
  companyShortName: string;
  companyTradingSystem: string;
  definitivedDate: string;
  finishDate: string; // YYYYMMDD
  greenShoe: number;
  greenShoeIndicator: string;
  maximumDate: string;
  observations1: string;
  observations2: string;
  observations3: string;
  observations4: string;
  observations5: string;
  offeredShares: number;
  offeringCompanyName: string;
  price: number;
  startingDate: string; // YYYYMMDD
}

/**
 * Takeover Bid (OPA) from /CorporateActions/TakeoverBids
 */
export interface BmeContinuoTakeoverBidApi {
  acquiredDate: string; // YYYYMMDD
  acquiredShares: number;
  cancellationDate: string;
  cancellationText: string;
  companyKey: string;
  companyName: string;
  companyShortName: string;
  companyTradingSystem: string;
  finishDate: string; // YYYYMMDD
  offeringCompanyName: string;
  price: number;
  priceText: string;
  result: string;
  shares: number;
  startingDate: string; // YYYYMMDD
}

/**
 * New Listing from /CorporateActions/NewListings
 */
export interface BmeContinuoNewListingApi {
  admissionDate: string; // YYYYMMDD
  admissionType: string;
  isin: string;
  marketCode: string;
  nominal: number;
  numSeq: string;
  numShares: number;
  observ: string;
  origin: string;
  relevantFactCode: string;
  share: string;
  tradingUnit: number;
  turnover: number;
}

/**
 * Delisting from /CorporateActions/Delistings
 */
export interface BmeContinuoDelistingApi {
  admissionDate: string; // YYYYMMDD
  isin: string;
  marketCode: string;
  nominal: number;
  numSeq: string;
  numShares: number;
  observ: string;
  origin: string;
  relevantFactCode: string;
  share: string;
  tradingUnit: number;
  turnover: number;
}

/**
 * Capital Increase from /CorporateActions/CapitalIncreases
 */
export interface BmeContinuoCapitalIncreaseApi {
  admissionDate: string; // YYYYMMDD
  currency: string;
  disbursement: null | number;
  dividendDate: string;
  effectiveAmount: number;
  finishDate: string; // YYYYMMDD
  isin: string;
  issuerName: string;
  liberatedPercentage: number;
  naturDescription: string;
  naturIndicator: string;
  newShares: null | number;
  nominalAmount: number;
  numSeq: string;
  observations: string;
  oldShares: null | number;
  price: null | number;
  profitDate: string;
  rightsIndicator: string;
  rightsPrice: number;
  shares: number;
  startingDate: string; // YYYYMMDD
  subgroupIndicator: string;
  typeDescription: string;
  typeIndicator: string;
}

/**
 * Split from /CorporateActions/Splits
 */
export interface BmeContinuoSplitApi {
  date: string; // YYYYMMDD
  equivalence: string;
  isin: string;
  issuerName: string;
  newIsin: string;
  nominal: number;
  previousIsin: string;
  securityName: string;
}

/**
 * Merger/Contrasplit from /CorporateActions/Mergers
 */
export interface BmeContinuoMergerApi {
  date: string; // YYYYMMDD
  equivalence: string;
  isin: string;
  issuerName: string;
  securityName: string;
}

/**
 * Other Payment from /CorporateActions/OtherPayments
 */
export interface BmeContinuoOtherPaymentApi {
  class: string;
  currency: string;
  effectiveAmount: number;
  exDate: string; // YYYYMMDD
  grossAmount: null | number;
  isin: string;
  issuerName: string;
  netAmount: null | number;
  observations: string;
  paymentDate: string; // YYYYMMDD
  share: string;
  shares: number;
  typeDescription: string;
  typeIndicator: string;
}

/**
 * Container for all BME Continuo corporate actions
 */
export interface BmeContinuoCorporateActions {
  capitalIncreases: BmeContinuoCapitalIncreaseApi[];
  delistings: BmeContinuoDelistingApi[];
  dividends: BmeContinuoDividendApi[];
  mergers: BmeContinuoMergerApi[];
  newListings: BmeContinuoNewListingApi[];
  otherPayments: BmeContinuoOtherPaymentApi[];
  publicOfferings: BmeContinuoPublicOfferingApi[];
  splits: BmeContinuoSplitApi[];
  takeoverBids: BmeContinuoTakeoverBidApi[];
}

// ============================================
// BME CONTINUO RELATED INSTRUMENTS API TYPES
// ============================================

/**
 * Related instrument from /Market/v1/EQ/RelatedInstruments
 */
export interface BmeContinuoRelatedInstrument {
  isin: string;
  issuerCode: string;
  name: string;
  shortName: string;
  ticker: string;
}

// ============================================
// BME CONTINUO DETAILS (combined)
// ============================================

/**
 * Required fields for BME Continuo details
 */
export const BME_CONTINUO_REQUIRED_FIELDS = [
  "name",
  "ticker",
  "isin",
  "companyKey",
  "shares",
  "marketCap",
] as const;
