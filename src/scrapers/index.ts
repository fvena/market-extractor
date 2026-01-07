/**
 * Market scrapers
 *
 * Architecture:
 * - clients/  : Browser and HTTP utilities
 * - parsers/  : HTML/DOM data extraction
 * - fetchers/ : Navigation, pagination, and orchestration
 */

// Client utilities
export { closeBrowser, delay, initBrowser, navigateTo } from "./clients/browser";
export type { FetchOptions, FetchResult, HtmlFetchResult } from "./clients/http";
export {
  buildFormData,
  extractAspxTokens,
  fetchHtml,
  fetchHtmlWithRetry,
  fetchJson,
  fetchWithRetry,
} from "./clients/http";

export type { BmeContinuoDetailResult } from "./fetchers/bme/continuo-details";
export {
  extractCompanyKey,
  fetchBmeContinuoDetails,
  fetchBmeContinuoDetailsBatch,
} from "./fetchers/bme/continuo-details";
// BME details fetchers
export { fetchBmeAlternativesCorporateActions } from "./fetchers/bme/corporate-actions";
export type { BmeAlternativesDetailResult } from "./fetchers/bme/details";
export {
  fetchBmeAlternativesDetails,
  fetchBmeAlternativesDetailsBatch,
} from "./fetchers/bme/details";

// BME listings fetchers
export type { BmeScrapingResult } from "./fetchers/bme/listings";
export { fetchBmeAlternativesListings, fetchBmeContinuoListings } from "./fetchers/bme/listings";

// Euronext details fetchers
export type { EuronextDetailResult } from "./fetchers/euronext/details";
export { fetchEuronextDetails, fetchEuronextDetailsBatch } from "./fetchers/euronext/details";

// Euronext fetchers
export type { EuronextScrapingResult } from "./fetchers/euronext/listings";
export { fetchEuronextListings } from "./fetchers/euronext/listings";

// Portfolio details fetchers
export type { PortfolioDetailResult } from "./fetchers/portfolio/details";
export { fetchPortfolioDetails } from "./fetchers/portfolio/details";

// Portfolio listings fetchers
export type { PortfolioScrapingResult } from "./fetchers/portfolio/listings";
export { fetchPortfolioListings } from "./fetchers/portfolio/listings";
