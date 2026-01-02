import type { BaseProductDetails } from "../types";

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
  name?: string;
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

/**
 * Portfolio listing item - the full IssuanceMarketBean plus constructed URL
 */
export interface PortfolioListingItem extends IssuanceMarketBean {
  url: string;
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
