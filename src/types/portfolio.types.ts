/**
 * Periodicity enum for coupon payments
 */
export type PeriodicityEnum = "ANNUAL" | "BIANNUAL" | "MONTHLY" | "QUARTERLY" | "WEEKLY";

/**
 * Day count type for debt calculations
 */
export type DayCountTypeEnum = "CALENDAR" | "WORKING";

/**
 * Debt type classification
 */
export type DebtTypeEnum = "FIXED" | "VARIABLE" | "ZERO";

/**
 * Issuance entity type
 */
export type IssuanceEntityType = "DEBT_FIXED" | "DEBT_ZERO" | "EQUITY" | "SCI_NEW_SHARES";

/**
 * Financial instrument type
 */
export type FinancialInstrumentEnum = "DEBT" | "EQUITY" | "INVESTMENT_FUND" | "MMI";

/**
 * Free float distribution requirement
 */
export type FreeFloatDistributionRequirement =
  | "COMPLIES_REQUIREMENTS"
  | "EXEMPT_FROM_COMPLIANCE"
  | "NOT_APPLICABLE"
  | "REDUCTION_OR_EXTENSION_COMPLIANCE";

/**
 * Holder transparency level
 */
export type IssuanceHolderTransparencyLevelEnum =
  | "NOT_PUBLIC"
  | "PUBLIC_UBO"
  | "PUBLIC_UBO_AND_SIGNIFICANT";

/**
 * Interest days calculation method
 */
export type InterestDaysEnum = "ACT_360" | "ACT_365" | "ACT_ACT" | "AMERICAN" | "EUROPEAN";

/**
 * Issuance status
 */
export type IssuanceStatusEnum =
  | "APPROVED"
  | "CLOSED"
  | "COMPLETED"
  | "EDITION"
  | "PENDING_APPROVAL"
  | "POST_EDITING_REQUIRED"
  | "PRE_TRADING"
  | "REJECTED"
  | "TRADING";

/**
 * Maturity type
 */
export type MaturityTypeEnum = "AMORTIZATION_PLAN" | "EXTENDIBLE" | "FIXED_MATURITY" | "PERPETUAL";

/**
 * NAV info for issuance
 */
export interface IssuanceNavInfoBean {
  createdAt?: string;
  date?: string;
  entityType: string;
  id?: number;
  issuanceId?: number;
  updatedAt?: string;
}

/**
 * Debt NAV info with bid/ask prices
 */
export interface DebtNavInfoBean extends IssuanceNavInfoBean {
  askPrice?: number;
  bidPrice?: number;
}

/**
 * Organization public information
 */
export interface OrganizationPublicBean {
  addressDoor?: string;
  addressNum?: string;
  addressStreet?: string;
  city?: string;
  contactEmail?: string;
  country?: string;
  description?: string;
  leiCode?: string;
  name?: string;
  registerNumber?: string;
  website?: string;
  zipCode?: string;
}

/**
 * Issuance trading information
 */
export interface IssuanceTradingInfoBean {
  accruedInterest?: number;
  custodyTradingUnits?: number;
  dynamicCollarPercentage?: number;
  dynamicVolatilityPercentage?: number;
  halted?: boolean;
  haltedUntilDate?: string;
  issuanceId?: number;
  lastHaltedDate?: string;
  lastTradingPrice?: number;
  maxPrice?: number;
  maxVolume?: number;
  referencePrice?: number;
  staticVolatilityPercentage?: number;
  tickSize?: number;
  totalUnits?: number;
  tradingStartDate?: string;
}

/**
 * Full IssuanceMarketBean from Portfolio API
 * This is the raw structure returned by the API
 */
