import type {
  BmeContinuoCorporateActions,
  BmeContinuoNewListingApi,
  BmeDocument,
  BmeListing,
  BmeYearlyData,
} from "../../types/bme.types";
import { parseContinuoDate, parseSpanishDate } from "../../helpers/parsing";

// =============================================================================
// LISTING DATE UTILITIES
// =============================================================================

/**
 * Finds the "Nueva Adm." (new admission) record from financial operations
 */
export function findCorporateActionsListingDate(listings: BmeListing[]) {
  if (listings.length === 0) return;

  const newListing = listings
    .filter((listing) => listing.type === "Nueva Adm." || listing.type === "Nueva Admisión")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!newListing[0]) return;

  return parseSpanishDate(newListing[0].date);
}

/**
 * Finds the initial access document (Documento Informativo de Incorporación)
 */
export function findDocumentListingDate(documents: BmeDocument[]) {
  if (documents.length === 0) return;

  const patterns = [
    /doc\.?\s*inicial\s*de\s*acceso/i,
    /documento\s+informativo\s+de\s+incorporaci[óo]n/i,
    /doc\.?\s*informativo\s+de\s+incorporaci[óo]n/i,
  ];

  // Sort documents by date ascending to get the earliest one
  const sortedDocuments = [...documents].sort((a, b) => a.date.localeCompare(b.date));

  for (const document of sortedDocuments) {
    const description = document.description;
    if (patterns.some((p) => p.test(description))) {
      return document.date;
    }
  }

  return sortedDocuments[0]?.date;
}

export function getListingDates(listings: BmeListing[], documents: BmeDocument[]) {
  let listingDate;
  const admissionListingDateString = findCorporateActionsListingDate(listings);
  const documentListingDateString = findDocumentListingDate(documents);

  // Determine the original listing date (more older date)
  const admissionListingDate = admissionListingDateString
    ? new Date(admissionListingDateString)
    : undefined;
  const documentListingDate = documentListingDateString
    ? new Date(documentListingDateString)
    : undefined;

  if (admissionListingDate && documentListingDate) {
    listingDate =
      admissionListingDate < documentListingDate
        ? admissionListingDateString
        : documentListingDateString;
  } else {
    listingDate = admissionListingDateString ?? documentListingDateString;
  }

  return listingDate;
}

function findNewListingDate(listings: BmeContinuoNewListingApi[]) {
  const newListing = listings
    .map((listing) => parseContinuoDate(listing.admissionDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  return newListing;
}

function findOldCorporateActionsListingDate(corporateActions: BmeContinuoCorporateActions) {
  const oldestCapitalIncreaseDate = corporateActions.capitalIncreases
    .map((capitalIncrease) => parseContinuoDate(capitalIncrease.admissionDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestDelistingDate = corporateActions.delistings
    .map((delisting) => parseContinuoDate(delisting.admissionDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestDividendDate = corporateActions.dividends
    .map((dividend) => parseContinuoDate(dividend.exDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestMergerDate = corporateActions.mergers
    .map((merger) => parseContinuoDate(merger.date))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestNewListingDate = corporateActions.newListings
    .map((newListing) => parseContinuoDate(newListing.admissionDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestOtherPaymentDate = corporateActions.otherPayments
    .map((otherPayment) => parseContinuoDate(otherPayment.exDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestPublicOfferingDate = corporateActions.publicOfferings
    .map((publicOffering) => parseContinuoDate(publicOffering.startingDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestSplitDate = corporateActions.splits
    .map((split) => parseContinuoDate(split.date))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];
  const oldestTakeoverBidDate = corporateActions.takeoverBids
    .map((takeoverBid) => parseContinuoDate(takeoverBid.startingDate))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];

  const oldestListingDate = [
    oldestCapitalIncreaseDate,
    oldestDelistingDate,
    oldestDividendDate,
    oldestMergerDate,
    oldestNewListingDate,
    oldestOtherPaymentDate,
    oldestPublicOfferingDate,
    oldestSplitDate,
    oldestTakeoverBidDate,
  ]
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];

  return oldestListingDate;
}

export function getListingDatesContinuo(
  corporateActions: BmeContinuoCorporateActions,
  yearlyHistory: BmeYearlyData[],
) {
  const newListingDate = findNewListingDate(corporateActions.newListings);
  const oldListingDate = findOldCorporateActionsListingDate(corporateActions);
  const oldestYearlyHistoryDate = yearlyHistory
    .map((yearlyHistory) => parseContinuoDate(`${String(yearlyHistory.year)}0101`))
    .filter((date) => date !== undefined)
    .sort((a, b) => a.localeCompare(b))[0];

  return (
    newListingDate ??
    [oldListingDate, oldestYearlyHistoryDate]
      .filter((date) => date !== undefined)
      .sort((a, b) => a.localeCompare(b))[0]
  );
}
