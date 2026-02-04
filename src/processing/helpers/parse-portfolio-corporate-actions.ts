/**
 * Parser for Portfolio Stock Exchange corporate actions from documents
 *
 * Portfolio documents have explicit `subtype` fields that classify corporate actions.
 * Unlike Euronext notices (title parsing) or BME (detailed structures), Portfolio uses
 * a predefined enum for document subtypes.
 */

import type {
  IssuanceDocument,
  IssuanceDocumentSubtypeEnum,
  PortfolioDocumentsResponse,
} from "../../types/portfolio.types";
import type { CorporateActionType, UnifiedCorporateActions } from "../../types/types";
import { emptyUnifiedCorporateActions } from "./parse-euronext-corporate-actions";

/**
 * Mapping from Portfolio document subtypes to unified corporate action types
 * Some subtypes don't map to corporate actions (administrative, governance, results)
 */
const SUBTYPE_TO_CORPORATE_ACTION: Partial<
  Record<IssuanceDocumentSubtypeEnum, CorporateActionType>
> = {
  ACQUISITION_COMPANY: "takeovers",
  // Capital increases
  CAPITAL_INCREASE: "capitalIncreases",
  CAPITAL_INCREASE_CONVERSION_DEVENTURES: "capitalIncreases",

  CAPITAL_INCREASE_OFFSETTING_RECEIVABLES: "capitalIncreases",

  // Dividends and distributions
  DISTRIBUTION_PAYMENT_DIVIDENDS: "dividends",
  DISTRIBUTION_SHARE_PREMIUM: "dividends",

  // Takeovers and acquisitions
  PUBLIC_TAKEOVER_BIDS: "takeovers",
  // Capital decreases
  REDUCTION_SHARE_CAPITAL: "capitalDecreases",

  // Trading suspensions
  SUSPENSIONS_LIFTING_EXCLUSION_TRADING: "tradingSuspensions",

  // Name changes (company name, not board changes)
  // Note: MANAGEMENT_CHANGES and MODIFICATIONS_BOARD_DIRECTORS are excluded
  // as they represent personnel changes, not company name changes
};

/**
 * Extract date in ISO format from document date string
 * Portfolio dates are ISO datetime strings (e.g., "2024-01-15T10:30:00Z")
 */
function extractDate(dateString: string): string | undefined {
  if (!dateString) return undefined;

  // If already in ISO date format (YYYY-MM-DD), return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Extract date from datetime string
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(dateString);
  return match?.[1];
}

/**
 * Classify a document subtype to a unified corporate action type
 */
export function classifyDocumentSubtype(
  subtype: IssuanceDocumentSubtypeEnum | undefined,
): CorporateActionType | undefined {
  if (!subtype) return undefined;
  return SUBTYPE_TO_CORPORATE_ACTION[subtype];
}

/**
 * Parse Portfolio documents into unified corporate actions structure
 * Extracts dates grouped by corporate action type from issuance documents
 */
export function parsePortfolioCorporateActions(
  documents: PortfolioDocumentsResponse | undefined,
): UnifiedCorporateActions {
  const result = emptyUnifiedCorporateActions();

  if (!documents?.issuanceDocuments) {
    return result;
  }

  for (const document_ of documents.issuanceDocuments) {
    processIssuanceDocument(document_, result);
  }

  // Sort all arrays by date (oldest first)
  for (const key of Object.keys(result) as CorporateActionType[]) {
    result[key].sort();
  }

  return result;
}

/**
 * Process a single issuance document and add to result if classifiable
 */
function processIssuanceDocument(
  document_: IssuanceDocument,
  result: UnifiedCorporateActions,
): void {
  const actionType = classifyDocumentSubtype(document_.subtype);
  if (!actionType) return;

  const date = extractDate(document_.date);
  if (!date) return;

  // Avoid duplicates
  if (!result[actionType].includes(date)) {
    result[actionType].push(date);
  }
}

/**
 * Get corporate actions summary (counts only)
 */
export function getPortfolioCorporateActionsSummary(
  corporateActions: UnifiedCorporateActions,
): Record<CorporateActionType, number> {
  const summary = {} as Record<CorporateActionType, number>;

  for (const key of Object.keys(corporateActions) as CorporateActionType[]) {
    summary[key] = corporateActions[key].length;
  }

  return summary;
}