export interface IssuanceMarketBean {
  companyDescription?: string;
  couponPeriodicity?: PeriodicityEnum;
  creationDate?: string;
  currency?: string;
  dayCountType?: DayCountTypeEnum;
  debtType?: DebtTypeEnum;
  directListingNominalValue?: number;
  directListingTotalAmount?: number;
  directListingUnits?: number;
  discretionalPeriodEndDate?: string;
  dividend?: number;
  dividendDueDate?: string;
  entityType?: IssuanceEntityType;
  expirationDate?: string;
  financialInstrument?: FinancialInstrumentEnum;
  fixedCouponPercentage?: number;
  freeFloatDistributionPercentage?: number;
  freeFloatDistributionRequirement?: FreeFloatDistributionRequirement;
  hasNavInfo?: boolean;
  holderTransparencyLevel?: IssuanceHolderTransparencyLevelEnum;
  id?: number;
  initialAccrualDate?: string;
  instrumentCode?: string;
  interestDays?: InterestDaysEnum;
  isFund?: boolean;
  isinCode?: string;
  issuanceDescription?: string;
  legalIssuanceApprovalDate?: string;
  leiCode?: string;
  name: string;
  navInfo?: DebtNavInfoBean;
  netAssetValuePerShare?: number;
  newSharesId?: number;
  organizationInfo?: OrganizationPublicBean;
  parentIssuanceId?: number;
  professionalProduct?: boolean;
  rightsIssuance?: boolean;
  status?: IssuanceStatusEnum;
  subscriptionPeriodStartDate?: string;
  suffix?: string;
  tradingCode?: string;
  tradingInfoBean?: IssuanceTradingInfoBean;
  treasuryStock?: number;
  typeOfMaturity?: MaturityTypeEnum;
  unitPrice?: number;
  variableCouponExplanation?: string;
  videoUrl?: string;
  volume?: number;
  votingRightsLimit?: number;
}

export interface PostTradeTransaction {
  entityType: string;
  executionVenue: string;
  flag: string;
  isinCode: string;
  price: number;
  priceCurrency: string;
  publicationDateTime: string;
  publicationVenue: string;
  quantity: number;
  tradingDateTime: string;
  transactionIdentificationCode: number;
}

export interface PostTradeResponse {
  content: PostTradeTransaction[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PortfolioDailyPrice {
  closePrice: number;
  date: string;
  turnover?: number;
  volume?: number;
}

export interface PortfolioPriceHistory {
  periodEnd: string;
  periodStart: string;
  prices: PortfolioDailyPrice[];
  tradingDays: number;
}

// ============================================
// DOCUMENT TYPES
// ============================================

/**
 * Corporate event document type
 */
export type CorporateEventDocumentTypeEnum =
  | "BOARD_OF_DIRECTORS_CERTIFICATION"
  | "FINANCIAL_INSTRUMENT"
  | "LEGAL_TRUSTED_PARTNER_STATEMENT"
  | "OTHER_LEGAL"
  | "PROSPECTUS";

/**
 * Issuance document subtype - indicates the corporate action type
 */
export type IssuanceDocumentSubtypeEnum =
  | "ACQUISITION_ASSETS"
  | "ACQUISITION_COMPANY"
  | "APPROVAL_BOARD_DIRECTORS_SPINOFF_PROJECT"
  | "APPROVAL_MERGER_BOARD_DIRECTORS"
  | "APPROVAL_RESOLUTIONS_SHAREHOLDERS"
  | "AUDIT_REPORT_QUALIFICATION"
  | "CAPITAL_INCREASE"
  | "CAPITAL_INCREASE_CONVERSION_DEVENTURES"
  | "CAPITAL_INCREASE_OFFSETTING_RECEIVABLES"
  | "CHANGE_LEGAL_TRUSTED_PARTNER"
  | "COMMUNICATION_PREBANKRUPTCY_PROCEEDINGS"
  | "CORPORATE_GOVERNANCE"
  | "DISTRIBUTION_PAYMENT_DIVIDENDS"
  | "DISTRIBUTION_SHARE_PREMIUM"
  | "FINANCING"
  | "FORMULATION_RESTATEMENT_ANNUAL_ACCOUNTS"
  | "GRANTING_PATENTS"
  | "MANAGEMENT_CHANGES"
  | "MODIFICATION_BYLAWS"
  | "MODIFICATION_BYLAWS_WAIVER_SOCIMI"
  | "MODIFICATIONS_BOARD_DIRECTORS"
  | "NOTICE_EXTRAORDINARY_GENERAL_SHAREHOLDERS"
  | "NOTIFICATION_CONVERTIBLE_BONDS"
  | "NOTIFICATION_EXPENSES_INCORPORATION"
  | "NOTIFICATION_LIQUIDITY_PROVIDERS"
  | "NOTIFICATION_OTHER_CORPORATE_TRANSACTIONS"
  | "ORDINARY_GENERAL_MEETING"
  | "ORGANIZATIONAL_STRUCTURE_INTERNAL_CONTROL"
  | "OTHER"
  | "PROGRAM_REPURCHASE_OWN_SHARES"
  | "PROPOSED_RESOLUTIONS_ANNUAL_GENERAL"
  | "PUBLIC_TAKEOVER_BIDS"
  | "PUBLICATION_SUSTAINABILITY_REPORT"
  | "PURCHASE_SHARES_EXECUTIVES"
  | "PURCHASE_SHARES_RELEVANT_HOLDERS"
  | "REDUCTION_SHARE_CAPITAL"
  | "RESULTS_BUSINESS_PLAN"
  | "RESULTS_COMMUNICATION_EVENTS_IMPACT"
  | "RESULTS_FORECASTS"
  | "RESULTS_MODIFICATION_PROPOSED_APPLICATION"
  | "RESULTS_PRESENTATION"
  | "RESULTS_PROGRESS"
  | "RESULTS_STRATEGIC_PLAN"
  | "SALE_ASSETS"
  | "SALE_SHARES"
  | "SIGNIFICANT_SHAREHOLDINGS"
  | "SIGNING_AGREEMENTS"
  | "START_REFINANCING_PROCESS"
  | "STRATEGIC_ALLIANCE"
  | "SUSPENSIONS_LIFTING_EXCLUSION_TRADING"
  | "TERMINATION_LEASE_AGREEMENTS"
  | "TRANSFER_REGISTERED_OFFICE"
  | "VALUATION_REAL_ESTATE_PORTFOLIO";

/**
 * Issuance document type
 */
export type IssuanceDocumentTypeEnum =
  | "ARTICLES_OF_ASSOCIATION"
  | "BOARD_OF_DIRECTORS_CERTIFICATION"
  | "BOARD_OF_DIRECTORS_CERTIFICATION_SUPPLEMENT"
  | "DEED_OF_INCORPORATION_STRUCTURED"
  | "FINANCIAL_DOCS"
  | "FINANCIAL_INSTRUMENT"
  | "HOLDERS_AGREEMENT"
  | "INFORMATION_OF_INTEREST"
  | "INSIDE_INFORMATION"
  | "ISSUANCE_NEWS"
  | "ISSUER_AGREEMENT"
  | "LEGAL_TRUSTED_PARTNER_STATEMENT"
  | "MARKET_NOTICES"
  | "NAV_INFO"
  | "OTHER_LEGAL"
  | "PLACEMENT_CERTIFICATION_PROSPECTUS"
  | "PLACEMENT_CERTIFICATION_STRUCTURED"
  | "POST_TRADE_REPORT"
  | "PREVIOUS_HOLDER"
  | "PROSPECTUS"
  | "RATING"
  | "REQUEST_LETTER_SUPPLEMENT"
  | "SECRETARY_BOARD_CERTIFICATION"
  | "SECURITY_LIENS"
  | "SUPPLEMENT"
  | "TERMS_AND_CONDITIONS_PROSPECTUS"
  | "TERMS_AND_CONDITIONS_STRUCTURED";

/**
 * Corporate event document from API
 */
export interface CorporateEventDocument {
  comment?: string;
  date: string; // ISO datetime
  id: number;
  mimeType: string;
  publicDoc: boolean;
  title: string;
  type: CorporateEventDocumentTypeEnum;
  url: string;
  user?: string;
}

/**
 * Issuance document from API
 */
export interface IssuanceDocument {
  comment?: string;
  date: string; // ISO datetime
  id: number;
  mimeType: string;
  publicDoc: boolean;
  subtype?: IssuanceDocumentSubtypeEnum;
  title: string;
  type: IssuanceDocumentTypeEnum;
  url: string;
  user?: string;
}

/**
 * Documents response from GET /open/market/:id/documents
 */
export interface PortfolioDocumentsResponse {
  corporateEventDocuments?: CorporateEventDocument[];
  issuanceDocuments?: IssuanceDocument[];
}
